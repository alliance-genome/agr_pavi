"""
Unit testing for SeqRegion class and related functions
"""

from Bio import Seq
import logging
import pytest

from seq_region import SeqRegion, Variant
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
    alt_sequence = wb_c42d8_1_1_cds_regions[0].get_alt_sequence(variants=[wb_variant_gk787530])

    # Sequence before variant must be identical
    assert ref_sequence[0:33] == alt_sequence[0:33]
    # Sequence at variant position must match expected ref/alt sequence
    assert ref_sequence[33:34] == wb_variant_gk787530.genomic_ref_seq
    assert alt_sequence[33:34] == wb_variant_gk787530.genomic_alt_seq
    # Sequence after variant must be identical
    assert ref_sequence[34:] == alt_sequence[34:]


def test_get_alt_sequence_deletion(wb_variant_kx29, wb_f59f5_2a_1_exon10) -> None:
    ref_sequence = wb_f59f5_2a_1_exon10.get_sequence()
    alt_sequence = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[wb_variant_kx29])

    # Sequence before variant must be identical
    assert ref_sequence[0:44] == alt_sequence[0:44]
    # Sequence at variant position must match expected ref sequence
    assert ref_sequence[44:45] == wb_variant_kx29.genomic_ref_seq
    # Sequence after variant must be identical
    assert ref_sequence[45:] == alt_sequence[44:]


def test_get_alt_sequence_insertion(wb_variant_ce338, c14f11_3_1_exon5) -> None:
    # Variant insertion at negative strand
    ref_sequence = c14f11_3_1_exon5.get_sequence()
    alt_sequence = c14f11_3_1_exon5.get_alt_sequence(variants=[wb_variant_ce338])

    assert len(alt_sequence) == len(ref_sequence) + 1

    # Sequence before variant must be identical
    assert ref_sequence[0:96] == alt_sequence[0:96]
    # Sequence at variant position must match expected alt sequence
    assert alt_sequence[96:97] == Seq.reverse_complement(wb_variant_ce338.genomic_alt_seq)
    # Sequence after variant must be identical
    assert ref_sequence[96:] == alt_sequence[97:]

    # Complete sequence comparison (belts and braces)
    assert ref_sequence == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'
    assert alt_sequence == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGTGCTCTTACCATGGCGGCCACCTACGCCA'


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
    alt1_sequence = c14f11_3_1_exon5.get_alt_sequence(variants=[insert_start, mutation])
    alt2_sequence = c14f11_3_1_exon5.get_alt_sequence(variants=[insert_end, mutation])
    alt3_sequence = c14f11_3_1_exon5.get_alt_sequence(variants=[insert_start, insert_end, mutation])

    assert ref_sequence  == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E221
    assert alt1_sequence == 'ACTTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTGTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'
    assert alt2_sequence == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTGTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCTTTA'
    assert alt3_sequence == 'ACTTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTGTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCTTTA'


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
    alt1_sequence = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[insert_start, mutation])
    alt2_sequence = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[delete_end, mutation])
    alt3_sequence = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[insert_start, delete_end, mutation])

    assert ref_sequence  == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'  # noqa: E221
    assert alt1_sequence == 'ATCGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTAggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'
    assert alt2_sequence == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTAggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAAT'
    assert alt3_sequence == 'ATCGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTAggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAAT'


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
    overspan_sequence = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[overspanning_deletion])
    start_overlap_sequence = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[start_overlap_deletion])
    end_overlap_sequence = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[end_overlap_deletion])

    assert ref_sequence           == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'  # noqa: E221
    assert overspan_sequence      == ''  # noqa: E221
    assert start_overlap_sequence ==         'TCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'  # noqa: E222
    assert end_overlap_sequence   == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTA'  # noqa: E221


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
    overspan_sequence = c14f11_3_1_exon5.get_alt_sequence(variants=[overspanning_deletion])
    start_overlap_sequence = c14f11_3_1_exon5.get_alt_sequence(variants=[start_overlap_deletion])
    end_overlap_sequence = c14f11_3_1_exon5.get_alt_sequence(variants=[end_overlap_deletion])

    assert ref_sequence           == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E221
    assert overspan_sequence      == ''  # noqa: E221
    assert start_overlap_sequence ==         'CCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E222
    assert end_overlap_sequence   == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACC'  # noqa: E221


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
    overspan_sequence = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[overspanning_mutation])
    start_overlap_sequence = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[start_overlap_mutation])
    end_overlap_sequence = wb_f59f5_2a_1_exon10.get_alt_sequence(variants=[end_overlap_mutation])

    assert ref_sequence           == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'  # noqa: E221
    assert overspan_sequence      == 'GGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGAAAGGGA'  # noqa: E221
    assert start_overlap_sequence == 'GGGGAAAGTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAGGAATAg'  # noqa: E222
    assert end_overlap_sequence   == 'ACGATGACTCAAAAAATGGATATTCTACTTTCCTACGGAAAAAAGCAAATTAATTCATTGATACAAGAGCTGTGTTCTATAAGTATTGCTAATGCGAAACTATCTACACTCCCTCTATTCAATCAGTGCTtggaaaaaactgtaaaaccGAACTCAGTCAAAGCCGTTGATTCTTTAAAAGGGA'  # noqa: E221


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
    overspan_sequence = c14f11_3_1_exon5.get_alt_sequence(variants=[overspanning_mutation])
    start_overlap_sequence = c14f11_3_1_exon5.get_alt_sequence(variants=[start_overlap_mutation])
    end_overlap_sequence = c14f11_3_1_exon5.get_alt_sequence(variants=[end_overlap_mutation])

    assert ref_sequence           == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E221
    assert overspan_sequence      == 'CCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCGGCCCG'  # noqa: E221
    assert start_overlap_sequence == 'CCCGGCCCCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCTACGCCA'  # noqa: E222
    assert end_overlap_sequence   == 'ATTTTGTGCCAGTTTTCGTTGAATGTTCGTACCAAACAAGCCGAGCGTCGTCAATTTATGATCAACACTTTTTTGGCTGTTTTCAGTGGACTTTTGGCTCTTACCATGGCGGCCACCCGGCCCG'  # noqa: E221


def test_get_alt_sequence_inframe_only(wb_variant_gk787530, wb_c42d8_1_1_cds_regions) -> None:
    ref_sequence = wb_c42d8_1_1_cds_regions[0].get_sequence()
    alt_sequence = wb_c42d8_1_1_cds_regions[0].get_alt_sequence(variants=[wb_variant_gk787530])

    # Phase 0 alt sequence
    assert ref_sequence == 'ATGTCGATGTATGGCAAAGACAAGGCGTATATCGAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'
    assert alt_sequence == 'ATGTCGATGTATGGCAAAGACAAGGCGTATATCAAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'

    phase_2_region = wb_c42d8_1_1_cds_regions[0].sub_region(rel_start=2, rel_end=wb_c42d8_1_1_cds_regions[0].seq_length)
    phase_2_ref_sequence = phase_2_region.get_sequence()
    phase_2_alt_sequence = phase_2_region.get_alt_sequence(variants=[wb_variant_gk787530])
    phase_2_alt_inframe_sequence = phase_2_region.get_alt_sequence(variants=[wb_variant_gk787530], inframe_only=True)

    # Phase 2 alt sequence
    assert phase_2_ref_sequence == 'TGTCGATGTATGGCAAAGACAAGGCGTATATCGAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'
    assert phase_2_alt_sequence == 'TGTCGATGTATGGCAAAGACAAGGCGTATATCAAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'
    assert phase_2_alt_inframe_sequence == 'TCGATGTATGGCAAAGACAAGGCGTATATCAAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'
