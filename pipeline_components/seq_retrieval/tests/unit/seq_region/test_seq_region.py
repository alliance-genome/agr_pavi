"""
Unit testing for SeqRegion class and related functions
"""

from Bio import Seq
import logging
import pytest

from seq_region import SeqRegion
from variant.variant import Variant
from log_mgmt import get_logger, set_log_level

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


FASTA_FILE_URL = 'file://tests/resources/GCF_000002985.6_WBcel235_genomic_X.fna.gz'


def test_seq_region_class_neg_strand() -> None:

    # WBGene00000149 Transcript:C42D8.8b.1 Exon 1 (mRNA start)
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5116799, end=5116864, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)

    assert isinstance(exon_1, SeqRegion)

    exon_1_seq: str = exon_1.get_sequence()

    assert isinstance(exon_1_seq, str)
    assert exon_1_seq == 'atgACGGTGGGTAAACTAATGATTGGCTTACTTATACCGATTCTTGTCGCCACAGTTTACGCAGAG'


def test_seq_region_class_pos_strand(wb_c42d8_1_1_exons) -> None:

    # WBGene00016599 Transcript:C42D8.1.1 Exon 1 (mRNA start)
    exon_1: SeqRegion = wb_c42d8_1_1_exons[0]

    assert isinstance(exon_1, SeqRegion)

    exon_1_seq: str = exon_1.get_sequence()

    assert isinstance(exon_1_seq, str)
    assert exon_1_seq == 'aacCATGTCGATGTATGGCAAAGACAAGGCGTATATCGAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'


def test_seq_region_overlap(wb_c42d8_1_1_exons) -> None:

    # WBGene00016599 Transcript:C42D8.1.1 Exon 1 (mRNA start)
    exon_1: SeqRegion = wb_c42d8_1_1_exons[0]

    # WBVar01145173 - gk787530 - NC_003284.9:g.5109543G>A - point mutation (overlap)
    gk787530: SeqRegion = SeqRegion(seq_id='X', start=5109543, end=5109543,
                                    fasta_file_url=FASTA_FILE_URL)

    assert exon_1.overlaps(gk787530) is True

    # gk320952 - splice region variant (no overlap)
    gk320952: SeqRegion = SeqRegion(seq_id='X', start=5110758, end=5110758,
                                    fasta_file_url=FASTA_FILE_URL)

    assert exon_1.overlaps(gk320952) is False

    # WBGene00016599 Transcript:C42D8.1.1 Exon 8 (mRNA end)
    exon_8: SeqRegion = wb_c42d8_1_1_exons[7]
    # Transcript:C42D8.8a.1 Exon 11 (overlap on opposite strand)
    opp_strand_exon: SeqRegion = SeqRegion(seq_id='X', start=5112422, end=5113420, strand='-',
                                           fasta_file_url=FASTA_FILE_URL)
    same_strand_exon: SeqRegion = SeqRegion(seq_id='X', start=5112422, end=5113420, strand='+',
                                            fasta_file_url=FASTA_FILE_URL)

    assert exon_8.overlaps(opp_strand_exon) is False
    assert exon_8.overlaps(same_strand_exon) is True


def test_seq_region_sub_region_pos_strand() -> None:
    # WBGene00016599 Transcript:C42D8.1.1 Exon 2
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5110473, end=5110556, frame=0, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    sub_region: SeqRegion = exon_1.sub_region(rel_start=1, rel_end=10)

    assert isinstance(sub_region, SeqRegion)
    assert sub_region.start == 5110473
    assert sub_region.end == 5110482
    assert sub_region.frame == 0
    assert sub_region.get_sequence() == 'gtttcagTGG'


def test_seq_region_sub_region_neg_strand() -> None:
    # WBGene00000149 Transcript:C42D8.8b.1 Exon 1 (mRNA start)
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5116799, end=5116864, frame=0, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)

    sub_region: SeqRegion = exon_1.sub_region(rel_start=11, rel_end=20)

    assert isinstance(sub_region, SeqRegion)
    assert sub_region.start == 5116845
    assert sub_region.end == 5116854
    assert sub_region.frame == 2
    assert sub_region.get_sequence() == 'GTAAACTAAT'

    sub_region_frame1: SeqRegion = exon_1.sub_region(rel_start=12, rel_end=20)
    assert sub_region_frame1.start == 5116845
    assert sub_region_frame1.end == 5116853
    assert sub_region_frame1.frame == 1
    assert sub_region_frame1.get_sequence() == 'TAAACTAAT'

    sub_region_frame0: SeqRegion = exon_1.sub_region(rel_start=13, rel_end=20)
    assert sub_region_frame0.start == 5116845
    assert sub_region_frame0.end == 5116852
    assert sub_region_frame0.frame == 0
    assert sub_region_frame0.get_sequence() == 'AAACTAAT'


def test_seq_region_inframe_sequence(wb_c42d8_1_1_cds_regions) -> None:
    cds_region: SeqRegion = wb_c42d8_1_1_cds_regions[0]
    assert cds_region.frame == 0

    complete_sequence = cds_region.get_sequence(inframe_only=False)
    frame0_inframe_sequence = cds_region.inframe_sequence()

    assert frame0_inframe_sequence == complete_sequence
    assert frame0_inframe_sequence != ""
    assert len(frame0_inframe_sequence) % 3 == 0  # Complete codons

    # Frame 1 testing
    frame1_subregion: SeqRegion = cds_region.sub_region(rel_start=3, rel_end=cds_region.seq_length)
    assert frame1_subregion.frame == 1

    frame1_inframe_sequence = frame1_subregion.inframe_sequence()

    assert frame1_inframe_sequence != frame1_subregion.get_sequence(inframe_only=False)
    assert frame1_inframe_sequence == frame1_subregion.get_sequence(inframe_only=True)
    assert len(frame1_inframe_sequence) % 3 == 0  # Complete codons
    assert frame1_inframe_sequence == complete_sequence[3:cds_region.seq_length]

    # Frame 2 testing
    frame2_subregion: SeqRegion = cds_region.sub_region(rel_start=2, rel_end=cds_region.seq_length)
    assert frame2_subregion.frame == 2

    frame2_inframe_sequence = frame2_subregion.inframe_sequence()

    assert frame2_inframe_sequence != frame2_subregion.get_sequence(inframe_only=False)
    assert frame2_inframe_sequence == frame2_subregion.get_sequence(inframe_only=True)
    assert len(frame2_inframe_sequence) % 3 == 0  # Complete codons
    assert frame2_inframe_sequence == complete_sequence[3:cds_region.seq_length]

    # Frame 4 testing (frame 2 in next codon)
    frame4_subregion: SeqRegion = cds_region.sub_region(rel_start=5, rel_end=cds_region.seq_length)
    assert frame4_subregion.frame == 2

    frame4_inframe_sequence = frame4_subregion.inframe_sequence()

    assert frame4_inframe_sequence != frame4_subregion.get_sequence(inframe_only=False)
    assert frame4_inframe_sequence == frame4_subregion.get_sequence(inframe_only=True)
    assert len(frame4_inframe_sequence) % 3 == 0  # Complete codons
    assert frame4_inframe_sequence == complete_sequence[6:cds_region.seq_length]

    # Sequence without complete codons
    incomplete_frames_subregion: SeqRegion = cds_region.sub_region(rel_start=2, rel_end=4)
    assert incomplete_frames_subregion.frame == 2

    incomplete_frames_inframe_sequence = incomplete_frames_subregion.inframe_sequence()

    assert incomplete_frames_inframe_sequence != incomplete_frames_subregion.get_sequence(inframe_only=False)
    assert incomplete_frames_inframe_sequence == incomplete_frames_subregion.get_sequence(inframe_only=True)
    assert len(incomplete_frames_inframe_sequence) % 3 == 0  # Complete codons
    assert incomplete_frames_inframe_sequence == ""


def test_get_alt_sequence_mutation(wb_variant_gk787530, wb_c42d8_1_1_cds_regions) -> None:
    ref_sequence = wb_c42d8_1_1_cds_regions[0].get_sequence()
    alt_sequence_info = wb_c42d8_1_1_cds_regions[0].get_alt_sequence(variants=[wb_variant_gk787530])
    gk787530_ref_start = 33  # 0-based index of the start of the variant in the ref sequence
    gk787530_ref_end = 33  # 0-based index of the end of the variant in the ref sequence

    # Sequence before variant must be identical
    assert ref_sequence[0:gk787530_ref_start] == alt_sequence_info['sequence'][0:gk787530_ref_start]
    # Sequence at variant position must match expected ref/alt sequence
    assert ref_sequence[gk787530_ref_start:gk787530_ref_end + 1] == wb_variant_gk787530.genomic_ref_seq
    assert alt_sequence_info['sequence'][gk787530_ref_start:gk787530_ref_end + 1] == wb_variant_gk787530.genomic_alt_seq
    # Sequence after variant must be identical
    assert ref_sequence[gk787530_ref_end + 1:] == alt_sequence_info['sequence'][gk787530_ref_end + 1:]
    # Alt sequence variant should have one embedded variant
    assert len(alt_sequence_info['embedded_variants']) == 1
    embedded_variant = alt_sequence_info['embedded_variants'][0]
    # Alt sequence variant should be positioned correctly
    # note: AltSeqEmbeddedVariant stores 1-based relative positions
    assert embedded_variant.rel_start == gk787530_ref_start + 1
    assert embedded_variant.rel_end == gk787530_ref_end + 1
    assert embedded_variant.variant_id == wb_variant_gk787530.variant_id


def test_get_alt_sequence_deletion(wb_variant_kx29, wb_f59f5_2a_1_exon10) -> None:
    kx29_ref_start = 44  # 0-based index of the start of the variant in the ref sequence
    kx29_ref_end = 44  # 0-based index of the end of the variant in the ref sequence
    kx29_alt_end = kx29_ref_end - len(wb_variant_kx29.genomic_ref_seq)  # 0-based index of the end of the variant in the ref sequence

    ref_sequence = wb_f59f5_2a_1_exon10.get_sequence()
    alt_sequence_info = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[wb_variant_kx29])

    # Sequence before variant must be identical
    assert ref_sequence[0:kx29_ref_start] == alt_sequence_info['sequence'][0:kx29_ref_start]
    # Sequence at variant position must match expected ref sequence
    assert ref_sequence[kx29_ref_start:kx29_ref_end + 1] == wb_variant_kx29.genomic_ref_seq
    # Sequence after variant must be identical
    assert ref_sequence[kx29_ref_end + 1:] == alt_sequence_info['sequence'][kx29_alt_end + 1:]
    # Alt sequence variant should have one embedded variant
    assert len(alt_sequence_info['embedded_variants']) == 1
    embedded_variant = alt_sequence_info['embedded_variants'][0]
    # Alt sequence variant should be positioned correctly
    # note: AltSeqEmbeddedVariant stores 1-based relative positions
    assert embedded_variant.rel_start == (kx29_ref_start - 1) + 1  # Deletions are positioned by their flanking bases (-1 start)
    assert embedded_variant.rel_end == (kx29_alt_end + 1) + 1    # Deletions are positioned by their flanking bases (+1 end)
    assert embedded_variant.variant_id == wb_variant_kx29.variant_id


def test_get_alt_sequence_insertion(wb_variant_ce338, c14f11_3_1_exon5) -> None:
    ce338_ref_start = 95  # 0-based index of the start of the variant in the ref sequence (flanking base before insertion)
    ce338_ref_end = 96  # 0-based index of the end of the variant in the ref sequence (flanking base after insertion)
    ce338_alt_start = ce338_ref_start + 1  # 0-based index of the end of the variant in the alt sequence (first base of insertion)
    ce338_alt_end = ce338_ref_end - 1 + len(wb_variant_ce338.genomic_alt_seq)  # 0-based index of the end of the variant in the alt sequence (last base of insertion)

    # Variant insertion at negative strand
    ref_sequence = c14f11_3_1_exon5.get_sequence()
    alt_sequence_info = c14f11_3_1_exon5.get_alt_sequence(variants=[wb_variant_ce338])

    assert len(alt_sequence_info['sequence']) == len(ref_sequence) + 1

    # Sequence before variant must be identical
    assert ref_sequence[0:ce338_ref_start + 1] == alt_sequence_info['sequence'][0:ce338_alt_start]
    # Sequence at variant position must match expected alt sequence
    assert alt_sequence_info['sequence'][ce338_alt_start:ce338_alt_end + 1] == Seq.reverse_complement(wb_variant_ce338.genomic_alt_seq)
    # Sequence after variant must be identical
    assert ref_sequence[ce338_ref_end:] == alt_sequence_info['sequence'][ce338_alt_end + 1:]

    # Complete sequence comparison (belts and braces)
    assert ref_sequence                  == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E221
    assert alt_sequence_info['sequence'] == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGTGCTCTTACCATGGCGGCCACCTACGCCA'

    # Alt sequence variant should have one embedded variant
    assert len(alt_sequence_info['embedded_variants']) == 1
    embedded_variant = alt_sequence_info['embedded_variants'][0]
    # Alt sequence variant should be positioned correctly
    # note: AltSeqEmbeddedVariant stores 1-based relative positions
    assert embedded_variant.rel_start == ce338_alt_start + 1  # Insertions are positioned by their bases inserted
    assert embedded_variant.rel_end == ce338_alt_end + 1  # Insertions are positioned by their bases inserted
    assert embedded_variant.variant_id == wb_variant_ce338.variant_id


def test_get_alt_sequence_input_errors(wb_variant_yn32, wb_variant_yn30, wb_variant_yn10, wb_c42d8_8b_1_exons) -> None:
    """
    Test Variant get_alt_sequence input argument errors.
    """
    # no variants provided
    with pytest.raises(ValueError):
        wb_c42d8_8b_1_exons[7].get_alt_sequence(variants=[])

    # overlapping variants provided
    with pytest.raises(ValueError):
        wb_c42d8_8b_1_exons[7].get_alt_sequence(variants=[wb_variant_yn32, wb_variant_yn10])

    # variant position outside of sequence region
    with pytest.raises(ValueError):
        wb_c42d8_8b_1_exons[7].get_alt_sequence(variants=[wb_variant_yn30])


def test_get_alt_sequence_multiple_variants_neg_strand(c14f11_3_1_exon5) -> None:
    """
    Test Variant get_alt_sequence variant embedding on neg strand with multiple variants
    """
    # c14f11_3_1_exon5 start=6227974, end=6228097
    insert_start = Variant(variant_id='custom_cf14f11-3-1-exon5_start_insertion_variant', genomic_ref_seq='', genomic_alt_seq='G',
                           seq_id='X', start=6228096, end=6228097)
    insert_end = Variant(variant_id='custom_cf14f11-3-1-exon5_end_insertion_variant', genomic_ref_seq='', genomic_alt_seq='AAA',
                         seq_id='X', start=6227974, end=6227975)
    mutation = Variant(variant_id='custom_cf14f11-3-1-exon5_mutation_variant', genomic_ref_seq='A', genomic_alt_seq='C',
                       seq_id='X', start=6228027, end=6228027)

    # Variant insertion at negative strand
    ref_sequence = c14f11_3_1_exon5.get_sequence()
    alt1_sequence_info = c14f11_3_1_exon5.get_alt_sequence(variants=[insert_start, mutation])
    alt2_sequence_info = c14f11_3_1_exon5.get_alt_sequence(variants=[insert_end, mutation])
    alt3_sequence_info = c14f11_3_1_exon5.get_alt_sequence(variants=[insert_start, insert_end, mutation])

    assert ref_sequence                   == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E221
    assert alt1_sequence_info['sequence'] == 'ACTTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTGTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'
    assert alt2_sequence_info['sequence'] == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTGTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCTTTA'
    assert alt3_sequence_info['sequence'] == 'ACTTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTGTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCTTTA'

    # Alt 1 sequence should have two embedded variants
    assert len(alt1_sequence_info['embedded_variants']) == 2
    # Alt 1 variant 1 should be positioned correctly
    assert alt1_sequence_info['embedded_variants'][0].rel_start == 2
    assert alt1_sequence_info['embedded_variants'][0].rel_end == 2
    assert alt1_sequence_info['embedded_variants'][0].variant_id == insert_start.variant_id
    # Alt 1 variant 2 should be positioned correctly
    assert alt1_sequence_info['embedded_variants'][1].rel_start == 72
    assert alt1_sequence_info['embedded_variants'][1].rel_end == 72
    assert alt1_sequence_info['embedded_variants'][1].variant_id == mutation.variant_id

    # Alt 2 sequence should have two embedded variants
    assert len(alt2_sequence_info['embedded_variants']) == 2
    # Alt 2 variant 1 should be positioned correctly
    assert alt2_sequence_info['embedded_variants'][0].rel_start == 71
    assert alt2_sequence_info['embedded_variants'][0].rel_end == 71
    assert alt2_sequence_info['embedded_variants'][0].variant_id == mutation.variant_id
    # Alt 2 variant 2 should be positioned correctly
    assert alt2_sequence_info['embedded_variants'][1].rel_start == 124
    assert alt2_sequence_info['embedded_variants'][1].rel_end == 126
    assert alt2_sequence_info['embedded_variants'][1].variant_id == insert_end.variant_id

    # Alt 3 sequence should have three embedded variants
    assert len(alt3_sequence_info['embedded_variants']) == 3
    # Alt 3 variant 1 should be positioned correctly
    assert alt3_sequence_info['embedded_variants'][0].rel_start == 2
    assert alt3_sequence_info['embedded_variants'][0].rel_end == 2
    assert alt3_sequence_info['embedded_variants'][0].variant_id == insert_start.variant_id
    # Alt 3 variant 2 should be positioned correctly
    assert alt3_sequence_info['embedded_variants'][1].rel_start == 72
    assert alt3_sequence_info['embedded_variants'][1].rel_end == 72
    assert alt3_sequence_info['embedded_variants'][1].variant_id == mutation.variant_id
    # Alt 3 variant 3 should be positioned correctly
    assert alt3_sequence_info['embedded_variants'][2].rel_start == 125
    assert alt3_sequence_info['embedded_variants'][2].rel_end == 127
    assert alt3_sequence_info['embedded_variants'][2].variant_id == insert_end.variant_id


def test_get_alt_sequence_multiple_variants_pos_strand(wb_f59f5_2a_1_exon10) -> None:
    # wb_f59f5_2a_1_exon10 start=10536403, end=10536586
    insert_start = Variant(variant_id='custom_f59f5-2a-1-exon10_start_insertion_variant', genomic_ref_seq='', genomic_alt_seq='T',
                           seq_id='X', start=10536403, end=10536404)
    delete_end = Variant(variant_id='custom_f59f5-2a-1-exon10_end_deletion_variant', genomic_ref_seq='AG', genomic_alt_seq='',
                         seq_id='X', start=10536585, end=10536586)
    mutation = Variant(variant_id='custom_f59f5-2a-1-exon10_mutation_variant', genomic_ref_seq='T', genomic_alt_seq='A',
                       seq_id='X', start=10536533, end=10536533)

    # Variant insertion at negative strand
    ref_sequence = wb_f59f5_2a_1_exon10.get_sequence()
    alt1_sequence_info = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[insert_start, mutation])
    alt2_sequence_info = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[delete_end, mutation])
    alt3_sequence_info = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[insert_start, delete_end, mutation])

    assert ref_sequence                   == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'  # noqa: E221
    assert alt1_sequence_info['sequence'] == 'ATCGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTAggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'
    assert alt2_sequence_info['sequence'] == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTAggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAAT'
    assert alt3_sequence_info['sequence'] == 'ATCGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTAggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAAT'

    # Alt 1 seq should have two embedded variants
    assert len(alt1_sequence_info['embedded_variants']) == 2
    # Alt 1 variant 1 should be positioned correctly
    assert alt1_sequence_info['embedded_variants'][0].rel_start == 2
    assert alt1_sequence_info['embedded_variants'][0].rel_end == 2
    assert alt1_sequence_info['embedded_variants'][0].variant_id == insert_start.variant_id
    # Alt 1 variant 2 should be positioned correctly
    assert alt1_sequence_info['embedded_variants'][1].rel_start == 132
    assert alt1_sequence_info['embedded_variants'][1].rel_end == 132
    assert alt1_sequence_info['embedded_variants'][1].variant_id == mutation.variant_id

    # Alt 2 seq should have two embedded variants
    assert len(alt2_sequence_info['embedded_variants']) == 2
    # Alt 2 variant 1 should be positioned correctly
    assert alt2_sequence_info['embedded_variants'][0].rel_start == 131
    assert alt2_sequence_info['embedded_variants'][0].rel_end == 131
    assert alt2_sequence_info['embedded_variants'][0].variant_id == mutation.variant_id
    # Alt 2 variant 2 should be positioned correctly
    assert alt2_sequence_info['embedded_variants'][1].rel_start == 182
    assert alt2_sequence_info['embedded_variants'][1].rel_end == 183
    assert alt2_sequence_info['embedded_variants'][1].variant_id == delete_end.variant_id

    # Alt 3 seq should have three embedded variants
    assert len(alt3_sequence_info['embedded_variants']) == 3
    # Alt 3 variant 1 should be positioned correctly
    assert alt3_sequence_info['embedded_variants'][0].rel_start == 2
    assert alt3_sequence_info['embedded_variants'][0].rel_end == 2
    assert alt3_sequence_info['embedded_variants'][0].variant_id == insert_start.variant_id
    # Alt 3 variant 2 should be positioned correctly
    assert alt3_sequence_info['embedded_variants'][1].rel_start == 132
    assert alt3_sequence_info['embedded_variants'][1].rel_end == 132
    assert alt3_sequence_info['embedded_variants'][1].variant_id == mutation.variant_id
    # Alt 3 variant 3 should be positioned correctly
    assert alt3_sequence_info['embedded_variants'][2].rel_start == 183
    assert alt3_sequence_info['embedded_variants'][2].rel_end == 184
    assert alt3_sequence_info['embedded_variants'][2].variant_id == delete_end.variant_id


def test_get_alt_sequence_boundary_overlapping_deletion_pos_strand(wb_f59f5_2a_1_exon10) -> None:
    # Variant overspans complete seq region
    overspanning_deletion = Variant(variant_id='custom_f59f5-2a-1-exon10_overspanning_deletion', genomic_ref_seq='cagACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAggtaa',
                                    seq_id='X', start=10536400, end=10536590)
    # Variant partially overlaps on seq region start
    start_overlap_deletion = Variant(variant_id='custom_f59f5-2a-1-exon10_start_overlap_deletion', genomic_ref_seq='cagACGATGAC',
                                     seq_id='X', start=10536400, end=10536410)
    # Variant partially overlaps on seq region end
    end_overlap_deletion = Variant(variant_id='custom_f59f5-2a-1-exon10_end_overlap_deletion', genomic_ref_seq='GGAATAggtaa',
                                   seq_id='X', start=10536580, end=10536590)

    ref_sequence = wb_f59f5_2a_1_exon10.get_sequence()
    overspan_sequence_info = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[overspanning_deletion])
    start_overlap_sequence_info = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[start_overlap_deletion])
    end_overlap_sequence_info = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[end_overlap_deletion])

    assert ref_sequence                            == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'  # noqa: E221
    assert overspan_sequence_info['sequence']      == ''  # noqa: E221
    assert start_overlap_sequence_info['sequence'] ==         'TCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'  # noqa: E222
    assert end_overlap_sequence_info['sequence']   == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTA'  # noqa: E221

    # Overspan seq should have one embedded variant
    assert len(overspan_sequence_info['embedded_variants']) == 1
    assert overspan_sequence_info['embedded_variants'][0].rel_start == 0
    assert overspan_sequence_info['embedded_variants'][0].rel_end == 1
    assert overspan_sequence_info['embedded_variants'][0].variant_id == overspanning_deletion.variant_id
    # Start_overlap seq should have one embedded variant
    assert len(start_overlap_sequence_info['embedded_variants']) == 1
    assert start_overlap_sequence_info['embedded_variants'][0].rel_start == 0
    assert start_overlap_sequence_info['embedded_variants'][0].rel_end == 1
    assert start_overlap_sequence_info['embedded_variants'][0].variant_id == start_overlap_deletion.variant_id
    # End_overlap seq should have one embedded variant
    assert len(end_overlap_sequence_info['embedded_variants']) == 1
    assert end_overlap_sequence_info['embedded_variants'][0].rel_start == 177
    assert end_overlap_sequence_info['embedded_variants'][0].rel_end == 178
    assert end_overlap_sequence_info['embedded_variants'][0].variant_id == end_overlap_deletion.variant_id


def test_get_alt_sequence_boundary_overlapping_deletion_neg_strand(c14f11_3_1_exon5) -> None:
    # c14f11_3_1_exon5 start=6227974, end=6228097
    # Variant overspans complete seq region
    overspanning_deletion = Variant(variant_id='custom_c14f11-3-1-exon5_overspanning_deletion', genomic_ref_seq='TTACTGGCGTAGGTGGCCGCCATGGTAAGAGCCAAAAGTCCACTGAAAACAGCCAAAAAAGTGTTGATCATAAATTGACGACGCTCGGCTTGTTTGGTACGAACATTCAACGAAAACTGGCACAAAATCTA',
                                    seq_id='X', start=6227970, end=6228100)
    # Variant partially overlaps on seq region start
    start_overlap_deletion = Variant(variant_id='custom_c14f11-3-1-exon5_start_overlap_deletion', genomic_ref_seq='CACAAAATCTAAATATTGATT',
                                     seq_id='X', start=6228090, end=6228110)
    # Variant partially overlaps on seq region end
    end_overlap_deletion = Variant(variant_id='custom_c14f11-3-1-exon5_end_overlap_deletion', genomic_ref_seq='TTACTGGCGTA',
                                   seq_id='X', start=6227970, end=6227980)

    ref_sequence = c14f11_3_1_exon5.get_sequence()
    overspan_sequence_info = c14f11_3_1_exon5.get_alt_sequence(variants=[overspanning_deletion])
    start_overlap_sequence_info = c14f11_3_1_exon5.get_alt_sequence(variants=[start_overlap_deletion])
    end_overlap_sequence_info = c14f11_3_1_exon5.get_alt_sequence(variants=[end_overlap_deletion])

    assert ref_sequence                            == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E221
    assert overspan_sequence_info['sequence']      == ''  # noqa: E221
    assert start_overlap_sequence_info['sequence'] ==         'CCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E222
    assert end_overlap_sequence_info['sequence']   == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACC'  # noqa: E221

    # Overspan seq should have one embedded variant
    assert len(overspan_sequence_info['embedded_variants']) == 1
    assert overspan_sequence_info['embedded_variants'][0].rel_start == 0
    assert overspan_sequence_info['embedded_variants'][0].rel_end == 1
    assert overspan_sequence_info['embedded_variants'][0].variant_id == overspanning_deletion.variant_id
    # Start_overlap seq should have one embedded variant
    assert len(start_overlap_sequence_info['embedded_variants']) == 1
    assert start_overlap_sequence_info['embedded_variants'][0].rel_start == 0
    assert start_overlap_sequence_info['embedded_variants'][0].rel_end == 1
    assert start_overlap_sequence_info['embedded_variants'][0].variant_id == start_overlap_deletion.variant_id
    # End_overlap seq should have one embedded variant
    assert len(end_overlap_sequence_info['embedded_variants']) == 1
    assert end_overlap_sequence_info['embedded_variants'][0].rel_start == 117
    assert end_overlap_sequence_info['embedded_variants'][0].rel_end == 118
    assert end_overlap_sequence_info['embedded_variants'][0].variant_id == end_overlap_deletion.variant_id


def test_get_alt_sequence_boundary_overlapping_mutation_pos_strand(wb_f59f5_2a_1_exon10) -> None:
    # Variant overspans complete seq region
    overspanning_mutation = Variant(variant_id='custom_f59f5-2a-1-exon10_overspanning_mutation',
                                    genomic_ref_seq='cagACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAggtaa',
                                    genomic_alt_seq='AAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGG',
                                    seq_id='X', start=10536400, end=10536590)
    # Variant partially overlaps on seq region start
    start_overlap_mutation = Variant(variant_id='custom_f59f5-2a-1-exon10_start_overlap_mutation',
                                     genomic_ref_seq='cagACGATGAC',
                                     genomic_alt_seq='AAAGGGGAAAG',
                                     seq_id='X', start=10536400, end=10536410)
    # Variant partially overlaps on seq region end
    end_overlap_mutation = Variant(variant_id='custom_f59f5-2a-1-exon10_end_overlap_mutation',
                                   genomic_ref_seq='GGAATAggtaa',
                                   genomic_alt_seq='AAAGGGAAAGG',
                                   seq_id='X', start=10536580, end=10536590)

    ref_sequence = wb_f59f5_2a_1_exon10.get_sequence()
    overspan_sequence_info = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[overspanning_mutation])
    start_overlap_sequence_info = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[start_overlap_mutation])
    end_overlap_sequence_info = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[end_overlap_mutation])

    assert ref_sequence                            == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'  # noqa: E221
    assert overspan_sequence_info['sequence']      == 'GGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGA'  # noqa: E221
    assert start_overlap_sequence_info['sequence'] == 'GGGGAAAGTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'  # noqa: E222
    assert end_overlap_sequence_info['sequence']   == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAAAAGGGA'  # noqa: E221

    # overspan seq should have one embedded variant
    assert len(overspan_sequence_info['embedded_variants']) == 1
    # overspan seq embedded variants should be positioned correctly
    assert overspan_sequence_info['embedded_variants'][0].rel_start == 1
    assert overspan_sequence_info['embedded_variants'][0].rel_end == 184
    assert overspan_sequence_info['embedded_variants'][0].variant_id == overspanning_mutation.variant_id
    # Start_overlap seq should have one embedded variant
    assert len(start_overlap_sequence_info['embedded_variants']) == 1
    # start_overlap seq embedded variants should be positioned correctly
    assert start_overlap_sequence_info['embedded_variants'][0].rel_start == 1
    assert start_overlap_sequence_info['embedded_variants'][0].rel_end == 8
    assert start_overlap_sequence_info['embedded_variants'][0].variant_id == start_overlap_mutation.variant_id
    # End_overlap seq should have one embedded variant
    assert len(end_overlap_sequence_info['embedded_variants']) == 1
    # End_overlap seq embedded variants should be positioned correctly
    assert end_overlap_sequence_info['embedded_variants'][0].rel_start == 178
    assert end_overlap_sequence_info['embedded_variants'][0].rel_end == 184
    assert end_overlap_sequence_info['embedded_variants'][0].variant_id == end_overlap_mutation.variant_id


def test_get_alt_sequence_boundary_overlapping_mutation_neg_strand(c14f11_3_1_exon5) -> None:
    # c14f11_3_1_exon5 start=6227974, end=6228097
    # Variant overspans complete seq region
    overspanning_mutation = Variant(variant_id='custom_c14f11-3-1-exon5_overspanning_mutation',
                                    genomic_ref_seq='TTACTGGCGTAGGTGGCCGCCATGGTAAGAGCCAAAAGTCCACTGAAAACAGCCAAAAAAGTGTTGATCATAAATTGACGACGCTCGGCTTGTTTGGTACGAACATTCAACGAAAACTGGCACAAAATCTA',
                                    genomic_alt_seq='GGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCGGGCCG',
                                    seq_id='X', start=6227970, end=6228100)
    # Variant partially overlaps on seq region start
    start_overlap_mutation = Variant(variant_id='custom_c14f11-3-1-exon5_start_overlap_mutation',
                                     genomic_ref_seq='CACAAAATCTAAATATTGATT',
                                     genomic_alt_seq='GGGCCGGGCCGGGCCGGGCCG',
                                     seq_id='X', start=6228090, end=6228110)
    # Variant partially overlaps on seq region end
    end_overlap_mutation = Variant(variant_id='custom_c14f11-3-1-exon5_end_overlap_mutation',
                                   genomic_ref_seq='TTACTGGCGTA',
                                   genomic_alt_seq='GGGCCGGGCCG',
                                   seq_id='X', start=6227970, end=6227980)

    ref_sequence = c14f11_3_1_exon5.get_sequence()
    overspan_sequence_info = c14f11_3_1_exon5.get_alt_sequence(variants=[overspanning_mutation])
    start_overlap_sequence_info = c14f11_3_1_exon5.get_alt_sequence(variants=[start_overlap_mutation])
    end_overlap_sequence_info = c14f11_3_1_exon5.get_alt_sequence(variants=[end_overlap_mutation])

    assert ref_sequence                            == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E221
    assert overspan_sequence_info['sequence']      == 'CCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCG'  # noqa: E221
    assert start_overlap_sequence_info['sequence'] == 'CCCGGCCCCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E222
    assert end_overlap_sequence_info['sequence']   == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCCGGCCCG'  # noqa: E221

    # overspan seq should have one embedded variant
    assert len(overspan_sequence_info['embedded_variants']) == 1
    # overspan seq embedded variants should be positioned correctly
    assert overspan_sequence_info['embedded_variants'][0].rel_start == 1
    assert overspan_sequence_info['embedded_variants'][0].rel_end == 124
    assert overspan_sequence_info['embedded_variants'][0].variant_id == overspanning_mutation.variant_id
    # Start_overlap seq should have one embedded variant
    assert len(start_overlap_sequence_info['embedded_variants']) == 1
    # start_overlap seq embedded variants should be positioned correctly
    assert start_overlap_sequence_info['embedded_variants'][0].rel_start == 1
    assert start_overlap_sequence_info['embedded_variants'][0].rel_end == 8
    assert start_overlap_sequence_info['embedded_variants'][0].variant_id == start_overlap_mutation.variant_id
    # End_overlap seq should have one embedded variant
    assert len(end_overlap_sequence_info['embedded_variants']) == 1
    # End_overlap seq embedded variants should be positioned correctly
    assert end_overlap_sequence_info['embedded_variants'][0].rel_start == 118
    assert end_overlap_sequence_info['embedded_variants'][0].rel_end == 124
    assert end_overlap_sequence_info['embedded_variants'][0].variant_id == end_overlap_mutation.variant_id


def test_get_alt_sequence_inframe_only(wb_variant_gk787530, wb_c42d8_1_1_cds_regions) -> None:
    ref_sequence = wb_c42d8_1_1_cds_regions[0].get_sequence()
    alt_sequence_info = wb_c42d8_1_1_cds_regions[0].get_alt_sequence(variants=[wb_variant_gk787530])

    # Phase 0 alt sequence
    assert ref_sequence                  == 'ATGTCGATGTATGGCAAAGACAAGGCGTATATCGAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'  # noqa: E221
    assert alt_sequence_info['sequence'] == 'ATGTCGATGTATGGCAAAGACAAGGCGTATATCAAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'

    # Phase 0 alt seq should have one embedded variant
    assert len(alt_sequence_info['embedded_variants']) == 1
    # Phase 0 alt seq embedded variants should be positioned correctly
    assert alt_sequence_info['embedded_variants'][0].rel_start == 34
    assert alt_sequence_info['embedded_variants'][0].rel_end == 34
    assert alt_sequence_info['embedded_variants'][0].variant_id == wb_variant_gk787530.variant_id

    phase_2_region = wb_c42d8_1_1_cds_regions[0].sub_region(rel_start=2, rel_end=wb_c42d8_1_1_cds_regions[0].seq_length)
    phase_2_ref_sequence = phase_2_region.get_sequence()
    phase_2_alt_sequence_info = phase_2_region.get_alt_sequence(variants=[wb_variant_gk787530])
    phase_2_alt_inframe_sequence_info = phase_2_region.get_alt_sequence(variants=[wb_variant_gk787530], inframe_only=True)

    # Phase 2 alt sequence
    assert phase_2_ref_sequence                  == 'TGTCGATGTATGGCAAAGACAAGGCGTATATCGAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'  # noqa: E221
    assert phase_2_alt_sequence_info['sequence'] == 'TGTCGATGTATGGCAAAGACAAGGCGTATATCAAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'
    assert phase_2_alt_inframe_sequence_info['sequence'] == 'TCGATGTATGGCAAAGACAAGGCGTATATCAAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'

    # Phase 2 alt seq should have one embedded variant
    assert len(phase_2_alt_sequence_info['embedded_variants']) == 1
    # Phase 2 alt seq embedded variants should be positioned correctly
    assert phase_2_alt_sequence_info['embedded_variants'][0].rel_start == 33
    assert phase_2_alt_sequence_info['embedded_variants'][0].rel_end == 33
    assert phase_2_alt_sequence_info['embedded_variants'][0].variant_id == wb_variant_gk787530.variant_id
