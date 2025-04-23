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


def test_rel_position_neg_strand(wb_cdna_c54h2_5_1: MultiPartSeqRegion) -> None:

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


def test_rel_position_pos_strand(wb_cds_c42d8_1_1: MultiPartSeqRegion) -> None:

    # Report position within exon
    assert wb_cds_c42d8_1_1.to_rel_position(5109510) == 1
    assert wb_cds_c42d8_1_1.to_rel_position(5111135) == 508
    assert wb_cds_c42d8_1_1.to_rel_position(5112330) == 759
    # Raise error within intron
    with pytest.raises(ValueError):
        wb_cds_c42d8_1_1.to_rel_position(5109650)

    # Raise error out of boundaries
    with pytest.raises(ValueError):
        wb_cds_c42d8_1_1.to_rel_position(5109509)
    with pytest.raises(ValueError):
        wb_cds_c42d8_1_1.to_rel_position(5112331)


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


def test_sub_region_w_frame_neg_strand(wb_cds_c54h2_5_1: MultiPartSeqRegion) -> None:

    # Test subregion extraction within a single seqRegions (exon)
    sub_region = wb_cds_c54h2_5_1.sub_region(rel_start=2, rel_end=51)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 50
    assert sub_region.get_sequence() == wb_cds_c54h2_5_1.get_sequence()[1:51]
    assert sub_region.end == wb_cds_c54h2_5_1.end - (2 - 1)
    assert sub_region.start == sub_region.end - (50 - 1)
    assert sub_region.frame == 2
    assert sub_region.strand == '-'

    # Test subregion extraction accross multiple seqRegions (exons)
    sub_region = wb_cds_c54h2_5_1.sub_region(rel_start=350, rel_end=450)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 101
    assert sub_region.get_sequence() == wb_cds_c54h2_5_1.get_sequence()[349:450]
    assert sub_region.start == 5780159
    assert sub_region.end == 5780305
    assert sub_region.frame == 2
    assert sub_region.strand == '-'
    assert sub_region.get_sequence() == 'TTCTCTGGGACTTGAAGTTCTTGGCCAGaaacattgCCGTTGGTGGAGGACTTTTGCTCCTTCTTGCCGAGACACAGGAAGAGAAGGCTTCCCTGTTCGCC'

    # Test subregion extraction at frame 1
    sub_region = wb_cds_c54h2_5_1.sub_region(rel_start=351, rel_end=450)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 100
    assert sub_region.get_sequence() == wb_cds_c54h2_5_1.get_sequence()[350:450]
    assert sub_region.start == 5780159
    assert sub_region.end == 5780304
    assert sub_region.frame == 1
    assert sub_region.strand == '-'
    assert sub_region.get_sequence() == 'TCTCTGGGACTTGAAGTTCTTGGCCAGaaacattgCCGTTGGTGGAGGACTTTTGCTCCTTCTTGCCGAGACACAGGAAGAGAAGGCTTCCCTGTTCGCC'

    # Test subregion extraction at frame 0
    sub_region = wb_cds_c54h2_5_1.sub_region(rel_start=352, rel_end=450)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 99
    assert sub_region.get_sequence() == wb_cds_c54h2_5_1.get_sequence()[351:450]
    assert sub_region.start == 5780159
    assert sub_region.end == 5780303
    assert sub_region.frame == 0
    assert sub_region.strand == '-'
    assert sub_region.get_sequence() == 'CTCTGGGACTTGAAGTTCTTGGCCAGaaacattgCCGTTGGTGGAGGACTTTTGCTCCTTCTTGCCGAGACACAGGAAGAGAAGGCTTCCCTGTTCGCC'


def test_sub_region_w_frame_pos_strand(wb_cds_c42d8_1_1: MultiPartSeqRegion) -> None:
    # Test subregion extraction within a single seqRegions (exon)
    sub_region = wb_cds_c42d8_1_1.sub_region(rel_start=1, rel_end=50)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 50
    assert sub_region.get_sequence() == wb_cds_c42d8_1_1.get_sequence()[0:50]
    assert sub_region.start == 5109510
    assert sub_region.end == sub_region.start + 50 - 1
    assert sub_region.frame == 0
    assert sub_region.strand == '+'
    assert sub_region.get_sequence() == 'ATGTCGATGTATGGCAAAGACAAGGCGTATATCGAGAATGAGACAAAGTT'

    # Test subregion extraction accross multiple seqRegions (exons)
    sub_region = wb_cds_c42d8_1_1.sub_region(rel_start=100, rel_end=149)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 50
    assert sub_region.get_sequence() == wb_cds_c42d8_1_1.get_sequence()[99:149]
    assert sub_region.start == 5109609
    assert sub_region.end == 5110486
    assert sub_region.frame == 0
    assert sub_region.strand == '+'
    assert sub_region.get_sequence() == 'TATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAGgtttcagTGGTAGA'

    # Test subregion extraction at frame 2
    sub_region = wb_cds_c42d8_1_1.sub_region(rel_start=101, rel_end=149)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 49
    assert sub_region.get_sequence() == wb_cds_c42d8_1_1.get_sequence()[100:149]
    assert sub_region.start == 5109610
    assert sub_region.end == 5110486
    assert sub_region.frame == 2
    assert sub_region.strand == '+'
    assert sub_region.get_sequence() == 'ATCGAGAAGGCCCAATTTTGAAACCAGATGTAGAGgtttcagTGGTAGA'

    # Test subregion extraction at frame 1
    sub_region = wb_cds_c42d8_1_1.sub_region(rel_start=102, rel_end=149)
    assert isinstance(sub_region, MultiPartSeqRegion)
    assert sub_region.seq_length == 48
    assert sub_region.get_sequence() == wb_cds_c42d8_1_1.get_sequence()[101:149]
    assert sub_region.start == 5109611
    assert sub_region.end == 5110486
    assert sub_region.frame == 1
    assert sub_region.strand == '+'
    assert sub_region.get_sequence() == 'TCGAGAAGGCCCAATTTTGAAACCAGATGTAGAGgtttcagTGGTAGA'


def test_get_alt_sequence_single_exon_mutation_pos_strand(wb_variant_gk803418, wb_cds_c42d8_1_1) -> None:

    ref_sequence = wb_cds_c42d8_1_1.get_sequence()
    alt_sequence = wb_cds_c42d8_1_1.get_alt_sequence(variants=[wb_variant_gk803418])

    # Sequence before variant must be identical
    assert ref_sequence[0:507] == alt_sequence[0:507]
    # Sequence at variant position must match expected ref/alt sequence
    assert ref_sequence[507:508] == wb_variant_gk803418.genomic_ref_seq
    assert alt_sequence[507:508] == wb_variant_gk803418.genomic_alt_seq
    # Sequence after variant must be identical
    assert ref_sequence[508:] == alt_sequence[508:]
