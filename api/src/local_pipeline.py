"""
Local pipeline execution module for PAVI API.

This module provides direct Python execution of the PAVI pipeline components
(seq_retrieval, alignment, seq_info_align) for local EC2 deployment,
replacing AWS Step Functions and Batch.
"""

import asyncio
import json
import os
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Callable, Optional

from log_mgmt.log_manager import get_logger
import job_db

log = get_logger(__name__)

# Pipeline components path - auto-detect from repo structure or use env var
_default_components_path = Path(__file__).resolve().parent.parent.parent / "pipeline_components"
PIPELINE_COMPONENTS_PATH = Path(os.environ.get("PAVI_PIPELINE_COMPONENTS_PATH", str(_default_components_path)))
SEQ_RETRIEVAL_SRC = PIPELINE_COMPONENTS_PATH / "seq_retrieval" / "src"
SEQ_RETRIEVAL_PYTHON = PIPELINE_COMPONENTS_PATH / "seq_retrieval" / ".venv" / "bin" / "python"


class LocalPipelineError(Exception):
    """Exception raised when local pipeline execution fails."""

    def __init__(self, message: str, stage: str, cause: Optional[str] = None):
        super().__init__(message)
        self.stage = stage
        self.cause = cause


class LocalPipelineRunner:
    """
    Local pipeline runner that executes pipeline components directly.

    This replaces AWS Step Functions + Batch for local EC2 deployment.
    """

    def __init__(
        self,
        work_dir: str = "/tmp/pavi/work",
        results_dir: str = "/tmp/pavi/results",
        max_workers: int = 4,
        progress_callback: Optional[Callable[[str, str, int], None]] = None,
    ):
        """
        Initialize the local pipeline runner.

        Args:
            work_dir: Directory for intermediate work files
            results_dir: Directory for final results
            max_workers: Maximum parallel sequence retrieval tasks
            progress_callback: Optional callback(job_id, stage, sequences_processed)
        """
        self.work_dir = Path(work_dir)
        self.results_dir = Path(results_dir)
        self.max_workers = max_workers
        self.progress_callback = progress_callback

        # Ensure directories exist
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)

    def _update_progress(self, job_id: str, stage: str, sequences_processed: int = 0) -> None:
        """Update job progress via callback if set."""
        if self.progress_callback:
            try:
                self.progress_callback(job_id, stage, sequences_processed)
            except Exception as e:
                log.warning(f"Progress callback error: {e}")

    def run_pipeline(
        self,
        job_id: str,
        seq_regions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Run the complete pipeline synchronously.

        Args:
            job_id: Unique job identifier
            seq_regions: List of sequence region dictionaries

        Returns:
            Dictionary with result paths and metadata

        Raises:
            LocalPipelineError: If any pipeline stage fails
        """
        job_work_dir = self.work_dir / job_id
        job_results_dir = self.results_dir / job_id

        # Create job directories
        job_work_dir.mkdir(parents=True, exist_ok=True)
        job_results_dir.mkdir(parents=True, exist_ok=True)

        log.info(f"Starting local pipeline for job {job_id} with {len(seq_regions)} sequences")

        try:
            # Stage 1: Parallel sequence retrieval
            self._update_progress(job_id, "SEQUENCE_RETRIEVAL", 0)
            fasta_files, seqinfo_files = self._run_sequence_retrieval(
                job_id, seq_regions, job_work_dir
            )

            if not fasta_files:
                raise LocalPipelineError(
                    "No FASTA files produced by sequence retrieval",
                    stage="SEQUENCE_RETRIEVAL",
                )

            # Stage 2: Merge FASTAs and run alignment
            self._update_progress(job_id, "ALIGNMENT", len(seq_regions))
            merged_fasta = self._merge_fastas(fasta_files, job_work_dir)
            alignment_file = self._run_clustal(merged_fasta, job_work_dir)

            # Stage 3: Collect and align sequence info
            self._update_progress(job_id, "COLLECTING_RESULTS", len(seq_regions))
            seq_info_file = self._run_collect_seq_info(
                seqinfo_files, alignment_file, job_work_dir
            )

            # Copy results to results directory
            result_alignment = job_results_dir / "alignment-output.aln"
            result_seqinfo = job_results_dir / "aligned_seq_info.json"

            shutil.copy(alignment_file, result_alignment)
            shutil.copy(seq_info_file, result_seqinfo)

            # Write a self-contained per-job SQLite alongside the result
            # files (input + alignment + seq-info). Failure is logged and
            # swallowed inside job_db.write_finished_job; the on-disk
            # files remain canonical.
            try:
                alignment_bytes = result_alignment.read_bytes()
                seqinfo_bytes = result_seqinfo.read_bytes()
                job_db.write_finished_job(
                    db_path=job_db.db_path_for_job(self.results_dir, job_id),
                    job_id=job_id,
                    seq_regions=seq_regions,
                    alignment_bytes=alignment_bytes,
                    seq_info_bytes=seqinfo_bytes,
                )
            except Exception as e:
                log.warning(f"Per-job DB write failed for {job_id}: {e}")

            self._update_progress(job_id, "DONE", len(seq_regions))

            log.info(f"Pipeline completed successfully for job {job_id}")

            return {
                "alignment_file": str(result_alignment),
                "seqinfo_file": str(result_seqinfo),
                "sequences_processed": len(seq_regions),
            }

        except LocalPipelineError:
            raise
        except Exception as e:
            log.error(f"Pipeline failed for job {job_id}: {e}")
            raise LocalPipelineError(
                f"Pipeline execution failed: {str(e)}",
                stage="UNKNOWN",
                cause=str(e),
            )

    async def run_pipeline_async(
        self,
        job_id: str,
        seq_regions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Run the complete pipeline asynchronously.

        Args:
            job_id: Unique job identifier
            seq_regions: List of sequence region dictionaries

        Returns:
            Dictionary with result paths and metadata
        """
        # Run in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self.run_pipeline, job_id, seq_regions
        )

    def _run_sequence_retrieval(
        self,
        job_id: str,
        seq_regions: list[dict[str, Any]],
        work_dir: Path,
    ) -> tuple[list[Path], list[Path]]:
        """
        Run sequence retrieval for all regions in parallel.

        Returns:
            Tuple of (fasta_files, seqinfo_files)
        """
        fasta_files: list[Path] = []
        seqinfo_files: list[Path] = []
        errors: list[str] = []

        sequences_completed = 0

        def run_single_retrieval(seq_region: dict[str, Any]) -> tuple[Optional[Path], Optional[Path]]:
            """Run seq_retrieval for a single region."""
            unique_entry_id = seq_region.get("unique_entry_id", "unknown")
            try:
                return self._invoke_seq_retrieval(seq_region, work_dir)
            except Exception as e:
                log.error(f"Sequence retrieval failed for {unique_entry_id}: {e}")
                return None, None

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(run_single_retrieval, sr): sr
                for sr in seq_regions
            }

            for future in as_completed(futures):
                seq_region = futures[future]
                unique_entry_id = seq_region.get("unique_entry_id", "unknown")

                try:
                    fasta_file, seqinfo_file = future.result()
                    if fasta_file and fasta_file.exists():
                        fasta_files.append(fasta_file)
                    if seqinfo_file and seqinfo_file.exists():
                        seqinfo_files.append(seqinfo_file)

                    sequences_completed += 1
                    self._update_progress(job_id, "SEQUENCE_RETRIEVAL", sequences_completed)

                except Exception as e:
                    errors.append(f"{unique_entry_id}: {str(e)}")

        if errors:
            log.warning(f"Some sequence retrievals failed: {errors}")

        if not fasta_files:
            raise LocalPipelineError(
                f"All sequence retrievals failed: {errors}",
                stage="SEQUENCE_RETRIEVAL",
                cause="; ".join(errors),
            )

        return fasta_files, seqinfo_files

    def _invoke_seq_retrieval(
        self,
        seq_region: dict[str, Any],
        work_dir: Path,
    ) -> tuple[Path, Path]:
        """
        Invoke seq_retrieval as a subprocess.

        Args:
            seq_region: Sequence region dictionary
            work_dir: Working directory for outputs

        Returns:
            Tuple of (fasta_path, seqinfo_path)
        """
        unique_entry_id = seq_region["unique_entry_id"]
        base_seq_name = seq_region["base_seq_name"]
        seq_id = seq_region["seq_id"]
        seq_strand = seq_region.get("seq_strand", "+")
        exon_seq_regions = seq_region["exon_seq_regions"]
        cds_seq_regions = seq_region.get("cds_seq_regions", [])
        fasta_file_url = seq_region["fasta_file_url"]
        variant_ids = seq_region.get("variant_ids", [])
        alt_seq_name_suffix = seq_region.get("alt_seq_name_suffix", "_alt")
        species = seq_region.get("species")

        # Build command - use seq_retrieval's venv Python which has required packages
        python_path = str(SEQ_RETRIEVAL_PYTHON)
        script_path = str(SEQ_RETRIEVAL_SRC / "seq_retrieval.py")
        log.debug(f"Using Python: {python_path}, Script: {script_path}")

        cmd = [
            python_path,
            script_path,
            "--output_type", "protein",
            "--unique_entry_id", unique_entry_id,
            "--base_seq_name", base_seq_name,
            "--seq_id", seq_id,
            "--seq_strand", seq_strand,
            "--fasta_file_url", fasta_file_url,
            "--exon_seq_regions", json.dumps(exon_seq_regions),
            "--cds_seq_regions", json.dumps(cds_seq_regions),
            "--variant_ids", json.dumps(variant_ids),
            "--alt_seq_name_suffix", alt_seq_name_suffix,
            "--reuse_local_cache",
        ]

        # Add species if provided
        if species:
            cmd.extend(["--species", species])

        log.debug(f"Running seq_retrieval for {unique_entry_id}")

        # Run in work directory
        result = subprocess.run(
            cmd,
            cwd=str(work_dir),
            capture_output=True,
            text=True,
            env={**os.environ, "PYTHONPATH": str(SEQ_RETRIEVAL_SRC)},
        )

        if result.returncode != 0:
            log.error(f"seq_retrieval failed for {unique_entry_id}: {result.stderr}")
            raise LocalPipelineError(
                f"Sequence retrieval failed for {unique_entry_id}",
                stage="SEQUENCE_RETRIEVAL",
                cause=result.stderr[:500] if result.stderr else None,
            )

        fasta_path = work_dir / f"{unique_entry_id}-protein.fa"
        seqinfo_path = work_dir / f"{unique_entry_id}-seqinfo.json"

        return fasta_path, seqinfo_path

    def _merge_fastas(self, fasta_files: list[Path], work_dir: Path) -> Path:
        """
        Merge multiple FASTA files into one.

        Args:
            fasta_files: List of FASTA file paths
            work_dir: Working directory

        Returns:
            Path to merged FASTA file
        """
        merged_path = work_dir / "alignment-input.fa"

        with open(merged_path, "w") as merged:
            for fasta_file in fasta_files:
                if fasta_file.exists():
                    with open(fasta_file) as f:
                        content = f.read()
                        if content:
                            merged.write(content)
                            # Ensure newline between files
                            if not content.endswith("\n"):
                                merged.write("\n")

        log.debug(f"Merged {len(fasta_files)} FASTA files into {merged_path}")
        return merged_path

    def _run_clustal(self, input_fasta: Path, work_dir: Path) -> Path:
        """
        Run Clustal Omega alignment.

        Args:
            input_fasta: Path to input FASTA file
            work_dir: Working directory

        Returns:
            Path to alignment output file
        """
        output_path = work_dir / "alignment-output.aln"

        # Check if clustalo is available
        clustalo_path = shutil.which("clustalo")
        if not clustalo_path:
            # Try common installation locations
            for path in ["/usr/bin/clustalo", "/usr/local/bin/clustalo"]:
                if os.path.exists(path):
                    clustalo_path = path
                    break

        if not clustalo_path:
            raise LocalPipelineError(
                "Clustal Omega (clustalo) not found in PATH",
                stage="ALIGNMENT",
                cause="Install clustalo: sudo yum install clustal-omega",
            )

        cmd = [
            clustalo_path,
            "-i", str(input_fasta),
            "--outfmt=clustal",
            "--resno",
            "-o", str(output_path),
        ]

        log.debug(f"Running Clustal Omega: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            log.error(f"Clustal Omega failed: {result.stderr}")
            raise LocalPipelineError(
                "Alignment failed",
                stage="ALIGNMENT",
                cause=result.stderr[:500] if result.stderr else None,
            )

        if not output_path.exists():
            raise LocalPipelineError(
                "Alignment output file not created",
                stage="ALIGNMENT",
            )

        log.debug(f"Alignment completed: {output_path}")
        return output_path

    def _run_collect_seq_info(
        self,
        seqinfo_files: list[Path],
        alignment_file: Path,
        work_dir: Path,
    ) -> Path:
        """
        Collect and merge sequence info with alignment positions.

        This is a simplified implementation that merges seqinfo files
        and adds alignment coordinates for variants.

        Args:
            seqinfo_files: List of seqinfo JSON file paths
            alignment_file: Path to alignment output
            work_dir: Working directory

        Returns:
            Path to aligned seq info JSON file
        """
        output_path = work_dir / "aligned_seq_info.json"

        # Merge all seqinfo files
        merged_info: dict[str, Any] = {}

        for seqinfo_file in seqinfo_files:
            if seqinfo_file.exists():
                try:
                    with open(seqinfo_file) as f:
                        info = json.load(f)
                        merged_info.update(info)
                except json.JSONDecodeError as e:
                    log.warning(f"Failed to parse {seqinfo_file}: {e}")

        # Try to add alignment positions using the seq_info_align module
        try:
            aligned_info = self._add_alignment_positions(merged_info, alignment_file)
        except Exception as e:
            log.warning(f"Failed to add alignment positions: {e}")
            aligned_info = merged_info

        # Write output
        with open(output_path, "w") as f:
            json.dump(aligned_info, f, indent=2)

        log.debug(f"Collected seq info: {output_path}")
        return output_path

    def _add_alignment_positions(
        self,
        seq_info: dict[str, Any],
        alignment_file: Path,
    ) -> dict[str, Any]:
        """
        Add relative alignment positions to variant information.

        Parses the Clustal alignment to compute position mappings
        and updates variant coordinates.

        Args:
            seq_info: Merged sequence info dictionary
            alignment_file: Path to Clustal alignment

        Returns:
            Updated seq_info with alignment positions
        """
        # Parse alignment to get position mappings
        position_maps = self._parse_clustal_positions(alignment_file)

        # Update variant positions in seq_info
        for seq_name, info in seq_info.items():
            if seq_name not in position_maps:
                continue

            pos_map = position_maps[seq_name]

            # Update embedded_variants if present
            if "embedded_variants" in info and info["embedded_variants"]:
                for variant in info["embedded_variants"]:
                    # Map seq_start_pos to alignment position
                    if "seq_start_pos" in variant:
                        orig_start = variant["seq_start_pos"]
                        if orig_start in pos_map:
                            variant["alignment_start_pos"] = pos_map[orig_start]
                        else:
                            # Fallback: use seq position directly if not in map
                            variant["alignment_start_pos"] = orig_start

                    # Map seq_end_pos to alignment position
                    if "seq_end_pos" in variant:
                        orig_end = variant["seq_end_pos"]
                        if orig_end in pos_map:
                            variant["alignment_end_pos"] = pos_map[orig_end]
                        else:
                            # Fallback: use seq position directly if not in map
                            variant["alignment_end_pos"] = orig_end

        return seq_info

    def _parse_clustal_positions(self, alignment_file: Path) -> dict[str, dict[int, int]]:
        """
        Parse Clustal alignment to build position maps.

        Maps original sequence positions to alignment positions.

        Args:
            alignment_file: Path to Clustal alignment

        Returns:
            Dict mapping seq_name -> {original_pos -> alignment_pos}
        """
        position_maps: dict[str, dict[int, int]] = {}

        try:
            with open(alignment_file) as f:
                lines = f.readlines()

            # Skip header line (CLUSTAL...)
            sequences: dict[str, str] = {}

            for line in lines[1:]:
                line = line.rstrip()
                if not line or line.startswith(" ") or line.startswith("*"):
                    continue

                # Parse sequence line: "seq_name    ACDE-FG   123"
                parts = line.split()
                if len(parts) >= 2:
                    seq_name = parts[0]
                    seq_chunk = parts[1]

                    if seq_name not in sequences:
                        sequences[seq_name] = ""
                    sequences[seq_name] += seq_chunk

            # Build position maps
            for seq_name, aligned_seq in sequences.items():
                pos_map: dict[int, int] = {}
                orig_pos = 1

                for align_pos, char in enumerate(aligned_seq, start=1):
                    if char != "-":
                        pos_map[orig_pos] = align_pos
                        orig_pos += 1

                position_maps[seq_name] = pos_map

        except Exception as e:
            log.warning(f"Failed to parse Clustal alignment: {e}")

        return position_maps


# Singleton instance
_pipeline_runner: Optional[LocalPipelineRunner] = None


def get_local_pipeline_runner() -> LocalPipelineRunner:
    """Get or create the local pipeline runner singleton."""
    global _pipeline_runner
    if _pipeline_runner is None:
        from config import get_api_config

        config = get_api_config()
        _pipeline_runner = LocalPipelineRunner(
            work_dir=config.pipeline.local_work_path,
            results_dir=config.pipeline.local_results_path,
            max_workers=config.pipeline.local_max_workers,
        )
    return _pipeline_runner
