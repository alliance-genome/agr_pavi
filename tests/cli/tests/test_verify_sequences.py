"""Tests for UniProt FASTA parsing and the sequence-verification logic.

The verification tests use a fake UniProt client so they run offline and
deterministically — no network, no rate limits.
"""

from __future__ import annotations

from pavi_cli.catalog import CatalogExample, CatalogExpectations, CatalogGene
from pavi_cli.uniprot_client import ProteinRecord, parse_fasta
from pavi_cli.verify_sequences import (
    align_stats,
    identity_pct,
    verify_example_sequences,
)


# ---------------------------------------------------------------------------
# FASTA parsing
# ---------------------------------------------------------------------------


def test_parse_fasta_joins_wrapped_lines() -> None:
    text = ">sp|P04637|P53_HUMAN Cellular tumor antigen p53\nMEEPQSDPSV\nEPPLSQETFS\n"
    header, seq = parse_fasta(text)
    assert header.startswith("sp|P04637|P53_HUMAN")
    assert seq == "MEEPQSDPSVEPPLSQETFS"


def test_parse_fasta_stops_at_second_record() -> None:
    text = ">one\nAAAA\n>two\nCCCC\n"
    header, seq = parse_fasta(text)
    assert header == "one"
    assert seq == "AAAA"


# ---------------------------------------------------------------------------
# Identity / coverage metric
# ---------------------------------------------------------------------------


def test_identity_pct_identical() -> None:
    assert identity_pct("MKWVTFISLL", "MKWVTFISLL") == 100.0


def test_identity_pct_one_mismatch() -> None:
    assert identity_pct("MKWVTFISLL", "MKWVTFISLA") == 90.0


def test_align_stats_truncated_isoform_is_high_identity_low_coverage() -> None:
    canonical = "MKWVTFISLLFLFSSAYSRGVFRRDAHKSEVAHRFKDLGEENFKALVLIAF"
    # An exact prefix (first 25 aa) — a shorter isoform of the same protein.
    produced = canonical[:25]
    stats = align_stats(produced, canonical)
    assert stats.identity_pct == 100.0
    assert 45.0 < stats.coverage_pct < 55.0  # 25 / 50


def test_align_stats_wrong_protein_is_low_identity() -> None:
    canonical = "MKWVTFISLLFLFSSAYSRGVFRRDAHKSEVAHRFKDLGEENFKALVLIAF"
    produced = "QWERTYIPASDFGHKLCVNMQWERTYIPASDFGHKLCVNMQWERTYIPAS"
    stats = align_stats(produced, canonical)
    assert stats.identity_pct < 40.0


# ---------------------------------------------------------------------------
# verify_example_sequences (offline, fake UniProt client)
# ---------------------------------------------------------------------------


class _FakeUniProt:
    def __init__(self, by_accession: dict[str, str]):
        self._by_accession = by_accession

    def fetch_canonical(self, accession: str) -> ProteinRecord:
        seq = self._by_accession[accession]
        return ProteinRecord(accession=accession, header=accession, sequence=seq)


def _example(genes: list[CatalogGene]) -> CatalogExample:
    return CatalogExample(
        id="test-example",
        name="Test",
        category="basic",
        description="",
        genes=tuple(genes),
        expectations=CatalogExpectations(2, 0.0, 0, ()),
    )


def _aln(rows: list[tuple[str, str]]) -> bytes:
    """Build a minimal single-block CLUSTAL alignment from (id, seq) rows."""
    lines = ["CLUSTAL O(1.2.4) multiple sequence alignment", ""]
    for rid, seq in rows:
        lines.append(f"{rid}      {seq}")
    return ("\n".join(lines) + "\n").encode()


HUMAN = "MKWVTFISLLFLFSSAYSRGVFRRDAHKSEVAHRFKDLGEENFKALVLIAF"
MOUSE = "MKWVTFLSLLFLFSSAYSRGVFRREAHKSEVAHRFKDLGEEHFKALVLITF"  # a few aa diff


def test_verify_picks_correct_species_row() -> None:
    example = _example([
        CatalogGene("HGNC:1", "GENE", "Homo sapiens", uniprotAccession="P-HUMAN"),
        CatalogGene("MGI:1", "Gene", "Mus musculus", uniprotAccession="P-MOUSE"),
    ])
    alignment = _aln([("GENE_human", HUMAN), ("Gene_mouse", MOUSE)])
    client = _FakeUniProt({"P-HUMAN": HUMAN, "P-MOUSE": MOUSE})

    result = verify_example_sequences(example, alignment, client=client)  # type: ignore[arg-type]
    assert result.ok
    by_name = {g.gene_name: g for g in result.genes}
    assert by_name["GENE"].best_row == "GENE_human"
    assert by_name["GENE"].identity_pct == 100.0
    assert by_name["Gene"].best_row == "Gene_mouse"


def test_verify_skips_gene_without_accession() -> None:
    example = _example([
        CatalogGene("HGNC:1", "GENE", "Homo sapiens", uniprotAccession="P-HUMAN"),
        CatalogGene("WB:1", "worm", "Caenorhabditis elegans"),
    ])
    alignment = _aln([("GENE_human", HUMAN), ("worm_x", MOUSE)])
    client = _FakeUniProt({"P-HUMAN": HUMAN})

    result = verify_example_sequences(example, alignment, client=client)  # type: ignore[arg-type]
    skipped = [g for g in result.genes if g.skipped]
    assert len(skipped) == 1
    assert skipped[0].gene_name == "worm"
    assert result.ok  # skip does not fail the example


def test_verify_flags_wrong_protein() -> None:
    wrong = "QWERTYIPASDFGHKLCVNMQWERTYIPASDFGHKLCVNMQWERTYIPAS"
    example = _example([
        CatalogGene("HGNC:1", "GENE", "Homo sapiens", uniprotAccession="P-HUMAN"),
    ])
    alignment = _aln([("GENE_human", wrong)])
    client = _FakeUniProt({"P-HUMAN": HUMAN})

    result = verify_example_sequences(example, alignment, client=client)  # type: ignore[arg-type]
    assert not result.ok
    assert result.genes[0].identity_pct < 95.0


def test_verify_truncated_isoform_passes_identity_but_reports_coverage() -> None:
    example = _example([
        CatalogGene("HGNC:1", "GENE", "Homo sapiens", uniprotAccession="P-HUMAN"),
    ])
    # Produced protein is an exact 30-aa prefix of the 50-aa canonical.
    alignment = _aln([("GENE_human", HUMAN[:30])])
    client = _FakeUniProt({"P-HUMAN": HUMAN})

    result = verify_example_sequences(example, alignment, client=client)  # type: ignore[arg-type]
    g = result.genes[0]
    assert g.ok  # identity over overlap is 100%
    assert g.identity_pct == 100.0
    assert g.coverage_pct < 70.0
    assert g.note is not None and "partial isoform" in g.note
