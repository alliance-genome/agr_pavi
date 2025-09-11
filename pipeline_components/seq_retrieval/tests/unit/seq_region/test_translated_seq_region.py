"""
Unit testing for TranslatedSeqRegion class and related functions
"""

import logging
import pytest
from Bio.Data import CodonTable

from seq_region import SeqRegion, TranslatedSeqRegion, InvalidatedOrfException, InvalidatedTranslationException, OrfNotFoundException
from seq_region.translated_seq_region import find_orfs

from .fixtures.translated_seq_regions import TranscriptFixture

from log_mgmt import get_logger, set_log_level

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


FASTA_FILE_URL = 'file://tests/resources/GCF_000002985.6_WBcel235_genomic_subset.fna.gz'


def test_translated_seq_region_class(WB_transcript1: TranscriptFixture) -> None:

    translatedSeqRegion = WB_transcript1['translatedSeqRegion']

    # Assert successful transcript seq retrieval
    assert translatedSeqRegion.get_sequence(type='transcript') == WB_transcript1['transcriptSeq']

    ## Test translate method
    protein_seq = translatedSeqRegion.translate()

    # Assert successful translation
    assert isinstance(protein_seq, str)
    assert protein_seq == WB_transcript1['proteinSeq']


def test_incomplete_orf_translation() -> None:

    # Test translation of incomplete ORF
    # WBGene00000149 Transcript:C54H2.5.1 5' UTR
    five_p_utr: SeqRegion = SeqRegion(seq_id='X', start=5780713, end=5780722, strand='-',
                                      fasta_file_url=FASTA_FILE_URL)
    UTR_SEQ = 'CTCTTGGAAA'

    incomplete_multipart_seq_region = TranslatedSeqRegion(exon_seq_regions=[five_p_utr])

    chained_utr_seq: str = incomplete_multipart_seq_region.get_sequence(type='transcript')

    assert isinstance(chained_utr_seq, str)
    assert chained_utr_seq == UTR_SEQ

    # Assert failed translation
    with pytest.raises(OrfNotFoundException):
        incomplete_multipart_seq_region.translate()


def test_orf_detection() -> None:

    # Test detection of ORF in softmasked sequence
    # Y48G1C.9b cds
    DNA_SEQUENCE = 'ATGATCTCGAAAAAGCACGTGGAATCGATGCACGCGTTGCCGGACCCtaaagaaactgaaatttga'

    codon_table: CodonTable.CodonTable = CodonTable.unambiguous_dna_by_name["Standard"]

    # Find the best open reading frame
    orfs = find_orfs(DNA_SEQUENCE, codon_table, return_type='longest')

    assert isinstance(orfs, list)
    assert len(orfs) == 1

    orf = orfs.pop()
    assert 'seq_start' in orf.keys() and 'seq_end' in orf.keys()

    assert orf['seq_start'] == 1
    assert orf['seq_end'] == 66


def test_cds_vs_non_cds_translation(wb_transcript_zc506_4a_1_no_cds: TranscriptFixture, wb_transcript_zc506_4a_1_with_cds: TranscriptFixture) -> None:

    no_CDS_translatedSeqRegion = wb_transcript_zc506_4a_1_no_cds['translatedSeqRegion']
    cds_translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds['translatedSeqRegion']

    ## Translate
    no_cds_protein_seq = no_CDS_translatedSeqRegion.translate()
    cds_protein_seq = cds_translatedSeqRegion.translate()

    # Assert successful translation
    assert isinstance(no_cds_protein_seq, str)
    assert isinstance(cds_protein_seq, str)

    # Assert proteins match expected result and not each other
    assert no_cds_protein_seq == wb_transcript_zc506_4a_1_no_cds['proteinSeq']
    assert cds_protein_seq == wb_transcript_zc506_4a_1_with_cds['proteinSeq']
    # If protein sequence with and without use of CDS is identical,
    # then this test case is pointless (and needs replacement)
    assert no_cds_protein_seq != cds_protein_seq


def test_transcript_seq_retrieval_w_variants(wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript) -> None:
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds['translatedSeqRegion']
    ref_transcript_seq = translatedSeqRegion.get_sequence(type='transcript', unmasked=False)
    # AAAAAAGAAG > AAAAAAGAAA
    alt_transcript_seq_info = translatedSeqRegion.get_alt_sequence(type='transcript', variants=[wb_variant_mgl_1_transcript])
    alt_transcript_seq = alt_transcript_seq_info.sequence

    assert ref_transcript_seq == wb_transcript_zc506_4a_1_with_cds['transcriptSeq']
    assert alt_transcript_seq != ref_transcript_seq
    assert alt_transcript_seq == 'AAACGACACATATGAATGTATATAGGGAACAAGAGTTTCCATACTCATAGTGCTCATTAGAATAGCACGGATCGTGTTTCGCCTCTCGCCTTGTTAACCGAATCTGCCCCCGTGTGCCCCGGCTGCTTGTGTTGTGTCACACAAGACTAACGCCCTCTTATCCTTTCCATTCTCTTAAAATCCATTTCTAgagttgaaaactttatttttattcaatactCAAATCATGGTACCGaaaccCCCTTCAATAATTCGACACATGTTCTCGGTGCTTGCACTTGCTATACAGATACTTGCAAATGTCAATGTGGTTGCACAgACAACGGAAGCCGTCGACCTCGCTCCACCTCCAAAAgTTCGACAAATCCGAATACCCGGAGATATATTAATCGGTGGCGTCTTTCCAGTTCATTCAAAGTCATTAAACGGCGATGAGCCATGTGGCGAAATAGCCGAAACCAGGGGTGTGCATCGAGTGGAAGCAATGCTCTATGCGCTCGACCAGATTAACTCTCAAAACGACTTTCTTCGCGGGTACAAATTGggTGCACTTATTCTTGATTCATGCTCAAATCCAGCATATGCGCTAAACCAGAGTTTAGATTTTGTGAGAGATATGATTGGATCCTCAGAAGCTTCTGATTATGTTTGTCTGGATGGGAGCGATCCAAATCTCAAGAAACAATCACAAAAGAAGAATGTAGCAGCAGTAGTAGGTGGTAGTTATAGTTCTGTGTCTGTACAATTAGCAAACCTATTGCGACTGTTTCGAATAGCACAAGTTAGCCCTGCAAGTACTAATGCAGACTTGTCGGATAAAAAccgatttgaatattttgcaaGAACAGTACCTTCTGATGATTATCAGGCTATGGCAATGGTCGAAATCGCTGTTAAATTCAAATGGAGTTATGTTTCCCTTGTTTACTCGGCAGATGAATACGGAGAATTGGGTGCTGACGCtttcaaaaaagaaAcaaGAAAGAAAGGAATCTGCATCGCACTAGAAGAAcgaatacaaaataaaaaagaaagtttcaCGGAGTCAATCAACAATTTGGTTCAAAAACTTCAACCCGAGAAAAATGTTGGAGCAACGGTGGTGGTTCTGTTTGTAGGAACAGAATACATCCCAGACATATTGCGATACACGGCAGAAAGGATGAAGTTGACGTCCGGCGCAAAGAAGCGTATCATTTGGCTTGCATCAGAGTCGTGGGATAGAAACAATGACAAGTATACCGCAGGAGACAATCGGCTAGCAGCTCAAGGAGCTATAGTTTTGATGTTGGCATCACAGAAAGTTCCGTCATTTGAAGAGTATTTTATGAGTTTGCATCCTGGTACAGAAGCGTTCGAAAGAAATAAATGGTTAAGGGAGTTGTGGCAAGTAAAGTACAAATGTGAATTTGATACTCCGCCTGGGTCAACGGCATCAAGGTGCGAGGATATCAAACAATCCACCGAAGGCTTCAATGCAGATGACAAGGTTCAATTTGTAATTGATGCAGTCTATGCCATTGCTCATGGGCTCCAATCTATGAAACAAGCGATATGTCCAGATGATGCTATCGAAAATCACTGGATTTCTCGGTACAGCAAGCAACCTGAAATATGCCACGCCATGCAAAACATTGATGGAAGtgacttttatcaaaattatttgctCAAAGTTAACTTTACAGATATTGTTGGAAAAAGGTTTCGTTTTTCACCACAAGGAGATGGTCCAGCTAGTTACACAATTTTGACATATAAGCCAAAATCCATGGATAAAAAGCGGAGGATGACAGATGACGAGAGCTCGCCATCTGATTATGTAGAAATTGGACACTGGAGTGAGAACAACttgaccatttatgagaaaaacttATGGTGGGATCCTGATCATACACCAGTCTCCGTTTGTTCTTTGCCCTGTAAAATCGGGTTCAGAAAACAGTTGATAAAGGATGAACAATGTTGTTGGGCATGCAGCAAATGTGAAGACTACGAATATCTCATCAATGAAACTCATTGTGTAGGGTGTGAACAGGGATGGTGGCCAACAAAGGATAGGAAAGGATGTTTTGATCTATCTCTTTCCCAGTTAAAATATATGAGATGGAGGTCGATGTACTCGTTGGTTCCAACCATTTTAGCAGTGTTTGGAATTATTGCCACACTCTTTGTGATAGTGGTGTATGTGATatataatGAAACCCCTGTCGTTAAAGCTTCGGGGCGAGAGCTAAGCTACATTTTGCTTATTTCCATGATTATGTGTTACTGCATGACATTTGTTCTTCTATCAAAACCAAGTGCAATTGTATGTGCTATCAAACGAACAGGAATTGGATTCGCATTTTCTTGTCTATACTCTGCAATGTTTGTAAAAACCAATAGAATTTTCCGCATCTTCAGCACAAGATCTGCTCAACGACCAAGATTCATATCTCCCATCTCTCAGGTTGTCATGACTGCAATGCTAGCCGGAGTACAATTGATCGGAAGTCTTATTTGGCTGTCAGTAGTGCCACCAGGTTGGAGACACCACTACCCCACCAGGGACCAGGTGGTTTTAACTTGTAATGTTCCTGACCATCACTTTTTGTATTCATTGGCTTATGATGGTTTCCTGATTGTGCTTTGTACAACGTATGCtgtaaaaactagaaaagtgcccgaaaatttcaacgaGACAAAATTCATCGGCTTCTCCATGTACACGACATGTGTTGTTTGGCTCAGttggattttctttttttttggaaccgGAAGTGATTTCCAAattcaaacaTCATCTCTTtgtatttcaatttccatGTCAGCCAATGTGGCATTAGCATGCATATTTTCACCAAAGCTTTGGatcattttgtttgaaaaacacaaaaacgtCCGAAAGCAGGAAGGTGAAAGTATGCTTAACAAAAGtagCAGATCATTAGGAAACTGTAGTTCCCGATTATGTGCCAATAGCATCGACGAGCCAAATCAGTACACCGCTTTGCTCACTGACAGTACACGAAGACGATCATCACGCAAGACATCTCAGCCAACGAGCACCAGCTCTGCTCACGATACTTTCTTATGAATGATATCCATTAATTTATTGTGCATATGTATCAATATACCTGATAACGAAAATTGTTTATCGATAATTCTTTCTTTTGATACGGAATGAATGAACTATTCGGACGAACACG'
    # Alt seq should have one embedded variant
    assert len(alt_transcript_seq_info.embedded_variants) == 1
    assert alt_transcript_seq_info.embedded_variants[0].variant_id == wb_variant_mgl_1_transcript.variant_id
    # Alt seq embedded variant should be positioned correctly
    # note: AltSeqEmbeddedVariant stores 1-based relative positions
    assert alt_transcript_seq_info.embedded_variants[0].seq_start_pos == 977
    assert alt_transcript_seq_info.embedded_variants[0].seq_end_pos == 977


def test_coding_seq_retrieval_w_variants(wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript) -> None:
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds['translatedSeqRegion']
    ref_coding_seq = translatedSeqRegion.get_sequence(type='coding', unmasked=False)
    # AAAAAAGAAG > AAAAAAGAAA
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(type='coding', variants=[wb_variant_mgl_1_transcript])
    alt_coding_seq = alt_coding_seq_info.sequence

    assert ref_coding_seq == wb_transcript_zc506_4a_1_with_cds['codingSeq']
    assert alt_coding_seq != ref_coding_seq
    assert alt_coding_seq == 'ATGGTACCGaaaccCCCTTCAATAATTCGACACATGTTCTCGGTGCTTGCACTTGCTATACAGATACTTGCAAATGTCAATGTGGTTGCACAgACAACGGAAGCCGTCGACCTCGCTCCACCTCCAAAAgTTCGACAAATCCGAATACCCGGAGATATATTAATCGGTGGCGTCTTTCCAGTTCATTCAAAGTCATTAAACGGCGATGAGCCATGTGGCGAAATAGCCGAAACCAGGGGTGTGCATCGAGTGGAAGCAATGCTCTATGCGCTCGACCAGATTAACTCTCAAAACGACTTTCTTCGCGGGTACAAATTGggTGCACTTATTCTTGATTCATGCTCAAATCCAGCATATGCGCTAAACCAGAGTTTAGATTTTGTGAGAGATATGATTGGATCCTCAGAAGCTTCTGATTATGTTTGTCTGGATGGGAGCGATCCAAATCTCAAGAAACAATCACAAAAGAAGAATGTAGCAGCAGTAGTAGGTGGTAGTTATAGTTCTGTGTCTGTACAATTAGCAAACCTATTGCGACTGTTTCGAATAGCACAAGTTAGCCCTGCAAGTACTAATGCAGACTTGTCGGATAAAAAccgatttgaatattttgcaaGAACAGTACCTTCTGATGATTATCAGGCTATGGCAATGGTCGAAATCGCTGTTAAATTCAAATGGAGTTATGTTTCCCTTGTTTACTCGGCAGATGAATACGGAGAATTGGGTGCTGACGCtttcaaaaaagaaAcaaGAAAGAAAGGAATCTGCATCGCACTAGAAGAAcgaatacaaaataaaaaagaaagtttcaCGGAGTCAATCAACAATTTGGTTCAAAAACTTCAACCCGAGAAAAATGTTGGAGCAACGGTGGTGGTTCTGTTTGTAGGAACAGAATACATCCCAGACATATTGCGATACACGGCAGAAAGGATGAAGTTGACGTCCGGCGCAAAGAAGCGTATCATTTGGCTTGCATCAGAGTCGTGGGATAGAAACAATGACAAGTATACCGCAGGAGACAATCGGCTAGCAGCTCAAGGAGCTATAGTTTTGATGTTGGCATCACAGAAAGTTCCGTCATTTGAAGAGTATTTTATGAGTTTGCATCCTGGTACAGAAGCGTTCGAAAGAAATAAATGGTTAAGGGAGTTGTGGCAAGTAAAGTACAAATGTGAATTTGATACTCCGCCTGGGTCAACGGCATCAAGGTGCGAGGATATCAAACAATCCACCGAAGGCTTCAATGCAGATGACAAGGTTCAATTTGTAATTGATGCAGTCTATGCCATTGCTCATGGGCTCCAATCTATGAAACAAGCGATATGTCCAGATGATGCTATCGAAAATCACTGGATTTCTCGGTACAGCAAGCAACCTGAAATATGCCACGCCATGCAAAACATTGATGGAAGtgacttttatcaaaattatttgctCAAAGTTAACTTTACAGATATTGTTGGAAAAAGGTTTCGTTTTTCACCACAAGGAGATGGTCCAGCTAGTTACACAATTTTGACATATAAGCCAAAATCCATGGATAAAAAGCGGAGGATGACAGATGACGAGAGCTCGCCATCTGATTATGTAGAAATTGGACACTGGAGTGAGAACAACttgaccatttatgagaaaaacttATGGTGGGATCCTGATCATACACCAGTCTCCGTTTGTTCTTTGCCCTGTAAAATCGGGTTCAGAAAACAGTTGATAAAGGATGAACAATGTTGTTGGGCATGCAGCAAATGTGAAGACTACGAATATCTCATCAATGAAACTCATTGTGTAGGGTGTGAACAGGGATGGTGGCCAACAAAGGATAGGAAAGGATGTTTTGATCTATCTCTTTCCCAGTTAAAATATATGAGATGGAGGTCGATGTACTCGTTGGTTCCAACCATTTTAGCAGTGTTTGGAATTATTGCCACACTCTTTGTGATAGTGGTGTATGTGATatataatGAAACCCCTGTCGTTAAAGCTTCGGGGCGAGAGCTAAGCTACATTTTGCTTATTTCCATGATTATGTGTTACTGCATGACATTTGTTCTTCTATCAAAACCAAGTGCAATTGTATGTGCTATCAAACGAACAGGAATTGGATTCGCATTTTCTTGTCTATACTCTGCAATGTTTGTAAAAACCAATAGAATTTTCCGCATCTTCAGCACAAGATCTGCTCAACGACCAAGATTCATATCTCCCATCTCTCAGGTTGTCATGACTGCAATGCTAGCCGGAGTACAATTGATCGGAAGTCTTATTTGGCTGTCAGTAGTGCCACCAGGTTGGAGACACCACTACCCCACCAGGGACCAGGTGGTTTTAACTTGTAATGTTCCTGACCATCACTTTTTGTATTCATTGGCTTATGATGGTTTCCTGATTGTGCTTTGTACAACGTATGCtgtaaaaactagaaaagtgcccgaaaatttcaacgaGACAAAATTCATCGGCTTCTCCATGTACACGACATGTGTTGTTTGGCTCAGttggattttctttttttttggaaccgGAAGTGATTTCCAAattcaaacaTCATCTCTTtgtatttcaatttccatGTCAGCCAATGTGGCATTAGCATGCATATTTTCACCAAAGCTTTGGatcattttgtttgaaaaacacaaaaacgtCCGAAAGCAGGAAGGTGAAAGTATGCTTAACAAAAGtagCAGATCATTAGGAAACTGTAGTTCCCGATTATGTGCCAATAGCATCGACGAGCCAAATCAGTACACCGCTTTGCTCACTGACAGTACACGAAGACGATCATCACGCAAGACATCTCAGCCAACGAGCACCAGCTCTGCTCACGATACTTTCTTATGA'
    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert alt_coding_seq_info.embedded_variants[0].variant_id == wb_variant_mgl_1_transcript.variant_id
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 751
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 751


def test_protein_seq_retrieval_w_variants(wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript) -> None:
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds['translatedSeqRegion']
    ref_protein_seq = translatedSeqRegion.get_sequence(type='protein', unmasked=False)
    # KEAR > KETR
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(type='protein', variants=[wb_variant_mgl_1_transcript])

    assert ref_protein_seq == wb_transcript_zc506_4a_1_with_cds['proteinSeq']
    assert alt_protein_seq_info.sequence != ref_protein_seq
    assert alt_protein_seq_info.sequence == 'MVPKPPSIIRHMFSVLALAIQILANVNVVAQTTEAVDLAPPPKVRQIRIPGDILIGGVFPVHSKSLNGDEPCGEIAETRGVHRVEAMLYALDQINSQNDFLRGYKLGALILDSCSNPAYALNQSLDFVRDMIGSSEASDYVCLDGSDPNLKKQSQKKNVAAVVGGSYSSVSVQLANLLRLFRIAQVSPASTNADLSDKNRFEYFARTVPSDDYQAMAMVEIAVKFKWSYVSLVYSADEYGELGADAFKKETRKKGICIALEERIQNKKESFTESINNLVQKLQPEKNVGATVVVLFVGTEYIPDILRYTAERMKLTSGAKKRIIWLASESWDRNNDKYTAGDNRLAAQGAIVLMLASQKVPSFEEYFMSLHPGTEAFERNKWLRELWQVKYKCEFDTPPGSTASRCEDIKQSTEGFNADDKVQFVIDAVYAIAHGLQSMKQAICPDDAIENHWISRYSKQPEICHAMQNIDGSDFYQNYLLKVNFTDIVGKRFRFSPQGDGPASYTILTYKPKSMDKKRRMTDDESSPSDYVEIGHWSENNLTIYEKNLWWDPDHTPVSVCSLPCKIGFRKQLIKDEQCCWACSKCEDYEYLINETHCVGCEQGWWPTKDRKGCFDLSLSQLKYMRWRSMYSLVPTILAVFGIIATLFVIVVYVIYNETPVVKASGRELSYILLISMIMCYCMTFVLLSKPSAIVCAIKRTGIGFAFSCLYSAMFVKTNRIFRIFSTRSAQRPRFISPISQVVMTAMLAGVQLIGSLIWLSVVPPGWRHHYPTRDQVVLTCNVPDHHFLYSLAYDGFLIVLCTTYAVKTRKVPENFNETKFIGFSMYTTCVVWLSWIFFFFGTGSDFQIQTSSLCISISMSANVALACIFSPKLWIILFEKHKNVRKQEGESMLNKSSRSLGNCSSRLCANSIDEPNQYTALLTDSTRRRSSRKTSQPTSTSSAHDTFL'
    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert alt_protein_seq_info.embedded_variants[0].variant_id == wb_variant_mgl_1_transcript.variant_id
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 251
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 251


def test_protein_seq_retrieval_w_empty_variants_list(wb_transcript_zc506_4a_1_with_cds) -> None:
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds['translatedSeqRegion']
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(type='protein', variants=[])
    ref_protein_seq = translatedSeqRegion.get_sequence(type='protein', unmasked=False)

    assert alt_protein_seq_info.sequence == wb_transcript_zc506_4a_1_with_cds['proteinSeq']
    assert ref_protein_seq == alt_protein_seq_info.sequence
    # Alt seq should have no embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 0


def test_protein_seq_retrieval_w_variants_in_startcodon(wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript_start_codon) -> None:
    # Translation through alternative ORFs is currently not supported, so variants in start codon are not supported
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds['translatedSeqRegion']
    ref_protein_seq = translatedSeqRegion.get_sequence(type='protein')
    # ATGGTA > TTGGTA
    with pytest.raises(InvalidatedTranslationException):
        translatedSeqRegion.get_alt_sequence(type='protein', variants=[wb_variant_mgl_1_transcript_start_codon])

    assert ref_protein_seq == wb_transcript_zc506_4a_1_with_cds['proteinSeq']


def test_coding_seq_retrieval_w_variants_in_startcodon(wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript_start_codon) -> None:
    # Translation through alternative ORFs is currently not supported, so variants in start codon are not supported
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds['translatedSeqRegion']
    ref_coding_seq = translatedSeqRegion.get_sequence(type='coding', unmasked=False)
    # ATGGTA > TTGGTA
    with pytest.raises(InvalidatedOrfException):
        translatedSeqRegion.get_alt_sequence(type='coding', variants=[wb_variant_mgl_1_transcript_start_codon])

    assert ref_coding_seq == wb_transcript_zc506_4a_1_with_cds['codingSeq']


def test_coding_seq_retrieval_w_stop_loss_recovery_neg_strand(wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript_stop_loss) -> None:
    # Translation on stop-codon loss is expected to continue until the next stop codon in the same ORF
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds['translatedSeqRegion']
    ref_coding_seq = translatedSeqRegion.get_sequence(type='coding', unmasked=False)
    variant_ref_rel_start = len(ref_coding_seq) - 3
    variant_ref_rel_end = len(ref_coding_seq) - 3
    variant_alt_rel_start = variant_ref_rel_start
    variant_alt_rel_end = variant_ref_rel_end
    # ATGA > AAGA
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(type='coding', variants=[wb_variant_mgl_1_transcript_stop_loss])
    alt_coding_seq = alt_coding_seq_info.sequence

    assert ref_coding_seq == wb_transcript_zc506_4a_1_with_cds['codingSeq']
    assert alt_coding_seq != ref_coding_seq
    assert alt_coding_seq == ref_coding_seq[:variant_ref_rel_start] + 'AGA' + 'ATGATATCCATTAATTTATTGTGCATATGTATCAATATACCTGATAACGAAAATTGTTTATCGATAATTCTTTCTTTTGATACGGAATGA'
    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert alt_coding_seq_info.embedded_variants[0].variant_id == wb_variant_mgl_1_transcript_stop_loss.variant_id
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == variant_alt_rel_start + 1
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == variant_alt_rel_end + 1


def test_coding_seq_retrieval_w_stop_loss_recovery_pos_strand(wb_transcript_c42d8_1_1_with_cds, wb_variant_c42d8_1_1_transcript_stop_loss) -> None:
    # Translation on stop-codon loss is expected to continue until the next stop codon in the same ORF
    translatedSeqRegion = wb_transcript_c42d8_1_1_with_cds['translatedSeqRegion']
    ref_coding_seq = translatedSeqRegion.get_sequence(type='coding', unmasked=False)
    variant_ref_rel_start = len(ref_coding_seq) - 3
    variant_ref_rel_end = len(ref_coding_seq) - 3
    variant_alt_rel_start = variant_ref_rel_start
    variant_alt_rel_end = variant_ref_rel_end
    # CTAA > CAAA
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(type='coding', variants=[wb_variant_c42d8_1_1_transcript_stop_loss])
    alt_coding_seq = alt_coding_seq_info.sequence

    assert ref_coding_seq == wb_transcript_c42d8_1_1_with_cds['codingSeq']
    assert alt_coding_seq != ref_coding_seq
    assert alt_coding_seq == ref_coding_seq[:variant_ref_rel_start] + 'AAA' + 'TTCTGA'
    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert alt_coding_seq_info.embedded_variants[0].variant_id == wb_variant_c42d8_1_1_transcript_stop_loss.variant_id
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == variant_alt_rel_start + 1
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == variant_alt_rel_end + 1


def test_coding_seq_retrieval_w_stop_loss_no_recovery(wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript_stop_loss, wb_variant_mgl_1_transcript_stop2_loss) -> None:
    # Translation on stop-codon loss is expected to fail if no stop codon is found in the 5p UTR in the same ORF
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds['translatedSeqRegion']
    ref_coding_seq = translatedSeqRegion.get_sequence(type='coding', unmasked=False)
    # ATGA > AAGA
    with pytest.raises(InvalidatedOrfException):
        translatedSeqRegion.get_alt_sequence(type='coding', variants=[wb_variant_mgl_1_transcript_stop_loss, wb_variant_mgl_1_transcript_stop2_loss])

    assert ref_coding_seq == wb_transcript_zc506_4a_1_with_cds['codingSeq']


def test_coding_seq_retrieval_w_stop_gain(wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript_stop_gain) -> None:
    # Translation on stop-codon loss is expected to continue until the next stop codon in the same ORF
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds['translatedSeqRegion']
    ref_coding_seq = translatedSeqRegion.get_sequence(type='coding', unmasked=False)
    variant_ref_rel_start = 21
    variant_ref_rel_end = 21
    variant_alt_rel_start = variant_ref_rel_start - 1  # Deletion => flanking bases should be included
    variant_alt_rel_end = variant_ref_rel_end
    # TCAA > TCA
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(type='coding', variants=[wb_variant_mgl_1_transcript_stop_gain])
    alt_coding_seq = alt_coding_seq_info.sequence

    assert ref_coding_seq == wb_transcript_zc506_4a_1_with_cds['codingSeq']
    assert alt_coding_seq != ref_coding_seq
    assert alt_coding_seq == ref_coding_seq[:variant_ref_rel_start] + ref_coding_seq[variant_ref_rel_end + 1:25]
    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert alt_coding_seq_info.embedded_variants[0].variant_id == wb_variant_mgl_1_transcript_stop_gain.variant_id
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == variant_alt_rel_start + 1
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == variant_alt_rel_end + 1


def test_coding_seq_retrieval_w_framesize_insertion_midframe(wb_transcript_b0334_8a_1_with_cds, wb_variant_mg305) -> None:
    translatedSeqRegion = wb_transcript_b0334_8a_1_with_cds['translatedSeqRegion']
    ref_coding_seq = translatedSeqRegion.get_sequence(type='coding', unmasked=True)
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(type='coding', variants=[wb_variant_mg305])

    assert ref_coding_seq == wb_transcript_b0334_8a_1_with_cds['codingSeq'].upper()
    assert alt_coding_seq_info.sequence != ref_coding_seq

    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert alt_coding_seq_info.embedded_variants[0].variant_id == wb_variant_mg305.variant_id
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 780
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 824


def test_protein_seq_retrieval_w_framesize_insertion_midframe(wb_transcript_b0334_8a_1_with_cds, wb_variant_mg305) -> None:
    translatedSeqRegion = wb_transcript_b0334_8a_1_with_cds['translatedSeqRegion']
    ref_protein_seq = translatedSeqRegion.get_sequence(type='protein')
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(type='protein', variants=[wb_variant_mg305])

    assert ref_protein_seq == wb_transcript_b0334_8a_1_with_cds['proteinSeq']
    assert alt_protein_seq_info.sequence != ref_protein_seq

    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert alt_protein_seq_info.embedded_variants[0].variant_id == wb_variant_mg305.variant_id
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 260
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 275


def test_coding_seq_retrieval_w_framesize_insertion_between_frames(wb_transcript_t09A5_10_1_with_cds, wb_variant_ev571) -> None:
    translatedSeqRegion = wb_transcript_t09A5_10_1_with_cds['translatedSeqRegion']
    ref_coding_seq = translatedSeqRegion.get_sequence(type='coding', unmasked=False)
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(type='coding', variants=[wb_variant_ev571])

    assert ref_coding_seq == wb_transcript_t09A5_10_1_with_cds['codingSeq']
    assert alt_coding_seq_info.sequence != ref_coding_seq

    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert alt_coding_seq_info.embedded_variants[0].variant_id == wb_variant_ev571.variant_id
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 1030
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 1038


def test_protein_seq_retrieval_w_framesize_insertion_between_frames(wb_transcript_t09A5_10_1_with_cds, wb_variant_ev571) -> None:
    translatedSeqRegion = wb_transcript_t09A5_10_1_with_cds['translatedSeqRegion']
    ref_protein_seq = translatedSeqRegion.get_sequence(type='protein')
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(type='protein', variants=[wb_variant_ev571])

    assert ref_protein_seq == wb_transcript_t09A5_10_1_with_cds['proteinSeq']
    assert alt_protein_seq_info.sequence != ref_protein_seq

    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert alt_protein_seq_info.embedded_variants[0].variant_id == wb_variant_ev571.variant_id
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 344
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 346
