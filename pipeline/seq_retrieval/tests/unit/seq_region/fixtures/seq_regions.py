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


@pytest.fixture
def wb_zc506_4a_1_exons() -> List[SeqRegion]:
    # WBGene00003232 Transcript:ZC506.4a.1
    return [
        SeqRegion(seq_id='X', start=9975783, end=9976017, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9973922, end=9974005, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9973799, end=9973834, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9973090, end=9973196, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9972951, end=9973032, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9972797, end=9972906, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9972486, end=9972674, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9972331, end=9972440, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9972101, end=9972215, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9971651, end=9972022, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9971183, end=9971279, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9970990, end=9971137, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9970778, end=9970941, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9970619, end=9970720, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9970339, end=9970577, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9969791, end=9970049, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9969676, end=9969748, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9969386, end=9969633, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9969191, end=9969336, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9968517, end=9968788, strand='-', fasta_file_url=FASTA_FILE_URL),
    ]


@pytest.fixture
def wb_zc506_4a_1_cds_regions() -> List[SeqRegion]:
    # WBGene00003232 Transcript:ZC506.4a.1
    return [
        SeqRegion(seq_id='X', start=9975783, end=9975791, frame=0, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9973922, end=9974005, frame=0, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9973799, end=9973834, frame=0, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9973090, end=9973196, frame=0, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9972951, end=9973032, frame=1, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9972797, end=9972906, frame=0, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9972486, end=9972674, frame=1, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9972331, end=9972440, frame=1, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9972101, end=9972215, frame=2, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9971651, end=9972022, frame=1, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9971183, end=9971279, frame=1, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9970990, end=9971137, frame=0, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9970778, end=9970941, frame=2, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9970619, end=9970720, frame=0, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9970339, end=9970577, frame=0, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9969791, end=9970049, frame=1, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9969676, end=9969748, frame=0, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9969386, end=9969633, frame=2, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9969191, end=9969336, frame=0, strand='-', fasta_file_url=FASTA_FILE_URL),
        SeqRegion(seq_id='X', start=9968629, end=9968788, frame=1, strand='-', fasta_file_url=FASTA_FILE_URL),
    ]


@pytest.fixture
def wb_f59f5_2a_1_exon10() -> SeqRegion:
    # WB:WBGene00010341 - Transcript:F59F5.2a.1 - exon 10
    return SeqRegion(seq_id='X', start=10536403, end=10536586, strand='+', fasta_file_url=FASTA_FILE_URL)


@pytest.fixture
def c14f11_3_1_exon7() -> SeqRegion:
    # WB:WBGene00001803 - Transcript:C14F11.3.1 - exon 7
    return SeqRegion(seq_id='X', start=6227974, end=6228097, strand='-', fasta_file_url=FASTA_FILE_URL)
