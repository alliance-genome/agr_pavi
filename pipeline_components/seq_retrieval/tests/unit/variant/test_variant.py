"""
Unit testing for Variant class and related functions
"""

import json
import logging
import pytest
import responses  # requests mocking library
from typing import Any

from variant import SeqSubstitutionType, Variant, variants_overlap
from log_mgmt import get_logger, set_log_level

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


@responses.activate
def test_variant_from_id_initiation(wb_variant_yn10: Variant) -> None:
    """
    Test Variant class initiation from variant ID.
    """
    VARIANT_ID = "NC_003284.9:g.5113285_5115215del"
    variant_data: Any
    with open(f"tests/resources/{VARIANT_ID}.json", "r") as f:
        variant_data = json.load(f)

    responses.add(
        responses.GET,
        f"https://www.alliancegenome.org/api/variant/{VARIANT_ID}",
        json=variant_data,
        status=200,
    )

    # NC_003284.9:g.5113285_5115215del - yn10
    variant = Variant.from_variant_id(VARIANT_ID)
    assert isinstance(variant, Variant)
    assert variant == wb_variant_yn10


def test_variant_seq_substitution_type_deletion(wb_variant_kx29) -> None:
    """Test seq_substitution_type calculation for deletion variant."""
    assert isinstance(wb_variant_kx29, Variant)
    assert wb_variant_kx29.seq_substitution_type == SeqSubstitutionType.DELETION


def test_variant_seq_substitution_type_insertion(wb_variant_ce338) -> None:
    """Test seq_substitution_type calculation for insertion variant."""
    assert isinstance(wb_variant_ce338, Variant)
    assert wb_variant_ce338.seq_substitution_type == SeqSubstitutionType.INSERTION


def test_variant_seq_substitution_type_substitution(wb_variant_gk787530) -> None:
    """Test seq_substitution_type calculation for substitution variant."""
    assert isinstance(wb_variant_gk787530, Variant)
    assert wb_variant_gk787530.seq_substitution_type == SeqSubstitutionType.SUBSTITUTION


def test_variant_seq_substitution_type_indel(wb_variant_n1913) -> None:
    """Test seq_substitution_type calculation for indel variant."""
    assert isinstance(wb_variant_n1913, Variant)
    assert wb_variant_n1913.seq_substitution_type == SeqSubstitutionType.INDEL


def test_subsitution_variant_from_dict_initiation() -> None:
    """
    Test Variant class initiation from dict for substitution.
    """
    variant = Variant(
        variant_id="NC_003284.9:g.5114224C>T",
        seq_id="X",
        start=5114224,
        end=5114224,
        genomic_ref_seq="C",
        genomic_alt_seq="T",
    )
    variant_from_dict = Variant.from_dict(
        {
            "variant_id": "NC_003284.9:g.5114224C>T",
            "genomic_seq_id": "X",
            "genomic_start_pos": 5114224,
            "genomic_end_pos": 5114224,
            "genomic_ref_seq": "C",
            "genomic_alt_seq": "T",
        }
    )

    assert variant == variant_from_dict


def test_deletion_variant_from_dict_initiation() -> None:
    """
    Test Variant class initiation from dict for deletion.
    """
    variant = Variant(
        variant_id="NC_003284.9:g.5114224delC",
        seq_id="X",
        start=5114224,
        end=5114224,
        genomic_ref_seq="C",
        genomic_alt_seq="",
    )
    variant_from_dict = Variant.from_dict(
        {
            "variant_id": "NC_003284.9:g.5114224delC",
            "genomic_seq_id": "X",
            "genomic_start_pos": 5114224,
            "genomic_end_pos": 5114224,
            "genomic_ref_seq": "C",
        }
    )

    assert variant == variant_from_dict


def test_insertion_variant_from_dict_initiation() -> None:
    """
    Test Variant class initiation from dict for insertion.
    """
    variant = Variant(
        variant_id="NC_003284.9:g.5114224InsT",
        seq_id="X",
        start=5114224,
        end=5114225,
        genomic_ref_seq="",
        genomic_alt_seq="T",
    )
    variant_from_dict = Variant.from_dict(
        {
            "variant_id": "NC_003284.9:g.5114224InsT",
            "genomic_seq_id": "X",
            "genomic_start_pos": 5114224,
            "genomic_end_pos": 5114225,
            "genomic_alt_seq": "T",
        }
    )

    assert variant == variant_from_dict


def test_variant_from_dict_initiation_errors() -> None:
    """
    Test Variant class initiation errors when initiating from dict.
    """
    # Missing variant_id
    with pytest.raises(KeyError):
        Variant.from_dict(
            {
                "genomic_seq_id": "X",
                "genomic_start_pos": 5114224,
                "genomic_end_pos": 5114224,
                "genomic_ref_seq": "C",
                "genomic_alt_seq": "T",
            }
        )
    # Missing genomic_seq_id
    with pytest.raises(KeyError):
        Variant.from_dict(
            {
                "variant_id": "NC_003284.9:g.5114224C>T",
                "genomic_start_pos": 5114224,
                "genomic_end_pos": 5114224,
                "genomic_ref_seq": "C",
                "genomic_alt_seq": "T",
            }
        )
    # Missing genomic_start_pos
    with pytest.raises(KeyError):
        Variant.from_dict(
            {
                "variant_id": "NC_003284.9:g.5114224C>T",
                "genomic_seq_id": "X",
                "genomic_end_pos": 5114224,
                "genomic_ref_seq": "C",
                "genomic_alt_seq": "T",
            }
        )
    # Missing genomic_end_pos
    with pytest.raises(KeyError):
        Variant.from_dict(
            {
                "variant_id": "NC_003284.9:g.5114224C>T",
                "genomic_seq_id": "X",
                "genomic_start_pos": 5114224,
                "genomic_ref_seq": "C",
                "genomic_alt_seq": "T",
            }
        )


def test_variant_initiation_errors() -> None:
    """
    Test Variant class initiation errors.
    """
    # start > end
    with pytest.raises(ValueError):
        Variant(
            variant_id="NC_003284.9:g.5109543G>A",
            seq_id="X",
            start=5109544,
            end=5109543,
            genomic_ref_seq="G",
            genomic_alt_seq="A",
        )
    # No genomic_ref_seq and genomic_alt_seq
    with pytest.raises(ValueError):
        Variant(
            variant_id="NC_003284.9:g.5109543G>A",
            seq_id="X",
            start=5109543,
            end=5109543,
        )
    # Empty genomic_ref_seq and genomic_alt_seq
    with pytest.raises(ValueError):
        Variant(
            variant_id="NC_003284.9:g.5109543G>A",
            seq_id="X",
            start=5109543,
            end=5109543,
            genomic_ref_seq="",
            genomic_alt_seq="",
        )
    # Insertion with invalid positions
    with pytest.raises(ValueError):
        Variant(
            variant_id="NC_003284.9:g.6228001_6228002insA",
            seq_id="X",
            start=6228001,
            end=6228001,
            genomic_alt_seq="A",
        )


def test_variant_comparison(wb_variant_yn32, wb_variant_yn30) -> None:
    """
    Test Variant class __eq__() method.
    """
    variant = Variant(
        variant_id="NC_003284.9:g.5114224C>T",
        seq_id="X",
        start=5114224,
        end=5114224,
        genomic_ref_seq="C",
        genomic_alt_seq="T",
    )
    assert wb_variant_yn32 == variant
    assert wb_variant_yn32 != wb_variant_yn30


def test_affects_protein_sequence() -> None:
    """
    Test Variant.affects_protein_sequence() method.
    """
    # Variant with no molecular consequences (conservative: affects protein)
    variant_no_consequences = Variant(
        variant_id="test_variant",
        seq_id="X",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
    )
    assert variant_no_consequences.affects_protein_sequence() is True

    # UTR variant (does not affect protein)
    variant_utr = Variant(
        variant_id="test_utr_variant",
        seq_id="X",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        molecular_consequences=["3_prime_UTR_variant"],
    )
    assert variant_utr.affects_protein_sequence() is False

    # 5' UTR variant (does not affect protein)
    variant_5utr = Variant(
        variant_id="test_5utr_variant",
        seq_id="X",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        molecular_consequences=["5_prime_UTR_variant"],
    )
    assert variant_5utr.affects_protein_sequence() is False

    # Intron variant (does not affect protein)
    variant_intron = Variant(
        variant_id="test_intron_variant",
        seq_id="X",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        molecular_consequences=["intron_variant"],
    )
    assert variant_intron.affects_protein_sequence() is False

    # Missense variant (affects protein)
    variant_missense = Variant(
        variant_id="test_missense_variant",
        seq_id="X",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        molecular_consequences=["missense_variant"],
    )
    assert variant_missense.affects_protein_sequence() is True

    # Frameshift variant (affects protein)
    variant_frameshift = Variant(
        variant_id="test_frameshift_variant",
        seq_id="X",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        molecular_consequences=["frameshift_variant"],
    )
    assert variant_frameshift.affects_protein_sequence() is True

    # Mixed consequences with coding effect (affects protein)
    variant_mixed_coding = Variant(
        variant_id="test_mixed_variant",
        seq_id="X",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        molecular_consequences=["intron_variant", "splice_donor_variant"],
    )
    assert variant_mixed_coding.affects_protein_sequence() is True

    # Multiple non-coding consequences (does not affect protein)
    variant_all_noncoding = Variant(
        variant_id="test_noncoding_variant",
        seq_id="X",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        molecular_consequences=["intron_variant", "upstream_gene_variant"],
    )
    assert variant_all_noncoding.affects_protein_sequence() is False


def test_variant_overlaps(
    wb_variant_yn32, wb_variant_yn30, wb_variant_yn10, wb_variant_e1178
) -> None:
    """
    Test Variant.overlaps() method.
    """
    # Non-overlapping variants
    assert wb_variant_yn32.overlaps(wb_variant_yn30) is False
    assert wb_variant_yn30.overlaps(wb_variant_yn32) is False
    # Overlapping variants
    assert wb_variant_yn32.overlaps(wb_variant_yn10) is True
    assert wb_variant_yn10.overlaps(wb_variant_yn32) is True
    # Non-overlapping variants
    assert wb_variant_yn30.overlaps(wb_variant_yn10) is False
    assert wb_variant_yn10.overlaps(wb_variant_yn30) is False

    # Hypothetical insertion variants overlapping yn10 (5113285-5115215)
    yn10_start_overlap_insertion = Variant(
        variant_id="insert_overlap_start_yn10",
        seq_id="X",
        start=5113285,
        end=5113286,
        genomic_ref_seq="",
        genomic_alt_seq="A",
    )
    yn10_end_overlap_insertion = Variant(
        variant_id="insert_overlap_end_yn10",
        seq_id="X",
        start=5115214,
        end=5115215,
        genomic_ref_seq="",
        genomic_alt_seq="A",
    )
    assert yn10_start_overlap_insertion.overlaps(wb_variant_yn10) is True
    assert wb_variant_yn10.overlaps(yn10_start_overlap_insertion) is True
    assert yn10_end_overlap_insertion.overlaps(wb_variant_yn10) is True
    assert wb_variant_yn10.overlaps(yn10_end_overlap_insertion) is True

    # Hypothetical insertion variants not overlapping yn10 at edges (5113285-5115215)
    yn10_start_no_overlap_insertion = Variant(
        variant_id="insert_no_overlap_start_yn10",
        seq_id="X",
        start=5113284,
        end=5113285,
        genomic_ref_seq="",
        genomic_alt_seq="A",
    )
    yn10_end_no_overlap_insertion = Variant(
        variant_id="insert_no_overlap_end_yn10",
        seq_id="X",
        start=5115215,
        end=5115216,
        genomic_ref_seq="",
        genomic_alt_seq="A",
    )
    assert yn10_start_no_overlap_insertion.overlaps(wb_variant_yn10) is False
    assert wb_variant_yn10.overlaps(yn10_start_no_overlap_insertion) is False
    assert yn10_end_no_overlap_insertion.overlaps(wb_variant_yn10) is False
    assert wb_variant_yn10.overlaps(yn10_end_no_overlap_insertion) is False

    # Non-overlapping insertion variant (wb_variant_e1178)
    assert wb_variant_yn10.overlaps(wb_variant_e1178) is False
    assert wb_variant_e1178.overlaps(wb_variant_yn10) is False


def test_variant_stores_hgvs_and_impact():
    v = Variant(
        variant_id="test:123",
        seq_id="chr1",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        molecular_consequences=["missense_variant"],
        hgvs_protein="NP_000316.2:p.Leu278Ser",
        hgvs_coding="NM_000325.6:c.833T>C",
        impact="MODERATE"
    )
    assert v.hgvs_protein == "NP_000316.2:p.Leu278Ser"
    assert v.hgvs_coding == "NM_000325.6:c.833T>C"
    assert v.impact == "MODERATE"


def test_variant_hgvs_defaults_to_none():
    v = Variant(
        variant_id="test:456",
        seq_id="chr1",
        start=200,
        end=200,
        genomic_ref_seq="C",
        genomic_alt_seq="G",
    )
    assert v.hgvs_protein is None
    assert v.hgvs_coding is None
    assert v.impact is None


def test_variant_stores_gene_id():
    v = Variant(
        variant_id="test:789",
        seq_id="chr1",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        gene_id="MGI:98297"
    )
    assert v.gene_id == "MGI:98297"


def test_variants_overlap(
    wb_variant_yn10: Variant, wb_variant_yn30: Variant, wb_variant_yn32: Variant
) -> None:
    """
    Test variants_overlap() function.
    """
    assert (
        variants_overlap(list((wb_variant_yn10, wb_variant_yn30, wb_variant_yn32)))
        is True
    )
    assert variants_overlap(list((wb_variant_yn10, wb_variant_yn32))) is True
    assert variants_overlap(list((wb_variant_yn10, wb_variant_yn30))) is False
    assert variants_overlap(list((wb_variant_yn30, wb_variant_yn32))) is False
