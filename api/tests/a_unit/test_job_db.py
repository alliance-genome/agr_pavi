"""Unit tests for the per-job SQLite store (api/src/job_db.py)."""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest

# Match the import-path setup used by other a_unit tests in this package.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

import job_db  # noqa: E402


def test_db_path_for_job_uses_job_subdir(tmp_path: Path) -> None:
    db_path = job_db.db_path_for_job(tmp_path, "abc-123")
    assert db_path == tmp_path / "abc-123" / job_db.JOB_DB_FILENAME


def test_write_finished_job_round_trips_input_and_results(tmp_path: Path) -> None:
    job_id = "round-trip-job"
    seq_regions = [
        {"unique_entry_id": "0_TP53", "base_seq_name": "TP53", "species": "Homo sapiens"},
        {"unique_entry_id": "1_Trp53", "base_seq_name": "Trp53", "species": "Mus musculus"},
    ]
    alignment_bytes = b">TP53\nMEEPQSDPSV\n>Trp53\nMEESQSDISL\n"
    seq_info_bytes = b'{"sequences": [{"id": "TP53"}, {"id": "Trp53"}]}'

    db_path = job_db.db_path_for_job(tmp_path, job_id)
    job_db.write_finished_job(
        db_path=db_path,
        job_id=job_id,
        seq_regions=seq_regions,
        alignment_bytes=alignment_bytes,
        seq_info_bytes=seq_info_bytes,
    )

    assert db_path.exists()

    metadata = job_db.read_metadata(db_path)
    assert metadata["job_id"] == job_id
    assert metadata["input_count"] == "2"
    assert metadata["schema_version"] == job_db.SCHEMA_VERSION
    assert "completed_at" in metadata

    regions = job_db.read_input_seq_regions(db_path)
    assert regions == seq_regions

    # Direct SQL inspection so we catch schema regressions
    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute(
            "SELECT name, mime_type, content FROM results ORDER BY name"
        ).fetchall()
    finally:
        conn.close()

    by_name = {row[0]: (row[1], row[2]) for row in rows}
    assert by_name["alignment"] == ("text/plain", alignment_bytes)
    assert by_name["seq_info"] == ("application/json", seq_info_bytes)


def test_write_finished_job_overwrites_existing_db(tmp_path: Path) -> None:
    job_id = "overwrite-job"
    db_path = job_db.db_path_for_job(tmp_path, job_id)

    job_db.write_finished_job(
        db_path=db_path,
        job_id=job_id,
        seq_regions=[{"v": 1}],
        alignment_bytes=b"first",
        seq_info_bytes=b"first",
    )
    job_db.write_finished_job(
        db_path=db_path,
        job_id=job_id,
        seq_regions=[{"v": 2}],
        alignment_bytes=b"second",
        seq_info_bytes=b"second",
    )

    regions = job_db.read_input_seq_regions(db_path)
    assert regions == [{"v": 2}]


def test_read_helpers_handle_missing_db(tmp_path: Path) -> None:
    db_path = tmp_path / "nope.db"
    assert job_db.read_input_seq_regions(db_path) is None
    assert job_db.read_metadata(db_path) == {}


@pytest.mark.parametrize("attr", ["read_input_seq_regions", "read_metadata"])
def test_read_helpers_tolerate_corrupt_db(tmp_path: Path, attr: str) -> None:
    db_path = tmp_path / "corrupt.db"
    db_path.write_bytes(b"not a sqlite database")
    fn = getattr(job_db, attr)
    # read_input_seq_regions returns None, read_metadata returns {}
    result = fn(db_path)
    assert result is None or result == {}


# --- Export formats -------------------------------------------------------

_CLUSTAL = (
    "CLUSTAL O(1.2.4) multiple sequence alignment\n"
    "\n\n"
    "BRCA1_HUMAN         MDLSALRVEE 10\n"
    "BRCA1_MOUSE         MDLSALRIEE 10\n"
    "                    *******:**\n"
    "\n"
    "BRCA1_HUMAN         VQNVINAMQK 20\n"
    "BRCA1_MOUSE         VQNVVNAMQK 20\n"
    "                    ****:*****\n"
)

_SEQ_INFO = {
    "BRCA1_HUMAN": {
        "species": "Homo sapiens",
        "embedded_variants": [
            {
                "alignment_start_pos": 8,
                "alignment_end_pos": 8,
                "seq_start_pos": 8,
                "seq_end_pos": 8,
                "variant_id": "NC_000017.11:g.43093456A>G",
                "genomic_seq_id": "NC_000017.11",
                "genomic_start_pos": 43093456,
                "genomic_end_pos": 43093456,
                "genomic_ref_seq": "A",
                "genomic_alt_seq": "G",
                "seq_substitution_type": "substitution",
                "molecular_consequences": ["missense_variant"],
                "hgvs_coding": "NM_007294.4:c.22A>G",
                "hgvs_protein": "NP_009225.1:p.Ile8Val",
                "impact": "MODERATE",
                "gene_id": "HGNC:1100",
            }
        ],
    },
    "BRCA1_MOUSE": {"species": "Mus musculus"},
}


def _make_job_db(tmp_path: Path) -> Path:
    import json

    db_path = job_db.db_path_for_job(tmp_path, "export-job")
    job_db.write_finished_job(
        db_path=db_path,
        job_id="export-job",
        seq_regions=[{"base_seq_name": "BRCA1"}],
        alignment_bytes=_CLUSTAL.encode("utf-8"),
        seq_info_bytes=json.dumps(_SEQ_INFO).encode("utf-8"),
    )
    return db_path


def test_export_bundle_json_mirrors_db(tmp_path: Path) -> None:
    import json

    bundle = json.loads(job_db.export_bundle_json(_make_job_db(tmp_path)))
    assert bundle["job_id"] == "export-job"
    assert bundle["schema_version"] == job_db.SCHEMA_VERSION
    assert bundle["input_seq_regions"] == [{"base_seq_name": "BRCA1"}]
    assert bundle["alignment"].startswith("CLUSTAL O")
    assert bundle["seq_info"] == _SEQ_INFO


def test_export_fasta_concatenates_blocks_and_drops_conservation(tmp_path: Path) -> None:
    fasta = job_db.export_fasta(_make_job_db(tmp_path))
    # Interleaved blocks are joined per sequence; counts and conservation gone.
    assert ">BRCA1_HUMAN\nMDLSALRVEEVQNVINAMQK\n" in fasta
    assert ">BRCA1_MOUSE\nMDLSALRIEEVQNVVNAMQK\n" in fasta
    assert "*" not in fasta
    assert "10" not in fasta and "20" not in fasta


def test_export_variants_csv_flattens_embedded_variants(tmp_path: Path) -> None:
    csv_text = job_db.export_variants_csv(_make_job_db(tmp_path))
    lines = [ln for ln in csv_text.splitlines() if ln.strip()]
    assert lines[0].startswith("sequence,species,alignment_start_pos")
    # Exactly one variant row (only BRCA1_HUMAN has an embedded variant).
    assert len(lines) == 2
    row = lines[1]
    assert "BRCA1_HUMAN" in row
    assert "NC_000017.11:g.43093456A>G" in row
    assert "missense_variant" in row
    assert "MODERATE" in row


def test_exports_on_empty_db_do_not_crash(tmp_path: Path) -> None:
    # A DB with no results table content still yields valid, empty-ish output.
    db_path = job_db.db_path_for_job(tmp_path, "empty-job")
    job_db.write_finished_job(
        db_path=db_path,
        job_id="empty-job",
        seq_regions=[],
        alignment_bytes=b"",
        seq_info_bytes=b"{}",
    )
    assert job_db.export_fasta(db_path) == ""
    assert job_db.export_variants_csv(db_path).startswith("sequence,")
