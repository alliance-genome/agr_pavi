"""Read the shared `tests/examples/catalog.json`."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

# Resolve catalog path relative to this file so the CLI works regardless of
# the cwd it is invoked from. `tests/cli/pavi_cli/catalog.py` ->
# `tests/examples/catalog.json` is two `parents` up + `examples`.
CATALOG_PATH = Path(__file__).resolve().parents[2] / "examples" / "catalog.json"


@dataclass(frozen=True)
class CatalogGene:
    geneId: str
    geneName: str
    species: str
    alleleIds: tuple[str, ...] = ()
    uniprotAccession: str | None = None


@dataclass(frozen=True)
class CatalogExpectations:
    minSequenceCount: int
    minMaxPairwiseIdentityPct: float
    minEmbeddedVariantsTotal: int
    expectedConsequenceCategories: tuple[str, ...]


@dataclass(frozen=True)
class CatalogExample:
    id: str
    name: str
    category: str
    description: str
    genes: tuple[CatalogGene, ...]
    expectations: CatalogExpectations


def load_catalog(path: Path = CATALOG_PATH) -> tuple[CatalogExample, ...]:
    raw = json.loads(path.read_text())
    return tuple(_to_example(item) for item in raw["examples"])


def _to_example(item: dict) -> CatalogExample:
    return CatalogExample(
        id=item["id"],
        name=item["name"],
        category=item["category"],
        description=item["description"],
        genes=tuple(
            CatalogGene(
                geneId=g["geneId"],
                geneName=g["geneName"],
                species=g["species"],
                alleleIds=tuple(g.get("alleleIds") or ()),
                uniprotAccession=g.get("uniprotAccession"),
            )
            for g in item["genes"]
        ),
        expectations=CatalogExpectations(
            minSequenceCount=int(item["expectations"]["minSequenceCount"]),
            minMaxPairwiseIdentityPct=float(item["expectations"]["minMaxPairwiseIdentityPct"]),
            minEmbeddedVariantsTotal=int(item["expectations"]["minEmbeddedVariantsTotal"]),
            expectedConsequenceCategories=tuple(item["expectations"]["expectedConsequenceCategories"]),
        ),
    )


def find_example(examples: Iterable[CatalogExample], example_id: str) -> CatalogExample | None:
    for ex in examples:
        if ex.id == example_id:
            return ex
    return None
