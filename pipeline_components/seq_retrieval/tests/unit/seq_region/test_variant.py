"""
Unit testing for Variant class and related functions
"""

import json
import logging
import pytest
import responses  # requests mocking library
from typing import Any

from variant.variant import SeqSubstitutionType, Variant, variants_overlap
from log_mgmt import get_logger, set_log_level

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


def test_variant_from_id_initiation(wb_variant_yn10: Variant) -> None:
    """
    Test Variant class initiation from variant ID.
    """
    VARIANT_ID = 'NC_003284.9:g.5113285_5115215del'
    variant_data: Any
    with open(f'tests/resources/{VARIANT_ID}.json', 'r') as f:
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


def test_variant_initiation_errors() -> None:
    """
    Test Variant class initiation errors.
    """
    # start > end
    with pytest.raises(ValueError):
        Variant(variant_id='NC_003284.9:g.5109543G>A',
                seq_id='X', start=5109544, end=5109543,
                genomic_ref_seq='G', genomic_alt_seq='A')
    # No genomic_ref_seq and genomic_alt_seq
    with pytest.raises(ValueError):
        Variant(variant_id='NC_003284.9:g.5109543G>A',
                seq_id='X', start=5109543, end=5109543)
    # Empty genomic_ref_seq and genomic_alt_seq
    with pytest.raises(ValueError):
        Variant(variant_id='NC_003284.9:g.5109543G>A',
                seq_id='X', start=5109543, end=5109543,
                genomic_ref_seq='', genomic_alt_seq='')
    # Insertion with invalid positions
    with pytest.raises(ValueError):
        Variant(variant_id='NC_003284.9:g.6228001_6228002insA',
                seq_id='X', start=6228001, end=6228001,
                genomic_alt_seq='A')


def test_variant_comparison(wb_variant_yn32, wb_variant_yn30) -> None:
    """
    Test Variant class __eq__() method.
    """
    variant = Variant(variant_id='NC_003284.9:g.5114224C>T', seq_id='X', start=5114224, end=5114224,
                      genomic_ref_seq='C', genomic_alt_seq='T')
    assert wb_variant_yn32 == variant
    assert wb_variant_yn32 != wb_variant_yn30


def test_variant_overlaps(wb_variant_yn32, wb_variant_yn30, wb_variant_yn10, wb_variant_e1178) -> None:
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
    yn10_start_overlap_insertion = Variant(variant_id='insert_overlap_start_yn10', seq_id='X', start=5113285, end=5113286,
                                           genomic_ref_seq='', genomic_alt_seq='A')
    yn10_end_overlap_insertion = Variant(variant_id='insert_overlap_end_yn10', seq_id='X', start=5115214, end=5115215,
                                         genomic_ref_seq='', genomic_alt_seq='A')
    assert yn10_start_overlap_insertion.overlaps(wb_variant_yn10) is True
    assert wb_variant_yn10.overlaps(yn10_start_overlap_insertion) is True
    assert yn10_end_overlap_insertion.overlaps(wb_variant_yn10) is True
    assert wb_variant_yn10.overlaps(yn10_end_overlap_insertion) is True

    # Hypothetical insertion variants not overlapping yn10 at edges (5113285-5115215)
    yn10_start_no_overlap_insertion = Variant(variant_id='insert_no_overlap_start_yn10', seq_id='X', start=5113284, end=5113285,
                                              genomic_ref_seq='', genomic_alt_seq='A')
    yn10_end_no_overlap_insertion = Variant(variant_id='insert_no_overlap_end_yn10', seq_id='X', start=5115215, end=5115216,
                                            genomic_ref_seq='', genomic_alt_seq='A')
    assert yn10_start_no_overlap_insertion.overlaps(wb_variant_yn10) is False
    assert wb_variant_yn10.overlaps(yn10_start_no_overlap_insertion) is False
    assert yn10_end_no_overlap_insertion.overlaps(wb_variant_yn10) is False
    assert wb_variant_yn10.overlaps(yn10_end_no_overlap_insertion) is False

    # Non-overlapping insertion variant (wb_variant_e1178)
    assert wb_variant_yn10.overlaps(wb_variant_e1178) is False
    assert wb_variant_e1178.overlaps(wb_variant_yn10) is False


def test_variants_overlap(wb_variant_yn10: Variant, wb_variant_yn30: Variant, wb_variant_yn32: Variant) -> None:
    """
    Test variants_overlap() function.
    """
    assert variants_overlap(list((wb_variant_yn10, wb_variant_yn30, wb_variant_yn32))) is True
    assert variants_overlap(list((wb_variant_yn10, wb_variant_yn32))) is True
    assert variants_overlap(list((wb_variant_yn10, wb_variant_yn30))) is False
    assert variants_overlap(list((wb_variant_yn30, wb_variant_yn32))) is False
