"""
SeqEmbeddedVariant fixtures for unit testing
"""
import pytest

from variant import SeqEmbeddedVariant, SeqEmbeddedVariantsList


@pytest.fixture
def wb_variant_yn32_in_C42D8_8a_1_coding_seq(wb_variant_yn32) -> SeqEmbeddedVariant:
    return SeqEmbeddedVariant(variant=wb_variant_yn32, seq_start_pos=1129, seq_end_pos=1129,
                              embedded_ref_seq_len=1, embedded_alt_seq_len=1)


@pytest.fixture
def wb_variant_yn32_in_C42D8_8a_1_protein_seq(wb_variant_yn32_in_C42D8_8a_1_coding_seq) -> SeqEmbeddedVariant:
    translated_embedded_variant: SeqEmbeddedVariant = wb_variant_yn32_in_C42D8_8a_1_coding_seq.to_translated(2061)
    return translated_embedded_variant


@pytest.fixture
def wb_variants_yn10_yn30_in_C42D8_8a_1_list(wb_variant_yn30, wb_variant_yn10) -> SeqEmbeddedVariantsList:
    return SeqEmbeddedVariantsList([
        SeqEmbeddedVariant(variant=wb_variant_yn30, seq_start_pos=130, seq_end_pos=130, embedded_ref_seq_len=1, embedded_alt_seq_len=1),
        SeqEmbeddedVariant(variant=wb_variant_yn10, seq_start_pos=172, seq_end_pos=173, embedded_ref_seq_len=1358, embedded_alt_seq_len=0)
    ])
