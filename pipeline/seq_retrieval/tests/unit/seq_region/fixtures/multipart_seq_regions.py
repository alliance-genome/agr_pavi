"""
MultipartSeqRegion fixtures for unit testing
"""

from seq_region import SeqRegion, MultiPartSeqRegion

import pytest


FASTA_FILE_URL = 'file://tests/resources/GCF_000002985.6_WBcel235_genomic_X.fna.gz'


@pytest.fixture
def multipart_WB_transcript1() -> MultiPartSeqRegion:
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
