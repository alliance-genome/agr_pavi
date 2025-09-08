"""
Unit testing for SeqEmbeddedVariant class and related functions
"""

import logging
import pytest

from log_mgmt import get_logger, set_log_level
from variant import SeqEmbeddedVariant

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


def test_seq_embedded_variant_initiation(wb_variant_yn32_in_C42D8_8a_1_coding_seq, wb_variant_yn32) -> None:
    assert isinstance(wb_variant_yn32_in_C42D8_8a_1_coding_seq, SeqEmbeddedVariant)
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.seq_start_pos == 1129
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.seq_end_pos == 1129
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.variant_id == wb_variant_yn32.variant_id


def test_seq_embedded_variant_initiation_from_dict(wb_variant_yn32_in_C42D8_8a_1_coding_seq, wb_variant_yn32) -> None:
    seq_embedded_variant = SeqEmbeddedVariant.from_dict({
        'variant_id': wb_variant_yn32.variant_id,
        'genomic_seq_id': wb_variant_yn32.genomic_seq_id,
        'genomic_start_pos': wb_variant_yn32.genomic_start_pos,
        'genomic_end_pos': wb_variant_yn32.genomic_end_pos,
        'genomic_ref_seq': wb_variant_yn32.genomic_ref_seq,
        'genomic_alt_seq': wb_variant_yn32.genomic_alt_seq,
        'seq_substitution_type': wb_variant_yn32.seq_substitution_type.value,
        'seq_start_pos': 377,
        'seq_end_pos': 377
    })

    assert isinstance(seq_embedded_variant, SeqEmbeddedVariant)
    assert seq_embedded_variant == wb_variant_yn32_in_C42D8_8a_1_coding_seq


def test_seq_embedded_variant_from_dict_initiation_errors(wb_variant_yn32) -> None:
    """
    Test SeqEmbeddedVariant class initiation errors when initiating from dict.
    """
    # Missing seq_start_pos
    with pytest.raises(KeyError):
        SeqEmbeddedVariant.from_dict({
            'variant_id': wb_variant_yn32.variant_id,
            'genomic_seq_id': wb_variant_yn32.genomic_seq_id,
            'genomic_start_pos': wb_variant_yn32.genomic_start_pos,
            'genomic_end_pos': wb_variant_yn32.genomic_end_pos,
            'genomic_ref_seq': wb_variant_yn32.genomic_ref_seq,
            'genomic_alt_seq': wb_variant_yn32.genomic_alt_seq,
            'seq_substitution_type': wb_variant_yn32.seq_substitution_type.value,
            'seq_end_pos': 377
        })
    # Missing seq_end_pos
    with pytest.raises(KeyError):
        SeqEmbeddedVariant.from_dict({
            'variant_id': wb_variant_yn32.variant_id,
            'genomic_seq_id': wb_variant_yn32.genomic_seq_id,
            'genomic_start_pos': wb_variant_yn32.genomic_start_pos,
            'genomic_end_pos': wb_variant_yn32.genomic_end_pos,
            'genomic_ref_seq': wb_variant_yn32.genomic_ref_seq,
            'genomic_alt_seq': wb_variant_yn32.genomic_alt_seq,
            'seq_substitution_type': wb_variant_yn32.seq_substitution_type.value,
            'seq_start_pos': 377,
        })
    # Missing any of the variant properties (here variant_id)
    with pytest.raises(KeyError):
        SeqEmbeddedVariant.from_dict({
            'genomic_seq_id': wb_variant_yn32.genomic_seq_id,
            'genomic_start_pos': wb_variant_yn32.genomic_start_pos,
            'genomic_end_pos': wb_variant_yn32.genomic_end_pos,
            'genomic_ref_seq': wb_variant_yn32.genomic_ref_seq,
            'genomic_alt_seq': wb_variant_yn32.genomic_alt_seq,
            'seq_substitution_type': wb_variant_yn32.seq_substitution_type.value,
            'seq_start_pos': 377,
            'seq_end_pos': 377,
        })


def test_translated_seq_positions(wb_variant_yn32_in_C42D8_8a_1_coding_seq) -> None:
    """
    Test the SeqEmbeddedVariant.translated_seq_positions() method
    """
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.seq_start_pos == 1129
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.seq_end_pos == 1129
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.translated_seq_positions() == (377, 377)
