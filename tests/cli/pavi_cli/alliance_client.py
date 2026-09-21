"""Python port of the WebUI's Alliance v9 response adapters.

Mirrors the field-map work done in
`webui/src/app/submit/components/AlignmentEntry/serverActions.ts` and
`pipeline_components/seq_retrieval/src/variant/variant.py`. Keeping a
Python copy here lets the CLI:

  - Validate every catalog gene ID still resolves under the current
    Alliance response shape (the `verify-alliance` command).
  - Build smarter assertions against allele / variant lookups in
    later phases.
  - Detect a future API reshape (call it v10) in seconds on a PR rather
    than after a user-visible regression.

The adapters intentionally accept the legacy flat shape as a fallback
(`is_legacy_shape` checks) so a rollback wouldn't re-break the harness.
See `docs/plans/2026-05-19-alliance-v9-api-migration.md` for the
field-by-field map.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import requests

DEFAULT_BASE_URL = "https://www.alliancegenome.org"
DEFAULT_TIMEOUT_S = 15.0


class AllianceError(RuntimeError):
    pass


@dataclass(frozen=True)
class GeneInfo:
    id: str
    symbol: str
    species_short_name: str | None
    species_name: str | None
    taxon_id: str | None
    chromosome: str | None
    start: int | None
    end: int | None
    strand: str | None


@dataclass(frozen=True)
class AlleleSummary:
    id: str
    symbol: str | None
    has_disease: bool
    has_phenotype: bool
    variant_hgvs: tuple[str, ...]


@dataclass(frozen=True)
class VariantInfo:
    hgvs: str
    chromosome: str | None
    start: int | None
    end: int | None
    ref: str | None
    alt: str | None
    molecular_consequences: tuple[str, ...]
    impact: str | None
    hgvs_protein: str | None
    hgvs_coding: str | None
    gene_id: str | None


class AllianceClient:
    def __init__(self, base_url: str = DEFAULT_BASE_URL, timeout_s: float = DEFAULT_TIMEOUT_S):
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s

    # ----- gene -----

    def get_gene(self, gene_id: str) -> GeneInfo:
        response = requests.get(
            f"{self.base_url}/api/gene/{gene_id}", timeout=self.timeout_s
        )
        if response.status_code == 404:
            raise AllianceError(f"Gene {gene_id!r} not found.")
        response.raise_for_status()
        return adapt_gene_response(response.json(), gene_id)

    # ----- alleles -----

    def list_alleles(
        self,
        gene_id: str,
        *,
        categories: tuple[str, ...] = ("allele with one variant", "variant"),
        page_size: int = 1000,
        max_pages: int = 50,
    ) -> list[AlleleSummary]:
        """Return one summary per allele, deduped across all pages.

        The endpoint returns one row per (allele, variant) pair, so a
        single row-cap silently truncates the unique-allele set on
        heavily-annotated genes. We paginate until we've fetched all
        rows reported by the server's `total` and dedupe at the end.

        `max_pages` is a runaway guard; with `page_size=1000` it covers
        50,000 rows, well past anything the catalog needs today.
        """
        all_rows: list[dict[str, Any]] = []
        total: int | None = None
        for page in range(1, max_pages + 1):
            body = self._fetch_allele_page(
                gene_id, categories=categories, page=page, page_size=page_size
            )
            page_rows = body.get("results") or []
            if total is None:
                total = body.get("total")
            all_rows.extend(page_rows)
            if not page_rows or (total is not None and len(all_rows) >= total):
                break
        else:
            raise AllianceError(
                f"list_alleles({gene_id!r}) hit max_pages={max_pages} "
                f"before reaching total={total}; raise the cap or paginate smaller."
            )
        return adapt_allele_list({"results": all_rows})

    def _fetch_allele_page(
        self,
        gene_id: str,
        *,
        categories: tuple[str, ...],
        page: int,
        page_size: int,
    ) -> dict[str, Any]:
        params = {
            "filter.alleleCategory": "|".join(categories),
            "limit": str(page_size),
            "page": str(page),
        }
        url = f"{self.base_url}/api/gene/{gene_id}/allele-variant-detail"
        response = requests.get(url, params=params, timeout=self.timeout_s)
        response.raise_for_status()
        return response.json()

    # ----- variant -----

    def get_variant(self, hgvs: str) -> VariantInfo:
        response = requests.get(
            f"{self.base_url}/api/variant/{quote(hgvs, safe=':>')}",
            timeout=self.timeout_s,
        )
        if response.status_code == 404:
            raise AllianceError(f"Variant {hgvs!r} not found.")
        response.raise_for_status()
        return adapt_variant_response(response.json(), hgvs)


# --------------------------------------------------------------------------
# Adapters — pure functions, easy to unit test against captured JSON.
# --------------------------------------------------------------------------


def adapt_gene_response(body: dict[str, Any], requested_id: str) -> GeneInfo:
    """Map the new `.gene` nested shape to a flat GeneInfo."""
    # Legacy flat shape fallback.
    if body.get("id") and body.get("symbol") and body.get("species"):
        species = body.get("species") or {}
        loc = (body.get("genomeLocations") or [{}])[0]
        return GeneInfo(
            id=body["id"],
            symbol=body["symbol"],
            species_short_name=species.get("shortName"),
            species_name=species.get("name"),
            taxon_id=species.get("taxonId"),
            chromosome=loc.get("chromosome"),
            start=_as_int(loc.get("start")),
            end=_as_int(loc.get("end")),
            strand=loc.get("strand"),
        )

    g = body.get("gene")
    if not g:
        raise AllianceError(
            f"Gene response for {requested_id!r} has neither legacy nor v9 shape."
        )

    taxon = g.get("taxon") or {}
    taxon_species = taxon.get("species") or {}
    locations = g.get("geneGenomicLocationAssociations") or []
    loc = locations[0] if locations else {}
    loc_obj = loc.get("geneGenomicLocationAssociationObject") or {}

    return GeneInfo(
        id=g.get("primaryExternalId") or requested_id,
        symbol=(g.get("geneSymbol") or {}).get("displayText") or g.get("primaryExternalId") or requested_id,
        species_short_name=taxon_species.get("abbreviation"),
        species_name=taxon.get("name"),
        taxon_id=taxon.get("curie"),
        chromosome=loc_obj.get("name"),
        start=_as_int(loc.get("start")),
        end=_as_int(loc.get("end")),
        strand=loc.get("strand"),
    )


def adapt_allele_list(body: dict[str, Any]) -> list[AlleleSummary]:
    rows = body.get("results") or []
    by_id: dict[str, AlleleSummary] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        allele = row.get("allele") or {}
        allele_id = (
            allele.get("id")
            or allele.get("primaryExternalId")
            or allele.get("curie")
        )
        if not allele_id:
            continue
        symbol = _extract_allele_symbol(row)
        has_disease = bool(allele.get("hasDisease") or row.get("hasDisease"))
        has_phenotype = bool(allele.get("hasPhenotype") or row.get("hasPhenotype"))

        hgvs = _extract_variant_hgvs(row)

        prev = by_id.get(allele_id)
        if prev:
            merged_hgvs = tuple(dict.fromkeys((*prev.variant_hgvs, *( (hgvs,) if hgvs else ()))))
            by_id[allele_id] = AlleleSummary(
                id=prev.id,
                symbol=prev.symbol or symbol,
                has_disease=prev.has_disease or has_disease,
                has_phenotype=prev.has_phenotype or has_phenotype,
                variant_hgvs=merged_hgvs,
            )
        else:
            by_id[allele_id] = AlleleSummary(
                id=allele_id,
                symbol=symbol,
                has_disease=has_disease,
                has_phenotype=has_phenotype,
                variant_hgvs=(hgvs,) if hgvs else (),
            )
    return list(by_id.values())


def _extract_allele_symbol(row: dict[str, Any]) -> str | None:
    allele = row.get("allele") or {}
    allele_symbol_obj = allele.get("alleleSymbol") or {}
    return (
        allele.get("symbol")
        or allele_symbol_obj.get("displayText")
        or allele_symbol_obj.get("formatText")
        or row.get("symbol")
    )


def _extract_variant_hgvs(row: dict[str, Any]) -> str | None:
    variant = row.get("variant") or {}
    locations = variant.get("curatedVariantGenomicLocations") or []
    if locations and locations[0].get("hgvs"):
        return locations[0]["hgvs"]
    return row.get("symbol")


def adapt_variant_response(body: dict[str, Any], requested_id: str) -> VariantInfo:
    # Legacy flat shape fallback (matches the pipeline's adapter).
    if "location" in body:
        location = body.get("location") or {}
        transcript_consequences = body.get("transcriptLevelConsequence") or []
        first = transcript_consequences[0] if transcript_consequences else {}
        molecular_consequences = tuple(
            mc
            for c in transcript_consequences
            for mc in (c.get("molecularConsequences") or [])
        )
        return VariantInfo(
            hgvs=requested_id,
            chromosome=location.get("chromosome"),
            start=_as_int(location.get("start")),
            end=_as_int(location.get("end")),
            ref=body.get("genomicReferenceSequence"),
            alt=body.get("genomicVariantSequence"),
            molecular_consequences=tuple(dict.fromkeys(molecular_consequences)),
            impact=first.get("impact"),
            hgvs_protein=first.get("hgvsProteinNomenclature"),
            hgvs_coding=first.get("hgvsCodingNomenclature"),
            gene_id=(body.get("gene") or {}).get("id"),
        )

    variant_list = body.get("variantList") or []
    location: dict[str, Any] = {}
    if variant_list:
        locs = variant_list[0].get("curatedVariantGenomicLocations") or []
        if locs:
            location = locs[0] or {}

    chromosome = (
        (location.get("variantGenomicLocationAssociationObject") or {}).get("name")
    )

    predicted = location.get("predictedVariantConsequences") or []
    mcs: list[str] = []
    for pc in predicted:
        for vc in pc.get("vepConsequences") or []:
            name = vc.get("name") if isinstance(vc, dict) else vc
            if name and name not in mcs:
                mcs.append(name)

    most_severe = location.get("mostSevereConsequence") or (predicted[0] if predicted else None)
    impact = None
    hgvs_p = None
    hgvs_c = None
    if most_severe:
        hgvs_p = most_severe.get("hgvsProteinNomenclature")
        hgvs_c = most_severe.get("hgvsCodingNomenclature")
        vep_impact = most_severe.get("vepImpact")
        if isinstance(vep_impact, dict):
            impact = vep_impact.get("name")
        else:
            impact = vep_impact

    gene_ids = body.get("geneIds") or []
    return VariantInfo(
        hgvs=requested_id,
        chromosome=chromosome,
        start=_as_int(location.get("start")),
        end=_as_int(location.get("end")),
        ref=location.get("referenceSequence"),
        alt=location.get("variantSequence"),
        molecular_consequences=tuple(mcs),
        impact=impact,
        hgvs_protein=hgvs_p,
        hgvs_coding=hgvs_c,
        gene_id=gene_ids[0] if gene_ids else None,
    )


def _as_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None
