"""
Parsing of the current (Alliance API v9) variant response shape.

The live API returns variant data under `variantList[].curatedVariantGenomicLocations[]`;
test_variant.py only exercised the legacy top-level `location` shape. requests.get is
mocked, so these tests run without network access.
"""

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from variant import Variant

# Trimmed from the real response for NC_003284.9:g.5114224C>T
# (https://www.alliancegenome.org/api/variant/..., fetched 2026-09-22).
V9_RESPONSE: dict[str, Any] = {
    "geneIds": ["WB:WBGene00000149"],
    "variantList": [
        {
            "curatedVariantGenomicLocations": [
                {
                    "variantGenomicLocationAssociationObject": {"name": "X"},
                    "start": 5114224,
                    "end": 5114224,
                    "referenceSequence": "C",
                    "variantSequence": "T",
                    "mostSevereConsequence": {
                        "hgvsProteinNomenclature": "WB:CE04209:p.Glu377Lys",
                        "hgvsCodingNomenclature": "WB:C42D8.8a.1:c.1129G>A",
                        "vepImpact": {"name": "MODERATE"},
                    },
                    "predictedVariantConsequences": [
                        {"vepConsequences": [{"name": "missense_variant"}]},
                        {"vepConsequences": [{"name": "missense_variant"}]},
                    ],
                }
            ]
        }
    ],
}


def _fetch(payload: dict[str, Any], variant_id: str = "NC_003284.9:g.5114224C>T") -> Variant:
    response = MagicMock()
    response.json.return_value = payload
    with patch("variant.variant.requests.get", return_value=response) as get:
        variant = Variant.from_variant_id(variant_id)
    get.assert_called_once()
    return variant


def test_parses_live_v9_response() -> None:
    variant = _fetch(V9_RESPONSE)

    assert variant.genomic_seq_id == "X"
    assert (variant.genomic_start_pos, variant.genomic_end_pos) == (5114224, 5114224)
    assert (variant.genomic_ref_seq, variant.genomic_alt_seq) == ("C", "T")
    # Consequences are aggregated across predicted consequences and deduplicated.
    assert variant.molecular_consequences == ["missense_variant"]
    assert variant.hgvs_protein == "WB:CE04209:p.Glu377Lys"
    assert variant.hgvs_coding == "WB:C42D8.8a.1:c.1129G>A"
    assert variant.impact == "MODERATE"
    assert variant.gene_id == "WB:WBGene00000149"


def test_falls_back_to_first_predicted_consequence_without_most_severe() -> None:
    location: dict[str, Any] = {
        "variantGenomicLocationAssociationObject": {"name": "3"},
        "start": 10,
        "end": 12,
        "referenceSequence": "ACG",
        "variantSequence": "",
        "predictedVariantConsequences": [
            {
                "hgvsProteinNomenclature": "p.Del",
                "hgvsCodingNomenclature": "c.Del",
                "vepImpact": "HIGH",  # plain string rather than {"name": ...}
                "vepConsequences": ["frameshift_variant", {"name": "stop_gained"}],
            },
            {"vepConsequences": [{"name": "frameshift_variant"}]},
        ],
    }
    variant = _fetch({"variantList": [{"curatedVariantGenomicLocations": [location]}]})

    assert variant.molecular_consequences == ["frameshift_variant", "stop_gained"]
    assert variant.hgvs_protein == "p.Del"
    assert variant.impact == "HIGH"
    assert variant.gene_id is None


def test_response_without_location_raises_clear_error() -> None:
    # Previously crashed inside the constructor with "'>' not supported between
    # 'NoneType' and 'NoneType'".
    with pytest.raises(ValueError, match="no genomic location for variant NC_1:g.1A>T"):
        _fetch({"variantList": []}, variant_id="NC_1:g.1A>T")
