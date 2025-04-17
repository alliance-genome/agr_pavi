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
    # WBVar01145173 - gk787530 - NC_003284.9:g.5109543G>A - point mutation
    return Variant(variant_id='NC_003284.9:g.5109543G>A',
                   seq_id='X', start=5109543, end=5109543,
                   genomic_ref_seq='G', genomic_alt_seq='A')


@pytest.fixture
def wb_variant_kx29() -> Variant:
    # WB:WBVar00088371 - kx29 - NC_003284.9:g.10536447_10536447del - deletion
    return Variant(variant_id='NC_003284.9:g.10536447_10536447del',
                   seq_id='X', start=10536447, end=10536447,
                   genomic_ref_seq='G')


@pytest.fixture
def wb_variant_ce338() -> Variant:
    # WB:WBVar00054047 - ce338 - NC_003284.9:g.6228001_6228002insA - insertion
    return Variant(variant_id='NC_003284.9:g.6228001_6228002insA',
                   seq_id='X', start=6228001, end=6228002,
                   genomic_alt_seq='A')


@pytest.fixture
def wb_variant_e1178() -> Variant:
    # WB:WBVar00143804 - e1178 - NC_003284.9:g.10517603_10517604insC - insertion
    return Variant(variant_id='NC_003284.9:g.10517603_10517604insC',
                   seq_id='X', start=10517603, end=10517604,
                   genomic_ref_seq='',
                   genomic_alt_seq='C')
