"""
Unit testing for MultiPartSeqRegion class and related functions
"""

from seq_region import MultiPartSeqRegion

import pytest


def test_multipart_seq_region_class(wb_cdna_c54h2_5_1: MultiPartSeqRegion) -> None:

    ## Test Class initiation
    # WBGene00000149 Transcript:C54H2.5.1 Exon 1 (mRNA start)
    EXON_1_SEQ = 'CTCTTGGAAAATGAACCAGTTCCGGGCTCCAGGTGGTCAGAACGAAATGCTGGCGAAAGCAGAAGACGCCGCTGAAGAT'

    # WBGene00000149 Transcript:C54H2.5.1 Exon 2
    EXON_2_SEQ = 'TTCTTCCGCAAAACAAGGACCTACCTACCCCACATTGCTCGCCTCTGCCTCGTCTCCACATTCCTTGAAGATGGAATCCGTATGTACTTCCAATGGGATGATCAAAAACAGTTCATGCAAGAGTCTTGGTCTTGCGGTTGGTTCATCGCAACTTTGTTCGTCATCTACAACTTCTTCGGACAGTTCATCCCGGTTTTAATGATCATGCTCCGCAAGAAGGTGTTGGTCGCATGTGGAATTCTTGCCAGCATTGTCATTCTCCAAACCATCGCTTACCATATTCTCTGGGACTTGAAGTTCTTGGCCAG'

    # WBGene00000149 Transcript:C54H2.5.1 Exon 3
    EXON_3_SEQ = 'aaacattgCCGTTGGTGGAGGACTTTTGCTCCTTCTTGCCGAGACACAGGAAGAGAAGGCTTCCCTGTTCGCCGGAGTTCCAACAATGGGAGACTCGAACAAGCCAAAATCGTACATGCTTCTTGCCGGACGTGTTCTTCTTATCTTCATGTTCATGTCTTTGATGCATTTTGAGATGTCCTTCATGCAAGTTTTGGAGATTGTTGTTGGATTTGCTCTCATCACTCTCGTCTCAATTGGTTACAAGACAAAGCTTTCCGCGATTGTTCTTGTCATCTGGCTCTTCGGACTTAACCTTTGGCTTAATGCTTG'

    # WBGene00004788 Transcript:C54H2.5.1 Exon 4
    EXON_4_SEQ = 'gtggACCATTCCTTCCGACCGCTTCTACAGAGACTTCATGAAGTACGATTTCTTCCAAACCATGTCCGTCATTGGAGGACTTCTCCTTGTCATTGCCTACGGACCAGGAGGAGTGTCAGTCGATGACTACAAGAAAAGATGGTAGATACCCCATTAACACCAGTACTTATACGCATTTCTATGTCAAATCATTGCATTACACTCACTCACCCCGATAAATTTACCTGGATTGTTTATATAATTTATGAAtctgtttcgattttttcgatatttcctTTAATCAATATATTTAGAGTAGAACGTTTTCCCTCGGTTTCCCATCCAATGCTTCTTGTCGTAATGTTACAACTTCATATCTatttccttttatttttttttgtcattttcttcCTTTCCCTAAAACTTCATGGACTATATGGGTTGTTTTCCAATGAAACTCTCCCTACAAACTTCTATTTTTCTCACACGAATCACAACTAAAACAGTCATTTTTCCACCACTTTCCTTTACTTTCTAATCGGCCTATCCCAATTTTCTTCTGGTAGTTTTGTTCCCGTAaagaataaacatttttctgtc'

    ## Test sequence retrieval methods
    chained_seq: str = wb_cdna_c54h2_5_1.get_sequence()

    assert isinstance(chained_seq, str)
    assert chained_seq == EXON_1_SEQ + EXON_2_SEQ + EXON_3_SEQ + EXON_4_SEQ


def test_rel_position(wb_cdna_c54h2_5_1: MultiPartSeqRegion) -> None:

    # Report position within exon
    assert wb_cdna_c54h2_5_1.to_rel_position(5780722) == 1
    assert wb_cdna_c54h2_5_1.to_rel_position(5780565) == 100
    # Raise error within intron
    with pytest.raises(ValueError):
        wb_cdna_c54h2_5_1.to_rel_position(5780595)

    # Raise error out of boundaries
    with pytest.raises(ValueError):
        wb_cdna_c54h2_5_1.to_rel_position(5780723)
    with pytest.raises(ValueError):
        wb_cdna_c54h2_5_1.to_rel_position(5778874)


def test_sub_region_neg_strand(wb_cdna_c54h2_5_1: MultiPartSeqRegion) -> None:

    # Test subregion extraction within a single exon
    sub_region = wb_cdna_c54h2_5_1.sub_region(rel_start=101, rel_end=200)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 100
    assert sub_region.get_sequence() == wb_cdna_c54h2_5_1.get_sequence()[100:200]
    assert sub_region.end == 5780564
    assert sub_region.start == sub_region.end - (100 - 1)

    # Test subregion extraction of multiple seqRegions
    sub_region = wb_cdna_c54h2_5_1.sub_region(rel_start=1, rel_end=110)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 110
    assert sub_region.get_sequence() == wb_cdna_c54h2_5_1.get_sequence()[0:110]
    assert sub_region.start == 5780555
    assert sub_region.end == wb_cdna_c54h2_5_1.end


def test_sub_region_pos_strand(wb_cdna_c42d8_1_1: MultiPartSeqRegion) -> None:

    # Test subregion extraction within a single seqRegions (exon)
    sub_region = wb_cdna_c42d8_1_1.sub_region(rel_start=2, rel_end=101)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 100
    assert sub_region.get_sequence() == wb_cdna_c42d8_1_1.get_sequence()[1:101]
    assert sub_region.start == wb_cdna_c42d8_1_1.start + 2 - 1
    assert sub_region.end == sub_region.start + 100 - 1

    # Test subregion extraction accross multiple seqRegions (exons)
    sub_region = wb_cdna_c42d8_1_1.sub_region(rel_start=150, rel_end=250)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 101
    assert sub_region.get_sequence() == wb_cdna_c42d8_1_1.get_sequence()[149:250]
    assert sub_region.start == 5110483
    assert sub_region.end == 5110636
