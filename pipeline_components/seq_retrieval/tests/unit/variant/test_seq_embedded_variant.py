"""
Unit testing for SeqEmbeddedVariant class and related functions
"""

import logging
import pytest

from log_mgmt import get_logger, set_log_level
from variant import SeqEmbeddedVariant, Variant

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


def test_translated_seq_positions_substitution(wb_variant_yn32_in_C42D8_8a_1_coding_seq) -> None:
    """
    Test the SeqEmbeddedVariant.translated_seq_positions() method
    """
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.seq_start_pos == 1129
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.seq_end_pos == 1129
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.translated_seq_positions(2061) == (377, 377)


def test_translated_seq_positions_between_codon_insertion() -> None:
    """
    Test the SeqEmbeddedVariant.translated_seq_positions() method on insertions between codons.
    Translated seq positions should indicate the affected amino acid position(s) (insertion site)
     + flanking amino acids on both sides where only complete in-frame codons are inserted (for insertions of >= 3 bps)
    """
    one_bp_between_codon_insertion_variant = Variant('test-1bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='G')
    one_bp_between_codon_insertion = SeqEmbeddedVariant(variant=one_bp_between_codon_insertion_variant, seq_start_pos=3, seq_end_pos=5)

    assert one_bp_between_codon_insertion.translated_seq_positions(2061) == (2, 2)

    two_bp_between_codon_insertion_variant = Variant('test-2bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='GG')
    two_bp_between_codon_insertion = SeqEmbeddedVariant(variant=two_bp_between_codon_insertion_variant, seq_start_pos=3, seq_end_pos=6)

    assert two_bp_between_codon_insertion.translated_seq_positions(2061) == (2, 2)

    three_bp_between_codon_insertion_variant = Variant('test-3bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='GGG')
    three_bp_between_codon_insertion = SeqEmbeddedVariant(variant=three_bp_between_codon_insertion_variant, seq_start_pos=3, seq_end_pos=7)

    assert three_bp_between_codon_insertion.translated_seq_positions(2061) == (1, 3)

    four_bp_between_codon_insertion_variant = Variant('test-4bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='GGGG')
    four_bp_between_codon_insertion = SeqEmbeddedVariant(variant=four_bp_between_codon_insertion_variant, seq_start_pos=3, seq_end_pos=8)

    assert four_bp_between_codon_insertion.translated_seq_positions(2061) == (2, 3)

    five_bp_between_codon_insertion_variant = Variant('test-5bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='GGGGG')
    five_bp_between_codon_insertion = SeqEmbeddedVariant(variant=five_bp_between_codon_insertion_variant, seq_start_pos=3, seq_end_pos=9)

    assert five_bp_between_codon_insertion.translated_seq_positions(2061) == (2, 3)

    six_bp_between_codon_insertion_variant = Variant('test-6bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='GGGGGG')
    six_bp_between_codon_insertion = SeqEmbeddedVariant(variant=six_bp_between_codon_insertion_variant, seq_start_pos=3, seq_end_pos=10)

    assert six_bp_between_codon_insertion.translated_seq_positions(2061) == (1, 4)


def test_translated_seq_positions_one_bp_in_codon_insertion() -> None:
    """
    Test the SeqEmbeddedVariant.translated_seq_positions() method on insertions starting after one bp within a codon.
    Translated seq positions should indicate the affected amino acid position(s) only (insertion site)
    """
    one_bp_insertion_variant = Variant('test-1bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='G')
    one_bp_insertion = SeqEmbeddedVariant(variant=one_bp_insertion_variant, seq_start_pos=4, seq_end_pos=6)

    assert one_bp_insertion.translated_seq_positions(2061) == (2, 2)

    two_bp_insertion_variant = Variant('test-2bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GG')
    two_bp_insertion = SeqEmbeddedVariant(variant=two_bp_insertion_variant, seq_start_pos=4, seq_end_pos=7)

    assert two_bp_insertion.translated_seq_positions(2061) == (2, 2)

    three_bp_insertion_variant = Variant('test-3bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGG')
    three_bp_insertion = SeqEmbeddedVariant(variant=three_bp_insertion_variant, seq_start_pos=4, seq_end_pos=8)

    assert three_bp_insertion.translated_seq_positions(2061) == (2, 3)

    four_bp_insertion_variant = Variant('test-4bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGGG')
    four_bp_insertion = SeqEmbeddedVariant(variant=four_bp_insertion_variant, seq_start_pos=4, seq_end_pos=9)

    assert four_bp_insertion.translated_seq_positions(2061) == (2, 3)

    five_bp_insertion_variant = Variant('test-5bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGGGG')
    five_bp_insertion = SeqEmbeddedVariant(variant=five_bp_insertion_variant, seq_start_pos=4, seq_end_pos=10)

    assert five_bp_insertion.translated_seq_positions(2061) == (2, 3)

    six_bp_insertion_variant = Variant('test-6bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGGGGG')
    six_bp_insertion = SeqEmbeddedVariant(variant=six_bp_insertion_variant, seq_start_pos=4, seq_end_pos=11)

    assert six_bp_insertion.translated_seq_positions(2061) == (2, 4)

    seven_bp_insertion_variant = Variant('test-7bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGGGGGG')
    seven_bp_insertion = SeqEmbeddedVariant(variant=seven_bp_insertion_variant, seq_start_pos=4, seq_end_pos=12)

    assert seven_bp_insertion.translated_seq_positions(2061) == (2, 4)

    eight_bp_insertion_variant = Variant('test-8bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGGGGGGG')
    eight_bp_insertion = SeqEmbeddedVariant(variant=eight_bp_insertion_variant, seq_start_pos=4, seq_end_pos=13)

    assert eight_bp_insertion.translated_seq_positions(2061) == (2, 4)


def test_translated_seq_positions_two_bp_in_codon_insertion() -> None:
    """
    Test the SeqEmbeddedVariant.translated_seq_positions() method on insertions starting after two bp into a codon.
    Translated seq positions should indicate the affected amino acid position(s) only (insertion site)
    """
    one_bp_insertion_variant = Variant('test-1bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='G')
    one_bp_insertion = SeqEmbeddedVariant(variant=one_bp_insertion_variant, seq_start_pos=5, seq_end_pos=7)

    assert one_bp_insertion.translated_seq_positions(2061) == (2, 2)

    two_bp_insertion_variant = Variant('test-2bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GG')
    two_bp_insertion = SeqEmbeddedVariant(variant=two_bp_insertion_variant, seq_start_pos=5, seq_end_pos=8)

    assert two_bp_insertion.translated_seq_positions(2061) == (2, 3)

    three_bp_insertion_variant = Variant('test-3bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGG')
    three_bp_insertion = SeqEmbeddedVariant(variant=three_bp_insertion_variant, seq_start_pos=5, seq_end_pos=9)

    assert three_bp_insertion.translated_seq_positions(2061) == (2, 3)

    four_bp_insertion_variant = Variant('test-4bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGGG')
    four_bp_insertion = SeqEmbeddedVariant(variant=four_bp_insertion_variant, seq_start_pos=5, seq_end_pos=10)

    assert four_bp_insertion.translated_seq_positions(2061) == (2, 3)

    five_bp_insertion_variant = Variant('test-5bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGGGG')
    five_bp_insertion = SeqEmbeddedVariant(variant=five_bp_insertion_variant, seq_start_pos=5, seq_end_pos=11)

    assert five_bp_insertion.translated_seq_positions(2061) == (2, 4)

    six_bp_insertion_variant = Variant('test-6bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGGGGG')
    six_bp_insertion = SeqEmbeddedVariant(variant=six_bp_insertion_variant, seq_start_pos=5, seq_end_pos=12)

    assert six_bp_insertion.translated_seq_positions(2061) == (2, 4)

    seven_bp_insertion_variant = Variant('test-7bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGGGGGG')
    seven_bp_insertion = SeqEmbeddedVariant(variant=seven_bp_insertion_variant, seq_start_pos=5, seq_end_pos=13)

    assert seven_bp_insertion.translated_seq_positions(2061) == (2, 4)

    eight_bp_insertion_variant = Variant('test-8bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGGGGGGG')
    eight_bp_insertion = SeqEmbeddedVariant(variant=eight_bp_insertion_variant, seq_start_pos=5, seq_end_pos=14)

    assert eight_bp_insertion.translated_seq_positions(2061) == (2, 5)


# TODO: test variant position conversion for deletions.
# Currently causing problems: WB yn10.
def test_translated_seq_positions_complete_inframe_codon_deletion() -> None:
    """
    Test the SeqEmbeddedVariant.translated_seq_positions() method on deletions of complete codons.
    Translated seq positions should indicate the flanking AAs on both sides of the deletion,
    as in-frame complete codon deletions cannot be visualised otherwise.
    """
    one_codon_deletion_variant = Variant('test-one-codon-deletion', 'X', 5116859, 5116861, genomic_ref_seq='CGT')
    one_codon_deletion = SeqEmbeddedVariant(variant=one_codon_deletion_variant, seq_start_pos=3, seq_end_pos=4)

    assert one_codon_deletion.translated_seq_positions(2061) == (1, 2)

    two_codon_deletion_variant = Variant('test-two-codon-deletion', 'X', 5116856, 5116861, genomic_ref_seq='GTGCGT')
    two_codon_deletion = SeqEmbeddedVariant(variant=two_codon_deletion_variant, seq_start_pos=3, seq_end_pos=4)

    assert two_codon_deletion.translated_seq_positions(2061) == (1, 2)


def test_translated_seq_positions_one_bp_in_codon_deletion() -> None:
    '''
    Test the SeqEmbeddedVariant.translated_seq_positions() method on deletions starting at one bp into a codon.
    Translated seq positions for deletions of partial codons should indicate the affected amino acid position only
    (single codon in which deletion started).
    '''
    one_bp_deletion_variant = Variant('test-1bp-deletion', 'X', 5116861, 5116861, genomic_ref_seq='T')
    one_bp_deletion = SeqEmbeddedVariant(variant=one_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4)

    assert one_bp_deletion.translated_seq_positions(2060) == (2, 2)

    two_bp_deletion_variant = Variant('test-2bp-deletion', 'X', 5116860, 5116861, genomic_ref_seq='GT')
    two_bp_deletion = SeqEmbeddedVariant(variant=two_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4)

    assert two_bp_deletion.translated_seq_positions(2059) == (2, 2)

    three_bp_deletion_variant = Variant('test-3bp-deletion', 'X', 5116859, 5116861, genomic_ref_seq='CGT')
    three_bp_deletion = SeqEmbeddedVariant(variant=three_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4)

    assert three_bp_deletion.translated_seq_positions(2058) == (1, 2)

    four_bp_deletion_variant = Variant('test-4bp-deletion', 'X', 5116858, 5116861, genomic_ref_seq='CCGT')
    four_bp_deletion = SeqEmbeddedVariant(variant=four_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4)

    assert four_bp_deletion.translated_seq_positions(2057) == (2, 2)

    five_bp_deletion_variant = Variant('test-5bp-deletion', 'X', 5116857, 5116861, genomic_ref_seq='ACCGT')
    five_bp_deletion = SeqEmbeddedVariant(variant=five_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4)

    assert five_bp_deletion.translated_seq_positions(2056) == (2, 2)

    six_bp_deletion_variant = Variant('test-6bp-deletion', 'X', 5116856, 5116861, genomic_ref_seq='CACCGT')
    six_bp_deletion = SeqEmbeddedVariant(variant=six_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4)

    assert six_bp_deletion.translated_seq_positions(2055) == (1, 2)

    seven_bp_deletion_variant = Variant('test-1bp-deletion', 'X', 5116855, 5116861, genomic_ref_seq='CCACCGT')
    seven_bp_deletion = SeqEmbeddedVariant(variant=seven_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4)

    assert seven_bp_deletion.translated_seq_positions(2054) == (2, 2)

    eight_bp_deletion_variant = Variant('test-1bp-deletion', 'X', 5116854, 5116861, genomic_ref_seq='CCCACCGT')
    eight_bp_deletion = SeqEmbeddedVariant(variant=eight_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4)

    assert eight_bp_deletion.translated_seq_positions(2053) == (2, 2)


def test_translated_seq_positions_two_bp_in_codon_deletion() -> None:
    '''
    Test the SeqEmbeddedVariant.translated_seq_positions() method on deletions starting at two bp into a codon.
    Translated seq positions for deletions of partial codons should indicate the affected amino acid position only
    (single codon in which deletion started).
    '''
    one_bp_deletion_variant = Variant('test-1bp-deletion', 'X', 5116860, 5116860, genomic_ref_seq='G')
    one_bp_deletion = SeqEmbeddedVariant(variant=one_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5)

    assert one_bp_deletion.translated_seq_positions(2060) == (2, 2)

    two_bp_deletion_variant = Variant('test-2bp-deletion', 'X', 5116859, 5116860, genomic_ref_seq='CG')
    two_bp_deletion = SeqEmbeddedVariant(variant=two_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5)

    assert two_bp_deletion.translated_seq_positions(2058) == (2, 2)

    three_bp_deletion_variant = Variant('test-3bp-deletion', 'X', 5116858, 5116860, genomic_ref_seq='CCG')
    three_bp_deletion = SeqEmbeddedVariant(variant=three_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5)

    assert three_bp_deletion.translated_seq_positions(2057) == (2, 2)

    four_bp_deletion_variant = Variant('test-4bp-deletion', 'X', 5116857, 5116860, genomic_ref_seq='ACCG')
    four_bp_deletion = SeqEmbeddedVariant(variant=four_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5)

    assert four_bp_deletion.translated_seq_positions(2056) == (2, 2)

    five_bp_deletion_variant = Variant('test-5bp-deletion', 'X', 5116856, 5116860, genomic_ref_seq='CACCG')
    five_bp_deletion = SeqEmbeddedVariant(variant=five_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5)

    assert five_bp_deletion.translated_seq_positions(2055) == (2, 2)

    six_bp_deletion_variant = Variant('test-6bp-deletion', 'X', 5116855, 5116860, genomic_ref_seq='CCACCG')
    six_bp_deletion = SeqEmbeddedVariant(variant=six_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5)

    assert six_bp_deletion.translated_seq_positions(2054) == (2, 2)

    seven_bp_deletion_variant = Variant('test-7bp-deletion', 'X', 5116854, 5116860, genomic_ref_seq='CCCACCG')
    seven_bp_deletion = SeqEmbeddedVariant(variant=seven_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5)

    assert seven_bp_deletion.translated_seq_positions(2053) == (2, 2)

    eight_bp_deletion_variant = Variant('test-8bp-deletion', 'X', 5116853, 5116860, genomic_ref_seq='ACCCACCG')
    eight_bp_deletion = SeqEmbeddedVariant(variant=eight_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5)

    assert eight_bp_deletion.translated_seq_positions(2053) == (2, 2)


def test_translated_seq_positions_three_bp_in_codon_deletion() -> None:
    '''
    Test the SeqEmbeddedVariant.translated_seq_positions() method on deletions starting at three bp into a codon.
    Translated seq positions for deletions of partial codons should indicate the affected amino acid position only
    (single codon in which deletion started).
    '''

    one_bp_deletion_variant = Variant('test-1bp-deletion', 'X', 5116859, 5116859, genomic_ref_seq='C')
    one_bp_deletion = SeqEmbeddedVariant(variant=one_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6)

    assert one_bp_deletion.translated_seq_positions(2058) == (2, 2)

    two_bp_deletion_variant = Variant('test-2bp-deletion', 'X', 5116858, 5116859, genomic_ref_seq='CC')
    two_bp_deletion = SeqEmbeddedVariant(variant=two_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6)

    assert two_bp_deletion.translated_seq_positions(2057) == (2, 2)

    three_bp_deletion_variant = Variant('test-3bp-deletion', 'X', 5116857, 5116859, genomic_ref_seq='ACC')
    three_bp_deletion = SeqEmbeddedVariant(variant=three_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6)

    assert three_bp_deletion.translated_seq_positions(2056) == (2, 2)

    four_bp_deletion_variant = Variant('test-4bp-deletion', 'X', 5116856, 5116859, genomic_ref_seq='CACC')
    four_bp_deletion = SeqEmbeddedVariant(variant=four_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6)

    assert four_bp_deletion.translated_seq_positions(2055) == (2, 2)

    five_bp_deletion_variant = Variant('test-5bp-deletion', 'X', 5116855, 5116859, genomic_ref_seq='CCACC')
    five_bp_deletion = SeqEmbeddedVariant(variant=five_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6)

    assert five_bp_deletion.translated_seq_positions(2054) == (2, 2)

    six_bp_deletion_variant = Variant('test-6bp-deletion', 'X', 5116854, 5116859, genomic_ref_seq='CCCACC')
    six_bp_deletion = SeqEmbeddedVariant(variant=six_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6)

    assert six_bp_deletion.translated_seq_positions(2053) == (2, 2)

    seven_bp_deletion_variant = Variant('test-7bp-deletion', 'X', 5116853, 5116859, genomic_ref_seq='ACCCACC')
    seven_bp_deletion = SeqEmbeddedVariant(variant=seven_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6)

    assert seven_bp_deletion.translated_seq_positions(2053) == (2, 2)

    eight_bp_deletion_variant = Variant('test-7bp-deletion', 'X', 5116853, 5116859, genomic_ref_seq='TACCCACC')
    eight_bp_deletion = SeqEmbeddedVariant(variant=eight_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6)

    assert eight_bp_deletion.translated_seq_positions(2053) == (2, 2)


def test_translated_seq_positions_indel() -> None:
    '''
    Test the SeqEmbeddedVariant.translated_seq_positions() method on indels.
    Translated seq positions for indels should indicate the affected amino acid position(s)
    based on the longest sequence (ref or alt).
    '''
    # TODO
    pass
