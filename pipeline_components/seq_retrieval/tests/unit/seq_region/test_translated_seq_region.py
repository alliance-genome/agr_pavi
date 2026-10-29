"""
Unit testing for TranslatedSeqRegion class and related functions
"""

import logging
import pytest
from Bio.Data import CodonTable

from seq_region import (
    SeqRegion,
    TranslatedSeqRegion,
    InvalidatedOrfException,
    OrfNotFoundException,
    SequenceNotFoundException,
)
from seq_region.translated_seq_region import find_orfs
from variant import Variant

from .fixtures.translated_seq_regions import TranscriptFixture

from log_mgmt import get_logger, set_log_level

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


FASTA_FILE_URL = "file://tests/resources/GCF_000002985.6_WBcel235_genomic_subset.fna.gz"


def test_translated_seq_region_class(WB_transcript1: TranscriptFixture) -> None:
    translatedSeqRegion = WB_transcript1["translatedSeqRegion"]

    # Assert successful transcript seq retrieval
    assert (
        translatedSeqRegion.get_sequence(type="transcript")
        == WB_transcript1["transcriptSeq"]
    )

    # Assert coding seq retrieval fails when not fetched
    with pytest.raises(SequenceNotFoundException):
        translatedSeqRegion.get_sequence(type="coding", autofetch=False)

    # Assert coding sequence retrieval defaults to automatic fetching when not already fetched
    coding_sequence = translatedSeqRegion.get_sequence(type="coding")
    assert len(coding_sequence) > 0

    # Assert protein seq retrieval fails when not fetched
    with pytest.raises(SequenceNotFoundException):
        translatedSeqRegion.get_sequence(type="protein", autofetch=False)

    ## Test translate method
    protein_seq = translatedSeqRegion.translate()

    # Assert successful translation
    assert isinstance(protein_seq, str)
    assert protein_seq == WB_transcript1["proteinSeq"]


def test_incomplete_orf_translation() -> None:
    # Test translation of incomplete ORF
    # WB:WBGene00004788 Transcript:C54H2.5.1 5' UTR
    five_p_utr: SeqRegion = SeqRegion(
        seq_id="X",
        start=5780713,
        end=5780722,
        strand="-",
        fasta_file_url=FASTA_FILE_URL,
    )
    UTR_SEQ = "CTCTTGGAAA"

    incomplete_multipart_seq_region = TranslatedSeqRegion(exon_seq_regions=[five_p_utr])

    chained_utr_seq: str = incomplete_multipart_seq_region.get_sequence(
        type="transcript"
    )

    assert isinstance(chained_utr_seq, str)
    assert chained_utr_seq == UTR_SEQ

    # Assert ORF retrieval failure reporting
    with pytest.raises(OrfNotFoundException):
        incomplete_multipart_seq_region.get_sequence(type="coding")

    with pytest.raises(OrfNotFoundException):
        incomplete_multipart_seq_region.translate()

    with pytest.raises(OrfNotFoundException):
        incomplete_multipart_seq_region.get_sequence(type="protein")

    with pytest.raises(OrfNotFoundException):
        incomplete_multipart_seq_region.get_alt_sequence(
            type="coding",
            variants=[Variant("test_variant", "X", 5780719, 5780719, "A", "C")],
        )

    with pytest.raises(OrfNotFoundException):
        incomplete_multipart_seq_region.get_alt_sequence(
            type="protein",
            variants=[Variant("test_variant", "X", 5780719, 5780719, "A", "C")],
        )


def test_orf_detection() -> None:
    # Test detection of ORF in softmasked sequence
    # Y48G1C.9b cds
    DNA_SEQUENCE = "ATGATCTCGAAAAAGCACGTGGAATCGATGCACGCGTTGCCGGACCCtaaagaaactgaaatttga"

    codon_table: CodonTable.CodonTable = CodonTable.unambiguous_dna_by_name["Standard"]

    # Find the best open reading frame
    orfs = find_orfs(DNA_SEQUENCE, codon_table, return_type="longest")

    assert isinstance(orfs, list)
    assert len(orfs) == 1

    orf = orfs.pop()
    assert "seq_start" in orf.keys() and "seq_end" in orf.keys()

    assert orf["seq_start"] == 1
    assert orf["seq_end"] == 66


def test_cds_vs_non_cds_translation(
    wb_transcript_zc506_4a_1_no_cds: TranscriptFixture,
    wb_transcript_zc506_4a_1_with_cds: TranscriptFixture,
) -> None:
    no_CDS_translatedSeqRegion = wb_transcript_zc506_4a_1_no_cds["translatedSeqRegion"]
    cds_translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds["translatedSeqRegion"]

    ## Translate
    no_cds_protein_seq = no_CDS_translatedSeqRegion.translate()
    cds_protein_seq = cds_translatedSeqRegion.translate()

    # Assert successful translation
    assert isinstance(no_cds_protein_seq, str)
    assert isinstance(cds_protein_seq, str)

    # Assert proteins match expected result and not each other
    assert no_cds_protein_seq == wb_transcript_zc506_4a_1_no_cds["proteinSeq"]
    assert cds_protein_seq == wb_transcript_zc506_4a_1_with_cds["proteinSeq"]
    # If protein sequence with and without use of CDS is identical,
    # then this test case is pointless (and needs replacement)
    assert no_cds_protein_seq != cds_protein_seq


def test_transcript_seq_retrieval_w_variants(
    wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript
) -> None:
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds["translatedSeqRegion"]
    ref_transcript_seq = translatedSeqRegion.get_sequence(
        type="transcript", unmasked=False
    )
    # AAAAAAGAAG > AAAAAAGAAA
    alt_transcript_seq_info = translatedSeqRegion.get_alt_sequence(
        type="transcript", variants=[wb_variant_mgl_1_transcript]
    )
    alt_transcript_seq = alt_transcript_seq_info.sequence

    assert ref_transcript_seq == wb_transcript_zc506_4a_1_with_cds["transcriptSeq"]
    assert alt_transcript_seq != ref_transcript_seq
    assert (
        alt_transcript_seq
        == "AAACGACACATATGAATGTATATAGGGAACAAGAGTTTCCATACTCATAGTGCTCATTAGAATAGCACGGATCGTGTTTCGCCTCTCGCCTTGTTAACCGAATCTGCCCCCGTGTGCCCCGGCTGCTTGTGTTGTGTCACACAAGACTAACGCCCTCTTATCCTTTCCATTCTCTTAAAATCCATTTCTAgagttgaaaactttatttttattcaatactCAAATCATGGTACCGaaaccCCCTTCAATAATTCGACACATGTTCTCGGTGCTTGCACTTGCTATACAGATACTTGCAAATGTCAATGTGGTTGCACAgACAACGGAAGCCGTCGACCTCGCTCCACCTCCAAAAgTTCGACAAATCCGAATACCCGGAGATATATTAATCGGTGGCGTCTTTCCAGTTCATTCAAAGTCATTAAACGGCGATGAGCCATGTGGCGAAATAGCCGAAACCAGGGGTGTGCATCGAGTGGAAGCAATGCTCTATGCGCTCGACCAGATTAACTCTCAAAACGACTTTCTTCGCGGGTACAAATTGggTGCACTTATTCTTGATTCATGCTCAAATCCAGCATATGCGCTAAACCAGAGTTTAGATTTTGTGAGAGATATGATTGGATCCTCAGAAGCTTCTGATTATGTTTGTCTGGATGGGAGCGATCCAAATCTCAAGAAACAATCACAAAAGAAGAATGTAGCAGCAGTAGTAGGTGGTAGTTATAGTTCTGTGTCTGTACAATTAGCAAACCTATTGCGACTGTTTCGAATAGCACAAGTTAGCCCTGCAAGTACTAATGCAGACTTGTCGGATAAAAAccgatttgaatattttgcaaGAACAGTACCTTCTGATGATTATCAGGCTATGGCAATGGTCGAAATCGCTGTTAAATTCAAATGGAGTTATGTTTCCCTTGTTTACTCGGCAGATGAATACGGAGAATTGGGTGCTGACGCtttcaaaaaagaaAcaaGAAAGAAAGGAATCTGCATCGCACTAGAAGAAcgaatacaaaataaaaaagaaagtttcaCGGAGTCAATCAACAATTTGGTTCAAAAACTTCAACCCGAGAAAAATGTTGGAGCAACGGTGGTGGTTCTGTTTGTAGGAACAGAATACATCCCAGACATATTGCGATACACGGCAGAAAGGATGAAGTTGACGTCCGGCGCAAAGAAGCGTATCATTTGGCTTGCATCAGAGTCGTGGGATAGAAACAATGACAAGTATACCGCAGGAGACAATCGGCTAGCAGCTCAAGGAGCTATAGTTTTGATGTTGGCATCACAGAAAGTTCCGTCATTTGAAGAGTATTTTATGAGTTTGCATCCTGGTACAGAAGCGTTCGAAAGAAATAAATGGTTAAGGGAGTTGTGGCAAGTAAAGTACAAATGTGAATTTGATACTCCGCCTGGGTCAACGGCATCAAGGTGCGAGGATATCAAACAATCCACCGAAGGCTTCAATGCAGATGACAAGGTTCAATTTGTAATTGATGCAGTCTATGCCATTGCTCATGGGCTCCAATCTATGAAACAAGCGATATGTCCAGATGATGCTATCGAAAATCACTGGATTTCTCGGTACAGCAAGCAACCTGAAATATGCCACGCCATGCAAAACATTGATGGAAGtgacttttatcaaaattatttgctCAAAGTTAACTTTACAGATATTGTTGGAAAAAGGTTTCGTTTTTCACCACAAGGAGATGGTCCAGCTAGTTACACAATTTTGACATATAAGCCAAAATCCATGGATAAAAAGCGGAGGATGACAGATGACGAGAGCTCGCCATCTGATTATGTAGAAATTGGACACTGGAGTGAGAACAACttgaccatttatgagaaaaacttATGGTGGGATCCTGATCATACACCAGTCTCCGTTTGTTCTTTGCCCTGTAAAATCGGGTTCAGAAAACAGTTGATAAAGGATGAACAATGTTGTTGGGCATGCAGCAAATGTGAAGACTACGAATATCTCATCAATGAAACTCATTGTGTAGGGTGTGAACAGGGATGGTGGCCAACAAAGGATAGGAAAGGATGTTTTGATCTATCTCTTTCCCAGTTAAAATATATGAGATGGAGGTCGATGTACTCGTTGGTTCCAACCATTTTAGCAGTGTTTGGAATTATTGCCACACTCTTTGTGATAGTGGTGTATGTGATatataatGAAACCCCTGTCGTTAAAGCTTCGGGGCGAGAGCTAAGCTACATTTTGCTTATTTCCATGATTATGTGTTACTGCATGACATTTGTTCTTCTATCAAAACCAAGTGCAATTGTATGTGCTATCAAACGAACAGGAATTGGATTCGCATTTTCTTGTCTATACTCTGCAATGTTTGTAAAAACCAATAGAATTTTCCGCATCTTCAGCACAAGATCTGCTCAACGACCAAGATTCATATCTCCCATCTCTCAGGTTGTCATGACTGCAATGCTAGCCGGAGTACAATTGATCGGAAGTCTTATTTGGCTGTCAGTAGTGCCACCAGGTTGGAGACACCACTACCCCACCAGGGACCAGGTGGTTTTAACTTGTAATGTTCCTGACCATCACTTTTTGTATTCATTGGCTTATGATGGTTTCCTGATTGTGCTTTGTACAACGTATGCtgtaaaaactagaaaagtgcccgaaaatttcaacgaGACAAAATTCATCGGCTTCTCCATGTACACGACATGTGTTGTTTGGCTCAGttggattttctttttttttggaaccgGAAGTGATTTCCAAattcaaacaTCATCTCTTtgtatttcaatttccatGTCAGCCAATGTGGCATTAGCATGCATATTTTCACCAAAGCTTTGGatcattttgtttgaaaaacacaaaaacgtCCGAAAGCAGGAAGGTGAAAGTATGCTTAACAAAAGtagCAGATCATTAGGAAACTGTAGTTCCCGATTATGTGCCAATAGCATCGACGAGCCAAATCAGTACACCGCTTTGCTCACTGACAGTACACGAAGACGATCATCACGCAAGACATCTCAGCCAACGAGCACCAGCTCTGCTCACGATACTTTCTTATGAATGATATCCATTAATTTATTGTGCATATGTATCAATATACCTGATAACGAAAATTGTTTATCGATAATTCTTTCTTTTGATACGGAATGAATGAACTATTCGGACGAACACG"
    )
    # Alt seq should have one embedded variant
    assert len(alt_transcript_seq_info.embedded_variants) == 1
    assert (
        alt_transcript_seq_info.embedded_variants[0].variant_id
        == wb_variant_mgl_1_transcript.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    # note: AltSeqEmbeddedVariant stores 1-based relative positions
    assert alt_transcript_seq_info.embedded_variants[0].seq_start_pos == 977
    assert alt_transcript_seq_info.embedded_variants[0].seq_end_pos == 977


def test_coding_seq_retrieval_w_variants(
    wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript
) -> None:
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds["translatedSeqRegion"]
    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    # AAAAAAGAAG > AAAAAAGAAA
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[wb_variant_mgl_1_transcript]
    )
    alt_coding_seq = alt_coding_seq_info.sequence

    assert ref_coding_seq == wb_transcript_zc506_4a_1_with_cds["codingSeq"]
    assert alt_coding_seq != ref_coding_seq
    assert (
        alt_coding_seq
        == "ATGGTACCGaaaccCCCTTCAATAATTCGACACATGTTCTCGGTGCTTGCACTTGCTATACAGATACTTGCAAATGTCAATGTGGTTGCACAgACAACGGAAGCCGTCGACCTCGCTCCACCTCCAAAAgTTCGACAAATCCGAATACCCGGAGATATATTAATCGGTGGCGTCTTTCCAGTTCATTCAAAGTCATTAAACGGCGATGAGCCATGTGGCGAAATAGCCGAAACCAGGGGTGTGCATCGAGTGGAAGCAATGCTCTATGCGCTCGACCAGATTAACTCTCAAAACGACTTTCTTCGCGGGTACAAATTGggTGCACTTATTCTTGATTCATGCTCAAATCCAGCATATGCGCTAAACCAGAGTTTAGATTTTGTGAGAGATATGATTGGATCCTCAGAAGCTTCTGATTATGTTTGTCTGGATGGGAGCGATCCAAATCTCAAGAAACAATCACAAAAGAAGAATGTAGCAGCAGTAGTAGGTGGTAGTTATAGTTCTGTGTCTGTACAATTAGCAAACCTATTGCGACTGTTTCGAATAGCACAAGTTAGCCCTGCAAGTACTAATGCAGACTTGTCGGATAAAAAccgatttgaatattttgcaaGAACAGTACCTTCTGATGATTATCAGGCTATGGCAATGGTCGAAATCGCTGTTAAATTCAAATGGAGTTATGTTTCCCTTGTTTACTCGGCAGATGAATACGGAGAATTGGGTGCTGACGCtttcaaaaaagaaAcaaGAAAGAAAGGAATCTGCATCGCACTAGAAGAAcgaatacaaaataaaaaagaaagtttcaCGGAGTCAATCAACAATTTGGTTCAAAAACTTCAACCCGAGAAAAATGTTGGAGCAACGGTGGTGGTTCTGTTTGTAGGAACAGAATACATCCCAGACATATTGCGATACACGGCAGAAAGGATGAAGTTGACGTCCGGCGCAAAGAAGCGTATCATTTGGCTTGCATCAGAGTCGTGGGATAGAAACAATGACAAGTATACCGCAGGAGACAATCGGCTAGCAGCTCAAGGAGCTATAGTTTTGATGTTGGCATCACAGAAAGTTCCGTCATTTGAAGAGTATTTTATGAGTTTGCATCCTGGTACAGAAGCGTTCGAAAGAAATAAATGGTTAAGGGAGTTGTGGCAAGTAAAGTACAAATGTGAATTTGATACTCCGCCTGGGTCAACGGCATCAAGGTGCGAGGATATCAAACAATCCACCGAAGGCTTCAATGCAGATGACAAGGTTCAATTTGTAATTGATGCAGTCTATGCCATTGCTCATGGGCTCCAATCTATGAAACAAGCGATATGTCCAGATGATGCTATCGAAAATCACTGGATTTCTCGGTACAGCAAGCAACCTGAAATATGCCACGCCATGCAAAACATTGATGGAAGtgacttttatcaaaattatttgctCAAAGTTAACTTTACAGATATTGTTGGAAAAAGGTTTCGTTTTTCACCACAAGGAGATGGTCCAGCTAGTTACACAATTTTGACATATAAGCCAAAATCCATGGATAAAAAGCGGAGGATGACAGATGACGAGAGCTCGCCATCTGATTATGTAGAAATTGGACACTGGAGTGAGAACAACttgaccatttatgagaaaaacttATGGTGGGATCCTGATCATACACCAGTCTCCGTTTGTTCTTTGCCCTGTAAAATCGGGTTCAGAAAACAGTTGATAAAGGATGAACAATGTTGTTGGGCATGCAGCAAATGTGAAGACTACGAATATCTCATCAATGAAACTCATTGTGTAGGGTGTGAACAGGGATGGTGGCCAACAAAGGATAGGAAAGGATGTTTTGATCTATCTCTTTCCCAGTTAAAATATATGAGATGGAGGTCGATGTACTCGTTGGTTCCAACCATTTTAGCAGTGTTTGGAATTATTGCCACACTCTTTGTGATAGTGGTGTATGTGATatataatGAAACCCCTGTCGTTAAAGCTTCGGGGCGAGAGCTAAGCTACATTTTGCTTATTTCCATGATTATGTGTTACTGCATGACATTTGTTCTTCTATCAAAACCAAGTGCAATTGTATGTGCTATCAAACGAACAGGAATTGGATTCGCATTTTCTTGTCTATACTCTGCAATGTTTGTAAAAACCAATAGAATTTTCCGCATCTTCAGCACAAGATCTGCTCAACGACCAAGATTCATATCTCCCATCTCTCAGGTTGTCATGACTGCAATGCTAGCCGGAGTACAATTGATCGGAAGTCTTATTTGGCTGTCAGTAGTGCCACCAGGTTGGAGACACCACTACCCCACCAGGGACCAGGTGGTTTTAACTTGTAATGTTCCTGACCATCACTTTTTGTATTCATTGGCTTATGATGGTTTCCTGATTGTGCTTTGTACAACGTATGCtgtaaaaactagaaaagtgcccgaaaatttcaacgaGACAAAATTCATCGGCTTCTCCATGTACACGACATGTGTTGTTTGGCTCAGttggattttctttttttttggaaccgGAAGTGATTTCCAAattcaaacaTCATCTCTTtgtatttcaatttccatGTCAGCCAATGTGGCATTAGCATGCATATTTTCACCAAAGCTTTGGatcattttgtttgaaaaacacaaaaacgtCCGAAAGCAGGAAGGTGAAAGTATGCTTAACAAAAGtagCAGATCATTAGGAAACTGTAGTTCCCGATTATGTGCCAATAGCATCGACGAGCCAAATCAGTACACCGCTTTGCTCACTGACAGTACACGAAGACGATCATCACGCAAGACATCTCAGCCAACGAGCACCAGCTCTGCTCACGATACTTTCTTATGA"
    )
    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == wb_variant_mgl_1_transcript.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 751
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 751


def test_protein_seq_retrieval_w_variants(
    wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript
) -> None:
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds["translatedSeqRegion"]
    ref_protein_seq = translatedSeqRegion.get_sequence(type="protein", unmasked=False)
    # KEAR > KETR
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[wb_variant_mgl_1_transcript]
    )

    assert ref_protein_seq == wb_transcript_zc506_4a_1_with_cds["proteinSeq"]
    assert alt_protein_seq_info.sequence != ref_protein_seq
    assert (
        alt_protein_seq_info.sequence
        == "MVPKPPSIIRHMFSVLALAIQILANVNVVAQTTEAVDLAPPPKVRQIRIPGDILIGGVFPVHSKSLNGDEPCGEIAETRGVHRVEAMLYALDQINSQNDFLRGYKLGALILDSCSNPAYALNQSLDFVRDMIGSSEASDYVCLDGSDPNLKKQSQKKNVAAVVGGSYSSVSVQLANLLRLFRIAQVSPASTNADLSDKNRFEYFARTVPSDDYQAMAMVEIAVKFKWSYVSLVYSADEYGELGADAFKKETRKKGICIALEERIQNKKESFTESINNLVQKLQPEKNVGATVVVLFVGTEYIPDILRYTAERMKLTSGAKKRIIWLASESWDRNNDKYTAGDNRLAAQGAIVLMLASQKVPSFEEYFMSLHPGTEAFERNKWLRELWQVKYKCEFDTPPGSTASRCEDIKQSTEGFNADDKVQFVIDAVYAIAHGLQSMKQAICPDDAIENHWISRYSKQPEICHAMQNIDGSDFYQNYLLKVNFTDIVGKRFRFSPQGDGPASYTILTYKPKSMDKKRRMTDDESSPSDYVEIGHWSENNLTIYEKNLWWDPDHTPVSVCSLPCKIGFRKQLIKDEQCCWACSKCEDYEYLINETHCVGCEQGWWPTKDRKGCFDLSLSQLKYMRWRSMYSLVPTILAVFGIIATLFVIVVYVIYNETPVVKASGRELSYILLISMIMCYCMTFVLLSKPSAIVCAIKRTGIGFAFSCLYSAMFVKTNRIFRIFSTRSAQRPRFISPISQVVMTAMLAGVQLIGSLIWLSVVPPGWRHHYPTRDQVVLTCNVPDHHFLYSLAYDGFLIVLCTTYAVKTRKVPENFNETKFIGFSMYTTCVVWLSWIFFFFGTGSDFQIQTSSLCISISMSANVALACIFSPKLWIILFEKHKNVRKQEGESMLNKSSRSLGNCSSRLCANSIDEPNQYTALLTDSTRRRSSRKTSQPTSTSSAHDTFL"
    )
    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert (
        alt_protein_seq_info.embedded_variants[0].variant_id
        == wb_variant_mgl_1_transcript.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 251
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 251


def test_protein_seq_retrieval_w_empty_variants_list(
    wb_transcript_zc506_4a_1_with_cds,
) -> None:
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds["translatedSeqRegion"]
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[]
    )
    ref_protein_seq = translatedSeqRegion.get_sequence(type="protein", unmasked=False)

    assert (
        alt_protein_seq_info.sequence == wb_transcript_zc506_4a_1_with_cds["proteinSeq"]
    )
    assert ref_protein_seq == alt_protein_seq_info.sequence
    # Alt seq should have no embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 0


def test_protein_seq_retrieval_w_variants_in_startcodon(
    wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript_start_codon
) -> None:
    # Translation through alternative ORFs is currently not supported, so variants in start codon are not supported
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds["translatedSeqRegion"]
    ref_protein_seq = translatedSeqRegion.get_sequence(type="protein")

    assert ref_protein_seq == wb_transcript_zc506_4a_1_with_cds["proteinSeq"]

    # ATGGTA > TTGGTA
    with pytest.raises(InvalidatedOrfException):
        translatedSeqRegion.get_alt_sequence(
            type="protein", variants=[wb_variant_mgl_1_transcript_start_codon]
        )


def test_coding_seq_retrieval_w_variants_in_startcodon(
    wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript_start_codon
) -> None:
    # Translation through alternative ORFs is currently not supported, so variants in start codon are not supported
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds["translatedSeqRegion"]
    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    # ATGGTA > TTGGTA
    with pytest.raises(InvalidatedOrfException):
        translatedSeqRegion.get_alt_sequence(
            type="coding", variants=[wb_variant_mgl_1_transcript_start_codon]
        )

    assert ref_coding_seq == wb_transcript_zc506_4a_1_with_cds["codingSeq"]


def test_coding_seq_retrieval_w_stop_loss_recovery_neg_strand(
    wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript_stop_loss
) -> None:
    # Translation on stop-codon loss is expected to continue until the next stop codon in the same ORF
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds["translatedSeqRegion"]
    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    variant_ref_rel_start = len(ref_coding_seq) - 3
    variant_ref_rel_end = len(ref_coding_seq) - 3
    variant_alt_rel_start = variant_ref_rel_start
    variant_alt_rel_end = variant_ref_rel_end
    # ATGA > AAGA
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[wb_variant_mgl_1_transcript_stop_loss]
    )
    alt_coding_seq = alt_coding_seq_info.sequence

    assert ref_coding_seq == wb_transcript_zc506_4a_1_with_cds["codingSeq"]
    assert alt_coding_seq != ref_coding_seq
    assert (
        alt_coding_seq
        == ref_coding_seq[:variant_ref_rel_start]
        + "AGA"
        + "ATGATATCCATTAATTTATTGTGCATATGTATCAATATACCTGATAACGAAAATTGTTTATCGATAATTCTTTCTTTTGATACGGAATGA"
    )
    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == wb_variant_mgl_1_transcript_stop_loss.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert (
        alt_coding_seq_info.embedded_variants[0].seq_start_pos
        == variant_alt_rel_start + 1
    )
    assert (
        alt_coding_seq_info.embedded_variants[0].seq_end_pos == variant_alt_rel_end + 1
    )


def test_coding_seq_retrieval_w_stop_loss_recovery_pos_strand(
    wb_transcript_c42d8_1_1_with_cds, wb_variant_c42d8_1_1_transcript_stop_loss
) -> None:
    # Translation on stop-codon loss is expected to continue until the next stop codon in the same ORF
    translatedSeqRegion = wb_transcript_c42d8_1_1_with_cds["translatedSeqRegion"]
    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    variant_ref_rel_start = len(ref_coding_seq) - 3
    variant_ref_rel_end = len(ref_coding_seq) - 3
    variant_alt_rel_start = variant_ref_rel_start
    variant_alt_rel_end = variant_ref_rel_end
    # CTAA > CAAA
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[wb_variant_c42d8_1_1_transcript_stop_loss]
    )
    alt_coding_seq = alt_coding_seq_info.sequence

    assert ref_coding_seq == wb_transcript_c42d8_1_1_with_cds["codingSeq"]
    assert alt_coding_seq != ref_coding_seq
    assert alt_coding_seq == ref_coding_seq[:variant_ref_rel_start] + "AAA" + "TTCTGA"
    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == wb_variant_c42d8_1_1_transcript_stop_loss.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert (
        alt_coding_seq_info.embedded_variants[0].seq_start_pos
        == variant_alt_rel_start + 1
    )
    assert (
        alt_coding_seq_info.embedded_variants[0].seq_end_pos == variant_alt_rel_end + 1
    )


def test_coding_seq_retrieval_w_stop_loss_no_recovery(
    wb_transcript_zc506_4a_1_with_cds,
    wb_variant_mgl_1_transcript_stop_loss,
    wb_variant_mgl_1_transcript_stop2_loss,
) -> None:
    # Translation on stop-codon loss is expected to fail if no stop codon is found in the 5p UTR in the same ORF
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds["translatedSeqRegion"]
    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    # ATGA > AAGA
    with pytest.raises(InvalidatedOrfException):
        translatedSeqRegion.get_alt_sequence(
            type="coding",
            variants=[
                wb_variant_mgl_1_transcript_stop_loss,
                wb_variant_mgl_1_transcript_stop2_loss,
            ],
        )

    assert ref_coding_seq == wb_transcript_zc506_4a_1_with_cds["codingSeq"]


def test_coding_seq_retrieval_w_stop_gain(
    wb_transcript_zc506_4a_1_with_cds, wb_variant_mgl_1_transcript_stop_gain
) -> None:
    # Translation on stop-codon loss is expected to continue until the next stop codon in the same ORF
    translatedSeqRegion = wb_transcript_zc506_4a_1_with_cds["translatedSeqRegion"]
    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    variant_ref_rel_start = 21
    variant_ref_rel_end = 21
    variant_alt_rel_start = (
        variant_ref_rel_start - 1
    )  # Deletion => flanking bases should be included
    variant_alt_rel_end = variant_ref_rel_end
    # TCAA > TCA
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[wb_variant_mgl_1_transcript_stop_gain]
    )
    alt_coding_seq = alt_coding_seq_info.sequence

    assert ref_coding_seq == wb_transcript_zc506_4a_1_with_cds["codingSeq"]
    assert alt_coding_seq != ref_coding_seq
    assert (
        alt_coding_seq
        == ref_coding_seq[:variant_ref_rel_start]
        + ref_coding_seq[variant_ref_rel_end + 1 : 25]
    )
    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == wb_variant_mgl_1_transcript_stop_gain.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert (
        alt_coding_seq_info.embedded_variants[0].seq_start_pos
        == variant_alt_rel_start + 1
    )
    assert (
        alt_coding_seq_info.embedded_variants[0].seq_end_pos == variant_alt_rel_end + 1
    )


def test_coding_seq_retrieval_w_framesize_insertion_midframe(
    wb_transcript_b0334_8a_1_with_cds, wb_variant_mg305
) -> None:
    translatedSeqRegion = wb_transcript_b0334_8a_1_with_cds["translatedSeqRegion"]
    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=True)
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[wb_variant_mg305]
    )

    assert ref_coding_seq == wb_transcript_b0334_8a_1_with_cds["codingSeq"].upper()
    assert alt_coding_seq_info.sequence != ref_coding_seq

    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == wb_variant_mg305.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 780
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 824


def test_protein_seq_retrieval_w_framesize_insertion_midframe(
    wb_transcript_b0334_8a_1_with_cds, wb_variant_mg305
) -> None:
    translatedSeqRegion = wb_transcript_b0334_8a_1_with_cds["translatedSeqRegion"]
    ref_protein_seq = translatedSeqRegion.get_sequence(type="protein")
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[wb_variant_mg305]
    )

    assert ref_protein_seq == wb_transcript_b0334_8a_1_with_cds["proteinSeq"]
    assert alt_protein_seq_info.sequence != ref_protein_seq

    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert (
        alt_protein_seq_info.embedded_variants[0].variant_id
        == wb_variant_mg305.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 260
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 275


def test_coding_seq_retrieval_w_framesize_insertion_between_frames(
    wb_transcript_t09A5_10_1_with_cds, wb_variant_ev571
) -> None:
    translatedSeqRegion = wb_transcript_t09A5_10_1_with_cds["translatedSeqRegion"]
    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[wb_variant_ev571]
    )

    assert ref_coding_seq == wb_transcript_t09A5_10_1_with_cds["codingSeq"]
    assert alt_coding_seq_info.sequence != ref_coding_seq

    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == wb_variant_ev571.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 1030
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 1038


def test_protein_seq_retrieval_w_framesize_insertion_between_frames(
    wb_transcript_t09A5_10_1_with_cds, wb_variant_ev571
) -> None:
    translatedSeqRegion = wb_transcript_t09A5_10_1_with_cds["translatedSeqRegion"]
    ref_protein_seq = translatedSeqRegion.get_sequence(type="protein")
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[wb_variant_ev571]
    )

    assert ref_protein_seq == wb_transcript_t09A5_10_1_with_cds["proteinSeq"]
    assert alt_protein_seq_info.sequence != ref_protein_seq

    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert (
        alt_protein_seq_info.embedded_variants[0].variant_id
        == wb_variant_ev571.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 344
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 346


def test_seq_retrieval_w_indel_deletion_within_one_codon(
    wb_transcript_c42d8_8b_1_with_cds,
) -> None:
    """
    SeqEmbeddedVariant positions are expected to represent the longest embedded seq of alt/ref
    on both ref and alt sequences.
    """
    translatedSeqRegion = wb_transcript_c42d8_8b_1_with_cds["translatedSeqRegion"]
    indel_deletion_variant = Variant(
        "test-indel-deletion",
        "X",
        5116859,
        5116860,
        genomic_ref_seq="CG",
        genomic_alt_seq="A",
    )

    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[indel_deletion_variant]
    )

    assert ref_coding_seq == wb_transcript_c42d8_8b_1_with_cds["codingSeq"]
    assert alt_coding_seq_info.sequence != ref_coding_seq

    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == indel_deletion_variant.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 5
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 6

    ref_protein_seq = translatedSeqRegion.get_sequence(type="protein", unmasked=False)
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[indel_deletion_variant]
    )

    assert ref_protein_seq == wb_transcript_c42d8_8b_1_with_cds["proteinSeq"]
    assert alt_protein_seq_info.sequence != ref_protein_seq

    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert (
        alt_protein_seq_info.embedded_variants[0].variant_id
        == indel_deletion_variant.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 2
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 2


def test_translation_of_indel_insertion_within_one_codon(
    wb_transcript_c42d8_8b_1_with_cds,
) -> None:
    """
    SeqEmbeddedVariant positions are expected to represent the longest embedded seq of alt/ref
    on both ref and alt sequences.
    """
    translatedSeqRegion = wb_transcript_c42d8_8b_1_with_cds["translatedSeqRegion"]
    indel_insertion_variant = Variant(
        "test-indel-insertion",
        "X",
        5116860,
        5116860,
        genomic_ref_seq="G",
        genomic_alt_seq="AA",
    )

    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[indel_insertion_variant]
    )

    assert ref_coding_seq == wb_transcript_c42d8_8b_1_with_cds["codingSeq"]
    assert alt_coding_seq_info.sequence != ref_coding_seq

    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == indel_insertion_variant.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 5
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 6

    ref_protein_seq = translatedSeqRegion.get_sequence(type="protein", unmasked=False)
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[indel_insertion_variant]
    )

    assert ref_protein_seq == wb_transcript_c42d8_8b_1_with_cds["proteinSeq"]
    assert alt_protein_seq_info.sequence != ref_protein_seq

    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert (
        alt_protein_seq_info.embedded_variants[0].variant_id
        == indel_insertion_variant.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 2
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 2


def test_translation_of_indel_deletion_crossing_codons(
    wb_transcript_c42d8_8b_1_with_cds,
) -> None:
    """
    SeqEmbeddedVariant positions are expected to represent the longest embedded seq of alt/ref
    on both ref and alt sequences.
    """
    translatedSeqRegion = wb_transcript_c42d8_8b_1_with_cds["translatedSeqRegion"]
    indel_deletion_variant = Variant(
        "test-indel-deletion-crossing-codon",
        "X",
        5116858,
        5116859,
        genomic_ref_seq="CC",
        genomic_alt_seq="A",
    )

    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[indel_deletion_variant]
    )

    assert ref_coding_seq == wb_transcript_c42d8_8b_1_with_cds["codingSeq"]
    assert alt_coding_seq_info.sequence != ref_coding_seq

    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == indel_deletion_variant.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 6
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 7

    ref_protein_seq = translatedSeqRegion.get_sequence(type="protein", unmasked=False)
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[indel_deletion_variant]
    )

    assert ref_protein_seq == wb_transcript_c42d8_8b_1_with_cds["proteinSeq"]
    assert alt_protein_seq_info.sequence != ref_protein_seq

    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert (
        alt_protein_seq_info.embedded_variants[0].variant_id
        == indel_deletion_variant.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 2
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 3


def test_translation_of_indel_insertion_crossing_codons(
    wb_transcript_c42d8_8b_1_with_cds,
) -> None:
    """
    SeqEmbeddedVariant positions are expected to represent the longest embedded seq of alt/ref
    on both ref and alt sequences.
    """
    translatedSeqRegion = wb_transcript_c42d8_8b_1_with_cds["translatedSeqRegion"]
    indel_insertion_variant = Variant(
        "test-indel-insertion",
        "X",
        5116859,
        5116859,
        genomic_ref_seq="C",
        genomic_alt_seq="AA",
    )

    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[indel_insertion_variant]
    )

    assert ref_coding_seq == wb_transcript_c42d8_8b_1_with_cds["codingSeq"]
    assert alt_coding_seq_info.sequence != ref_coding_seq

    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == indel_insertion_variant.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 6
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 7

    ref_protein_seq = translatedSeqRegion.get_sequence(type="protein", unmasked=False)
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[indel_insertion_variant]
    )

    assert ref_protein_seq == wb_transcript_c42d8_8b_1_with_cds["proteinSeq"]
    assert alt_protein_seq_info.sequence != ref_protein_seq

    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert (
        alt_protein_seq_info.embedded_variants[0].variant_id
        == indel_insertion_variant.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 2
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 3


def test_translation_of_insertion_introducing_stop_codon(
    wb_transcript_c42d8_8b_1_with_cds,
) -> None:
    """
    SeqEmbeddedVariant positions are expected to represent the inserted sequence, until but including the stop codon
    (end position should be length of sequence + 1, alignment position should indicate first gap position if a tailing gap is present)
    """
    translatedSeqRegion = wb_transcript_c42d8_8b_1_with_cds["translatedSeqRegion"]
    stop_insertion_variant = Variant(
        "test-insertion-introducing-stop",
        "X",
        5116858,
        5116859,
        genomic_ref_seq="",
        genomic_alt_seq="GCCTCAGCG",
    )

    ref_coding_seq = translatedSeqRegion.get_sequence(type="coding", unmasked=False)
    alt_coding_seq_info = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[stop_insertion_variant]
    )

    assert ref_coding_seq == wb_transcript_c42d8_8b_1_with_cds["codingSeq"]
    assert alt_coding_seq_info.sequence != ref_coding_seq

    # Alt seq should have one embedded variant
    assert len(alt_coding_seq_info.embedded_variants) == 1
    assert (
        alt_coding_seq_info.embedded_variants[0].variant_id
        == stop_insertion_variant.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_coding_seq_info.embedded_variants[0].seq_start_pos == 7
    assert alt_coding_seq_info.embedded_variants[0].seq_end_pos == 12

    ref_protein_seq = translatedSeqRegion.get_sequence(type="protein", unmasked=False)
    alt_protein_seq_info = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[stop_insertion_variant]
    )

    assert ref_protein_seq == wb_transcript_c42d8_8b_1_with_cds["proteinSeq"]
    assert alt_protein_seq_info.sequence != ref_protein_seq

    # Alt seq should have one embedded variant
    assert len(alt_protein_seq_info.embedded_variants) == 1
    assert (
        alt_protein_seq_info.embedded_variants[0].variant_id
        == stop_insertion_variant.variant_id
    )
    # Alt seq embedded variant should be positioned correctly
    assert alt_protein_seq_info.embedded_variants[0].seq_start_pos == 3
    assert alt_protein_seq_info.embedded_variants[0].seq_end_pos == 4


def test_translation_of_true_frameshift_insertion(
    wb_transcript_c42d8_8b_1_with_cds,
) -> None:
    """
    Jennifer Smith's "easy" case: a single-nucleotide insertion whose net length
    (len(alt) - len(ref) = +1) is not a multiple of 3, so it shifts the reading
    frame of every downstream codon.

    The pipeline relies on BioPython's ``Seq.translate(..., to_stop=True)`` reading
    the length-shifted coding sequence as plain codon triplets from position 0 —
    which naturally produces the shifted-frame protein and truncates at the first
    stop codon that appears in the new frame. This test proves that end-to-end
    at the pipeline level, not just at the BioPython level.

    Fingerprint of a correctly handled frameshift:
      * The N-terminus matches the reference up to (and including) the Met before
        the insertion position — the frameshift only affects downstream codons.
      * The sequence past that point is different (shifted-frame residues).
      * The alt protein terminates — the C-terminus is not an arbitrary run-on of
        the ref sequence, because BioPython stops at the first shifted-frame stop
        codon. Length is finite and typically different from the reference.
    """
    translatedSeqRegion = wb_transcript_c42d8_8b_1_with_cds["translatedSeqRegion"]

    # Insert a single nucleotide right after the start codon (the same genomic
    # position used by the existing crossing-codons test, which also exercises
    # a 1-nt insertion but asserts only "sequences differ"). A 1-nt insertion
    # is the simplest, cleanest case of a true frameshift — ``net = +1``.
    frameshift_insertion = Variant(
        "test-true-frameshift-insertion",
        "X",
        5116859,
        5116859,
        genomic_ref_seq="C",
        genomic_alt_seq="CA",
    )

    ref_protein = translatedSeqRegion.get_sequence(type="protein", unmasked=False)
    alt_protein = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[frameshift_insertion]
    ).sequence

    # 1. Protein must change — a frameshift can't leave the sequence identical.
    assert alt_protein != ref_protein, "frameshift must alter the protein sequence"

    # 2. N-terminus up to the frameshift position must be preserved. The
    #    variant lands at protein position 2 (per the sibling crossing-codons
    #    test), so residue 1 (Met) must still match.
    assert alt_protein[:1] == ref_protein[:1], (
        f"frameshift must preserve the Met start codon; "
        f"ref starts with {ref_protein[:5]!r}, alt starts with {alt_protein[:5]!r}"
    )

    # 3. Downstream residues must diverge — the shifted frame reads different
    #    codons than the reference. Compare the window right after the
    #    preserved N-terminus; if the alt is at least that long, it should
    #    differ there.
    if len(alt_protein) >= 6:
        assert alt_protein[1:6] != ref_protein[1:6], (
            "frameshift must change downstream codons; "
            f"ref[1:6]={ref_protein[1:6]!r} vs alt[1:6]={alt_protein[1:6]!r}"
        )

    # 4. Translation must actually terminate — no run-on past the end of the
    #    coding sequence. BioPython's ``to_stop=True`` guarantees this, but
    #    the pipeline wrapper must preserve it. A sanity bound: the alt
    #    protein cannot be longer than the alt coding region allows.
    alt_coding = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[frameshift_insertion]
    ).sequence
    assert len(alt_protein) * 3 <= len(alt_coding), (
        "alt protein length exceeds the available alt coding sequence — "
        "translation did not terminate correctly"
    )


def test_translation_of_true_frameshift_deletion(
    wb_transcript_c42d8_8b_1_with_cds,
) -> None:
    """
    Companion to ``test_translation_of_true_frameshift_insertion`` for the
    opposite direction: a single-nucleotide deletion (net length = -1). Same
    biology — the reading frame shifts for every downstream codon — but exercises
    the deletion branch in ``SeqRegion.get_alt_sequence`` rather than the
    insertion branch, so a regression that only affects one of the two paths
    is caught here.
    """
    translatedSeqRegion = wb_transcript_c42d8_8b_1_with_cds["translatedSeqRegion"]

    # Single-nt deletion at the same codon-crossing position used by the
    # insertion sibling test. ``ref="CC"`` + ``alt="C"`` deletes one base.
    frameshift_deletion = Variant(
        "test-true-frameshift-deletion",
        "X",
        5116858,
        5116859,
        genomic_ref_seq="CC",
        genomic_alt_seq="C",
    )

    ref_protein = translatedSeqRegion.get_sequence(type="protein", unmasked=False)
    alt_protein = translatedSeqRegion.get_alt_sequence(
        type="protein", variants=[frameshift_deletion]
    ).sequence

    assert alt_protein != ref_protein, "frameshift deletion must alter the protein"
    assert alt_protein[:1] == ref_protein[:1], (
        "frameshift deletion must preserve the Met start codon"
    )
    if len(alt_protein) >= 6:
        assert alt_protein[1:6] != ref_protein[1:6]
    alt_coding = translatedSeqRegion.get_alt_sequence(
        type="coding", variants=[frameshift_deletion]
    ).sequence
    assert len(alt_protein) * 3 <= len(alt_coding)
