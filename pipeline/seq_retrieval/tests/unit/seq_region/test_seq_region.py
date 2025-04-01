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


def test_seq_region_class_pos_strand() -> None:

    # WBGene00016599 Transcript:C42D8.1.1 Exon 1 (mRNA start)
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5109506, end=5109644, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    assert isinstance(exon_1, SeqRegion)

    exon_1_seq: str = exon_1.get_sequence()

    assert isinstance(exon_1_seq, str)
    assert exon_1_seq == 'aacCATGTCGATGTATGGCAAAGACAAGGCGTATATCGAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'


def test_seq_region_overlap() -> None:

    # WBGene00016599 Transcript:C42D8.1.1 Exon 1 (mRNA start)
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5109506, end=5109644, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    # gk787530 - point mutation (overlap)
    gk803418: SeqRegion = SeqRegion(seq_id='X', start=5109543, end=5109543, strand='+',
                                    fasta_file_url=FASTA_FILE_URL)

    assert exon_1.overlaps(gk803418) is True

    # gk320952 - splice region variant (no overlap)
    gk320952: SeqRegion = SeqRegion(seq_id='X', start=5110758, end=5110758, strand='+',
                                    fasta_file_url=FASTA_FILE_URL)

    assert exon_1.overlaps(gk320952) is False

    # WBGene00016599 Transcript:C42D8.1.1 Exon 8 (mRNA end)
    exon_8: SeqRegion = SeqRegion(seq_id='X', start=5112256, end=5112426, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)
    # Transcript:C42D8.8a.1 Exon 11 (overlap on opposite strand)
    opp_strand_exon: SeqRegion = SeqRegion(seq_id='X', start=5112422, end=5113420, strand='-',
                                           fasta_file_url=FASTA_FILE_URL)
    same_strand_exon: SeqRegion = SeqRegion(seq_id='X', start=5112422, end=5113420, strand='+',
                                            fasta_file_url=FASTA_FILE_URL)

    assert exon_8.overlaps(opp_strand_exon) is False
    assert exon_8.overlaps(same_strand_exon) is True
