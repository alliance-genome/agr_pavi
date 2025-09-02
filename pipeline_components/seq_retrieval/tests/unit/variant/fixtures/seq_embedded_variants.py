"""
SeqEmbeddedVariant fixtures for unit testing
"""
import pytest

from variant import SeqEmbeddedVariant, SeqEmbeddedVariantsList


@pytest.fixture
def wb_variant_yn32_in_C42D8_8a_1_seq(wb_variant_yn32) -> SeqEmbeddedVariant:
    return SeqEmbeddedVariant(variant=wb_variant_yn32, rel_start=377, rel_end=377)


@pytest.fixture
def wb_variants_yn10_yn30_in_C42D8_8a_1_list(wb_variant_yn30, wb_variant_yn10) -> SeqEmbeddedVariantsList:
    return SeqEmbeddedVariantsList([
        SeqEmbeddedVariant(variant=wb_variant_yn30, rel_start=130, rel_end=130),
        SeqEmbeddedVariant(variant=wb_variant_yn10, rel_start=172, rel_end=173)
    ])
