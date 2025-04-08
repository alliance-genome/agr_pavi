"""
Unit testing for Variant class and related functions
"""

from src.seq_region import Variant, variants_overlap

import pytest

import json
import responses  # requests mocking library
from typing import Any


FASTA_FILE_URL = 'file://tests/resources/GCF_000002985.6_WBcel235_genomic_X.fna.gz'


@pytest.fixture
def wb_variant_yn32() -> Variant:
    ## Test Class initiation
    # NC_003284.9:g.5114224C>T - yn32
    return Variant(variant_id='NC_003284.9:g.5114224C>T', seq_id='X', start=5114224, end=5114224,
                   genomic_ref_seq='C', genomic_alt_seq='T')


@pytest.fixture
def wb_variant_yn30() -> Variant:
    ## Test Class initiation
    # NC_003284.9:g.5115346G>A - yn30
    return Variant(variant_id='NC_003284.9:g.5115346G>A', seq_id='X', start=5115346, end=5115346,
                   genomic_ref_seq='G', genomic_alt_seq='A')


@pytest.fixture
def wb_variant_yn10() -> Variant:
    # NC_003284.9:g.5113285_5115215del - yn10
    return Variant(variant_id='NC_003284.9:g.5113285_5115215del', seq_id='X', start=5113285, end=5115215,
                   genomic_ref_seq='CCAGGACGTATGGTTGGAAGACGCTGGACGCTGAACGCTCGACTTCTGGTGATTGGATGAGCTTGTCGTGGCGGTAGAATGAGGCTGGCTCATCGATGATCGGCTCAATGTCGACACGAAGCTCTTTGATGTTTTTCTGAAAAATGCAAACAATTAAATTAATATGAAGATTGGAAACCCTTACGTCTTCATCTTCATCAGATTCGGATGAAGTGGACGAGGAAGAGTCCTCATCATCGTCCTCATCATCAGTTTGTACTGATGTTTCCACCAATTTTGGAGCCTTCTTCTCCTCTTCTATTGTGACCTTGATCTGAAAGTTCCATAAATTACAGATAAACTTTCAGAATTTTTTCAACGCCTACCTCCTTTGGCTTGATGTCAACAACCTTGACCTTCTTCTTCATGTCAGGTGTCTTCTTAACTTGCTCATCATCTTCATCCTCGTAATATTCATCAGCTTCCTCCTCGGAGTCAGATGCTTCGGTTGGGAGAACCTTAGCATTGTCGGTTTCCTTGACTGGCTTGGCGGTGGTTGTTGGAGCCTTCACGTCAAGTTTGGCGCTGAAAAACGCTTGTAATGAATGCTATGGAAAAGCGGAGTCTTTCTTACTTTTTGCTGAACTCATCATCGTGGATGATTGGAGTGAGTTCACTGTCCTCAACTGAGATATCTGGTGACACCTCGTCTCTGTAGTCCTTCCAGTAGGTGACTGCAATTGGACGGACATATTTCTCAAGATCTGGGAAGTCGCGAAGCATCGCAAGAGTTCCGTTGATGCGAAGATCGATGTAGCTAAATAAATTTTAGTTTAATCAGGAATGTTTGATTCTATTACCGAAGCCGATGAATAACGGTTGGCTTGTATGCGGCAGCTTCCTTTGAATCGGCCTTCAGCAAGTGACGGTATCTGTTCAAAGTGTGCATGCGATCCTTCTCCTCTGCACGGATGTAAGCCTTAAGAGATTGGAGAACAGAGTGCTTGTTTGGCTTGTTGACGTGAGTAGCGAGAGCTTGACGATAATCGTGTGTAGCCTGAAAAAACACATTATTTAGTTTATGTTGTCTTACTTCGCCTAAGTTCTTACATCTCTCTTCTTCTCGTTAAGCATTGCCTGAACACGCTCCTCATGAACCGCCTCGATCTCCTTTCGCATTCTCTTGTGCTCTTCTTCGAGCGAAGAAACGGTCTTCTGGAAGCGGGCGTTCATTTGAGACTTGAACTTCTCGGCTCCCTTTGGATCCTTGGCCTTTTGCTCGTTGTATCTCGTCTCCAAATCTCCCCACTCCTTCATCACCTGAATATTCATAGTTTGTGTCATGCAATAATTTTTAATTAAAAGTCTTTTTTAACTTCAAAGAAGATTCAATTTGCGAAAGTGGTATCTAATACTAATTCCATAGTCTTCCCTTAAATCATTATCCACTTGATCTCACCTTGTCAACCTTCTTTCTGTGCTTCTCATCCATTCTCATTTCTGCCTTCTTAAAATCGTCGTGCTCGTTGGTCCAGTTGGCAATCTTGAAGTATGGATCTTGGGAACTTGGTTCCTCTTCGTCCTTCTCGTCGGCTGAAAATAAAAAATATAATCTTTAATTAGAAAAAAGAATTATCGTTTCTTACACTCTTCTGAGTAATCATCCTCATAAGCATCATCCTCATCGTCGTCGTCGTCTTCGTCTTCTTTAGTTTTTTGAACATCAGTCTTGTTCGTTTCTGCAGAGAAAAAAAATGATGAATGATCTACTTTCCGTTAATCCCTCTACTTAATGTTTTTATTTCCACCGTACTAAGTCATATCATCTTATGACACTTACAACTGACTCATCTGGAAACTGTCATGGTAACTTACGGTCATTTGGACAGCAGACGAATTCAACACCGGTGAACATGTCGAGTGCGCATGGCTCAAGAACGGCAAATGATCTG',
                   genomic_alt_seq='')


def test_variant_from_id_initiation(wb_variant_yn10: Variant) -> None:
    """
    Test Variant class initiation from variant ID.
    """
    VARIANT_ID = 'NC_003284.9:g.5113285_5115215del'
    variant_data: Any
    with open(f'tests/resources/{VARIANT_ID}.json', 'r') as f:
        variant_data = json.load(f)

    responses.add(
        responses.GET,
        f"https://www.alliancegenome.org/api/variant/{VARIANT_ID}",
        json=variant_data,
        status=200,
    )

    # NC_003284.9:g.5113285_5115215del - yn10
    variant = Variant.from_variant_id(VARIANT_ID)
    assert isinstance(variant, Variant)
    assert variant == wb_variant_yn10


def test_variant_overlaps(wb_variant_yn32: Variant, wb_variant_yn30: Variant, wb_variant_yn10: Variant) -> None:
    """
    Test Variant.overlaps() method.
    """
    assert wb_variant_yn32.overlaps(wb_variant_yn30) is False
    assert wb_variant_yn30.overlaps(wb_variant_yn32) is False
    assert wb_variant_yn32.overlaps(wb_variant_yn10) is True
    assert wb_variant_yn10.overlaps(wb_variant_yn32) is True
    assert wb_variant_yn30.overlaps(wb_variant_yn10) is False
    assert wb_variant_yn10.overlaps(wb_variant_yn30) is False


def test_variants_overlap(wb_variant_yn10: Variant, wb_variant_yn30: Variant, wb_variant_yn32: Variant) -> None:
    """
    Test variants_overlap() function.
    """
    assert variants_overlap(list((wb_variant_yn10, wb_variant_yn30, wb_variant_yn32))) is True
    assert variants_overlap(list((wb_variant_yn10, wb_variant_yn32))) is True
    assert variants_overlap(list((wb_variant_yn10, wb_variant_yn30))) is False
    assert variants_overlap(list((wb_variant_yn30, wb_variant_yn32))) is False
