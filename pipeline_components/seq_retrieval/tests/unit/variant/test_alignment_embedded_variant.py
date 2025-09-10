"""
Unit testing for AlignmentEmbeddedVariant class and related functions
"""

import logging
import pytest

from variant import AlignmentEmbeddedVariant
from variant.alignment_embedded_variant import seq_to_alignment_position
from log_mgmt import get_logger, set_log_level

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


def test_seq_to_alignment_position(wb_C42D8_8a_1_yn32_seq_record) -> None:
    """
    Unit test for seq_to_alignment_position function
    """
    assert seq_to_alignment_position(wb_C42D8_8a_1_yn32_seq_record, 377) == 590


def test_end_boundary_seq_to_alignment_position(wb_C42D8_8a_1_yn29_seq_record) -> None:
    '''
    Test conversion of sequence positions that are 1 position beyond the end of the aligned sequence.
    1 position beyond the end of the aligned sequence inicates a deletion or stop codon,
    and should be considered as a valid position rather than an alignment gap that needs bridging.
    '''
    assert seq_to_alignment_position(wb_C42D8_8a_1_yn29_seq_record, 159) == 170


def test_out_of_bound_seq_to_alignment_position(wb_C42D8_8a_1_yn29_seq_record) -> None:
    """
    Test conversion of out-of-bound sequence positions (< 1 or > (seq length + 1)).
    Both should raise a ValueError
    """
    with pytest.raises(ValueError):
        seq_to_alignment_position(wb_C42D8_8a_1_yn29_seq_record, 0)
    with pytest.raises(ValueError):
        seq_to_alignment_position(wb_C42D8_8a_1_yn29_seq_record, 160)


def test_alignment_embedded_variant_initiation_with_SeqRecord(wb_variant_yn32_in_C42D8_8a_1_protein_alignment) -> None:
    """
    Test AlignmentEmbeddedVariant class initiation using SeqRecord.
    """
    assert isinstance(wb_variant_yn32_in_C42D8_8a_1_protein_alignment, AlignmentEmbeddedVariant)
    assert wb_variant_yn32_in_C42D8_8a_1_protein_alignment.alignment_start_pos == 590
    assert wb_variant_yn32_in_C42D8_8a_1_protein_alignment.alignment_end_pos == 590


def test_alignment_embedded_variant_initiation_with_positions(wb_variant_yn32_in_C42D8_8a_1_protein_seq) -> None:
    """
    Test AlignmentEmbeddedVariant class initiation using positions.
    """
    alignment_embedded_w_positions = AlignmentEmbeddedVariant(embedded_variant=wb_variant_yn32_in_C42D8_8a_1_protein_seq, alignment_start_pos=590, alignment_end_pos=590)

    assert isinstance(alignment_embedded_w_positions, AlignmentEmbeddedVariant)
    assert alignment_embedded_w_positions.alignment_start_pos == 590
    assert alignment_embedded_w_positions.alignment_end_pos == 590


def test_alignment_embedded_variant_from_dict(wb_variant_yn32_in_C42D8_8a_1_protein_alignment) -> None:
    """
    Test AlignmentEmbeddedVariant class initiation using dict as input.
    """
    alignment_embedded_from_dict = AlignmentEmbeddedVariant.from_dict({
        'variant_id': 'NC_003284.9:g.5114224C>T',
        'genomic_seq_id': 'X',
        'genomic_start_pos': 5114224,
        'genomic_end_pos': 5114224,
        'genomic_ref_seq': 'C',
        'genomic_alt_seq': 'T',
        'seq_substitution_type': 'substitution',
        'seq_start_pos': 377,
        'seq_end_pos': 377,
        'embedded_ref_seq_len': 1,
        'embedded_alt_seq_len': 1,
        'alignment_start_pos': 590,
        'alignment_end_pos': 590
    })

    assert isinstance(alignment_embedded_from_dict, AlignmentEmbeddedVariant)
    assert alignment_embedded_from_dict == wb_variant_yn32_in_C42D8_8a_1_protein_alignment


def test_alignment_embedded_variant_from_dict_initiation_errors(wb_variant_yn32) -> None:
    """
    Test AlignmentEmbeddedVariant class initiation errors when initiating from dict.
    """
    # Missing alignment_start_pos
    with pytest.raises(KeyError):
        AlignmentEmbeddedVariant.from_dict({
            'variant_id': wb_variant_yn32.variant_id,
            'genomic_seq_id': wb_variant_yn32.genomic_seq_id,
            'genomic_start_pos': wb_variant_yn32.genomic_start_pos,
            'genomic_end_pos': wb_variant_yn32.genomic_end_pos,
            'genomic_ref_seq': wb_variant_yn32.genomic_ref_seq,
            'genomic_alt_seq': wb_variant_yn32.genomic_alt_seq,
            'seq_substitution_type': wb_variant_yn32.seq_substitution_type.value,
            'seq_start_pos': 377,
            'seq_end_pos': 377,
            'alignment_end_pos': 590
        })
    # Missing alignment_end_pos
    with pytest.raises(KeyError):
        AlignmentEmbeddedVariant.from_dict({
            'variant_id': wb_variant_yn32.variant_id,
            'genomic_seq_id': wb_variant_yn32.genomic_seq_id,
            'genomic_start_pos': wb_variant_yn32.genomic_start_pos,
            'genomic_end_pos': wb_variant_yn32.genomic_end_pos,
            'genomic_ref_seq': wb_variant_yn32.genomic_ref_seq,
            'genomic_alt_seq': wb_variant_yn32.genomic_alt_seq,
            'seq_substitution_type': wb_variant_yn32.seq_substitution_type.value,
            'seq_start_pos': 377,
            'seq_end_pos': 377,
            'alignment_start_pos': 590
        })
    # Missing seq_start_pos
    with pytest.raises(KeyError):
        AlignmentEmbeddedVariant.from_dict({
            'variant_id': wb_variant_yn32.variant_id,
            'genomic_seq_id': wb_variant_yn32.genomic_seq_id,
            'genomic_start_pos': wb_variant_yn32.genomic_start_pos,
            'genomic_end_pos': wb_variant_yn32.genomic_end_pos,
            'genomic_ref_seq': wb_variant_yn32.genomic_ref_seq,
            'genomic_alt_seq': wb_variant_yn32.genomic_alt_seq,
            'seq_substitution_type': wb_variant_yn32.seq_substitution_type.value,
            'seq_end_pos': 377,
            'alignment_start_pos': 590,
            'alignment_end_pos': 590
        })
    # Missing seq_end_pos
    with pytest.raises(KeyError):
        AlignmentEmbeddedVariant.from_dict({
            'variant_id': wb_variant_yn32.variant_id,
            'genomic_seq_id': wb_variant_yn32.genomic_seq_id,
            'genomic_start_pos': wb_variant_yn32.genomic_start_pos,
            'genomic_end_pos': wb_variant_yn32.genomic_end_pos,
            'genomic_ref_seq': wb_variant_yn32.genomic_ref_seq,
            'genomic_alt_seq': wb_variant_yn32.genomic_alt_seq,
            'seq_substitution_type': wb_variant_yn32.seq_substitution_type.value,
            'seq_start_pos': 377,
            'alignment_start_pos': 590,
            'alignment_end_pos': 590
        })
    # Missing any of the variant properties (here variant_id)
    with pytest.raises(KeyError):
        AlignmentEmbeddedVariant.from_dict({
            'genomic_seq_id': wb_variant_yn32.genomic_seq_id,
            'genomic_start_pos': wb_variant_yn32.genomic_start_pos,
            'genomic_end_pos': wb_variant_yn32.genomic_end_pos,
            'genomic_ref_seq': wb_variant_yn32.genomic_ref_seq,
            'genomic_alt_seq': wb_variant_yn32.genomic_alt_seq,
            'seq_substitution_type': wb_variant_yn32.seq_substitution_type.value,
            'seq_start_pos': 377,
            'seq_end_pos': 377,
            'alignment_start_pos': 590,
            'alignment_end_pos': 590
        })
