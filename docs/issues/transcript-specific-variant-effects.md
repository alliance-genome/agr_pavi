# Architectural Gap: Transcript-Specific Variant Effects

## Summary

PAVI's allele selection is **gene-level**, but variant effects on protein sequence are **transcript-specific**. A variant that is `missense_variant` for one transcript may be `3_prime_UTR_variant` or `synonymous_variant` for another transcript of the same gene. Users can unknowingly select alleles whose variants have no protein-level effect on the chosen transcript, resulting in identical reference and variant protein sequences (VARIANTS: 0 in results).

## The Problem

### Current Behavior

1. User selects a **gene** (e.g., TP53)
2. User selects one or more **transcripts** (e.g., ENST00000413465.6)
3. User opens the allele dropdown and selects an **allele** (e.g., one carrying rs78378222)
4. Job runs: seq_retrieval embeds the variant into the genomic sequence, translates to protein
5. Result shows **VARIANTS: 0** — the reference and variant protein sequences are identical

### Why This Happens

The Alliance API endpoint `GET /api/gene/{id}/allele-variant-detail` returns records structured as:

```
allele × variant × transcript
```

For a gene like TP53 (133,000+ records in the API), a single variant can have different molecular consequences depending on which transcript it maps to:

| Variant | Transcript | Consequence |
|---------|-----------|-------------|
| rs78378222 | ENST00000269305.9 | `missense_variant` |
| rs78378222 | ENST00000413465.6 | `3_prime_UTR_variant` |
| rs78378222 | ENST00000610292.5 | `missense_variant` |

When the user selects rs78378222 and transcript ENST00000413465.6, the variant falls in the 3' UTR — outside the coding sequence. The pipeline correctly produces identical protein sequences, but the user sees this as "nothing happened" with no explanation.

### Root Cause

PAVI's `fetchAlleles()` server action (in `serverActions.ts`) groups API results by allele ID, collecting all unique variant IDs across all transcripts. It discards the transcript dimension entirely:

```typescript
// Current: allele → {id, displayName, variants: Map<variantId, variant>}
// Missing: which transcripts each variant actually affects at the protein level
```

The allele dropdown shows all alleles with variants for the gene, regardless of whether those variants produce protein changes in the user's selected transcript(s).

## Real-World Example

**Gene:** TP53 (HGNC:11998)
**Transcript selected:** ENST00000413465.6
**Allele selected:** carries variant rs78378222

- At the gene level, rs78378222 is listed as `missense_variant` (true for some transcripts)
- For ENST00000413465.6 specifically, rs78378222 falls in the 3' UTR
- Pipeline correctly produces identical proteins → VARIANTS: 0
- User is confused: "I selected a variant, where is it?"

**Confirmed working example:** ACTB with rs2128241151 — a genuine missense variant that produces a visible protein change in the result.

## Scale of the Issue

For genes with many transcripts and variants (like TP53):
- Alliance API returns **133,000+** allele-variant-detail records
- PAVI caps at **500 records** (MAX_ALLELE_RESULTS) to prevent browser freeze
- After grouping by allele ID: ~28 unique alleles shown in dropdown
- Many of these alleles may carry variants that are UTR/synonymous for the user's selected transcript

## Potential Solutions

### Option A: Filter alleles by selected transcript(s)

Cross-reference the selected transcript(s) with the allele-variant-detail data to show only alleles whose variants produce protein-coding changes (missense, frameshift, etc.) for those specific transcripts.

**Pros:** Clean UX — user only sees relevant alleles
**Cons:** Requires retaining transcript dimension in fetched data; dropdown contents change when transcript selection changes

### Option B: Annotate alleles with transcript-specific effect

Show all alleles but annotate each with its effect on the selected transcript(s). Grey out or tag alleles whose variants are UTR/synonymous for the current transcript selection.

**Pros:** User sees all alleles and understands why some won't show changes
**Cons:** More complex UI; still requires transcript-variant cross-referencing

### Option C: Post-submission warning

After the pipeline runs, if a variant produces no protein change, display a clear message explaining why (e.g., "Variant rs78378222 is in the 3' UTR of ENST00000413465.6 and does not affect the protein sequence").

**Pros:** Simplest to implement; no changes to allele selection
**Cons:** User wastes time waiting for a job that produces no useful diff

### Option D: Informational note in current UI

Add a note near the allele dropdown explaining that variant effects are transcript-specific and some combinations may not produce protein changes.

**Pros:** Minimal code change
**Cons:** Doesn't solve the underlying UX confusion

## Alliance API Details

### Endpoint

```
GET https://www.alliancegenome.org/api/gene/{geneId}/allele-variant-detail
```

### Key Response Fields

Each record contains:
- `allele.id` — Allele identifier
- `allele.symbol` — Allele display name
- `variant.id` — Variant identifier (e.g., rs78378222)
- `variant.displayName` — Variant display name
- `transcript` — Transcript this record applies to
- `molecularConsequence` — Effect type (missense_variant, 3_prime_UTR_variant, etc.)

### Filtering

The endpoint supports `filter.alleleCategory` to filter by category. PAVI excludes the plain `allele` category to show only alleles with associated variants.

## Related Issues

- [UTR Variant Position Bug](./utr-variant-position-bug.md) — Variants in UTR regions incorrectly displayed at protein position 1
- KANBAN-532 — Recalculate variant effects
- KANBAN-691 — Limit allele-transcript combinations

## Affected Code

| File | Relevance |
|------|-----------|
| `webui/src/app/submit/components/AlignmentEntry/serverActions.ts` | `fetchAlleles()` — groups by allele, discards transcript dimension |
| `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx` | Allele dropdown — shows all alleles regardless of transcript |
| `webui/src/hooks/useAlleleSelection.ts` | Allele selection hook — no transcript awareness |
| `pipeline_components/seq_retrieval/src/variant/variant.py` | Variant embedding — uses genomic coordinates only |

## Status

**Discovered:** 2026-03-11
**Status:** Documented, not yet addressed
**Priority:** Medium — affects user experience but does not produce incorrect results (pipeline correctly reports no protein change)
