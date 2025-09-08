"""
SeqEmbeddedVariant fixtures for unit testing
"""
import pytest

from variant import SeqEmbeddedVariant, SeqEmbeddedVariantsList


@pytest.fixture
def wb_variant_yn32_in_C42D8_8a_1_coding_seq(wb_variant_yn32) -> SeqEmbeddedVariant:
    return SeqEmbeddedVariant(variant=wb_variant_yn32, seq_start_pos=1129, seq_end_pos=1129)


@pytest.fixture
def wb_variant_yn32_in_C42D8_8a_1_protein_seq(wb_variant_yn32, wb_variant_yn32_in_C42D8_8a_1_coding_seq) -> SeqEmbeddedVariant:
    (protein_start, protein_end) = wb_variant_yn32_in_C42D8_8a_1_coding_seq.translated_seq_positions(2061)
    return SeqEmbeddedVariant(variant=wb_variant_yn32, seq_start_pos=protein_start, seq_end_pos=protein_end)


@pytest.fixture
def wb_variants_yn10_yn30_in_C42D8_8a_1_list(wb_variant_yn30, wb_variant_yn10) -> SeqEmbeddedVariantsList:
    return SeqEmbeddedVariantsList([
        SeqEmbeddedVariant(variant=wb_variant_yn30, seq_start_pos=130, seq_end_pos=130),
        SeqEmbeddedVariant(variant=wb_variant_yn10, seq_start_pos=172, seq_end_pos=173)
    ])
