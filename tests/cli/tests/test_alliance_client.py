"""Unit tests for the v9 Alliance response adapters.

These tests use in-line fixture JSON that mirrors the shape returned by
the live Alliance API. The intent is to lock the field map down so a
future field rename triggers an immediate red CI signal rather than a
silent regression.

Both v9 nested shapes and legacy flat shapes are exercised — the
legacy fallback exists so a rollback would not also break us.
"""

from __future__ import annotations

import pytest

from pavi_cli.alliance_client import (
    AllianceClient,
    AllianceError,
    adapt_allele_list,
    adapt_gene_response,
    adapt_variant_response,
)


# ---------------------------------------------------------------------------
# Gene
# ---------------------------------------------------------------------------


def test_adapt_gene_v9_nested_shape() -> None:
    body = {
        "gene": {
            "primaryExternalId": "HGNC:11998",
            "geneSymbol": {"displayText": "TP53"},
            "taxon": {
                "curie": "NCBITaxon:9606",
                "name": "Homo sapiens",
                "species": {"abbreviation": "Hsa"},
            },
            "geneGenomicLocationAssociations": [
                {
                    "start": "7661779",
                    "end": "7687550",
                    "strand": "-",
                    "geneGenomicLocationAssociationObject": {"name": "17"},
                }
            ],
        }
    }
    info = adapt_gene_response(body, "HGNC:11998")
    assert info.id == "HGNC:11998"
    assert info.symbol == "TP53"
    assert info.species_short_name == "Hsa"
    assert info.species_name == "Homo sapiens"
    assert info.taxon_id == "NCBITaxon:9606"
    assert info.chromosome == "17"
    assert info.start == 7661779
    assert info.end == 7687550
    assert info.strand == "-"


def test_adapt_gene_legacy_flat_shape() -> None:
    """If a rollback restores the pre-v9 shape, we should still parse it."""
    body = {
        "id": "HGNC:11998",
        "symbol": "TP53",
        "species": {
            "shortName": "Hsa",
            "name": "Homo sapiens",
            "taxonId": "NCBITaxon:9606",
        },
        "genomeLocations": [
            {"chromosome": "17", "start": 7661779, "end": 7687550, "strand": "-"}
        ],
    }
    info = adapt_gene_response(body, "HGNC:11998")
    assert info.symbol == "TP53"
    assert info.chromosome == "17"
    assert info.start == 7661779


def test_adapt_gene_missing_optional_fields_does_not_crash() -> None:
    body = {
        "gene": {
            "primaryExternalId": "ZFIN:foo",
            "geneSymbol": {"displayText": "foo"},
            "taxon": {"curie": "NCBITaxon:7955"},
            "geneGenomicLocationAssociations": [],
        }
    }
    info = adapt_gene_response(body, "ZFIN:foo")
    assert info.symbol == "foo"
    assert info.chromosome is None
    assert info.start is None


# ---------------------------------------------------------------------------
# Alleles
# ---------------------------------------------------------------------------


def test_adapt_allele_list_dedupes_by_id_and_collects_hgvs() -> None:
    body = {
        "results": [
            {
                "allele": {
                    "primaryExternalId": "MGI:1",
                    "alleleSymbol": {"displayText": "Tp53<tm1>"},
                    "hasDisease": True,
                    "hasPhenotype": False,
                },
                "variant": {
                    "curatedVariantGenomicLocations": [
                        {"hgvs": "NC_000017.11:g.7676154G>A"}
                    ]
                },
            },
            {
                "allele": {
                    "primaryExternalId": "MGI:1",
                    "hasDisease": False,
                    "hasPhenotype": True,
                },
                "variant": {
                    "curatedVariantGenomicLocations": [
                        {"hgvs": "NC_000017.11:g.7676155C>T"}
                    ]
                },
            },
        ]
    }
    alleles = adapt_allele_list(body)
    assert len(alleles) == 1
    a = alleles[0]
    assert a.id == "MGI:1"
    assert a.symbol == "Tp53<tm1>"
    assert a.has_disease is True
    assert a.has_phenotype is True
    assert a.variant_hgvs == (
        "NC_000017.11:g.7676154G>A",
        "NC_000017.11:g.7676155C>T",
    )


def test_adapt_allele_list_falls_back_to_format_text_symbol() -> None:
    body = {
        "results": [
            {
                "allele": {
                    "primaryExternalId": "MGI:2",
                    "alleleSymbol": {"formatText": "fallback"},
                }
            }
        ]
    }
    alleles = adapt_allele_list(body)
    assert alleles[0].symbol == "fallback"


def test_adapt_allele_list_drops_rows_without_id() -> None:
    body = {"results": [{"allele": {}}, "not a dict"]}
    assert adapt_allele_list(body) == []


# ---------------------------------------------------------------------------
# Variant
# ---------------------------------------------------------------------------


def test_adapt_variant_v9_shape() -> None:
    body = {
        "variantList": [
            {
                "curatedVariantGenomicLocations": [
                    {
                        "start": "7676154",
                        "end": "7676154",
                        "referenceSequence": "G",
                        "variantSequence": "A",
                        "variantGenomicLocationAssociationObject": {"name": "17"},
                        "predictedVariantConsequences": [
                            {
                                "vepConsequences": [{"name": "missense_variant"}],
                                "hgvsProteinNomenclature": "p.Arg175His",
                                "hgvsCodingNomenclature": "c.524G>A",
                                "vepImpact": {"name": "MODERATE"},
                            }
                        ],
                        "mostSevereConsequence": {
                            "hgvsProteinNomenclature": "p.Arg175His",
                            "hgvsCodingNomenclature": "c.524G>A",
                            "vepImpact": {"name": "MODERATE"},
                        },
                    }
                ]
            }
        ],
        "geneIds": ["HGNC:11998"],
    }
    v = adapt_variant_response(body, "NC_000017.11:g.7676154G>A")
    assert v.chromosome == "17"
    assert v.start == 7676154
    assert v.ref == "G"
    assert v.alt == "A"
    assert v.molecular_consequences == ("missense_variant",)
    assert v.impact == "MODERATE"
    assert v.hgvs_protein == "p.Arg175His"
    assert v.hgvs_coding == "c.524G>A"
    assert v.gene_id == "HGNC:11998"


def test_adapt_variant_legacy_flat_shape() -> None:
    body = {
        "location": {
            "chromosome": "17",
            "start": 7676154,
            "end": 7676154,
        },
        "genomicReferenceSequence": "G",
        "genomicVariantSequence": "A",
        "transcriptLevelConsequence": [
            {
                "molecularConsequences": ["missense_variant"],
                "impact": "MODERATE",
                "hgvsProteinNomenclature": "p.Arg175His",
                "hgvsCodingNomenclature": "c.524G>A",
            }
        ],
        "gene": {"id": "HGNC:11998"},
    }
    v = adapt_variant_response(body, "NC_000017.11:g.7676154G>A")
    assert v.chromosome == "17"
    assert v.molecular_consequences == ("missense_variant",)
    assert v.impact == "MODERATE"
    assert v.gene_id == "HGNC:11998"


# ---------------------------------------------------------------------------
# list_alleles pagination
# ---------------------------------------------------------------------------


def _allele_row(allele_id: str, hgvs: str) -> dict:
    return {
        "allele": {"primaryExternalId": allele_id},
        "variant": {
            "curatedVariantGenomicLocations": [{"hgvs": hgvs}],
        },
    }


def test_list_alleles_concatenates_pages() -> None:
    """Two pages, distinct alleles per page, no overlap."""
    pages = {
        1: {
            "total": 3,
            "results": [
                _allele_row("MGI:1", "NC_x:g.1A>T"),
                _allele_row("MGI:2", "NC_x:g.2A>T"),
            ],
        },
        2: {
            "total": 3,
            "results": [_allele_row("MGI:3", "NC_x:g.3A>T")],
        },
    }
    calls: list[int] = []

    def fake_fetch(self, gene_id, *, categories, page, page_size):
        calls.append(page)
        return pages[page]

    client = AllianceClient()
    client._fetch_allele_page = fake_fetch.__get__(client, AllianceClient)
    alleles = client.list_alleles("MGI:foo", page_size=2)

    assert calls == [1, 2]
    assert {a.id for a in alleles} == {"MGI:1", "MGI:2", "MGI:3"}


def test_list_alleles_dedupes_across_page_boundary() -> None:
    """Same allele appears on multiple pages with different variants — merge."""
    pages = {
        1: {
            "total": 3,
            "results": [
                _allele_row("MGI:1", "NC_x:g.1A>T"),
                _allele_row("MGI:1", "NC_x:g.2A>T"),
            ],
        },
        2: {
            "total": 3,
            "results": [_allele_row("MGI:1", "NC_x:g.3A>T")],
        },
    }

    def fake_fetch(self, gene_id, *, categories, page, page_size):
        return pages[page]

    client = AllianceClient()
    client._fetch_allele_page = fake_fetch.__get__(client, AllianceClient)
    alleles = client.list_alleles("MGI:foo", page_size=2)

    assert len(alleles) == 1
    assert alleles[0].variant_hgvs == (
        "NC_x:g.1A>T",
        "NC_x:g.2A>T",
        "NC_x:g.3A>T",
    )


def test_list_alleles_stops_on_empty_page() -> None:
    """If the server's total is missing/wrong, an empty page terminates the loop."""
    pages = {
        1: {"results": [_allele_row("MGI:1", "x")]},
        2: {"results": []},
    }

    def fake_fetch(self, gene_id, *, categories, page, page_size):
        return pages[page]

    client = AllianceClient()
    client._fetch_allele_page = fake_fetch.__get__(client, AllianceClient)
    alleles = client.list_alleles("MGI:foo", page_size=1)

    assert {a.id for a in alleles} == {"MGI:1"}


def test_list_alleles_raises_when_pages_exceed_cap() -> None:
    """Runaway server response trips the max_pages guard rather than looping forever."""
    def fake_fetch(self, gene_id, *, categories, page, page_size):
        # Always claim there's more, never converge.
        return {"total": 9999, "results": [_allele_row(f"MGI:{page}", "x")]}

    client = AllianceClient()
    client._fetch_allele_page = fake_fetch.__get__(client, AllianceClient)
    with pytest.raises(AllianceError, match="max_pages"):
        client.list_alleles("MGI:foo", page_size=1, max_pages=3)


def test_adapt_variant_dedupes_consequences() -> None:
    body = {
        "variantList": [
            {
                "curatedVariantGenomicLocations": [
                    {
                        "predictedVariantConsequences": [
                            {"vepConsequences": [{"name": "missense_variant"}]},
                            {"vepConsequences": [{"name": "missense_variant"}]},
                            {"vepConsequences": [{"name": "splice_region_variant"}]},
                        ]
                    }
                ]
            }
        ]
    }
    v = adapt_variant_response(body, "x")
    assert v.molecular_consequences == ("missense_variant", "splice_region_variant")
