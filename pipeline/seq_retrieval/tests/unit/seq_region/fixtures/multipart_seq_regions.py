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
