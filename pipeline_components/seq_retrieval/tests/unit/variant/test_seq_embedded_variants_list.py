"""
Unit testing for SeqEmbeddedVariantsList class and related methods
"""
from copy import deepcopy
import logging

from log_mgmt import get_logger, set_log_level
from variant import SeqEmbeddedVariantsList

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


def test_seq_embedded_variants_list_initiation(wb_variant_yn32_in_C42D8_8a_1_seq) -> None:
    embedded_variants_list = SeqEmbeddedVariantsList([wb_variant_yn32_in_C42D8_8a_1_seq])

    assert isinstance(embedded_variants_list, SeqEmbeddedVariantsList)
    assert len(embedded_variants_list) == 1
    assert embedded_variants_list[0] == wb_variant_yn32_in_C42D8_8a_1_seq


def test_shift_rel_positions_forwards(wb_variants_yn10_yn30_in_C42D8_8a_1_list) -> None:
    list_copy = deepcopy(wb_variants_yn10_yn30_in_C42D8_8a_1_list)
    list_copy.shift_rel_positions(2)

    for key in range(len(list_copy)):
        assert list_copy[key].rel_start == wb_variants_yn10_yn30_in_C42D8_8a_1_list[key].rel_start + 2
        assert list_copy[key].rel_end == wb_variants_yn10_yn30_in_C42D8_8a_1_list[key].rel_end + 2


def test_shift_rel_positions_backwards(wb_variants_yn10_yn30_in_C42D8_8a_1_list) -> None:
    list_copy = deepcopy(wb_variants_yn10_yn30_in_C42D8_8a_1_list)
    list_copy.shift_rel_positions(-1)

    for key in range(len(list_copy)):
        assert list_copy[key].rel_start == wb_variants_yn10_yn30_in_C42D8_8a_1_list[key].rel_start - 1
        assert list_copy[key].rel_end == wb_variants_yn10_yn30_in_C42D8_8a_1_list[key].rel_end - 1


def test_trimmed_on_rel_positions_deletion_edge(wb_variants_yn10_yn30_in_C42D8_8a_1_list) -> None:
    '''
    Test trimming at the deletion's edge (should drop the deletion from the list)
    '''
    trimmed_list = SeqEmbeddedVariantsList.trimmed_on_rel_positions(wb_variants_yn10_yn30_in_C42D8_8a_1_list, 172)

    assert isinstance(trimmed_list, SeqEmbeddedVariantsList)
    assert len(trimmed_list) == 1
    assert trimmed_list[0] == wb_variants_yn10_yn30_in_C42D8_8a_1_list[0]


def test_trimmed_on_rel_positions_between_variants(wb_variants_yn10_yn30_in_C42D8_8a_1_list) -> None:
    '''
    Test trimming betweem both variants in list (should drop the last variant)
    '''
    trimmed_list = SeqEmbeddedVariantsList.trimmed_on_rel_positions(wb_variants_yn10_yn30_in_C42D8_8a_1_list, 150)

    assert isinstance(trimmed_list, SeqEmbeddedVariantsList)
    assert len(trimmed_list) == 1
    assert trimmed_list[0] == wb_variants_yn10_yn30_in_C42D8_8a_1_list[0]


def test_trimmed_on_rel_positions_last_variant_boundary(wb_variants_yn10_yn30_in_C42D8_8a_1_list) -> None:
    '''
    Test trimming right after the end of the list (should not change anything)
    '''
    trimmed_list = SeqEmbeddedVariantsList.trimmed_on_rel_positions(wb_variants_yn10_yn30_in_C42D8_8a_1_list, 173)

    assert isinstance(trimmed_list, SeqEmbeddedVariantsList)
    assert len(trimmed_list) == 2
    assert trimmed_list == wb_variants_yn10_yn30_in_C42D8_8a_1_list


def test_trimmed_on_rel_positions_outside_list_boundary(wb_variants_yn10_yn30_in_C42D8_8a_1_list) -> None:
    '''
    Test trimming beyond the end of the list (should not change anything)
    '''
    trimmed_list = SeqEmbeddedVariantsList.trimmed_on_rel_positions(wb_variants_yn10_yn30_in_C42D8_8a_1_list, 180)

    assert isinstance(trimmed_list, SeqEmbeddedVariantsList)
    assert len(trimmed_list) == 2
    assert trimmed_list == wb_variants_yn10_yn30_in_C42D8_8a_1_list

# TODO: test trim halfway through a multi-base substitution or insertion
