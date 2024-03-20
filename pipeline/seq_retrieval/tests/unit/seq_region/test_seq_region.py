"""
Unit testing for SeqRegion class and related functions
"""

from seq_region import SeqRegion


FASTA_FILE_URL = 'file://tests/resources/GCF_000002985.6_WBcel235_genomic_X.fna.gz'


def test_seq_region_class_neg_strand():

    # WBGene00000149 Transcript:C42D8.8b.1 Exon 1 (mRNA start)
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5116799, end=5116864, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)

    assert isinstance(exon_1, SeqRegion)

    exon_1.fetch_seq()
    exon_1_seq: str = exon_1.get_sequence()

    assert isinstance(exon_1_seq, str)
    assert exon_1_seq == 'atgACGGTGGGTAAACTAATGATTGGCTTACTTATACCGATTCTTGTCGCCACAGTTTACGCAGAG'


def test_seq_region_class_pos_strand():

    # WBGene00016599 Transcript:C42D8.1.1 Exon 1 (mRNA start)
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5109506, end=5109644, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    assert isinstance(exon_1, SeqRegion)

    exon_1.fetch_seq()
    exon_1_seq: str = exon_1.get_sequence()

    assert isinstance(exon_1_seq, str)
    assert exon_1_seq == 'aacCATGTCGATGTATGGCAAAGACAAGGCGTATATCGAGAATGAGACAAAGTTTCGAGCAGACAGAGATTACTTGAGCCAGCCTGTCTATCAACAAACTGTCTATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAG'
