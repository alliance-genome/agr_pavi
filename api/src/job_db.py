"""
Per-job SQLite store for PAVI alignments.

Each finished job produces a self-contained `job.db` next to its result
files. The DB carries the original input payload, the alignment output,
and the seq-info output, so a single file is sufficient to reproduce or
re-export an alignment. A future desktop application can read these
files directly without going through the API.

This is deliberately separate from `local_job_store.py` (the shared
job-list index), which tracks job metadata across all jobs for the
running API. The per-job DB is the long-term, exportable artifact.
"""

from __future__ import annotations

import csv
import io
import json
import re
import sqlite3
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from log_mgmt.log_manager import get_logger

log = get_logger(__name__)

JOB_DB_FILENAME = "job.db"
SCHEMA_VERSION = "1"


def _connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _initialize_schema(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()
    cursor.executescript(
        """
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS input_seq_regions (
            idx INTEGER PRIMARY KEY,
            region_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS results (
            name TEXT PRIMARY KEY,
            mime_type TEXT NOT NULL,
            content BLOB NOT NULL
        );
        """
    )
    conn.commit()


def _set_metadata(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO metadata (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def db_path_for_job(results_dir: Path, job_id: str) -> Path:
    """Return the canonical job.db path for a given job."""
    return Path(results_dir) / job_id / JOB_DB_FILENAME


def write_finished_job(
    db_path: Path,
    job_id: str,
    seq_regions: list[dict[str, Any]],
    alignment_bytes: bytes,
    seq_info_bytes: bytes,
) -> None:
    """
    Create (or overwrite) a per-job SQLite file with input + results.

    Called from the pipeline's "results copy" step right after the
    alignment and seq-info outputs land in the job results directory.
    Failure here must not surface as a pipeline failure: the canonical
    output is still the on-disk files; the per-job DB is an additional
    artifact, so we log and continue.
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        # Overwrite to keep a clean state on re-runs of the same job_id.
        db_path.unlink()

    conn = _connect(db_path)
    try:
        _initialize_schema(conn)

        _set_metadata(conn, "schema_version", SCHEMA_VERSION)
        _set_metadata(conn, "job_id", job_id)
        _set_metadata(conn, "completed_at", _now_iso())
        _set_metadata(conn, "input_count", str(len(seq_regions)))

        conn.executemany(
            "INSERT INTO input_seq_regions (idx, region_json) VALUES (?, ?)",
            [(idx, json.dumps(region)) for idx, region in enumerate(seq_regions)],
        )

        conn.executemany(
            "INSERT INTO results (name, mime_type, content) VALUES (?, ?, ?)",
            [
                ("alignment", "text/plain", alignment_bytes),
                ("seq_info", "application/json", seq_info_bytes),
            ],
        )

        conn.commit()
        log.info(f"Wrote per-job DB for {job_id} at {db_path}")
    except Exception as e:
        log.warning(f"Failed to write per-job DB for {job_id}: {e}")
        conn.close()
        if db_path.exists():
            try:
                db_path.unlink()
            except OSError:
                pass
        return
    finally:
        try:
            conn.close()
        except Exception:
            pass


def read_input_seq_regions(db_path: Path) -> Optional[list[dict[str, Any]]]:
    """Return the original input sequence regions from a per-job DB."""
    if not db_path.exists():
        return None
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            "SELECT region_json FROM input_seq_regions ORDER BY idx ASC"
        ).fetchall()
        return [json.loads(row[0]) for row in rows]
    except sqlite3.DatabaseError as e:
        log.warning(f"Per-job DB at {db_path} is unreadable: {e}")
        return None
    finally:
        conn.close()


def read_metadata(db_path: Path) -> dict[str, str]:
    """Return all metadata key/value pairs from a per-job DB."""
    if not db_path.exists():
        return {}
    conn = _connect(db_path)
    try:
        rows = conn.execute("SELECT key, value FROM metadata").fetchall()
        return {row[0]: row[1] for row in rows}
    except sqlite3.DatabaseError:
        return {}
    finally:
        conn.close()


def read_results(db_path: Path) -> dict[str, bytes]:
    """Return the stored result blobs (e.g. ``alignment``, ``seq_info``) by name."""
    if not db_path.exists():
        return {}
    conn = _connect(db_path)
    try:
        rows = conn.execute("SELECT name, content FROM results").fetchall()
        return {row[0]: row[1] for row in rows}
    except sqlite3.DatabaseError:
        return {}
    finally:
        conn.close()


def _decoded_results(db_path: Path) -> tuple[str, Any]:
    """Return (alignment_text, seq_info_obj) from a per-job DB.

    ``seq_info_obj`` is the parsed JSON (a SeqInfoDict), or ``None`` if it is
    absent or unparseable.
    """
    results = read_results(db_path)
    alignment = results.get("alignment", b"").decode("utf-8", errors="replace")
    seq_info_obj: Any = None
    seq_info_raw = results.get("seq_info")
    if seq_info_raw is not None:
        try:
            seq_info_obj = json.loads(seq_info_raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            seq_info_obj = None
    return alignment, seq_info_obj


def export_bundle_json(db_path: Path) -> str:
    """Serialise a per-job DB to a single self-contained JSON bundle.

    Mirrors the DB contents: metadata, the original input regions, the
    alignment text, and the (parsed) seq-info. Round-trips the same
    information a `job.db` carries, in a format any tool can read.
    """
    alignment, seq_info_obj = _decoded_results(db_path)
    metadata = read_metadata(db_path)
    bundle = {
        "schema_version": metadata.get("schema_version", SCHEMA_VERSION),
        "job_id": metadata.get("job_id"),
        "completed_at": metadata.get("completed_at"),
        "input_seq_regions": read_input_seq_regions(db_path) or [],
        "alignment": alignment,
        "seq_info": seq_info_obj,
    }
    return json.dumps(bundle, indent=2)


def _parse_clustal(text: str) -> list[tuple[str, str]]:
    """Parse a CLUSTAL-format alignment into ``[(name, aligned_seq), ...]``.

    Concatenates the interleaved blocks per sequence and drops the header,
    the trailing residue counts, and the conservation lines. Order of first
    appearance is preserved.
    """
    seqs: dict[str, list[str]] = {}
    order: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not line or line.startswith("CLUSTAL"):
            continue
        # Conservation lines are indented to sit under the sequence columns.
        if raw_line[0].isspace():
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        name, chunk = parts[0], parts[1]
        # A real sequence chunk contains residues; skip conservation-only rows.
        if not re.search(r"[A-Za-z]", chunk):
            continue
        if name not in seqs:
            seqs[name] = []
            order.append(name)
        seqs[name].append(chunk)
    return [(name, "".join(seqs[name])) for name in order]


def export_fasta(db_path: Path, wrap: int = 60) -> str:
    """Export the aligned sequences (with gaps) as FASTA."""
    alignment, _ = _decoded_results(db_path)
    lines: list[str] = []
    for name, seq in _parse_clustal(alignment):
        lines.append(f">{name}")
        if wrap and wrap > 0 and seq:
            lines.extend(textwrap.wrap(seq, wrap))
        else:
            lines.append(seq)
    return "\n".join(lines) + ("\n" if lines else "")


_VARIANT_CSV_COLUMNS = [
    "sequence",
    "species",
    "alignment_start_pos",
    "alignment_end_pos",
    "seq_start_pos",
    "seq_end_pos",
    "variant_id",
    "seq_substitution_type",
    "genomic_seq_id",
    "genomic_start_pos",
    "genomic_end_pos",
    "genomic_ref_seq",
    "genomic_alt_seq",
    "hgvs_coding",
    "hgvs_protein",
    "molecular_consequences",
    "impact",
    "gene_id",
]


def export_variants_csv(db_path: Path) -> str:
    """Export the embedded variants across all sequences as a flat CSV table."""
    _, seq_info_obj = _decoded_results(db_path)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_VARIANT_CSV_COLUMNS, extrasaction="ignore")
    writer.writeheader()

    if isinstance(seq_info_obj, dict):
        for seq_name, seq_info in seq_info_obj.items():
            if not isinstance(seq_info, dict):
                continue
            species = seq_info.get("species", "")
            for variant in seq_info.get("embedded_variants", []) or []:
                if not isinstance(variant, dict):
                    continue
                row = {col: variant.get(col, "") for col in _VARIANT_CSV_COLUMNS}
                row["sequence"] = seq_name
                row["species"] = species
                consequences = variant.get("molecular_consequences")
                if isinstance(consequences, list):
                    row["molecular_consequences"] = ";".join(
                        str(c) for c in consequences
                    )
                writer.writerow(row)

    return buf.getvalue()
