"""
AlignmentEmbeddedVariant fixtures for unit testing
"""
import pytest

from variant import AlignmentEmbeddedVariant


@pytest.fixture
def wb_variant_yn32_in_C42D8_8a_1_alignment(wb_C42D8_8a_1_yn32_seq_record, wb_variant_yn32_in_C42D8_8a_1_seq) -> AlignmentEmbeddedVariant:
    return AlignmentEmbeddedVariant(embedded_variant=wb_variant_yn32_in_C42D8_8a_1_seq, alignment_record=wb_C42D8_8a_1_yn32_seq_record)
