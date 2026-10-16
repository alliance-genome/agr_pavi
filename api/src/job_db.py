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


def export_clustal(db_path: Path) -> str:
    """Return the aligned sequences in CLUSTAL format.

    The alignment stored in the DB is already produced by Clustal Omega, so
    we return it verbatim. Kept as its own export for symmetry with the
    other sequence formats.
    """
    alignment, _ = _decoded_results(db_path)
    return alignment


def export_phylip(db_path: Path, relaxed: bool = True) -> str:
    """Export the alignment in PHYLIP format.

    Strict PHYLIP truncates names to 10 characters, which collides for the
    typical PAVI naming scheme. Relaxed PHYLIP (the default) keeps full
    names separated by whitespace and is accepted by most modern
    phylogenetics tools (RAxML, IQ-TREE, PhyML).
    """
    seqs = _parse_clustal(_decoded_results(db_path)[0])
    if not seqs:
        return "0 0\n"
    ntax = len(seqs)
    nchar = max(len(s) for _, s in seqs)
    lines = [f" {ntax} {nchar}"]
    for name, seq in seqs:
        label = name if relaxed else (name[:10].ljust(10))
        sep = "  " if relaxed else ""
        lines.append(f"{label}{sep}{seq}")
    return "\n".join(lines) + "\n"


def export_stockholm(db_path: Path) -> str:
    """Export the alignment in Stockholm format (Pfam/HMMER)."""
    seqs = _parse_clustal(_decoded_results(db_path)[0])
    lines = ["# STOCKHOLM 1.0"]
    if seqs:
        name_width = max(len(n) for n, _ in seqs)
        for name, seq in seqs:
            lines.append(f"{name.ljust(name_width)}  {seq}")
    lines.append("//")
    return "\n".join(lines) + "\n"


_CLUSTAL_COLORS = {
    "A": "#80a0f0", "I": "#80a0f0", "L": "#80a0f0", "M": "#80a0f0",
    "F": "#80a0f0", "W": "#80a0f0", "V": "#80a0f0",
    "K": "#f01505", "R": "#f01505",
    "D": "#c048c0", "E": "#c048c0",
    "N": "#15c015", "Q": "#15c015", "S": "#15c015", "T": "#15c015",
    "C": "#f08080",
    "G": "#f09048",
    "P": "#c0c000",
    "H": "#15a4a4", "Y": "#15a4a4",
}


def _html_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def export_report_html(db_path: Path) -> str:
    """Self-contained HTML report for a finished job.

    One file: header with metadata, Clustal-colored alignment grid, variant
    table, and the input seq-regions in a <details>. No external CSS, JS,
    or fonts — openable offline. Also prints nicely to PDF via a browser.
    """
    alignment, seq_info_obj = _decoded_results(db_path)
    metadata = read_metadata(db_path)
    seqs = _parse_clustal(alignment)
    job_id = metadata.get("job_id", "")
    completed = metadata.get("completed_at", "")

    # Compact variant list across sequences
    variants: list[dict[str, Any]] = []
    if isinstance(seq_info_obj, dict):
        for seq_name, info in seq_info_obj.items():
            if not isinstance(info, dict):
                continue
            species = info.get("species", "")
            for v in info.get("embedded_variants", []) or []:
                if not isinstance(v, dict):
                    continue
                variants.append({
                    "sequence": seq_name,
                    "species": species,
                    "variant_id": v.get("variant_id", ""),
                    "position": v.get("alignment_start_pos", ""),
                    "type": v.get("seq_substitution_type", ""),
                    "ref": v.get("genomic_ref_seq", ""),
                    "alt": v.get("genomic_alt_seq", ""),
                    "hgvs_protein": v.get("hgvs_protein", ""),
                    "impact": v.get("impact", ""),
                })

    # Build colored alignment grid: one row per sequence, 60 cols per chunk.
    chunk = 60
    seq_len = max((len(s) for _, s in seqs), default=0)
    name_width = max((len(n) for n, _ in seqs), default=10)

    aln_blocks: list[str] = []
    for start in range(0, seq_len, chunk):
        end = min(start + chunk, seq_len)
        aln_blocks.append(f'<div class="pos">{start + 1} &rarr; {end}</div>')
        aln_blocks.append('<pre class="aln">')
        for name, seq in seqs:
            cells = []
            for ch in seq[start:end]:
                color = _CLUSTAL_COLORS.get(ch.upper(), "")
                if color and ch != "-":
                    cells.append(f'<span style="background:{color}">{_html_escape(ch)}</span>')
                else:
                    cells.append(_html_escape(ch))
            aln_blocks.append(f'<span class="n">{_html_escape(name).ljust(name_width)}</span>  {"".join(cells)}')
        aln_blocks.append('</pre>')
    aln_html = "\n".join(aln_blocks)

    # Variant table
    if variants:
        rows = []
        for v in variants:
            rows.append(
                "<tr>"
                f"<td>{_html_escape(str(v['sequence']))}</td>"
                f"<td>{_html_escape(str(v['species']))}</td>"
                f"<td>{_html_escape(str(v['variant_id']))}</td>"
                f"<td>{_html_escape(str(v['position']))}</td>"
                f"<td>{_html_escape(str(v['type']))}</td>"
                f"<td>{_html_escape(str(v['ref']))}&rarr;{_html_escape(str(v['alt']))}</td>"
                f"<td>{_html_escape(str(v['hgvs_protein']))}</td>"
                f'<td class="imp-{_html_escape(str(v["impact"]).lower())}">{_html_escape(str(v["impact"]))}</td>'
                "</tr>"
            )
        variant_table = (
            '<table><thead><tr>'
            '<th>Sequence</th><th>Species</th><th>Variant ID</th>'
            '<th>Pos (aln)</th><th>Type</th><th>Ref&rarr;Alt</th>'
            '<th>HGVS protein</th><th>Impact</th>'
            '</tr></thead><tbody>'
            + "".join(rows)
            + '</tbody></table>'
        )
    else:
        variant_table = '<p class="empty">No variants embedded.</p>'

    # Input seq-regions, truncated preview for pretty printing
    seq_regions = read_input_seq_regions(db_path) or []
    regions_json = json.dumps(seq_regions, indent=2) if seq_regions else "(none)"

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>PAVI job {_html_escape(job_id)}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         margin: 2rem auto; max-width: 1200px; padding: 0 1rem; color: #222; }}
  h1 {{ margin: 0 0 .25rem; font-size: 1.5rem; }}
  h2 {{ margin: 2rem 0 .75rem; font-size: 1.15rem; border-bottom: 2px solid #e5e7eb; padding-bottom: .25rem; }}
  .meta {{ color: #666; font-size: .9rem; margin-bottom: 1.5rem; }}
  .meta code {{ background: #f3f4f6; padding: 2px 6px; border-radius: 3px; }}
  .count {{ display: inline-block; background: #2563eb; color: white; padding: 2px 10px;
           border-radius: 999px; font-size: .8rem; margin-left: .5rem; }}
  .pos {{ font-size: .75rem; color: #888; margin-top: .75rem; }}
  pre.aln {{ font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
            font-size: 13px; line-height: 1.3; margin: .25rem 0 .5rem;
            background: #fafbfc; border: 1px solid #e5e7eb; border-radius: 4px;
            padding: .5rem; overflow-x: auto; }}
  pre.aln .n {{ color: #2563eb; font-weight: 600; }}
  table {{ width: 100%; border-collapse: collapse; margin: .5rem 0 1rem; font-size: .85rem; }}
  th, td {{ padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
  th {{ background: #f9fafb; font-weight: 600; }}
  .imp-high {{ color: #dc2626; font-weight: 600; }}
  .imp-moderate {{ color: #d97706; font-weight: 600; }}
  .imp-low {{ color: #16a34a; }}
  .imp-modifier {{ color: #6b7280; }}
  details {{ margin: 1rem 0; }}
  details pre {{ background: #f9fafb; padding: .75rem; border-radius: 4px; font-size: .75rem;
                 max-height: 400px; overflow: auto; }}
  .empty {{ color: #888; font-style: italic; }}
  @media print {{
    body {{ margin: 0; max-width: none; }}
    pre.aln {{ overflow: visible; }}
  }}
</style>
</head>
<body>
<h1>PAVI alignment report</h1>
<div class="meta">
  Job <code>{_html_escape(job_id)}</code>
  &middot; Completed {_html_escape(completed)}
  &middot; {len(seqs)} sequence{"s" if len(seqs) != 1 else ""}
  &middot; {seq_len} aligned positions
</div>

<h2>Alignment<span class="count">Clustal Omega</span></h2>
{aln_html}

<h2>Embedded variants<span class="count">{len(variants)}</span></h2>
{variant_table}

<h2>Input sequence regions</h2>
<details><summary>Show input payload ({len(seq_regions)} region{"s" if len(seq_regions) != 1 else ""})</summary>
<pre>{_html_escape(regions_json)}</pre>
</details>

<p class="meta" style="margin-top:2rem;">
  Generated by PAVI &middot; <a href="https://pavi.alliancegenome.org">pavi.alliancegenome.org</a>
</p>
</body>
</html>
"""


def export_nexus(db_path: Path) -> str:
    """Export the alignment in NEXUS format (PAUP*, MrBayes, FigTree)."""
    seqs = _parse_clustal(_decoded_results(db_path)[0])
    ntax = len(seqs)
    nchar = max((len(s) for _, s in seqs), default=0)
    # NEXUS forbids whitespace and some punctuation in taxon names; use '_'.
    def _safe(name: str) -> str:
        return re.sub(r"[\s;,:()\[\]'\"]+", "_", name)

    lines = [
        "#NEXUS",
        "",
        "BEGIN DATA;",
        f"    DIMENSIONS NTAX={ntax} NCHAR={nchar};",
        '    FORMAT DATATYPE=PROTEIN MISSING=? GAP=-;',
        "    MATRIX",
    ]
    if seqs:
        name_width = max(len(_safe(n)) for n, _ in seqs)
        for name, seq in seqs:
            lines.append(f"        {_safe(name).ljust(name_width)}  {seq}")
    lines.extend(["    ;", "END;", ""])
    return "\n".join(lines) + "\n"


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
