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
        'seq_substitution_type': str(wb_variant_yn32.seq_substitution_type.value),
        'seq_start_pos': 1129,
        'seq_end_pos': 1129,
        'embedded_ref_seq_len': 1,
        'embedded_alt_seq_len': 1
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
            'seq_end_pos': 377,
            'embedded_ref_seq_len': 1,
            'embedded_alt_seq_len': 1
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
            'embedded_ref_seq_len': 1,
            'embedded_alt_seq_len': 1
        })
    # Missing embedded_ref_seq_len
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
            'seq_end_pos': 377,
            'embedded_alt_seq_len': 1
        })
    # Missing embedded_alt_seq_len
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
            'seq_end_pos': 377,
            'embedded_ref_seq_len': 1,
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
            'embedded_ref_seq_len': 1,
            'embedded_alt_seq_len': 1
        })


def test_translation_of_substitution(wb_variant_yn32_in_C42D8_8a_1_coding_seq) -> None:
    """
    Test the SeqEmbeddedVariant.to_translated() method
    """
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.seq_start_pos == 1129
    assert wb_variant_yn32_in_C42D8_8a_1_coding_seq.seq_end_pos == 1129

    translated_wb_variant_yn32_in_C42D8_8a_1_coding_seq = wb_variant_yn32_in_C42D8_8a_1_coding_seq.to_translated(2061)

    assert translated_wb_variant_yn32_in_C42D8_8a_1_coding_seq.seq_start_pos == 377
    assert translated_wb_variant_yn32_in_C42D8_8a_1_coding_seq.seq_end_pos == 377


def test_translation_of_insertion_between_codons() -> None:
    """
    Test the SeqEmbeddedVariant.to_translated() method on insertions between codons.
    Translated seq positions should indicate the affected amino acid position(s) (insertion site)
     + flanking amino acids on both sides where only complete in-frame codons are inserted (for insertions of >= 3 bps)
    """
    one_bp_insertion_variant = Variant('test-1bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='G')
    one_bp_insertion = SeqEmbeddedVariant(variant=one_bp_insertion_variant, seq_start_pos=4, seq_end_pos=4,
                                          embedded_ref_seq_len=0, embedded_alt_seq_len=1)
    translated_one_bp_insertion = one_bp_insertion.to_translated(2061)

    assert translated_one_bp_insertion.seq_start_pos == 2
    assert translated_one_bp_insertion.seq_end_pos == 2

    two_bp_insertion_variant = Variant('test-2bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='GG')
    two_bp_insertion = SeqEmbeddedVariant(variant=two_bp_insertion_variant, seq_start_pos=4, seq_end_pos=5,
                                          embedded_ref_seq_len=0, embedded_alt_seq_len=2)
    translated_two_bp_insertion = two_bp_insertion.to_translated(2061)

    assert translated_two_bp_insertion.seq_start_pos == 2
    assert translated_two_bp_insertion.seq_end_pos == 2

    three_bp_insertion_variant = Variant('test-3bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='GGG')
    three_bp_insertion = SeqEmbeddedVariant(variant=three_bp_insertion_variant, seq_start_pos=4, seq_end_pos=6,
                                            embedded_ref_seq_len=0, embedded_alt_seq_len=3)
    translated_three_bp_insertion = three_bp_insertion.to_translated(2061)

    assert translated_three_bp_insertion.seq_start_pos == 1
    assert translated_three_bp_insertion.seq_end_pos == 3

    four_bp_insertion_variant = Variant('test-4bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='GGGG')
    four_bp_insertion = SeqEmbeddedVariant(variant=four_bp_insertion_variant, seq_start_pos=4, seq_end_pos=7,
                                           embedded_ref_seq_len=0, embedded_alt_seq_len=4)
    translated_four_bp_insertion = four_bp_insertion.to_translated(2061)

    assert translated_four_bp_insertion.seq_start_pos == 2
    assert translated_four_bp_insertion.seq_end_pos == 3

    five_bp_insertion_variant = Variant('test-5bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='GGGGG')
    five_bp_insertion = SeqEmbeddedVariant(variant=five_bp_insertion_variant, seq_start_pos=4, seq_end_pos=8,
                                           embedded_ref_seq_len=0, embedded_alt_seq_len=5)
    translated_five_bp_insertion = five_bp_insertion.to_translated(2061)

    assert translated_five_bp_insertion.seq_start_pos == 2
    assert translated_five_bp_insertion.seq_end_pos == 3

    six_bp_insertion_variant = Variant('test-6bp-insertion', 'X', 5116861, 5116862, genomic_alt_seq='GGGGGG')
    six_bp_insertion = SeqEmbeddedVariant(variant=six_bp_insertion_variant, seq_start_pos=4, seq_end_pos=9,
                                          embedded_ref_seq_len=0, embedded_alt_seq_len=6)
    translated_six_bp_insertion = six_bp_insertion.to_translated(2061)

    assert translated_six_bp_insertion.seq_start_pos == 1
    assert translated_six_bp_insertion.seq_end_pos == 4


def test_translation_of_insertion_one_bp_in_codon() -> None:
    """
    Test the SeqEmbeddedVariant.to_translated() method on insertions starting after one bp within a codon.
    Translated seq positions should indicate the affected amino acid position(s) only (insertion site)
    """
    one_bp_insertion_variant = Variant('test-1bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='G')
    one_bp_insertion = SeqEmbeddedVariant(variant=one_bp_insertion_variant, seq_start_pos=5, seq_end_pos=5,
                                          embedded_ref_seq_len=0, embedded_alt_seq_len=1)

    translated_one_bp_insertion = one_bp_insertion.to_translated(2061)

    assert translated_one_bp_insertion.seq_start_pos == 2
    assert translated_one_bp_insertion.seq_end_pos == 2

    two_bp_insertion_variant = Variant('test-2bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GG')
    two_bp_insertion = SeqEmbeddedVariant(variant=two_bp_insertion_variant, seq_start_pos=5, seq_end_pos=6,
                                          embedded_ref_seq_len=0, embedded_alt_seq_len=2)

    translated_two_bp_insertion = two_bp_insertion.to_translated(2061)

    assert translated_two_bp_insertion.seq_start_pos == 2
    assert translated_two_bp_insertion.seq_end_pos == 2

    three_bp_insertion_variant = Variant('test-3bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGG')
    three_bp_insertion = SeqEmbeddedVariant(variant=three_bp_insertion_variant, seq_start_pos=5, seq_end_pos=7,
                                            embedded_ref_seq_len=0, embedded_alt_seq_len=3)

    translated_three_bp_insertion = three_bp_insertion.to_translated(2061)

    assert translated_three_bp_insertion.seq_start_pos == 2
    assert translated_three_bp_insertion.seq_end_pos == 3

    four_bp_insertion_variant = Variant('test-4bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGGG')
    four_bp_insertion = SeqEmbeddedVariant(variant=four_bp_insertion_variant, seq_start_pos=5, seq_end_pos=8,
                                           embedded_ref_seq_len=0, embedded_alt_seq_len=4)

    translated_four_bp_insertion = four_bp_insertion.to_translated(2061)

    assert translated_four_bp_insertion.seq_start_pos == 2
    assert translated_four_bp_insertion.seq_end_pos == 3

    five_bp_insertion_variant = Variant('test-5bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGGGG')
    five_bp_insertion = SeqEmbeddedVariant(variant=five_bp_insertion_variant, seq_start_pos=5, seq_end_pos=9,
                                           embedded_ref_seq_len=0, embedded_alt_seq_len=5)

    translated_five_bp_insertion = five_bp_insertion.to_translated(2061)

    assert translated_five_bp_insertion.seq_start_pos == 2
    assert translated_five_bp_insertion.seq_end_pos == 3

    six_bp_insertion_variant = Variant('test-6bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGGGGG')
    six_bp_insertion = SeqEmbeddedVariant(variant=six_bp_insertion_variant, seq_start_pos=5, seq_end_pos=10,
                                          embedded_ref_seq_len=0, embedded_alt_seq_len=6)

    translated_six_bp_insertion = six_bp_insertion.to_translated(2061)

    assert translated_six_bp_insertion.seq_start_pos == 2
    assert translated_six_bp_insertion.seq_end_pos == 4

    seven_bp_insertion_variant = Variant('test-7bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGGGGGG')
    seven_bp_insertion = SeqEmbeddedVariant(variant=seven_bp_insertion_variant, seq_start_pos=5, seq_end_pos=11,
                                            embedded_ref_seq_len=0, embedded_alt_seq_len=7)

    translated_seven_bp_insertion = seven_bp_insertion.to_translated(2061)

    assert translated_seven_bp_insertion.seq_start_pos == 2
    assert translated_seven_bp_insertion.seq_end_pos == 4

    eight_bp_insertion_variant = Variant('test-8bp-insertion', 'X', 5116860, 5116861, genomic_alt_seq='GGGGGGGG')
    eight_bp_insertion = SeqEmbeddedVariant(variant=eight_bp_insertion_variant, seq_start_pos=4, seq_end_pos=12,
                                            embedded_ref_seq_len=0, embedded_alt_seq_len=8)

    translated_eight_bp_insertion = eight_bp_insertion.to_translated(2061)

    assert translated_eight_bp_insertion.seq_start_pos == 2
    assert translated_eight_bp_insertion.seq_end_pos == 4


def test_translation_of_insertion_two_bp_in_codon() -> None:
    """
    Test the SeqEmbeddedVariant.to_translated() method on insertions starting after two bp into a codon.
    Translated seq positions should indicate the affected amino acid position(s) only (insertion site)
    """
    one_bp_insertion_variant = Variant('test-1bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='G')
    one_bp_insertion = SeqEmbeddedVariant(variant=one_bp_insertion_variant, seq_start_pos=6, seq_end_pos=6,
                                          embedded_ref_seq_len=0, embedded_alt_seq_len=1)

    translated_one_bp_insertion = one_bp_insertion.to_translated(2061)

    assert translated_one_bp_insertion.seq_start_pos == 2
    assert translated_one_bp_insertion.seq_end_pos == 2

    two_bp_insertion_variant = Variant('test-2bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GG')
    two_bp_insertion = SeqEmbeddedVariant(variant=two_bp_insertion_variant, seq_start_pos=6, seq_end_pos=7,
                                          embedded_ref_seq_len=0, embedded_alt_seq_len=2)

    translated_two_bp_insertion = two_bp_insertion.to_translated(2061)

    assert translated_two_bp_insertion.seq_start_pos == 2
    assert translated_two_bp_insertion.seq_end_pos == 3

    three_bp_insertion_variant = Variant('test-3bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGG')
    three_bp_insertion = SeqEmbeddedVariant(variant=three_bp_insertion_variant, seq_start_pos=6, seq_end_pos=8,
                                            embedded_ref_seq_len=0, embedded_alt_seq_len=3)

    translated_three_bp_insertion = three_bp_insertion.to_translated(2061)

    assert translated_three_bp_insertion.seq_start_pos == 2
    assert translated_three_bp_insertion.seq_end_pos == 3

    four_bp_insertion_variant = Variant('test-4bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGGG')
    four_bp_insertion = SeqEmbeddedVariant(variant=four_bp_insertion_variant, seq_start_pos=6, seq_end_pos=9,
                                           embedded_ref_seq_len=0, embedded_alt_seq_len=4)

    translated_four_bp_insertion = four_bp_insertion.to_translated(2061)

    assert translated_four_bp_insertion.seq_start_pos == 2
    assert translated_four_bp_insertion.seq_end_pos == 3

    five_bp_insertion_variant = Variant('test-5bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGGGG')
    five_bp_insertion = SeqEmbeddedVariant(variant=five_bp_insertion_variant, seq_start_pos=6, seq_end_pos=10,
                                           embedded_ref_seq_len=0, embedded_alt_seq_len=5)

    translated_five_bp_insertion = five_bp_insertion.to_translated(2061)

    assert translated_five_bp_insertion.seq_start_pos == 2
    assert translated_five_bp_insertion.seq_end_pos == 4

    six_bp_insertion_variant = Variant('test-6bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGGGGG')
    six_bp_insertion = SeqEmbeddedVariant(variant=six_bp_insertion_variant, seq_start_pos=6, seq_end_pos=11,
                                          embedded_ref_seq_len=0, embedded_alt_seq_len=6)

    translated_six_bp_insertion = six_bp_insertion.to_translated(2061)

    assert translated_six_bp_insertion.seq_start_pos == 2
    assert translated_six_bp_insertion.seq_end_pos == 4

    seven_bp_insertion_variant = Variant('test-7bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGGGGGG')
    seven_bp_insertion = SeqEmbeddedVariant(variant=seven_bp_insertion_variant, seq_start_pos=6, seq_end_pos=12,
                                            embedded_ref_seq_len=0, embedded_alt_seq_len=7)
    translated_seven_bp_insertion = seven_bp_insertion.to_translated(2061)

    assert translated_seven_bp_insertion.seq_start_pos == 2
    assert translated_seven_bp_insertion.seq_end_pos == 4

    eight_bp_insertion_variant = Variant('test-8bp-insertion', 'X', 5116859, 5116860, genomic_alt_seq='GGGGGGGG')
    eight_bp_insertion = SeqEmbeddedVariant(variant=eight_bp_insertion_variant, seq_start_pos=6, seq_end_pos=13,
                                            embedded_ref_seq_len=0, embedded_alt_seq_len=8)
    translated_eight_bp_insertion = eight_bp_insertion.to_translated(2061)

    assert translated_eight_bp_insertion.seq_start_pos == 2
    assert translated_eight_bp_insertion.seq_end_pos == 5


# TODO: test variant position conversion for deletions.
# Currently causing problems: WB yn10.
def test_translation_of_complete_inframe_codon_deletion() -> None:
    """
    Test the SeqEmbeddedVariant.to_translated() method on deletions of complete codons.
    Translated seq positions should indicate the flanking AAs on both sides of the deletion,
    as in-frame complete codon deletions cannot be visualised otherwise.
    """
    one_codon_deletion_variant = Variant('test-one-codon-deletion', 'X', 5116859, 5116861, genomic_ref_seq='CGT')
    one_codon_deletion = SeqEmbeddedVariant(variant=one_codon_deletion_variant, seq_start_pos=3, seq_end_pos=4,
                                            embedded_ref_seq_len=3, embedded_alt_seq_len=0)

    translated_one_codon_deletion = one_codon_deletion.to_translated(2061)

    assert translated_one_codon_deletion.seq_start_pos == 1
    assert translated_one_codon_deletion.seq_end_pos == 2

    two_codon_deletion_variant = Variant('test-two-codon-deletion', 'X', 5116856, 5116861, genomic_ref_seq='GTGCGT')
    two_codon_deletion = SeqEmbeddedVariant(variant=two_codon_deletion_variant, seq_start_pos=3, seq_end_pos=4,
                                            embedded_ref_seq_len=6, embedded_alt_seq_len=0)

    translated_two_codon_deletion = two_codon_deletion.to_translated(2061)

    assert translated_two_codon_deletion.seq_start_pos == 1
    assert translated_two_codon_deletion.seq_end_pos == 2


def test_translation_of_cross_region_complete_inframe_codon_deletion(wb_variants_ok2799_in_k12g11_3_1_coding_seq) -> None:
    '''
    Test the SeqEmbeddedVariant.to_translated() method on deletions of complete codons accross multiple sequence regions.
    Translated seq positions should indicate the flanking AAs on both sides of the deletion,
    as in-frame complete codon deletions cannot be visualised otherwise.
    '''
    translated_embedded_variant: SeqEmbeddedVariant = wb_variants_ok2799_in_k12g11_3_1_coding_seq.to_translated(1050)

    assert translated_embedded_variant.seq_start_pos == 80
    assert translated_embedded_variant.seq_end_pos == 81


def test_translation_of_deletion_one_bp_in_codon() -> None:
    '''
    Test the SeqEmbeddedVariant.to_translated() method on deletions starting at one bp into a codon.
    Translated seq positions for deletions of partial codons should indicate the affected amino acid position only
    (single codon in which deletion started).
    '''
    one_bp_deletion_variant = Variant('test-1bp-deletion', 'X', 5116861, 5116861, genomic_ref_seq='T')
    one_bp_deletion = SeqEmbeddedVariant(variant=one_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4,
                                         embedded_ref_seq_len=1, embedded_alt_seq_len=0)

    translated_one_bp_deletion = one_bp_deletion.to_translated(2060)

    assert translated_one_bp_deletion.seq_start_pos == 2
    assert translated_one_bp_deletion.seq_end_pos == 2

    two_bp_deletion_variant = Variant('test-2bp-deletion', 'X', 5116860, 5116861, genomic_ref_seq='GT')
    two_bp_deletion = SeqEmbeddedVariant(variant=two_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4,
                                         embedded_ref_seq_len=2, embedded_alt_seq_len=0)

    translated_two_bp_deletion = two_bp_deletion.to_translated(2059)

    assert translated_two_bp_deletion.seq_start_pos == 2
    assert translated_two_bp_deletion.seq_end_pos == 2

    three_bp_deletion_variant = Variant('test-3bp-deletion', 'X', 5116859, 5116861, genomic_ref_seq='CGT')
    three_bp_deletion = SeqEmbeddedVariant(variant=three_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4,
                                           embedded_ref_seq_len=3, embedded_alt_seq_len=0)

    translated_three_bp_deletion = three_bp_deletion.to_translated(2058)

    assert translated_three_bp_deletion.seq_start_pos == 1
    assert translated_three_bp_deletion.seq_end_pos == 2

    four_bp_deletion_variant = Variant('test-4bp-deletion', 'X', 5116858, 5116861, genomic_ref_seq='CCGT')
    four_bp_deletion = SeqEmbeddedVariant(variant=four_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4,
                                          embedded_ref_seq_len=4, embedded_alt_seq_len=0)

    translated_four_bp_deletion = four_bp_deletion.to_translated(2057)

    assert translated_four_bp_deletion.seq_start_pos == 2
    assert translated_four_bp_deletion.seq_end_pos == 2

    five_bp_deletion_variant = Variant('test-5bp-deletion', 'X', 5116857, 5116861, genomic_ref_seq='ACCGT')
    five_bp_deletion = SeqEmbeddedVariant(variant=five_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4,
                                          embedded_ref_seq_len=5, embedded_alt_seq_len=0)

    translated_five_bp_deletion = five_bp_deletion.to_translated(2056)

    assert translated_five_bp_deletion.seq_start_pos == 2
    assert translated_five_bp_deletion.seq_end_pos == 2

    six_bp_deletion_variant = Variant('test-6bp-deletion', 'X', 5116856, 5116861, genomic_ref_seq='CACCGT')
    six_bp_deletion = SeqEmbeddedVariant(variant=six_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4,
                                         embedded_ref_seq_len=6, embedded_alt_seq_len=0)
    translated_six_bp_deletion = six_bp_deletion.to_translated(2055)

    assert translated_six_bp_deletion.seq_start_pos == 1
    assert translated_six_bp_deletion.seq_end_pos == 2

    seven_bp_deletion_variant = Variant('test-1bp-deletion', 'X', 5116855, 5116861, genomic_ref_seq='CCACCGT')
    seven_bp_deletion = SeqEmbeddedVariant(variant=seven_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4,
                                           embedded_ref_seq_len=7, embedded_alt_seq_len=0)

    translated_seven_bp_deletion = seven_bp_deletion.to_translated(2054)

    assert translated_seven_bp_deletion.seq_start_pos == 2
    assert translated_seven_bp_deletion.seq_end_pos == 2

    eight_bp_deletion_variant = Variant('test-1bp-deletion', 'X', 5116854, 5116861, genomic_ref_seq='CCCACCGT')
    eight_bp_deletion = SeqEmbeddedVariant(variant=eight_bp_deletion_variant, seq_start_pos=3, seq_end_pos=4,
                                           embedded_ref_seq_len=8, embedded_alt_seq_len=0)

    translated_eight_bp_deletion = eight_bp_deletion.to_translated(2053)

    assert translated_eight_bp_deletion.seq_start_pos == 2
    assert translated_eight_bp_deletion.seq_end_pos == 2


def test_translation_of_deletion_two_bp_in_codon() -> None:
    '''
    Test the SeqEmbeddedVariant.to_translated() method on deletions starting at two bp into a codon.
    Translated seq positions for deletions of partial codons should indicate the affected amino acid position only
    (single codon in which deletion started).
    '''
    one_bp_deletion_variant = Variant('test-1bp-deletion', 'X', 5116860, 5116860, genomic_ref_seq='G')
    one_bp_deletion = SeqEmbeddedVariant(variant=one_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5,
                                         embedded_ref_seq_len=1, embedded_alt_seq_len=0)

    translated_one_bp_deletion = one_bp_deletion.to_translated(2060)

    assert translated_one_bp_deletion.seq_start_pos == 2
    assert translated_one_bp_deletion.seq_end_pos == 2

    two_bp_deletion_variant = Variant('test-2bp-deletion', 'X', 5116859, 5116860, genomic_ref_seq='CG')
    two_bp_deletion = SeqEmbeddedVariant(variant=two_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5,
                                         embedded_ref_seq_len=2, embedded_alt_seq_len=0)

    translated_two_bp_deletion = two_bp_deletion.to_translated(2058)

    assert translated_two_bp_deletion.seq_start_pos == 2
    assert translated_two_bp_deletion.seq_end_pos == 2

    three_bp_deletion_variant = Variant('test-3bp-deletion', 'X', 5116858, 5116860, genomic_ref_seq='CCG')
    three_bp_deletion = SeqEmbeddedVariant(variant=three_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5,
                                           embedded_ref_seq_len=3, embedded_alt_seq_len=0)

    translated_three_bp_deletion = three_bp_deletion.to_translated(2057)

    assert translated_three_bp_deletion.seq_start_pos == 2
    assert translated_three_bp_deletion.seq_end_pos == 2

    four_bp_deletion_variant = Variant('test-4bp-deletion', 'X', 5116857, 5116860, genomic_ref_seq='ACCG')
    four_bp_deletion = SeqEmbeddedVariant(variant=four_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5,
                                          embedded_ref_seq_len=4, embedded_alt_seq_len=0)

    translated_four_bp_deletion = four_bp_deletion.to_translated(2056)

    assert translated_four_bp_deletion.seq_start_pos == 2
    assert translated_four_bp_deletion.seq_end_pos == 2

    five_bp_deletion_variant = Variant('test-5bp-deletion', 'X', 5116856, 5116860, genomic_ref_seq='CACCG')
    five_bp_deletion = SeqEmbeddedVariant(variant=five_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5,
                                          embedded_ref_seq_len=5, embedded_alt_seq_len=0)

    translated_five_bp_deletion = five_bp_deletion.to_translated(2055)

    assert translated_five_bp_deletion.seq_start_pos == 2
    assert translated_five_bp_deletion.seq_end_pos == 2

    six_bp_deletion_variant = Variant('test-6bp-deletion', 'X', 5116855, 5116860, genomic_ref_seq='CCACCG')
    six_bp_deletion = SeqEmbeddedVariant(variant=six_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5,
                                         embedded_ref_seq_len=6, embedded_alt_seq_len=0)

    translated_six_bp_deletion = six_bp_deletion.to_translated(2054)

    assert translated_six_bp_deletion.seq_start_pos == 2
    assert translated_six_bp_deletion.seq_end_pos == 2

    seven_bp_deletion_variant = Variant('test-7bp-deletion', 'X', 5116854, 5116860, genomic_ref_seq='CCCACCG')
    seven_bp_deletion = SeqEmbeddedVariant(variant=seven_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5,
                                           embedded_ref_seq_len=7, embedded_alt_seq_len=0)

    translated_seven_bp_deletion = seven_bp_deletion.to_translated(2053)

    assert translated_seven_bp_deletion.seq_start_pos == 2
    assert translated_seven_bp_deletion.seq_end_pos == 2

    eight_bp_deletion_variant = Variant('test-8bp-deletion', 'X', 5116853, 5116860, genomic_ref_seq='ACCCACCG')
    eight_bp_deletion = SeqEmbeddedVariant(variant=eight_bp_deletion_variant, seq_start_pos=4, seq_end_pos=5,
                                           embedded_ref_seq_len=8, embedded_alt_seq_len=0)

    translated_eight_bp_deletion = eight_bp_deletion.to_translated(2053)

    assert translated_eight_bp_deletion.seq_start_pos == 2
    assert translated_eight_bp_deletion.seq_end_pos == 2


def test_translation_of_deletion_three_bp_in_codon() -> None:
    '''
    Test the SeqEmbeddedVariant.to_translated() method on deletions starting at three bp into a codon.
    Translated seq positions for deletions of partial codons should indicate the affected amino acid position only
    (single codon in which deletion started).
    '''

    one_bp_deletion_variant = Variant('test-1bp-deletion', 'X', 5116859, 5116859, genomic_ref_seq='C')
    one_bp_deletion = SeqEmbeddedVariant(variant=one_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6,
                                         embedded_ref_seq_len=1, embedded_alt_seq_len=0)

    translated_one_bp_deletion = one_bp_deletion.to_translated(2058)

    assert translated_one_bp_deletion.seq_start_pos == 2
    assert translated_one_bp_deletion.seq_end_pos == 2

    two_bp_deletion_variant = Variant('test-2bp-deletion', 'X', 5116858, 5116859, genomic_ref_seq='CC')
    two_bp_deletion = SeqEmbeddedVariant(variant=two_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6,
                                         embedded_ref_seq_len=2, embedded_alt_seq_len=0)

    translated_two_bp_deletion = two_bp_deletion.to_translated(2057)

    assert translated_two_bp_deletion.seq_start_pos == 2
    assert translated_two_bp_deletion.seq_end_pos == 2

    three_bp_deletion_variant = Variant('test-3bp-deletion', 'X', 5116857, 5116859, genomic_ref_seq='ACC')
    three_bp_deletion = SeqEmbeddedVariant(variant=three_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6,
                                           embedded_ref_seq_len=3, embedded_alt_seq_len=0)

    translated_three_bp_deletion = three_bp_deletion.to_translated(2056)

    assert translated_three_bp_deletion.seq_start_pos == 2
    assert translated_three_bp_deletion.seq_end_pos == 2

    four_bp_deletion_variant = Variant('test-4bp-deletion', 'X', 5116856, 5116859, genomic_ref_seq='CACC')
    four_bp_deletion = SeqEmbeddedVariant(variant=four_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6,
                                          embedded_ref_seq_len=4, embedded_alt_seq_len=0)

    translated_four_bp_deletion = four_bp_deletion.to_translated(2055)

    assert translated_four_bp_deletion.seq_start_pos == 2
    assert translated_four_bp_deletion.seq_end_pos == 2

    five_bp_deletion_variant = Variant('test-5bp-deletion', 'X', 5116855, 5116859, genomic_ref_seq='CCACC')
    five_bp_deletion = SeqEmbeddedVariant(variant=five_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6,
                                          embedded_ref_seq_len=5, embedded_alt_seq_len=0)

    translated_five_bp_deletion = five_bp_deletion.to_translated(2054)

    assert translated_five_bp_deletion.seq_start_pos == 2
    assert translated_five_bp_deletion.seq_end_pos == 2

    six_bp_deletion_variant = Variant('test-6bp-deletion', 'X', 5116854, 5116859, genomic_ref_seq='CCCACC')
    six_bp_deletion = SeqEmbeddedVariant(variant=six_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6,
                                         embedded_ref_seq_len=6, embedded_alt_seq_len=0)

    translated_six_bp_deletion = six_bp_deletion.to_translated(2053)

    assert translated_six_bp_deletion.seq_start_pos == 2
    assert translated_six_bp_deletion.seq_end_pos == 2

    seven_bp_deletion_variant = Variant('test-7bp-deletion', 'X', 5116853, 5116859, genomic_ref_seq='ACCCACC')
    seven_bp_deletion = SeqEmbeddedVariant(variant=seven_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6,
                                           embedded_ref_seq_len=7, embedded_alt_seq_len=0)

    translated_seven_bp_deletion = seven_bp_deletion.to_translated(2053)

    assert translated_seven_bp_deletion.seq_start_pos == 2
    assert translated_seven_bp_deletion.seq_end_pos == 2

    eight_bp_deletion_variant = Variant('test-7bp-deletion', 'X', 5116853, 5116859, genomic_ref_seq='TACCCACC')
    eight_bp_deletion = SeqEmbeddedVariant(variant=eight_bp_deletion_variant, seq_start_pos=5, seq_end_pos=6,
                                           embedded_ref_seq_len=8, embedded_alt_seq_len=0)

    translated_eight_bp_deletion = eight_bp_deletion.to_translated(2053)

    assert translated_eight_bp_deletion.seq_start_pos == 2
    assert translated_eight_bp_deletion.seq_end_pos == 2


def test_translated_seq_positions_indel() -> None:
    '''
    Test the SeqEmbeddedVariant.to_translated() method on indels.
    Translated seq positions for indels should indicate the affected amino acid position(s)
    based on the longest sequence (ref or alt).
    '''
    # TODO
    pass
