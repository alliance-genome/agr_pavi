"""
Unit tests for local_pipeline sequence retrieval.

subprocess.run is mocked, so these tests need neither the seq_retrieval venv
nor network access.
"""

from pathlib import Path
from subprocess import CompletedProcess
from typing import Any, Callable
from unittest.mock import patch

import pytest

from src.local_pipeline import LocalPipelineError, LocalPipelineRunner


def _region(entry_id: str, **overrides: Any) -> dict[str, Any]:
    region: dict[str, Any] = {
        "unique_entry_id": entry_id,
        "base_seq_name": entry_id,
        "seq_id": "X",
        "seq_strand": "+",
        "exon_seq_regions": [{"start": 1, "end": 30}],
        "cds_seq_regions": [{"start": 1, "end": 30, "frame": 0}],
        "fasta_file_url": "https://example.org/genome.fa.gz",
        "variant_ids": [],
        "alt_seq_name_suffix": None,
        "species": None,
    }
    region.update(overrides)
    return region


@pytest.fixture
def runner(tmp_path: Path) -> LocalPipelineRunner:
    return LocalPipelineRunner(
        work_dir=str(tmp_path / "work"), results_dir=str(tmp_path / "results"), max_workers=2
    )


def _fake_run(outputs_for: set[str]) -> Callable[..., CompletedProcess[str]]:
    """subprocess.run stand-in: writes seq_retrieval outputs for the given entries, fails the rest."""

    def run(cmd: list[str], cwd: str, **_kwargs: Any) -> CompletedProcess[str]:  # noqa: U101
        assert all(isinstance(arg, str) for arg in cmd), f"non-str argument in command: {cmd}"
        entry_id = cmd[cmd.index("--unique_entry_id") + 1]
        if entry_id not in outputs_for:
            return CompletedProcess(cmd, 1, stdout="", stderr=f"boom for {entry_id}")
        (Path(cwd) / f"{entry_id}-protein.fa").write_text(f">{entry_id}\nMAAA\n")
        (Path(cwd) / f"{entry_id}-seqinfo.json").write_text("{}")
        return CompletedProcess(cmd, 0, stdout="", stderr="")

    return run


def test_null_optional_fields_fall_back_to_defaults(runner: LocalPipelineRunner, tmp_path: Path) -> None:
    # The API model defaults optional fields to None, so they arrive as present-but-None keys.
    region = _region(
        "e1", alt_seq_name_suffix=None, seq_strand=None, cds_seq_regions=None, variant_ids=None
    )
    captured: list[list[str]] = []

    def run(cmd: list[str], cwd: str, **kwargs: Any) -> CompletedProcess[str]:
        captured.append(cmd)
        return _fake_run({"e1"})(cmd, cwd, **kwargs)

    with patch("src.local_pipeline.subprocess.run", side_effect=run):
        runner._invoke_seq_retrieval(region, tmp_path)

    cmd = captured[0]
    assert cmd[cmd.index("--alt_seq_name_suffix") + 1] == "_alt"
    assert cmd[cmd.index("--seq_strand") + 1] == "+"
    assert cmd[cmd.index("--cds_seq_regions") + 1] == "[]"
    assert cmd[cmd.index("--variant_ids") + 1] == "[]"
    assert "--species" not in cmd


def test_all_retrievals_succeed(runner: LocalPipelineRunner, tmp_path: Path) -> None:
    regions = [_region("a"), _region("b")]
    with patch("src.local_pipeline.subprocess.run", side_effect=_fake_run({"a", "b"})):
        fastas, seqinfos = runner._run_sequence_retrieval("job", regions, tmp_path)
    assert sorted(p.name for p in fastas) == ["a-protein.fa", "b-protein.fa"]
    assert len(seqinfos) == 2


def test_partial_failure_fails_the_job_and_names_the_entry(
    runner: LocalPipelineRunner, tmp_path: Path
) -> None:
    # Previously the failed entry was dropped and the job reported "completed".
    regions = [_region("ok"), _region("broken")]
    with patch("src.local_pipeline.subprocess.run", side_effect=_fake_run({"ok"})):
        with pytest.raises(LocalPipelineError) as exc_info:
            runner._run_sequence_retrieval("job", regions, tmp_path)
    assert "broken" in str(exc_info.value)
    assert "1 of 2" in str(exc_info.value)
    assert exc_info.value.stage == "SEQUENCE_RETRIEVAL"


def test_missing_output_file_counts_as_failure(runner: LocalPipelineRunner, tmp_path: Path) -> None:
    def run_without_outputs(cmd: list[str], cwd: str, **_kwargs: Any) -> CompletedProcess[str]:  # noqa: U100, U101
        return CompletedProcess(cmd, 0, stdout="", stderr="")

    with patch("src.local_pipeline.subprocess.run", side_effect=run_without_outputs):
        with pytest.raises(LocalPipelineError) as exc_info:
            runner._run_sequence_retrieval("job", [_region("silent")], tmp_path)
    assert "silent" in str(exc_info.value)


def test_outputs_are_ordered_by_entry_id_not_completion_order(
    runner: LocalPipelineRunner, tmp_path: Path
) -> None:
    # Clustal keeps input order. Rows must follow the unique_entry_id order (its
    # 000_/001_ prefix is the submit-form position, as in the Nextflow pipeline),
    # not submission-list order or whichever retrieval thread finishes first.
    import time

    delays = {"000_a": 0.2, "001_b": 0.1, "002_c": 0.0}
    base = _fake_run(set(delays))

    def slow_run(cmd: list[str], cwd: str, **kwargs: Any) -> CompletedProcess[str]:
        time.sleep(delays[cmd[cmd.index("--unique_entry_id") + 1]])
        return base(cmd, cwd, **kwargs)

    runner.max_workers = 3
    regions = [_region(name) for name in ("001_b", "002_c", "000_a")]  # shuffled, like the fixture payload
    with patch("src.local_pipeline.subprocess.run", side_effect=slow_run):
        fastas, seqinfos = runner._run_sequence_retrieval("job", regions, tmp_path)
    assert [p.name for p in fastas] == ["000_a-protein.fa", "001_b-protein.fa", "002_c-protein.fa"]
    assert [p.name for p in seqinfos] == ["000_a-seqinfo.json", "001_b-seqinfo.json", "002_c-seqinfo.json"]
