"""
Unit testing for MultiPartSeqRegion class and related functions
"""

from seq_region import SeqRegion, MultiPartSeqRegion


FASTA_FILE_URL = 'file://tests/resources/GCF_000002985.6_WBcel235_genomic_X.fna.gz'


def test_multipart_seq_region_class():

    # WBGene00000149 Transcript:C42D8.8b.1 Exon 1 (mRNA start)
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5116799, end=5116864, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)
    EXON_1_SEQ = 'atgACGGTGGGTAAACTAATGATTGGCTTACTTATACCGATTCTTGTCGCCACAGTTTACGCAGAG'

    # WBGene00000149 Transcript:C42D8.8b.1 Exon 2
    exon_2: SeqRegion = SeqRegion(seq_id='X', start=5116171, end=5116338, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)
    EXON_2_SEQ = 'ggTTCCCCAGCAGGCAGCAAGCGACATGAGAAGTTCATTCCAATGGTCGCATTTTCATGTGGATACCGCAACCAGTATATGACCGAAGAGGGATCATGGAAGACTGATGATGAACGATATGCCACCTGCTTCTCTGGCAAACTTGACATCCTCAAGTACTGCCGCAAG'

    # WBGene00000149 Transcript:C42D8.8b.1 Exon 3
    exon_3: SeqRegion = SeqRegion(seq_id='X', start=5115556, end=5115682, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)
    EXON_3_SEQ = 'GCTTATCCATCCATGAACATCACCAACATCGTCGAATACTCGCACGAAGTGAGCATCTCCGACTGGTGCCGCGAGGAAGGATCGCCATGCAAGTGGACTCACAGTGTCAGACCGTACCATTGCATTG'

    seq_region_list = [exon_1, exon_2, exon_3]

    for seq_region in seq_region_list:
        seq_region.fetch_seq()

    multipart_seq_region = MultiPartSeqRegion(seq_region_list)

    multipart_seq_region.fetch_seq()

    chained_seq: str = multipart_seq_region.get_sequence()

    assert isinstance(chained_seq, str)
    assert chained_seq == EXON_1_SEQ + EXON_2_SEQ + EXON_3_SEQ
