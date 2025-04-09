"""
MultipartSeqRegion fixtures for unit testing
"""

from seq_region import SeqRegion, MultiPartSeqRegion

import pytest


FASTA_FILE_URL = 'file://tests/resources/GCF_000002985.6_WBcel235_genomic_X.fna.gz'


@pytest.fixture
def wb_cdna_c54h2_5_1() -> MultiPartSeqRegion:
    ## Test Class initiation
    # WBGene00000149 Transcript:C54H2.5.1
    # Exon 1 (mRNA start)
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5780644, end=5780722, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)

    # Exon 2
    exon_2: SeqRegion = SeqRegion(seq_id='X', start=5780278, end=5780585, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)

    # Exon 3
    exon_3: SeqRegion = SeqRegion(seq_id='X', start=5779920, end=5780231, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)

    # Exon 4
    exon_4: SeqRegion = SeqRegion(seq_id='X', start=5778875, end=5779453, strand='-',
                                  fasta_file_url=FASTA_FILE_URL)

    seq_region_list = [exon_1, exon_2, exon_3, exon_4]

    return MultiPartSeqRegion(seq_region_list)


@pytest.fixture
def wb_cdna_c42d8_1_1() -> MultiPartSeqRegion:
    # WB:WBGene00016599 Transcript:C42D8.1.1
    # Exon 1 (mRNA start)
    exon_1: SeqRegion = SeqRegion(seq_id='X', start=5109506, end=5109644, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    # Exon 2
    exon_2: SeqRegion = SeqRegion(seq_id='X', start=5110473, end=5110556, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    # Exon 3
    exon_3: SeqRegion = SeqRegion(seq_id='X', start=5110610, end=5110708, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    # Exon 4
    exon_4: SeqRegion = SeqRegion(seq_id='X', start=5110762, end=5110869, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    # Exon 5
    exon_5: SeqRegion = SeqRegion(seq_id='X', start=5111054, end=5111200, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    # Exon 6
    exon_6: SeqRegion = SeqRegion(seq_id='X', start=5111250, end=5111309, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    # Exon 7
    exon_7: SeqRegion = SeqRegion(seq_id='X', start=5111423, end=5111473, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    # Exon 8
    exon_8: SeqRegion = SeqRegion(seq_id='X', start=5112256, end=5112426, strand='+',
                                  fasta_file_url=FASTA_FILE_URL)

    seq_region_list = [exon_1, exon_2, exon_3, exon_4, exon_5, exon_6, exon_7, exon_8]

    return MultiPartSeqRegion(seq_region_list)
