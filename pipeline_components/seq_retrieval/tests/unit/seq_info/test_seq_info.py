"""
Unit testing for SeqInfo class and related functions
"""

import json
import logging
from enum import Enum

import jsonpickle  # type: ignore

from log_mgmt import get_logger, set_log_level
from seq_info import EnumValueHandler, SeqInfo
from variant import AlignmentEmbeddedVariant, SeqEmbeddedVariant

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


def test_seq_info_initiation_all_attributes(wb_variants_yn10_yn30_in_C42D8_8a_1_list):
    """
    Test that the SeqInfo class initiates correctly when given all attributes
    """
    SEQ = "atgACGGTGGGTAAACTAATGATTGGCTTACTTATACCGATTCTTGTCGCCACAGTTTACGCAGAGggTTCCCCAGCAGGCAGCAAGCGACATGAGAAGTTCATTCCAATGGTCGCATTTTCATGTGGATACCGCAACCAGTATATGACCGAAGAGGGATCATGGAAGACTGATGATGAACGATATGCCACCTGCTTCTCTGGCAAACTTGACATCCTCAAGTACTGCCGCAAGGCTTATCCATCCATGAACATCACCAACATCGTCGAATACTCGCACGAAGTGAGCATCTCCGACTGGTGCCGCGAGGAAGGATCGCCATGCAAGTGGACTCACAGTGTCAGACCGTACCATTGCATTGACGGAGAATTCCACTCGGAAGCTCTTCAAGTCCCGCACGACTGTCAATTCTCGCACGTCAACTCGCGCGACCAATGCAACGACTACCAGCACTGGAAGGATGAAGCTGGAAAGCAGTGCAAGACCAAGAAGTCCAAGGGCAACAAGGATATGATTGTCAGATCATTTGCCGTTCTTGAGCCATGCGCACTCGACATGTTCACCGGTGTTGAATTCGTCTGCTGTCCAAATGACCAAACGAACAAGACTgatgttcaaaaaactaaagaagacgaagacgacgacgacgatgaGGATGATGCTTATGAGGATGATTACTCAGAAGAGTccgaCGAGAAGGACGAAGAGGAACCAAGTTCCCAAGATCCATACTTCAAGATTGCCAACTGGACCAACGAGCACGACGATTTTAAGAAGGCAGAAATGAGAATGGATGAGAAGCACAGAAAGAAGGTTGACAAGGTGATGAAGGAGTGGGGAGATTTGGAGACGAGATACAACGAGCAAAAGGCCAAGGATCCAAAGGGAGCCGAGAAGTTCAAGTCTCAAATGAACGCCCGCTTCCAGAAGACCGTTTCTTCGCTCGAAGAAGAGCACAAGAGAATGCGAAAGGAGATCGAGGCGGTTCATGAGGAGCGTGTTCAGGCAATGCTTAACGAGAAGAAGAGAGATGCTACACACGATTATCGTCAAGCTCTCGCTACTCACGTCAACAAGCCAAACAAGCACTCTGTTCTCCAATCTCTTAAGGCTTACATCCGTGCAGAGGAGAAGGATCGCATGCACACTTTGAACAGATACCGTCACTTGCTGAAGGCCGATTCAAAGGAAGCTGCCGCATACAAGCCAACCGTTATTCATCGGCTTCGctACATCGATCTTCGCATCAACGGAACTCTTGCGATGCTTCGCGACTTCCCAGATCTTGAGAAATATGTCCGTCCAATTGCAGTCACCTACTGGAAGGACTACAGAGACGAGGTGTCACCAGATATCTCAGTTGAGGACAGTGAACTCACTCCAATCATCCACGATGATGAGTTCAGCAAAAACGCCAAACTTGACGTGAAGGCTCCAACAACCACCGCCAAGCCAGTCAAGGAAACCGACAATGCTAAGGTTCTCCCAACCGAAGCATCTGACTCCGAGGAGGAAGCTGATGAATATTACgaggatgaagatgatgagcAAGTTAAGAAGACACCTGACATGAAGAAGAAGGTCAAGGTTGTTGACATCAAGCCAAAGGAGATCAAGGTCACAATagaagaggagaagaaggCTCCAAAATTGGTGGAAACATCAGTACAAACTGATGATGAGGACGATGATGAGGACTCTTCCTCGTCCACTTCATCCGAAtctgatgaagatgaagacaaaaacatcAAAGAGCTTCGTGTCGACATTGAGCCGATCATCGATGAGCCAGCCTCATTCTACCGCCACGACAAGCTCATCCAATCACCAGAAGTCGAGCGTTCAGCGTCCAGCGTCTTCCAACCATACGTCCTGGCATCGGCGATGTTCATCACCGCTATCTGCATCATCGCCTTTGCCATCACCAACGCTCGTCGTCGCCGTGCCATGCGCGGTTTCATCGAGGTAGACGTCTACACACCAGAGGAGCGTCATGTCGCTGGAATGCAAGTCAATGGCTATGAAAACCCGACGTACTCATTCTTCGACTCGAAGGCCTAA"
    seq_info = SeqInfo(
        sequence=SEQ, embedded_variants=wb_variants_yn10_yn30_in_C42D8_8a_1_list
    )
    assert isinstance(seq_info, SeqInfo)
    assert seq_info.embedded_variants == wb_variants_yn10_yn30_in_C42D8_8a_1_list
    assert seq_info.sequence == SEQ


def test_seq_info_initiation_no_sequence(wb_variants_yn10_yn30_in_C42D8_8a_1_list):
    """
    Test that the SeqInfo class initiates correctly when given no sequence input arg.
    The resulting SeqInfo object should not have a sequence attribute.
    """
    seq_info = SeqInfo(embedded_variants=wb_variants_yn10_yn30_in_C42D8_8a_1_list)
    assert isinstance(seq_info, SeqInfo)
    assert seq_info.embedded_variants == wb_variants_yn10_yn30_in_C42D8_8a_1_list
    assert not hasattr(seq_info, "sequence")


def test_seq_info_initiation_no_embedded_variants():
    """
    Test that the SeqInfo class initiates correctly when given no embedded_variants input arg.
    The resulting SeqInfo object should not have a embedded_variants attribute.
    """
    SEQ = "atgACGGTGGGTAAACTAATGATTGGCTTACTTATACCGATTCTTGTCGCCACAGTTTACGCAGAGggTTCCCCAGCAGGCAGCAAGCGACATGAGAAGTTCATTCCAATGGTCGCATTTTCATGTGGATACCGCAACCAGTATATGACCGAAGAGGGATCATGGAAGACTGATGATGAACGATATGCCACCTGCTTCTCTGGCAAACTTGACATCCTCAAGTACTGCCGCAAGGCTTATCCATCCATGAACATCACCAACATCGTCGAATACTCGCACGAAGTGAGCATCTCCGACTGGTGCCGCGAGGAAGGATCGCCATGCAAGTGGACTCACAGTGTCAGACCGTACCATTGCATTGACGGAGAATTCCACTCGGAAGCTCTTCAAGTCCCGCACGACTGTCAATTCTCGCACGTCAACTCGCGCGACCAATGCAACGACTACCAGCACTGGAAGGATGAAGCTGGAAAGCAGTGCAAGACCAAGAAGTCCAAGGGCAACAAGGATATGATTGTCAGATCATTTGCCGTTCTTGAGCCATGCGCACTCGACATGTTCACCGGTGTTGAATTCGTCTGCTGTCCAAATGACCAAACGAACAAGACTgatgttcaaaaaactaaagaagacgaagacgacgacgacgatgaGGATGATGCTTATGAGGATGATTACTCAGAAGAGTccgaCGAGAAGGACGAAGAGGAACCAAGTTCCCAAGATCCATACTTCAAGATTGCCAACTGGACCAACGAGCACGACGATTTTAAGAAGGCAGAAATGAGAATGGATGAGAAGCACAGAAAGAAGGTTGACAAGGTGATGAAGGAGTGGGGAGATTTGGAGACGAGATACAACGAGCAAAAGGCCAAGGATCCAAAGGGAGCCGAGAAGTTCAAGTCTCAAATGAACGCCCGCTTCCAGAAGACCGTTTCTTCGCTCGAAGAAGAGCACAAGAGAATGCGAAAGGAGATCGAGGCGGTTCATGAGGAGCGTGTTCAGGCAATGCTTAACGAGAAGAAGAGAGATGCTACACACGATTATCGTCAAGCTCTCGCTACTCACGTCAACAAGCCAAACAAGCACTCTGTTCTCCAATCTCTTAAGGCTTACATCCGTGCAGAGGAGAAGGATCGCATGCACACTTTGAACAGATACCGTCACTTGCTGAAGGCCGATTCAAAGGAAGCTGCCGCATACAAGCCAACCGTTATTCATCGGCTTCGctACATCGATCTTCGCATCAACGGAACTCTTGCGATGCTTCGCGACTTCCCAGATCTTGAGAAATATGTCCGTCCAATTGCAGTCACCTACTGGAAGGACTACAGAGACGAGGTGTCACCAGATATCTCAGTTGAGGACAGTGAACTCACTCCAATCATCCACGATGATGAGTTCAGCAAAAACGCCAAACTTGACGTGAAGGCTCCAACAACCACCGCCAAGCCAGTCAAGGAAACCGACAATGCTAAGGTTCTCCCAACCGAAGCATCTGACTCCGAGGAGGAAGCTGATGAATATTACgaggatgaagatgatgagcAAGTTAAGAAGACACCTGACATGAAGAAGAAGGTCAAGGTTGTTGACATCAAGCCAAAGGAGATCAAGGTCACAATagaagaggagaagaaggCTCCAAAATTGGTGGAAACATCAGTACAAACTGATGATGAGGACGATGATGAGGACTCTTCCTCGTCCACTTCATCCGAAtctgatgaagatgaagacaaaaacatcAAAGAGCTTCGTGTCGACATTGAGCCGATCATCGATGAGCCAGCCTCATTCTACCGCCACGACAAGCTCATCCAATCACCAGAAGTCGAGCGTTCAGCGTCCAGCGTCTTCCAACCATACGTCCTGGCATCGGCGATGTTCATCACCGCTATCTGCATCATCGCCTTTGCCATCACCAACGCTCGTCGTCGCCGTGCCATGCGCGGTTTCATCGAGGTAGACGTCTACACACCAGAGGAGCGTCATGTCGCTGGAATGCAAGTCAATGGCTATGAAAACCCGACGTACTCATTCTTCGACTCGAAGGCCTAA"
    seq_info = SeqInfo(sequence=SEQ)
    assert isinstance(seq_info, SeqInfo)
    assert seq_info.sequence == SEQ
    assert not hasattr(seq_info, "embedded_variants")


def test_empty_seq_info_initiation():
    """
    Test that the SeqInfo class can be initiated with no arguments
    """
    seq_info = SeqInfo()
    assert isinstance(seq_info, SeqInfo)
    assert not hasattr(seq_info, "sequence")
    assert not hasattr(seq_info, "embedded_variants")


def test_seq_info_initiation_from_dict_seq_embedded_variants():
    """
    Test that the SeqInfo class can be initiated from a dictionary with seqEmbeddedVariants
    """
    seq_info = SeqInfo.from_dict(
        {
            "sequence": "ATG",
            "embedded_variants": [
                {
                    "variant_id": "NC_003284.9:g.5114224C>T",
                    "genomic_seq_id": "X",
                    "genomic_start_pos": 5114224,
                    "genomic_end_pos": 5114224,
                    "genomic_ref_seq": "C",
                    "genomic_alt_seq": "T",
                    "seq_substitution_type": "substitution",
                    "seq_start_pos": 2,
                    "seq_end_pos": 2,
                    "embedded_ref_seq_len": 1,
                    "embedded_alt_seq_len": 1,
                }
            ],
        }
    )

    assert isinstance(seq_info, SeqInfo)
    assert seq_info.sequence == "ATG"
    assert (
        seq_info.embedded_variants is not None and len(seq_info.embedded_variants) == 1
    )
    assert isinstance(seq_info.embedded_variants[0], SeqEmbeddedVariant)
    assert seq_info.embedded_variants[0].variant_id == "NC_003284.9:g.5114224C>T"


def test_seq_info_initiation_from_dict_alignment_embedded_variants():
    """
    Test that the SeqInfo class can be initiated from a dictionary with AlignmentEmbeddedVariants
    """
    seq_info = SeqInfo.from_dict(
        {
            "sequence": "ATG",
            "embedded_variants": [
                {
                    "variant_id": "NC_003284.9:g.5114224C>T",
                    "genomic_seq_id": "X",
                    "genomic_start_pos": 5114224,
                    "genomic_end_pos": 5114224,
                    "genomic_ref_seq": "C",
                    "genomic_alt_seq": "T",
                    "seq_substitution_type": "substitution",
                    "seq_start_pos": 2,
                    "seq_end_pos": 2,
                    "alignment_start_pos": 2,
                    "alignment_end_pos": 2,
                    "embedded_ref_seq_len": 1,
                    "embedded_alt_seq_len": 1,
                }
            ],
        }
    )

    assert isinstance(seq_info, SeqInfo)
    assert seq_info.sequence == "ATG"
    assert (
        seq_info.embedded_variants is not None and len(seq_info.embedded_variants) == 1
    )
    assert isinstance(seq_info.embedded_variants[0], AlignmentEmbeddedVariant)
    assert seq_info.embedded_variants[0].variant_id == "NC_003284.9:g.5114224C>T"


def test_seq_info_initiation_from_dict_unsupported_variants():
    """
    SeqInfo.from_dict must parse the unsupported_variants list, preserving the
    variant_id/reason pairs the pipeline wrote. The field reaches the UI via
    aligned_seq_info.json → the API → the webui, and that path starts with
    from_dict (see pipeline_components/seq_retrieval/src/seq_info_align.py:222).
    """
    seq_info = SeqInfo.from_dict(
        {
            "sequence": "MKT",
            "unsupported_variants": [
                {
                    "variant_id": "NC_003284.9:g.5113285_5115215del",
                    "reason": "disrupts a splice acceptor site — resulting transcript cannot be predicted from the reference exon map",
                },
                {
                    "variant_id": "some_other_variant",
                    "reason": "stop codon lost — translating past the reference stop requires re-predicting the resulting transcript",
                },
            ],
        }
    )

    assert isinstance(seq_info, SeqInfo)
    assert seq_info.sequence == "MKT"
    assert seq_info.unsupported_variants is not None
    assert len(seq_info.unsupported_variants) == 2
    assert seq_info.unsupported_variants[0]["variant_id"] == "NC_003284.9:g.5113285_5115215del"
    assert "splice acceptor" in seq_info.unsupported_variants[0]["reason"]
    assert seq_info.unsupported_variants[1]["variant_id"] == "some_other_variant"
    assert "stop codon" in seq_info.unsupported_variants[1]["reason"]


def test_seq_info_from_dict_unsupported_variants_type_errors():
    """
    Malformed unsupported_variants payloads must raise TypeError up front so the
    pipeline fails loudly during JSON ingestion rather than silently handing a
    broken list to the UI.
    """
    import pytest

    with pytest.raises(TypeError, match="unsupported_variants must be a list"):
        SeqInfo.from_dict({"unsupported_variants": "not-a-list"})

    with pytest.raises(TypeError, match="unsupported_variants must be a list of dicts"):
        SeqInfo.from_dict({"unsupported_variants": ["not-a-dict"]})

    with pytest.raises(TypeError, match="variant_id and reason"):
        SeqInfo.from_dict(
            {"unsupported_variants": [{"variant_id": "v1"}]}  # missing reason
        )

    with pytest.raises(TypeError, match="variant_id and reason"):
        SeqInfo.from_dict(
            {"unsupported_variants": [{"reason": "x"}]}  # missing variant_id
        )


def test_seq_info_unsupported_variants_jsonpickle_roundtrip():
    """
    Full write/read round-trip proving unsupported_variants survives the exact
    serializer the pipeline uses (jsonpickle, make_refs=False, unpicklable=False)
    and the exact parser the merge step uses (SeqInfo.from_dict). This is the
    plumbing between seq_retrieval (writes per-sequence seqinfo JSON) and
    seq_info_align (reads them back and merges — see src/seq_info_align.py:222).

    If this test ever regresses, a user who hits an unsupported variant will see
    their variant quietly drop out of the result page instead of appearing in the
    "skipped" sidecar with a reason.
    """
    jsonpickle.register(Enum, EnumValueHandler, base=True)

    original = SeqInfo(
        sequence="MKTVGK",
        species="Caenorhabditis elegans",
        requested_variant_ids=["v_supported", "v_stop_lost", "v_splice"],
        unsupported_variants=[
            {
                "variant_id": "v_stop_lost",
                "reason": "stop codon lost — translating past the reference stop requires re-predicting the resulting transcript",
            },
            {
                "variant_id": "v_splice",
                "reason": "disrupts a splice donor site — resulting transcript cannot be predicted from the reference exon map",
            },
        ],
    )

    encoded = jsonpickle.encode(original, make_refs=False, unpicklable=False)
    assert encoded is not None, "jsonpickle must produce a JSON string"
    raw = json.loads(encoded)
    assert "unsupported_variants" in raw, (
        "jsonpickle silently dropped unsupported_variants during encode — the UI "
        "would never see skipped variants if this regresses"
    )

    decoded = SeqInfo.from_dict(raw)
    assert decoded.sequence == original.sequence
    assert decoded.species == original.species
    assert decoded.requested_variant_ids == original.requested_variant_ids
    assert decoded.unsupported_variants == original.unsupported_variants
