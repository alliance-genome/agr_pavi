"""Catalog-driven Alliance API shape verification.

Walks every gene (and, where pinned, every allele) declared in
`tests/examples/catalog.json` and confirms the live Alliance response
still adapts cleanly to our normalized `GeneInfo` / `AlleleSummary`
shapes. This is the cheap-and-fast PR signal: no pipeline run, no
payload fixtures, just HTTP + shape adapters.

A failure here means either:
  - the catalog is out of date (rename / retirement), or
  - the Alliance API changed shape again (v9 -> vNext).

The first is fixed by editing `catalog.json`; the second by extending
the legacy-shape fallback in `alliance_client.adapt_*`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .alliance_client import AllianceClient, AllianceError
from .catalog import CatalogExample, CatalogGene


@dataclass
class GeneCheck:
    gene_id: str
    species: str
    ok: bool
    failures: list[str] = field(default_factory=list)
    resolved_symbol: str | None = None
    resolved_taxon: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "gene_id": self.gene_id,
            "species": self.species,
            "ok": self.ok,
            "failures": list(self.failures),
            "resolved_symbol": self.resolved_symbol,
            "resolved_taxon": self.resolved_taxon,
        }


@dataclass
class AlleleCheck:
    gene_id: str
    expected_allele_id: str
    ok: bool
    failure: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "gene_id": self.gene_id,
            "expected_allele_id": self.expected_allele_id,
            "ok": self.ok,
            "failure": self.failure,
        }


@dataclass
class ExampleCheck:
    example_id: str
    ok: bool
    genes: list[GeneCheck]
    alleles: list[AlleleCheck]

    def to_dict(self) -> dict[str, Any]:
        return {
            "example_id": self.example_id,
            "ok": self.ok,
            "genes": [g.to_dict() for g in self.genes],
            "alleles": [a.to_dict() for a in self.alleles],
        }


def verify_gene(client: AllianceClient, gene: CatalogGene) -> GeneCheck:
    failures: list[str] = []
    try:
        info = client.get_gene(gene.geneId)
    except AllianceError as e:
        return GeneCheck(
            gene_id=gene.geneId, species=gene.species, ok=False, failures=[str(e)]
        )
    except Exception as e:  # network / HTTP error
        return GeneCheck(
            gene_id=gene.geneId,
            species=gene.species,
            ok=False,
            failures=[f"{type(e).__name__}: {e}"],
        )

    if not info.symbol:
        failures.append("missing symbol")
    if not info.taxon_id:
        failures.append("missing taxon id")

    return GeneCheck(
        gene_id=gene.geneId,
        species=gene.species,
        ok=not failures,
        failures=failures,
        resolved_symbol=info.symbol,
        resolved_taxon=info.taxon_id,
    )


def verify_alleles(
    client: AllianceClient, gene: CatalogGene
) -> list[AlleleCheck]:
    expected = gene.alleleIds or []
    if not expected:
        return []
    try:
        alleles = client.list_alleles(gene.geneId)
    except Exception as e:
        return [
            AlleleCheck(
                gene_id=gene.geneId,
                expected_allele_id=aid,
                ok=False,
                failure=f"{type(e).__name__}: {e}",
            )
            for aid in expected
        ]

    by_id = {a.id: a for a in alleles}
    return [
        AlleleCheck(
            gene_id=gene.geneId,
            expected_allele_id=aid,
            ok=aid in by_id,
            failure=None if aid in by_id else "not present in allele-variant-detail response",
        )
        for aid in expected
    ]


def verify_example(
    client: AllianceClient, example: CatalogExample, *, check_alleles: bool = True
) -> ExampleCheck:
    gene_checks = [verify_gene(client, g) for g in example.genes]
    allele_checks: list[AlleleCheck] = []
    if check_alleles:
        for g in example.genes:
            allele_checks.extend(verify_alleles(client, g))
    ok = all(gc.ok for gc in gene_checks) and all(ac.ok for ac in allele_checks)
    return ExampleCheck(
        example_id=example.id,
        ok=ok,
        genes=gene_checks,
        alleles=allele_checks,
    )


def verify_catalog(
    client: AllianceClient,
    examples: list[CatalogExample],
    *,
    check_alleles: bool = True,
) -> list[ExampleCheck]:
    return [verify_example(client, ex, check_alleles=check_alleles) for ex in examples]


def format_verification_report(results: list[ExampleCheck]) -> str:
    lines: list[str] = []
    passed = sum(1 for r in results if r.ok)
    failed = len(results) - passed
    for r in results:
        icon = "✓" if r.ok else "✗"
        lines.append(f"  {icon} {r.example_id}")
        for gc in r.genes:
            gicon = "✓" if gc.ok else "✗"
            tail = f" ({gc.resolved_symbol})" if gc.resolved_symbol else ""
            lines.append(f"      {gicon} {gc.gene_id} [{gc.species}]{tail}")
            for f in gc.failures:
                lines.append(f"          ! {f}")
        for ac in r.alleles:
            aicon = "✓" if ac.ok else "✗"
            lines.append(f"      {aicon} allele {ac.expected_allele_id}")
            if ac.failure:
                lines.append(f"          ! {ac.failure}")
    summary = f"\n{passed}/{len(results)} examples verified, {failed} failed."
    return "\n".join(lines) + summary
