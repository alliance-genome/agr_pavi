# HGVS Variant Lookup & Best-Effort Variant Search — Design

**Status:** Approved (design), pending spec review
**Date:** 2026-08-04
**Component:** `webui` — `/submit` Alignment entry, "Alleles" MultiSelect

## Problem

The "Alleles" box on the submit form is a **client-side filter over a
pre-loaded list**, not a search. When a gene is selected, PAVI fetches its
alleles once (`fetchAlleles`) and caps the load at `MAX_DISTINCT_ALLELES =
100` distinct alleles, in the Alliance API's fixed **ascending
genomic-position order**. For high-variant genes the tail is silently
hidden.

Concrete report: mouse *Pax6* (`MGI:97490`) has **10,876 variant rows** /
300+ distinct alleles. The 100-cap stops near genomic position ~105.50M. A
user trying to add `NC_000068.8:g.105521966G>T` (position 105,521,966) —
whether pasting the HGVS or typing the allele name — gets "no results",
because that variant was never loaded and the box can only filter what is
already present.

## Feasibility findings (live Alliance API, verified 2026-08-04)

| Mechanism | Result |
|---|---|
| `allele-variant-detail` filter params (`filter.variant`, `q`, `filter.symbol`) | Ignored — return the full unfiltered set. No text/HGVS/position filter. |
| `allele-variant-detail` `sortBy`/`asc` | Ignored — order fixed ascending by position. |
| `/api/search?category=variant_search_result&q=<full HGVS or position>` | 0 results — index does not tokenize full HGVS or interior position. |
| `/api/search?category=variant_search_result&q=<gene token>&species=<species>` | Works — returns that gene's variants (name = HGVS), position-ordered. `species=` scopes correctly; `fq=genes:` does not. |
| **`/api/variant/{hgvs}`** (exact HGVS) | **HTTP 200 with full record.** Same endpoint the pipeline already uses for sequence retrieval. |

Implication: **exact-HGVS lookup is the only mechanism that lands a specific
deep-tail variant.** Text search can only surface *a gene's variants in
bulk* (like the existing fetch), never jump to a specific one. Bare-position
search and symbol-only "jump to this variant" are **not supported by any
available endpoint** and are out of scope.

`/api/variant/{hgvs}` response (verified for the reported variant) carries
everything needed:
- `geneIds: ['MGI:97490']` — lets us confirm the variant belongs to the
  selected gene.
- `allele.primaryExternalId: 'MGI:1856155'`, `symbol: 'Pax6<sup>Sey</sup>'`
  — allele id + display name.
- `variantList[0].curatedVariantGenomicLocations[0].hgvs` — the HGVS the
  pipeline requires as the variant id.
- `variantList[0].curatedVariantGenomicLocations[0].predictedVariantConsequences[]`
  — per-transcript `variantTranscript.name`, `vepImpact.name`,
  `vepConsequences[].name`, `calculatedProteinStart` for consequence badges.

Note this shape **differs** from `allele-variant-detail`: consequences live
under `curatedVariantGenomicLocations[].predictedVariantConsequences`, not a
top-level `consequence`. It needs its own parser.

## Goal

Let a user add a variant that is past the 100-allele cap:

1. **HGVS lookup (primary):** typing/pasting a full HGVS into the Alleles box
   resolves it via `/api/variant/{hgvs}`, confirms gene match, and adds it as
   a selectable, pipeline-ready option.
2. **Best-effort text search (secondary):** typing a non-HGVS token (≥3
   chars) queries `variant_search_result` scoped to the gene's species and
   merges any of *that gene's* variants into the options.

Both merge into the existing allele model so selection and submission work
unchanged.

## Architecture

Two new server actions produce `AlleleInfo` objects (the existing model).
The `useAlleleSelection` hook gains an `addAlleles` merge action so found
alleles enter `alleleList` — the single source the submission path reads
from. `AlignmentEntry` wires a **debounced `onFilter`** handler on the
Alleles MultiSelect that routes to HGVS-lookup or text-search and reports
status.

### Why merge into `alleleList`, not a local options union

`useAlleleSelection.processAlleleEntry` builds the submitted allele info from
`alleleList` keyed by `allele.id` (`useAlleleSelection.ts:80-104`), and
`AlignmentEntry` builds `variant_ids` from each selected allele's variant-Map
keys (`AlignmentEntry.tsx:271`). An allele that appears only in the dropdown
options but not in `alleleList` would be selectable yet **dropped at
submission** ("Selected allele not found"). Therefore found alleles must land
in `alleleList`.

### Selection-preservation constraint (must-fix)

The effect at `useAlleleSelection.ts:109-123` **blanket-clears
`selectedAlleleIds` whenever `alleleList` changes**, on the assumption that
`alleleList` only changes on a fresh gene load. Appending search results
would therefore wipe the user's in-progress selection. Fix: change that
effect to drop **only** selected ids that are absent from the new list,
instead of clearing all. This preserves the existing cross-gene behavior (a
new gene's list contains none of the old ids → selection cleared) while
allowing appends (selected ids still present → selection preserved).

### Server-action serialization

Server actions serialize `Map` → plain object across the boundary;
`AlignmentEntry` already tolerates this via `getVariantKeys` /
`getVariantValues` (`AlignmentEntry.tsx:30-37`). New actions build `AlleleInfo`
with a real `Map`; consumers must use those helpers (they already do).

## File Structure

- **Modify** `webui/src/app/submit/components/AlignmentEntry/serverActions.ts`
  — add `lookupVariantByHgvs` and `searchVariants`, plus a shared
  `parsePredictedConsequence` helper for the `/api/variant` shape.
- **Modify** `webui/src/app/submit/components/AlignmentEntry/types.ts` — add
  optional `source?: AlleleSource` to `AlleleInfo` for UI labeling
  (`'gene' | 'lookup' | 'search'`); existing gene-fetched alleles default to
  `'gene'`.
- **Create** `webui/src/app/submit/components/AlignmentEntry/hgvs.ts` — a
  pure `looksLikeHgvs(text): boolean` detector + `normalizeHgvs(text)` trim,
  unit-tested in isolation.
- **Modify** `webui/src/hooks/useAlleleSelection.ts` — add `addAlleles`
  action; rework the reset effect to preserve selection on append.
- **Modify** `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx`
  — debounced `onFilter` handler, variant-search status line, wire
  `addAlleles`.
- **Tests** co-located in `__tests__/` for each.

## Interfaces

```ts
// types.ts
export type AlleleSource = 'gene' | 'lookup' | 'search'
export interface AlleleInfo {
    readonly id: string
    readonly displayName: string
    variants: Map<string, VariantInfo>
    hasDisease: boolean
    hasPhenotype: boolean
    readonly source?: AlleleSource   // NEW, optional; undefined treated as 'gene'
}

// hgvs.ts
// Matches genomic HGVS like "NC_000068.8:g.105521966G>T",
// "NC_000068.8:g.105521966_105521970del", etc. Ref/alt optional (indels).
export function looksLikeHgvs(text: string): boolean
export function normalizeHgvs(text: string): string   // trim + collapse inner whitespace

// serverActions.ts
// Resolve one exact HGVS; null if not 200, malformed, or gene mismatch.
export async function lookupVariantByHgvs(
    geneId: string, hgvs: string
): Promise<AlleleInfo | null>

// Best-effort text search scoped to the gene's species; returns that gene's
// matching variants as minimal HGVS-keyed AlleleInfo (empty consequences).
// Empty array on no match / error. `limit` defaults to 15.
export async function searchVariants(
    geneId: string, geneSymbol: string, speciesName: string,
    query: string, limit?: number
): Promise<AlleleInfo[]>

// useAlleleSelection.ts (added to returned object)
addAlleles: (newAlleles: AlleleInfo[]) => void   // merge into alleleList, dedup by id
```

### `lookupVariantByHgvs` behavior

1. `GET https://www.alliancegenome.org/api/variant/{encodeURIComponent(hgvs)}`,
   `accept: application/json`.
2. Non-200 → `null`.
3. If `geneIds` does not include `geneId` → `null` (variant belongs to a
   different gene).
4. Build `AlleleInfo`:
   - `id` = `allele.primaryExternalId` if present, else the HGVS (variants
     with no named allele become their own pseudo-allele, matching the
     existing variant-row convention in `fetchAlleles`).
   - `displayName` = `stripHtml(symbol)` if present, else the HGVS.
   - one `VariantInfo`: `id` = HGVS, `displayName` = HGVS, `consequences`
     parsed from `predictedVariantConsequences` via
     `parsePredictedConsequence`.
   - `source: 'lookup'`.

### `searchVariants` behavior

1. `GET /api/search?category=variant_search_result&q={query}&species={speciesName}&limit={limit}`.
2. Keep results whose `genes` array contains an entry matching `geneSymbol`
   (case-insensitive prefix before the space, e.g. `'Pax6 (Mmu)'` → `Pax6`).
3. Map each kept result to a minimal `AlleleInfo`: `id` = `displayName` =
   `result.name` (the HGVS); one `VariantInfo` `{ id: name, displayName:
   name, consequences: [] }`; `source: 'search'`.
4. Dedup by id; return up to `limit`. Empty on error (best-effort, never
   throws to the UI).

Search hits intentionally omit consequence badges (the search core does not
return per-transcript consequences); the HGVS is sufficient for selection and
submission. A user who wants full detail can paste the exact HGVS to get the
enriched `lookup` record.

## Data Flow

```
User types in Alleles filter box
        │  onFilter(value)  [debounced ~350ms]
        ▼
looksLikeHgvs(value)? ──yes──► lookupVariantByHgvs(geneId, value)
        │no                              │
        ▼                                ├─ AlleleInfo ► addAlleles([it]) ► status "Added"
value.length ≥ 3 ?                       └─ null       ► status "No match for this gene"
        │yes
        ▼
searchVariants(geneId, symbol, species, value)
        │
        ├─ [AlleleInfo...] ► addAlleles(list) ► status "N added"
        └─ []              ► status "No matches"
                                             │
addAlleles merges into alleleList (dedup by id)
        ▼
alleleOptions useMemo (already unions selected-but-hidden) includes them
        ▼
PrimeReact MultiSelect filter matches on filterValue (contains HGVS) → shows
        ▼
User selects → selectedAlleleIds → processAlleleEntry reads alleleList
        ▼
Submit: variant_ids = selected alleles' variant-Map keys (HGVS) → pipeline
```

## Error Handling

- All network calls wrapped; failures return `null`/`[]` and set a neutral
  status ("No match for this gene" / "Search unavailable"). The box remains
  usable for the already-loaded list.
- HGVS lookup gene-mismatch is a first-class "not this gene" outcome, not an
  error.
- Debounce prevents a request per keystroke; an in-flight request is
  superseded (ignore stale responses via a request-id/latest-wins guard so a
  slow earlier response cannot overwrite a newer one).
- `addAlleles` is idempotent: re-adding an existing id is a no-op and does not
  disturb selection.

## Testing

- **`hgvs.test.ts`** — `looksLikeHgvs` accepts `NC_000068.8:g.105521966G>T`,
  `NC_000068.8:g.105521966_105521970del`, `NC_000011.10:g.31790705C>A`;
  rejects `Pax6`, `Sey`, `105521966`, empty. `normalizeHgvs` trims.
- **`serverActions` tests** (fetch mocked):
  - `lookupVariantByHgvs` returns a well-formed `AlleleInfo` (allele id,
    display name, one HGVS variant, parsed consequences, `source:'lookup'`)
    for a 200 payload whose `geneIds` includes the gene.
  - returns `null` on gene mismatch, on non-200, and on missing
    `variantList`.
  - `searchVariants` keeps only current-gene hits, maps to HGVS-keyed
    `AlleleInfo` with `source:'search'`, dedups, respects `limit`, returns
    `[]` on error.
- **`useAlleleSelection` tests** — `addAlleles` merges + dedups; a selection
  made before `addAlleles` **survives** the append (regression test for the
  reset effect); a genuine gene change still clears stale selection.
- **`AlignmentEntry` test** — typing an HGVS triggers `lookupVariantByHgvs`
  (mocked) and the returned allele appears as an option; the debounce fires
  once for rapid input.

## Global Constraints

- TypeScript strict mode; ESLint `--max-warnings 0`.
- Jest + React Testing Library; tests co-located in `__tests__/`.
- No new runtime dependencies (debounce via a small local util / `useRef`
  timer, not lodash).
- Server actions keep the existing `'use server'` module contract and the
  Alliance base URL already used in `serverActions.ts`.
- Variant ids submitted to the pipeline MUST be HGVS strings (the pipeline's
  `/api/variant/{id}` rejects MGI:/rs: CURIEs).
- Preserve existing behavior: gene-fetched alleles, the 100-cap fetch, and
  cross-gene selection reset all continue to work.
```
