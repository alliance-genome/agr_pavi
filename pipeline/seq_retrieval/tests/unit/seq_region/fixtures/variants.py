"""
Variant fixtures for unit testing
"""

import pytest

from seq_region import Variant


@pytest.fixture
def wb_variant_yn32() -> Variant:
    # NC_003284.9:g.5114224C>T - yn32
    return Variant(variant_id='NC_003284.9:g.5114224C>T', seq_id='X', start=5114224, end=5114224,
                   genomic_ref_seq='C', genomic_alt_seq='T')


@pytest.fixture
def wb_variant_yn30() -> Variant:
    # NC_003284.9:g.5115346G>A - yn30
    return Variant(variant_id='NC_003284.9:g.5115346G>A', seq_id='X', start=5115346, end=5115346,
                   genomic_ref_seq='G', genomic_alt_seq='A')


@pytest.fixture
def wb_variant_yn10() -> Variant:
    # NC_003284.9:g.5113285_5115215del - yn10
    return Variant(variant_id='NC_003284.9:g.5113285_5115215del', seq_id='X', start=5113285, end=5115215,
                   genomic_ref_seq='CCAGGACGTATGGTTGGAAGACGCTGGACGCTGAACGCTCGACTTCTGGTGATTGGATGAGCTTGTCGTGGCGGTAGAATGAGGCTGGCTCATCGATGATCGGCTCAATGTCGACACGAAGCTCTTTGATGTTTTTCTGAAAAATGCAAACAATTAAATTAATATGAAGATTGGAAACCCTTACGTCTTCATCTTCATCAGATTCGGATGAAGTGGACGAGGAAGAGTCCTCATCATCGTCCTCATCATCAGTTTGTACTGATGTTTCCACCAATTTTGGAGCCTTCTTCTCCTCTTCTATTGTGACCTTGATCTGAAAGTTCCATAAATTACAGATAAACTTTCAGAATTTTTTCAACGCCTACCTCCTTTGGCTTGATGTCAACAACCTTGACCTTCTTCTTCATGTCAGGTGTCTTCTTAACTTGCTCATCATCTTCATCCTCGTAATATTCATCAGCTTCCTCCTCGGAGTCAGATGCTTCGGTTGGGAGAACCTTAGCATTGTCGGTTTCCTTGACTGGCTTGGCGGTGGTTGTTGGAGCCTTCACGTCAAGTTTGGCGCTGAAAAACGCTTGTAATGAATGCTATGGAAAAGCGGAGTCTTTCTTACTTTTTGCTGAACTCATCATCGTGGATGATTGGAGTGAGTTCACTGTCCTCAACTGAGATATCTGGTGACACCTCGTCTCTGTAGTCCTTCCAGTAGGTGACTGCAATTGGACGGACATATTTCTCAAGATCTGGGAAGTCGCGAAGCATCGCAAGAGTTCCGTTGATGCGAAGATCGATGTAGCTAAATAAATTTTAGTTTAATCAGGAATGTTTGATTCTATTACCGAAGCCGATGAATAACGGTTGGCTTGTATGCGGCAGCTTCCTTTGAATCGGCCTTCAGCAAGTGACGGTATCTGTTCAAAGTGTGCATGCGATCCTTCTCCTCTGCACGGATGTAAGCCTTAAGAGATTGGAGAACAGAGTGCTTGTTTGGCTTGTTGACGTGAGTAGCGAGAGCTTGACGATAATCGTGTGTAGCCTGAAAAAACACATTATTTAGTTTATGTTGTCTTACTTCGCCTAAGTTCTTACATCTCTCTTCTTCTCGTTAAGCATTGCCTGAACACGCTCCTCATGAACCGCCTCGATCTCCTTTCGCATTCTCTTGTGCTCTTCTTCGAGCGAAGAAACGGTCTTCTGGAAGCGGGCGTTCATTTGAGACTTGAACTTCTCGGCTCCCTTTGGATCCTTGGCCTTTTGCTCGTTGTATCTCGTCTCCAAATCTCCCCACTCCTTCATCACCTGAATATTCATAGTTTGTGTCATGCAATAATTTTTAATTAAAAGTCTTTTTTAACTTCAAAGAAGATTCAATTTGCGAAAGTGGTATCTAATACTAATTCCATAGTCTTCCCTTAAATCATTATCCACTTGATCTCACCTTGTCAACCTTCTTTCTGTGCTTCTCATCCATTCTCATTTCTGCCTTCTTAAAATCGTCGTGCTCGTTGGTCCAGTTGGCAATCTTGAAGTATGGATCTTGGGAACTTGGTTCCTCTTCGTCCTTCTCGTCGGCTGAAAATAAAAAATATAATCTTTAATTAGAAAAAAGAATTATCGTTTCTTACACTCTTCTGAGTAATCATCCTCATAAGCATCATCCTCATCGTCGTCGTCGTCTTCGTCTTCTTTAGTTTTTTGAACATCAGTCTTGTTCGTTTCTGCAGAGAAAAAAAATGATGAATGATCTACTTTCCGTTAATCCCTCTACTTAATGTTTTTATTTCCACCGTACTAAGTCATATCATCTTATGACACTTACAACTGACTCATCTGGAAACTGTCATGGTAACTTACGGTCATTTGGACAGCAGACGAATTCAACACCGGTGAACATGTCGAGTGCGCATGGCTCAAGAACGGCAAATGATCTG',
                   genomic_alt_seq='')


@pytest.fixture
def wb_variant_gk803418() -> Variant:
    # WBVar01145173 - gk787530 - NC_003284.9:g.5109543G>A - point mutation (overlap)
    return Variant(variant_id='NC_003284.9:g.5109543G>A',
                   seq_id='X', start=5109543, end=5109543,
                   genomic_ref_seq='G', genomic_alt_seq='A')
