"""
Unit testing for SeqRegion class and related functions
"""

from seq_region import SeqRegion


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

    # gk787530 - point mutation (overlap)
    gk803418: SeqRegion = SeqRegion(seq_id='X', start=5109543, end=5109543,
                                    fasta_file_url=FASTA_FILE_URL)

    assert exon_1.overlaps(gk803418) is True

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


def test_get_alt_sequence_mutation(wb_variant_gk803418, wb_c42d8_1_1_cds_regions) -> None:
    ref_sequence = wb_c42d8_1_1_cds_regions[0].get_sequence()
    alt_sequence = wb_c42d8_1_1_cds_regions[0].get_alt_sequence(variants=[wb_variant_gk803418])

    # Sequence before variant must be identical
    assert ref_sequence[0:33] == alt_sequence[0:33]
    # Sequence at variant position must match expected ref/alt sequence
    assert ref_sequence[33:34] == wb_variant_gk803418.genomic_ref_seq
    assert alt_sequence[33:34] == wb_variant_gk803418.genomic_alt_seq
    # Sequence after variant must be identical
    assert ref_sequence[34:] == alt_sequence[34:]
