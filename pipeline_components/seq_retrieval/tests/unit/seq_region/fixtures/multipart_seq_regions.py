"""
MultipartSeqRegion fixtures for unit testing
"""

from seq_region import MultiPartSeqRegion

import pytest


@pytest.fixture
def wb_cdna_c54h2_5_1(wb_c54h2_5_1_exons) -> MultiPartSeqRegion:
    # WBGene00004788 Transcript:C54H2.5.1
    return MultiPartSeqRegion(wb_c54h2_5_1_exons)


@pytest.fixture
def wb_cds_c54h2_5_1(wb_c54h2_5_1_cds_regions) -> MultiPartSeqRegion:
    # WBGene00004788 Transcript:C54H2.5.1
    return MultiPartSeqRegion(wb_c54h2_5_1_cds_regions)


@pytest.fixture
def wb_cdna_c42d8_1_1(wb_c42d8_1_1_exons) -> MultiPartSeqRegion:
    # WB:WBGene00016599 Transcript:C42D8.1.1
    return MultiPartSeqRegion(wb_c42d8_1_1_exons)


@pytest.fixture
def wb_cds_c42d8_1_1(wb_c42d8_1_1_cds_regions) -> MultiPartSeqRegion:
    # WB:WBGene00016599 Transcript:C42D8.1.1
    return MultiPartSeqRegion(wb_c42d8_1_1_cds_regions)


@pytest.fixture
def wb_cdna_c42d8_8b_1(wb_c42d8_8b_1_exons) -> MultiPartSeqRegion:
    # WB:WBGene00000149 - Transcript:C42D8.8b.1
    return MultiPartSeqRegion(wb_c42d8_8b_1_exons)


@pytest.fixture
def wb_cds_c42d8_8b_1(wb_c42d8_8b_1_cds_regions) -> MultiPartSeqRegion:
    # WB:WBGene00000149 - Transcript:C42D8.8b.1
    return MultiPartSeqRegion(wb_c42d8_8b_1_cds_regions)


@pytest.fixture
def wb_cdna_k12g11_3_1(wb_k12g11_3_1_exons) -> MultiPartSeqRegion:
    """
    WB:WBGene00010790 (adh-1) - Transcript:K12G11.3.1
    """
    return MultiPartSeqRegion(wb_k12g11_3_1_exons)


@pytest.fixture
def wb_cds_k12g11_3_1(wb_k12g11_3_1_cds_regions) -> MultiPartSeqRegion:
    """
    WB:WBGene00010790 (adh-1) - Transcript:K12G11.3.1
    """
    return MultiPartSeqRegion(wb_k12g11_3_1_cds_regions)


@pytest.fixture
def wb_cdna_b0334_8a_1(wb_b0334_8a_1_exons) -> MultiPartSeqRegion:
    """
    WB:WBGene00000090 (age-1) - Transcript:B0334.8a.1
    """
    return MultiPartSeqRegion(wb_b0334_8a_1_exons)


@pytest.fixture
def wb_cds_b0334_8a_1(wb_b0334_8a_1_cds_regions) -> MultiPartSeqRegion:
    """
    WB:WBGene00000090 (age-1) - Transcript:B0334.8a.1
    """
    return MultiPartSeqRegion(wb_b0334_8a_1_cds_regions)


@pytest.fixture
def wb_cdna_t09A5_10_1(wb_t09A5_10_1_exons) -> MultiPartSeqRegion:
    """
    WB:WBGene00002994 (lin-5) - Transcript:t09A5_10_1
    """
    return MultiPartSeqRegion(wb_t09A5_10_1_exons)


@pytest.fixture
def wb_cds_t09A5_10_1(wb_t09A5_10_1_cds_regions) -> MultiPartSeqRegion:
    """
    WB:WBGene00002994 (lin-5) - Transcript:t09A5_10_1
    """
    return MultiPartSeqRegion(wb_t09A5_10_1_cds_regions)
