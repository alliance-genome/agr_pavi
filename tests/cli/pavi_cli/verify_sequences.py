"""Compare pipeline protein output against UniProt canonical sequences.

For each catalog gene that carries a `uniprotAccession`, fetch the
canonical protein and find the best-matching sequence in the produced
alignment (gaps stripped). A high identity confirms the pipeline picked
the right gene / species / isoform; a low one flags drift the internal
assertions can't see.

We match each canonical against *every* alignment row rather than by
name prefix, because genes can share a symbol across species (e.g. mouse
and rat `Sod1`) — letting the sequence itself decide which row it maps
to is both simpler and a stronger check.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from Bio.Align import PairwiseAligner

from .assertions import _parse_clustal
from .catalog import CatalogExample
from .uniprot_client import UniProtClient, UniProtError


def _build_aligner() -> PairwiseAligner:
    # Plain match/mismatch scoring (no substitution matrix) so any residue
    # alphabet works — UniProt sequences can contain U, X, B, Z, etc. that
    # BLOSUM62 doesn't cover.
    aligner = PairwiseAligner()
    aligner.mode = "global"
    aligner.match_score = 1.0
    aligner.mismatch_score = 0.0
    aligner.open_gap_score = -1.0
    aligner.extend_gap_score = -0.5
    return aligner


@dataclass(frozen=True)
class AlignStats:
    """Decomposed comparison of a produced protein against a canonical.

    `identity_pct` is measured over the *overlap* (positions aligned
    non-gap in both), so a shorter isoform whose residues exactly match
    the canonical still scores ~100% — that catches a wrong protein
    (low identity) without punishing a legitimately shorter transcript.
    `coverage_pct` is the overlap as a fraction of the canonical length,
    so a truncated isoform shows up as <100% coverage.
    """

    identity_pct: float
    coverage_pct: float
    overlap_len: int


def align_stats(
    produced: str, canonical: str, aligner: PairwiseAligner | None = None
) -> AlignStats:
    if not produced or not canonical:
        return AlignStats(0.0, 0.0, 0)
    aligner = aligner or _build_aligner()
    alignment = aligner.align(produced, canonical)[0]
    a_row, b_row = _aligned_rows(alignment)
    identical = overlap = 0
    for x, y in zip(a_row, b_row):
        if x != "-" and y != "-":
            overlap += 1
            if x == y:
                identical += 1
    identity = (identical / overlap * 100.0) if overlap else 0.0
    coverage = (overlap / len(canonical) * 100.0) if canonical else 0.0
    return AlignStats(identity, coverage, overlap)


def identity_pct(seq_a: str, seq_b: str, aligner: PairwiseAligner | None = None) -> float:
    """Identity (%) over the aligned overlap of two sequences."""
    return align_stats(seq_a, seq_b, aligner).identity_pct


def _aligned_rows(alignment: Any) -> tuple[str, str]:
    """Extract the two gapped aligned strings from a Bio.Align alignment."""
    # Alignment supports indexing to get each gapped row as a string.
    return str(alignment[0]), str(alignment[1])


@dataclass
class GeneSequenceCheck:
    gene_id: str
    gene_name: str
    species: str
    accession: str | None
    ok: bool
    skipped: bool = False
    identity_pct: float | None = None
    coverage_pct: float | None = None
    best_row: str | None = None
    pipeline_length: int | None = None
    uniprot_length: int | None = None
    note: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "gene_id": self.gene_id,
            "gene_name": self.gene_name,
            "species": self.species,
            "accession": self.accession,
            "ok": self.ok,
            "skipped": self.skipped,
            "identity_pct": (
                round(self.identity_pct, 2) if self.identity_pct is not None else None
            ),
            "coverage_pct": (
                round(self.coverage_pct, 2) if self.coverage_pct is not None else None
            ),
            "best_row": self.best_row,
            "pipeline_length": self.pipeline_length,
            "uniprot_length": self.uniprot_length,
            "note": self.note,
        }


@dataclass
class ExampleSequenceCheck:
    example_id: str
    ok: bool
    genes: list[GeneSequenceCheck] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "example_id": self.example_id,
            "ok": self.ok,
            "genes": [g.to_dict() for g in self.genes],
        }


# A candidate row must overlap at least this fraction of the canonical to
# be eligible as the "best match" — guards against a tiny fragment scoring
# a spurious 100% overlap-identity and being picked over the real row.
_MIN_COVERAGE_FOR_MATCH = 40.0


def verify_example_sequences(
    example: CatalogExample,
    alignment_bytes: bytes,
    *,
    client: UniProtClient | None = None,
    min_identity_pct: float = 95.0,
    min_coverage_pct: float = 0.0,
) -> ExampleSequenceCheck:
    client = client or UniProtClient()
    aligner = _build_aligner()

    rows = _parse_clustal(alignment_bytes)
    ungapped = [(rid, seq.replace("-", "")) for rid, seq in rows if seq.replace("-", "")]

    gene_checks: list[GeneSequenceCheck] = []
    for gene in example.genes:
        if not gene.uniprotAccession:
            gene_checks.append(
                GeneSequenceCheck(
                    gene_id=gene.geneId,
                    gene_name=gene.geneName,
                    species=gene.species,
                    accession=None,
                    ok=True,
                    skipped=True,
                    note="no uniprotAccession in catalog",
                )
            )
            continue

        try:
            canonical = client.fetch_canonical(gene.uniprotAccession)
        except (UniProtError, Exception) as e:  # noqa: BLE001 - report any fetch failure
            gene_checks.append(
                GeneSequenceCheck(
                    gene_id=gene.geneId,
                    gene_name=gene.geneName,
                    species=gene.species,
                    accession=gene.uniprotAccession,
                    ok=False,
                    note=f"{type(e).__name__}: {e}",
                )
            )
            continue

        # Score every row, then pick the best by overlap-identity — but
        # only among rows that cover enough of the canonical. Cross-species
        # rows align over the full length yet at lower identity, so the
        # right row wins on identity; a short isoform of the right gene
        # still wins because its overlap is an exact match.
        scored = [
            (rid, len(seq), align_stats(seq, canonical.sequence, aligner))
            for rid, seq in ungapped
        ]
        eligible = [s for s in scored if s[2].coverage_pct >= _MIN_COVERAGE_FOR_MATCH]
        pool = eligible or scored
        best_rid, best_len, best = max(pool, key=lambda s: s[2].identity_pct)

        failures = []
        if best.identity_pct < min_identity_pct:
            failures.append(f"identity {best.identity_pct:.1f}% < {min_identity_pct}%")
        if min_coverage_pct > 0 and best.coverage_pct < min_coverage_pct:
            failures.append(f"coverage {best.coverage_pct:.1f}% < {min_coverage_pct}%")
        # Always surface a non-fatal note when the produced protein is a
        # partial isoform, even if identity passes.
        note = "; ".join(failures) if failures else None
        if note is None and best.coverage_pct < 95.0:
            note = f"partial isoform (coverage {best.coverage_pct:.1f}%)"

        gene_checks.append(
            GeneSequenceCheck(
                gene_id=gene.geneId,
                gene_name=gene.geneName,
                species=gene.species,
                accession=gene.uniprotAccession,
                ok=not failures,
                identity_pct=best.identity_pct,
                coverage_pct=best.coverage_pct,
                best_row=best_rid,
                pipeline_length=best_len,
                uniprot_length=canonical.length,
                note=note,
            )
        )

    overall = all(g.ok for g in gene_checks)
    return ExampleSequenceCheck(example_id=example.id, ok=overall, genes=gene_checks)


def format_sequence_report(result: ExampleSequenceCheck) -> str:
    lines: list[str] = []
    icon = "✓" if result.ok else "✗"
    lines.append(f"  {icon} {result.example_id}")
    for g in result.genes:
        if g.skipped:
            lines.append(f"      – {g.gene_name} [{g.species}] — skipped ({g.note})")
            continue
        gicon = "✓" if g.ok else "✗"
        if g.identity_pct is not None:
            detail = (
                f"id={g.identity_pct:.1f}%  cov={g.coverage_pct:.0f}%"
                f"  pipeline={g.pipeline_length}aa  uniprot={g.uniprot_length}aa"
                f"  vs {g.accession}  (row {g.best_row})"
            )
        else:
            detail = g.note or "no comparison"
        lines.append(f"      {gicon} {g.gene_name} [{g.species}]  {detail}")
        if g.note and not g.ok:
            lines.append(f"          ! {g.note}")
    return "\n".join(lines)
