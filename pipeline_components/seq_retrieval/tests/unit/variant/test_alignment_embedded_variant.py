"""
Unit testing for AlignmentEmbeddedVariant class and related functions
"""

import logging

# from variant import AlignmentEmbeddedVariant
from variant.alignment_embedded_variant import seq_to_alignment_position
from log_mgmt import get_logger, set_log_level

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


def test_seq_to_alignment_position(wb_C42D8_8a_1_yn32_seq_record) -> None:
    """
    Unit test for seq_to_alignment_position function
    """
    assert seq_to_alignment_position(wb_C42D8_8a_1_yn32_seq_record, 377) == 590
