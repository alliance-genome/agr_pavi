"""
SeqRegion fixtures for unit testing
"""

from seq_region import SeqRegion

from typing import List
import pytest


FASTA_FILE_URL = 'file://tests/resources/GCF_000002985.6_WBcel235_genomic_X.fna.gz'


@pytest.fixture
def wb_c54h2_5_1_exons() -> List[SeqRegion]:
    # WBGene00004788 Transcript:C54H2.5.1
    return [
        # Exon 1 (mRNA start)
        SeqRegion(seq_id='X', start=5780644, end=5780722, strand='-',
                  fasta_file_url=FASTA_FILE_URL),
        # Exon 2
        SeqRegion(seq_id='X', start=5780278, end=5780585, strand='-',
                  fasta_file_url=FASTA_FILE_URL),
        # Exon 3
        SeqRegion(seq_id='X', start=5779920, end=5780231, strand='-',
                  fasta_file_url=FASTA_FILE_URL),
        # Exon 4
        SeqRegion(seq_id='X', start=5778875, end=5779453, strand='-',
                  fasta_file_url=FASTA_FILE_URL)
    ]


@pytest.fixture
def wb_c54h2_5_1_cds_regions() -> List[SeqRegion]:
    # WBGene00004788 Transcript:C54H2.5.1
    return [
        # CDS 1 (coding region start)
        SeqRegion(seq_id='X', start=5780644, end=5780712, frame=0, strand='-',
                  fasta_file_url=FASTA_FILE_URL),
        # CDS 2
        SeqRegion(seq_id='X', start=5780278, end=5780585, frame=0, strand='-',
                  fasta_file_url=FASTA_FILE_URL),
        # CDS 3
        SeqRegion(seq_id='X', start=5779920, end=5780231, frame=1, strand='-',
                  fasta_file_url=FASTA_FILE_URL),
        # CDS 4
        SeqRegion(seq_id='X', start=5779309, end=5779453, frame=1, strand='-',
                  fasta_file_url=FASTA_FILE_URL)
    ]


@pytest.fixture
def wb_c42d8_1_1_exons() -> List[SeqRegion]:
    # WB:WBGene00016599 Transcript:C42D8.1.1
    return [
        # Exon 1 (mRNA start)
        SeqRegion(seq_id='X', start=5109506, end=5109644, strand='+',
                  fasta_file_url=FASTA_FILE_URL),

        # Exon 2
        SeqRegion(seq_id='X', start=5110473, end=5110556, strand='+',
                  fasta_file_url=FASTA_FILE_URL),

        # Exon 3
        SeqRegion(seq_id='X', start=5110610, end=5110708, strand='+',
                  fasta_file_url=FASTA_FILE_URL),

        # Exon 4
        SeqRegion(seq_id='X', start=5110762, end=5110869, strand='+',
                  fasta_file_url=FASTA_FILE_URL),

        # Exon 5
        SeqRegion(seq_id='X', start=5111054, end=5111200, strand='+',
                  fasta_file_url=FASTA_FILE_URL),

        # Exon 6
        SeqRegion(seq_id='X', start=5111250, end=5111309, strand='+',
                  fasta_file_url=FASTA_FILE_URL),

        # Exon 7
        SeqRegion(seq_id='X', start=5111423, end=5111473, strand='+',
                  fasta_file_url=FASTA_FILE_URL),

        # Exon 8
        SeqRegion(seq_id='X', start=5112256, end=5112426, strand='+',
                  fasta_file_url=FASTA_FILE_URL)
    ]


@pytest.fixture
def wb_c42d8_1_1_cds_regions() -> List[SeqRegion]:
    # WB:WBGene00016599 Transcript:C42D8.1.1
    return [
        # CDS region 1 (coding region start)
        SeqRegion(seq_id='X', start=5109510, end=5109644, strand='+',
                  frame=0, fasta_file_url=FASTA_FILE_URL),

        # CDS region 2
        SeqRegion(seq_id='X', start=5110473, end=5110556, strand='+',
                  frame=0, fasta_file_url=FASTA_FILE_URL),

        # CDS region 3
        SeqRegion(seq_id='X', start=5110610, end=5110708, strand='+',
                  frame=0, fasta_file_url=FASTA_FILE_URL),

        # CDS region 4
        SeqRegion(seq_id='X', start=5110762, end=5110869, strand='+',
                  frame=0, fasta_file_url=FASTA_FILE_URL),

        # CDS region 5
        SeqRegion(seq_id='X', start=5111054, end=5111200, strand='+',
                  frame=0, fasta_file_url=FASTA_FILE_URL),

        # CDS region 6
        SeqRegion(seq_id='X', start=5111250, end=5111309, strand='+',
                  frame=0, fasta_file_url=FASTA_FILE_URL),

        # CDS region 7
        SeqRegion(seq_id='X', start=5111423, end=5111473, strand='+',
                  frame=0, fasta_file_url=FASTA_FILE_URL),

        # CDS region 8
        SeqRegion(seq_id='X', start=5112256, end=5112330, strand='+',
                  frame=0, fasta_file_url=FASTA_FILE_URL)
    ]
