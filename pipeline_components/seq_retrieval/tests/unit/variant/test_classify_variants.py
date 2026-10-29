"""
Unit tests for ``seq_retrieval.classify_variants_for_translation`` — the gate
that decides which incoming variants we translate, which we silently filter
(non-coding), and which we surface to the user as "unsupported" (stop_lost,
splice sites, transcript_ablation).

Covers Jennifer Smith's deferred classes (see memory
``project-indel-support-request``) and the recon finding that the pipeline used
to let these through, either silently dropping the result or raising upstream.
"""

from variant import Variant
from seq_retrieval import classify_variants_for_translation

# ``wb_variant_yn10``, ``wb_variant_yn32``, ``wb_variant_gk787530`` are brought
# in by ``tests/unit/variant/conftest.py`` (star-import from
# ``fixtures.variants``) and resolved by pytest at collection time.


def test_classify_pure_snv_lands_in_coding() -> None:
    """A plain missense SNV translates — it belongs in the coding bucket."""
    v = Variant(
        variant_id="snv_missense",
        seq_id="X",
        start=100,
        end=100,
        genomic_ref_seq="C",
        genomic_alt_seq="T",
        molecular_consequences=["missense_variant"],
    )
    coding, non_coding, unsupported = classify_variants_for_translation([v])
    assert coding == [v]
    assert non_coding == []
    assert unsupported == []


def test_classify_frameshift_without_splice_overlap_is_coding() -> None:
    """
    Jennifer's "easy" case: a frameshift variant with no splice-site overlap
    translates. The pipeline's find_orfs + Seq.translate(to_stop=True) chain
    handles the shifted frame correctly (see
    ``test_translation_of_true_frameshift_insertion``), so the gate must not
    reject these.
    """
    v = Variant(
        variant_id="pure_frameshift_insertion",
        seq_id="X",
        start=100,
        end=101,
        genomic_ref_seq="C",
        genomic_alt_seq="CA",  # net +1 nt
        molecular_consequences=["frameshift_variant"],
    )
    coding, non_coding, unsupported = classify_variants_for_translation([v])
    assert coding == [v]
    assert unsupported == []


def test_classify_stop_gained_snv_is_coding() -> None:
    """
    Stop-gained variants translate — the pipeline just needs the alt coding
    sequence to produce a protein that terminates earlier. This is explicitly
    in Jennifer's "easy" set.
    """
    v = Variant(
        variant_id="snv_stop_gained",
        seq_id="X",
        start=200,
        end=200,
        genomic_ref_seq="C",
        genomic_alt_seq="A",
        molecular_consequences=["stop_gained"],
    )
    coding, _, unsupported = classify_variants_for_translation([v])
    assert coding == [v]
    assert unsupported == []


def test_classify_non_coding_variants_are_filtered() -> None:
    """UTR / intronic / intergenic variants go to the non_coding bucket."""
    utr = Variant(
        variant_id="utr", seq_id="X", start=1, end=1,
        genomic_ref_seq="A", genomic_alt_seq="T",
        molecular_consequences=["3_prime_UTR_variant"],
    )
    intron = Variant(
        variant_id="intron", seq_id="X", start=2, end=2,
        genomic_ref_seq="A", genomic_alt_seq="T",
        molecular_consequences=["intron_variant"],
    )
    coding, non_coding, unsupported = classify_variants_for_translation([utr, intron])
    assert coding == []
    assert len(non_coding) == 2
    assert {v.variant_id for v in non_coding} == {"utr", "intron"}
    assert unsupported == []


def test_classify_stop_lost_is_unsupported_with_reason() -> None:
    """
    Jennifer's deferred class: stop_lost. The pipeline currently has no way to
    predict which codon the translation should run to when the reference stop
    is destroyed (that requires re-predicting the resulting transcript), so we
    refuse to translate and surface the reason to the UI.
    """
    v = Variant(
        variant_id="stop_lost_v",
        seq_id="X",
        start=300,
        end=302,
        genomic_ref_seq="TAA",
        genomic_alt_seq="CAA",
        molecular_consequences=["stop_lost"],
    )
    coding, _, unsupported = classify_variants_for_translation([v])
    assert coding == []
    assert len(unsupported) == 1
    assert unsupported[0]["variant_id"] == "stop_lost_v"
    assert "stop codon" in unsupported[0]["reason"]


def test_classify_splice_variants_are_unsupported() -> None:
    """
    Jennifer's deferred class: anything that disrupts splice sites. Even if the
    variant is also a frameshift (which we normally translate), the splice-site
    disruption means the resulting transcript boundaries move — frameshift
    translation on the reference exon map would produce a wrong protein.
    """
    for term in ("splice_acceptor_variant", "splice_donor_variant", "splice_region_variant"):
        v = Variant(
            variant_id=f"splice_{term}",
            seq_id="X",
            start=400,
            end=400,
            genomic_ref_seq="G",
            genomic_alt_seq="T",
            molecular_consequences=[term],
        )
        coding, _, unsupported = classify_variants_for_translation([v])
        assert coding == [], f"{term} must not be translated"
        assert len(unsupported) == 1
        assert unsupported[0]["variant_id"] == f"splice_{term}"
        assert "splice" in unsupported[0]["reason"].lower()


def test_classify_frameshift_plus_splice_overlap_is_unsupported() -> None:
    """
    Mixed-consequence variant: ``frameshift_variant`` + ``splice_acceptor_variant``.
    The frameshift translation path can't rescue this — splice-site disruption
    means the exon map we'd translate against is itself wrong. The variant must
    end up in ``unsupported`` with a splice-related reason, NOT in ``coding``.
    """
    v = Variant(
        variant_id="frameshift_at_splice_site",
        seq_id="X",
        start=500,
        end=501,
        genomic_ref_seq="AC",
        genomic_alt_seq="A",
        molecular_consequences=["frameshift_variant", "splice_acceptor_variant"],
    )
    coding, _, unsupported = classify_variants_for_translation([v])
    assert coding == []
    assert len(unsupported) == 1
    assert "splice" in unsupported[0]["reason"].lower()


def test_classify_real_wb_variant_yn10_is_unsupported(wb_variant_yn10) -> None:
    """
    End-to-end check with the real Alliance variant fixture ``wb_variant_yn10``,
    which carries the full "hard" cocktail from Jennifer's deferred list:
    ``splice_acceptor_variant`` + ``splice_donor_variant`` + ``frameshift_variant``
    + ``stop_lost`` + ``intron_variant`` (per the fixture definition in
    ``tests/unit/variant/fixtures/variants.py``).

    Before this gate, this variant went through the translation path and either
    raised ``NotImplementedError`` (partially-overlapping indel) or produced a
    silently wrong protein. After the gate, it must land in ``unsupported`` with
    a reason the UI can display.
    """
    coding, non_coding, unsupported = classify_variants_for_translation([wb_variant_yn10])
    assert coding == [], "yn10 must not go through translation"
    assert non_coding == [], "yn10 affects coding — it is not UTR/intron-only"
    assert len(unsupported) == 1
    entry = unsupported[0]
    assert entry["variant_id"] == wb_variant_yn10.variant_id
    # Either splice or stop reason is acceptable — both are in yn10's cocktail
    # and either tells the user why we skipped it. The exact wording comes from
    # UNSUPPORTED_CONSEQUENCES and the first-match rule in unsupported_reason.
    reason = entry["reason"].lower()
    assert "splice" in reason or "stop codon" in reason, (
        f"expected a splice- or stop_lost-related reason, got: {entry['reason']!r}"
    )


def test_classify_mixed_batch(
    wb_variant_yn10, wb_variant_yn32, wb_variant_gk787530
) -> None:
    """
    A realistic batch submission: one supported SNV, one supported SNV, and one
    unsupported splice/stop_lost cocktail. All three must land in the right
    bucket in a single call — a bug that silently reclassified the SNVs would
    corrupt a user's alignment, and a bug that dropped the unsupported variant
    silently would leave the user wondering why their variant disappeared.
    """
    coding, non_coding, unsupported = classify_variants_for_translation(
        [wb_variant_yn32, wb_variant_yn10, wb_variant_gk787530]
    )
    assert set(v.variant_id for v in coding) == {
        wb_variant_yn32.variant_id,
        wb_variant_gk787530.variant_id,
    }
    assert non_coding == []
    assert len(unsupported) == 1
    assert unsupported[0]["variant_id"] == wb_variant_yn10.variant_id
