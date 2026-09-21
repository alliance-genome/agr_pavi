# HGVS Variant Lookup & Best-Effort Variant Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user add a variant that is past the 100-allele fetch cap by resolving a pasted HGVS via `/api/variant/{hgvs}`, plus best-effort gene-scoped text search via `variant_search_result`, merging results into the existing allele model.

**Architecture:** Two new server actions produce `AlleleInfo` objects. `useAlleleSelection` gains an `addAlleles` merge action (and a selection-preserving rework of its reset effect) so found alleles enter `alleleList` — the single source the submission path reads. `AlignmentEntry` wires a debounced `onFilter` on the Alleles MultiSelect that routes to HGVS-lookup or text-search and reports status.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, PrimeReact MultiSelect, Jest + React Testing Library. No new runtime deps.

## Global Constraints

- TypeScript strict mode; ESLint `--max-warnings 0` (run `npm run lint` + `npm run typecheck` — note the repo's `tsc --noEmit --strict` reports pre-existing jest/chai matcher type errors in `*.test.tsx`; those are unrelated. Verify with `npx jest` that the target tests pass).
- Jest + React Testing Library; tests co-located in `__tests__/`.
- No new runtime dependencies. Debounce via a local `useRef` timer, not lodash.
- Server actions keep the `'use server'` module contract and the Alliance base host already used in `serverActions.ts` (`https://www.alliancegenome.org`).
- Variant ids submitted to the pipeline MUST be HGVS strings (`/api/variant/{id}` rejects `MGI:`/`rs:` CURIEs). Every added variant uses its HGVS as the `VariantInfo.id` (the Map key), because `AlignmentEntry.tsx:271` builds `variant_ids` from variant-Map keys.
- Preserve existing behavior: the 100-cap `fetchAlleles`, gene-fetched alleles, and cross-gene selection reset must all keep working.
- Alliance API field shapes are verified live (2026-08-04) in the design doc `docs/superpowers/specs/2026-08-04-hgvs-variant-lookup-design.md`. Trust those shapes.

---

### Task 1: HGVS detector utility

**Files:**
- Create: `webui/src/app/submit/components/AlignmentEntry/hgvs.ts`
- Test: `webui/src/app/submit/components/AlignmentEntry/__tests__/hgvs.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `looksLikeHgvs(text: string): boolean`, `normalizeHgvs(text: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
// webui/src/app/submit/components/AlignmentEntry/__tests__/hgvs.test.ts
import { looksLikeHgvs, normalizeHgvs } from '../hgvs';

describe('normalizeHgvs', () => {
    it('trims and collapses inner whitespace', () => {
        expect(normalizeHgvs('  NC_000068.8:g.105521966G>T  ')).toBe('NC_000068.8:g.105521966G>T');
        expect(normalizeHgvs('NC_000068.8:g.105521966  G>T')).toBe('NC_000068.8:g.105521966 G>T');
    });
});

describe('looksLikeHgvs', () => {
    it('accepts genomic HGVS substitutions and indels', () => {
        expect(looksLikeHgvs('NC_000068.8:g.105521966G>T')).toBe(true);
        expect(looksLikeHgvs('NC_000011.10:g.31790705C>A')).toBe(true);
        expect(looksLikeHgvs('NC_000068.8:g.105521966_105521970del')).toBe(true);
        expect(looksLikeHgvs('  NC_000068.8:g.105521966G>T  ')).toBe(true); // normalizes first
    });
    it('rejects gene symbols, allele names, bare positions, and empty', () => {
        expect(looksLikeHgvs('Pax6')).toBe(false);
        expect(looksLikeHgvs('Sey')).toBe(false);
        expect(looksLikeHgvs('105521966')).toBe(false);
        expect(looksLikeHgvs('')).toBe(false);
        expect(looksLikeHgvs('NC_000068.8:g.105521966')).toBe(false); // no change suffix
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd webui && npx jest hgvs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// webui/src/app/submit/components/AlignmentEntry/hgvs.ts

// Genomic HGVS: RefSeq accession + ":g." + start position + a change suffix
// (>subst, _range del/dup/ins/delins). Requires a change suffix so a bare
// position ("...:g.105521966") is routed to text search, not a doomed lookup.
const GENOMIC_HGVS_RE = /^[A-Za-z0-9_.]+:g\.\d+.+$/;

/** Trim outer whitespace and collapse internal whitespace runs to one space. */
export function normalizeHgvs(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
}

/** True when `text` (after normalization) looks like a genomic HGVS string. */
export function looksLikeHgvs(text: string): boolean {
    const t = normalizeHgvs(text);
    return GENOMIC_HGVS_RE.test(t);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd webui && npx jest hgvs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webui/src/app/submit/components/AlignmentEntry/hgvs.ts webui/src/app/submit/components/AlignmentEntry/__tests__/hgvs.test.ts
git commit -m "feat(webui): add genomic HGVS detector for allele search"
```

---

### Task 2: Add `AlleleSource` to the model and tag gene-fetched alleles

**Files:**
- Modify: `webui/src/app/submit/components/AlignmentEntry/types.ts`
- Modify: `webui/src/app/submit/components/AlignmentEntry/serverActions.ts` (the `fetchAlleles` allele constructor, ~line 340)

**Interfaces:**
- Consumes: nothing.
- Produces: `type AlleleSource = 'gene' | 'lookup' | 'search'`; `AlleleInfo.source?: AlleleSource`.

- [ ] **Step 1: Add the type and optional field**

In `types.ts`, add above `AlleleInfo`:

```ts
export type AlleleSource = 'gene' | 'lookup' | 'search'
```

Add to the `AlleleInfo` interface (after `hasPhenotype`):

```ts
    readonly source?: AlleleSource,
```

- [ ] **Step 2: Tag gene-fetched alleles**

In `serverActions.ts`, inside `fetchAlleles`, the allele object literal currently reads:

```ts
                allele = {
                    id: alleleId,
                    displayName: stripHtml(alleleSymbol) || alleleId,
                    variants: new Map(),
                    hasDisease: Boolean(result['allele']?.['hasDisease'] ?? result['hasDisease']),
                    hasPhenotype: Boolean(result['allele']?.['hasPhenotype'] ?? result['hasPhenotype']),
                }
```

Add `source: 'gene',` as the final property. Also add `AlleleSource` to the import from `./types` if you reference it explicitly (not required — the string literal is inferred against the optional field).

- [ ] **Step 3: Type-check + existing tests still pass**

Run: `cd webui && npx jest serverActions && npx tsc --noEmit --strict 2>&1 | grep serverActions || echo "no serverActions type errors"`
Expected: existing `serverActions` tests PASS; no new type errors in `serverActions.ts`/`types.ts`.

- [ ] **Step 4: Commit**

```bash
git add webui/src/app/submit/components/AlignmentEntry/types.ts webui/src/app/submit/components/AlignmentEntry/serverActions.ts
git commit -m "feat(webui): add AlleleSource to AlleleInfo, tag gene-fetched alleles"
```

---

### Task 3: `lookupVariantByHgvs` server action

**Files:**
- Modify: `webui/src/app/submit/components/AlignmentEntry/serverActions.ts`
- Test: `webui/src/app/submit/components/AlignmentEntry/__tests__/lookupVariantByHgvs.test.ts`

**Interfaces:**
- Consumes: `AlleleInfo`, `VariantConsequence`, `VariantInfo` from `./types`.
- Produces: `export async function lookupVariantByHgvs(geneId: string, hgvs: string): Promise<AlleleInfo | null>`.

**Response shape (verified live):** `GET /api/variant/{hgvs}` returns `{ symbol, geneIds: string[], allele: { primaryExternalId }, variantList: [ { curatedVariantGenomicLocations: [ { hgvs, predictedVariantConsequences: [ { variantTranscript: { name }, vepImpact: { name }, vepConsequences: [ { name } ], calculatedProteinStart } ] } ] } ] }`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lookupVariantByHgvs.test.ts
import { lookupVariantByHgvs } from '../serverActions';

const OK_PAYLOAD = {
    symbol: 'Pax6<sup>Sey</sup>',
    geneIds: ['MGI:97490'],
    allele: { primaryExternalId: 'MGI:1856155' },
    variantList: [{
        curatedVariantGenomicLocations: [{
            hgvs: 'NC_000068.8:g.105521966G>T',
            predictedVariantConsequences: [{
                variantTranscript: { name: 'NM_001244200.2' },
                vepImpact: { name: 'HIGH' },
                vepConsequences: [{ name: 'stop_gained' }],
                calculatedProteinStart: 208,
            }],
        }],
    }],
};

function mockFetchOnce(status: number, body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    }) as unknown as typeof fetch;
}

describe('lookupVariantByHgvs', () => {
    it('builds an AlleleInfo for a 200 payload whose geneIds include the gene', async () => {
        mockFetchOnce(200, OK_PAYLOAD);
        const allele = await lookupVariantByHgvs('MGI:97490', 'NC_000068.8:g.105521966G>T');
        expect(allele).not.toBeNull();
        expect(allele!.id).toBe('MGI:1856155');
        expect(allele!.displayName).toBe('Pax6Sey'); // HTML stripped
        expect(allele!.source).toBe('lookup');
        const variants = allele!.variants instanceof Map
            ? Array.from(allele!.variants.values()) : Object.values(allele!.variants as any);
        expect(variants).toHaveLength(1);
        expect(variants[0].id).toBe('NC_000068.8:g.105521966G>T');
        expect(variants[0].consequences[0]).toMatchObject({
            transcriptName: 'NM_001244200.2', impact: 'HIGH',
            molecularConsequences: ['stop_gained'], proteinStartPosition: 208,
        });
    });

    it('returns null when the variant belongs to a different gene', async () => {
        mockFetchOnce(200, { ...OK_PAYLOAD, geneIds: ['MGI:99999'] });
        expect(await lookupVariantByHgvs('MGI:97490', 'NC_000068.8:g.105521966G>T')).toBeNull();
    });

    it('returns null on non-200', async () => {
        mockFetchOnce(404, {});
        expect(await lookupVariantByHgvs('MGI:97490', 'NC_000068.8:g.1A>T')).toBeNull();
    });

    it('returns null when variantList is missing', async () => {
        mockFetchOnce(200, { symbol: 'x', geneIds: ['MGI:97490'] });
        expect(await lookupVariantByHgvs('MGI:97490', 'NC_000068.8:g.1A>T')).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd webui && npx jest lookupVariantByHgvs`
Expected: FAIL — `lookupVariantByHgvs` not exported.

- [ ] **Step 3: Write the implementation**

Add to `serverActions.ts` (reuse the existing module-level `stripHtml` pattern — define a local one in the function or lift the existing inline `stripHtml` to module scope; a local `const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '')` is fine):

```ts
// Parse a predictedVariantConsequences[] entry from the /api/variant shape
// (differs from allele-variant-detail: no siftPrediction/polyphenPrediction here).
function parsePredictedConsequence(raw: any): VariantConsequence {
    const tx = raw?.['variantTranscript']
    const consequences: string[] = Array.isArray(raw?.['vepConsequences'])
        ? raw['vepConsequences'].map((c: any) => c?.name).filter(Boolean)
        : []
    const proteinPos = raw?.['calculatedProteinStart']
    return {
        transcriptId: tx?.['curie'] ?? tx?.['name'],
        transcriptName: tx?.['name'],
        molecularConsequences: consequences,
        impact: raw?.['vepImpact']?.['name'],
        proteinStartPosition: (proteinPos !== undefined && proteinPos !== null && Number.isFinite(Number(proteinPos)))
            ? Number(proteinPos) : undefined,
        sift: undefined,
        polyphen: undefined,
    }
}

export async function lookupVariantByHgvs(geneId: string, hgvs: string): Promise<AlleleInfo | null> {
    const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '')
    try {
        const url = `https://www.alliancegenome.org/api/variant/${encodeURIComponent(hgvs)}`
        const response = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } })
        if (!response.ok) return null
        const body = await response.json()

        const geneIds: string[] = Array.isArray(body?.['geneIds']) ? body['geneIds'] : []
        if (!geneIds.includes(geneId)) return null

        const loc = body?.['variantList']?.[0]?.['curatedVariantGenomicLocations']?.[0]
        if (!loc) return null
        const resolvedHgvs: string = loc['hgvs'] ?? hgvs

        const consequences = Array.isArray(loc['predictedVariantConsequences'])
            ? loc['predictedVariantConsequences'].map(parsePredictedConsequence)
            : []

        const alleleId: string = body?.['allele']?.['primaryExternalId'] ?? resolvedHgvs
        const displayName = stripHtml(body?.['symbol']) || resolvedHgvs

        const variants = new Map<string, VariantInfo>()
        variants.set(resolvedHgvs, { id: resolvedHgvs, displayName: resolvedHgvs, consequences })

        return {
            id: alleleId,
            displayName,
            variants,
            hasDisease: Boolean(body?.['hasDisease']),
            hasPhenotype: Boolean(body?.['hasPhenotype']),
            source: 'lookup',
        }
    } catch (error) {
        console.error(`Error looking up variant ${hgvs} for gene ${geneId}:`, error)
        return null
    }
}
```

Add `VariantInfo` to the `./types` import at the top of `serverActions.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd webui && npx jest lookupVariantByHgvs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add webui/src/app/submit/components/AlignmentEntry/serverActions.ts webui/src/app/submit/components/AlignmentEntry/__tests__/lookupVariantByHgvs.test.ts
git commit -m "feat(webui): add lookupVariantByHgvs server action"
```

---

### Task 4: `searchVariants` server action

**Files:**
- Modify: `webui/src/app/submit/components/AlignmentEntry/serverActions.ts`
- Test: `webui/src/app/submit/components/AlignmentEntry/__tests__/searchVariants.test.ts`

**Interfaces:**
- Consumes: `AlleleInfo`, `VariantInfo`.
- Produces: `export async function searchVariants(geneId: string, geneSymbol: string, speciesName: string, query: string, limit?: number): Promise<AlleleInfo[]>`.

**Response shape (verified live):** `GET /api/search?category=variant_search_result&q=…&species=…&limit=…` returns `{ results: [ { name: '<HGVS>', species: 'Mus musculus', genes: ['Pax6 (Mmu)'] } ] }`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/searchVariants.test.ts
import { searchVariants } from '../serverActions';

const SEARCH_BODY = {
    results: [
        { name: 'NC_000068.8:g.105516549C>T', species: 'Mus musculus', genes: ['Pax6 (Mmu)'] },
        { name: 'NC_000068.8:g.105516553G>C', species: 'Mus musculus', genes: ['Pax6 (Mmu)'] },
        { name: 'NC_000011.10:g.31790705C>A', species: 'Homo sapiens', genes: ['PAX6 (Hsa)'] }, // wrong gene/species
        { name: 'NC_000068.8:g.105516549C>T', species: 'Mus musculus', genes: ['Pax6 (Mmu)'] }, // dup
    ],
};

function mockSearch(body: unknown, ok = true) {
    global.fetch = jest.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body }) as unknown as typeof fetch;
}

describe('searchVariants', () => {
    it('keeps only current-gene hits, maps to HGVS-keyed AlleleInfo, dedups', async () => {
        mockSearch(SEARCH_BODY);
        const alleles = await searchVariants('MGI:97490', 'Pax6', 'Mus musculus', 'Sey');
        expect(alleles.map(a => a.id)).toEqual([
            'NC_000068.8:g.105516549C>T',
            'NC_000068.8:g.105516553G>C',
        ]);
        expect(alleles[0].source).toBe('search');
        const v = alleles[0].variants instanceof Map
            ? Array.from(alleles[0].variants.values()) : Object.values(alleles[0].variants as any);
        expect(v[0]).toMatchObject({ id: 'NC_000068.8:g.105516549C>T', consequences: [] });
    });

    it('respects limit', async () => {
        mockSearch(SEARCH_BODY);
        const alleles = await searchVariants('MGI:97490', 'Pax6', 'Mus musculus', 'Sey', 1);
        expect(alleles).toHaveLength(1);
    });

    it('returns [] on error', async () => {
        mockSearch({}, false);
        expect(await searchVariants('MGI:97490', 'Pax6', 'Mus musculus', 'Sey')).toEqual([]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd webui && npx jest searchVariants`
Expected: FAIL — not exported.

- [ ] **Step 3: Write the implementation**

```ts
export async function searchVariants(
    geneId: string, geneSymbol: string, speciesName: string, query: string, limit = 15
): Promise<AlleleInfo[]> {
    try {
        const params = new URLSearchParams({
            category: 'variant_search_result',
            q: query,
            limit: String(Math.max(1, limit) * 3), // over-fetch; we filter by gene then trim
        })
        if (speciesName) params.append('species', speciesName)
        const url = `https://www.alliancegenome.org/api/search?${params.toString()}`
        const response = await fetch(url, { method: 'GET', headers: { accept: 'application/json' } })
        if (!response.ok) return []
        const body = await response.json()
        const results: any[] = Array.isArray(body?.['results']) ? body['results'] : []

        const symbolLc = geneSymbol.toLowerCase()
        const matchesGene = (r: any): boolean =>
            Array.isArray(r?.['genes']) &&
            r['genes'].some((g: string) => typeof g === 'string' &&
                g.toLowerCase().split(' ')[0] === symbolLc)

        const seen = new Set<string>()
        const alleles: AlleleInfo[] = []
        for (const r of results) {
            const hgvs = r?.['name']
            if (!hgvs || typeof hgvs !== 'string' || seen.has(hgvs)) continue
            if (!matchesGene(r)) continue
            seen.add(hgvs)
            const variants = new Map<string, VariantInfo>()
            variants.set(hgvs, { id: hgvs, displayName: hgvs, consequences: [] })
            alleles.push({
                id: hgvs, displayName: hgvs, variants,
                hasDisease: false, hasPhenotype: false, source: 'search',
            })
            if (alleles.length >= limit) break
        }
        return alleles
    } catch (error) {
        console.error(`Error searching variants for gene ${geneId} (q="${query}"):`, error)
        return []
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd webui && npx jest searchVariants`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add webui/src/app/submit/components/AlignmentEntry/serverActions.ts webui/src/app/submit/components/AlignmentEntry/__tests__/searchVariants.test.ts
git commit -m "feat(webui): add best-effort searchVariants server action"
```

---

### Task 5: `addAlleles` merge + selection-preserving reset in `useAlleleSelection`

**Files:**
- Modify: `webui/src/hooks/useAlleleSelection.ts`
- Test: `webui/src/hooks/__tests__/useAlleleSelection.addAlleles.test.ts`

**Interfaces:**
- Consumes: `AlleleInfo`.
- Produces: adds `addAlleles: (newAlleles: AlleleInfo[]) => void` to the hook's returned object. Existing return fields unchanged.

**Critical:** The effect at `useAlleleSelection.ts:109-123` currently blanket-clears `selectedAlleleIds` on every `alleleList` change. Rework it to drop **only** ids absent from the new list, so appending search results preserves an in-progress selection while a genuine gene change (whose new list shares no ids) still clears.

- [ ] **Step 1: Write the failing test**

```ts
// webui/src/hooks/__tests__/useAlleleSelection.addAlleles.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAlleleSelection } from '../useAlleleSelection';
import type { AlleleInfo } from '@/app/submit/components/AlignmentEntry/types';

const mkAllele = (id: string): AlleleInfo => ({
    id, displayName: id, variants: new Map(), hasDisease: false, hasPhenotype: false, source: 'search',
});

// A ref object shaped like createRef<MultiSelect>() — the hook only calls .current?.show().
const msRef = { current: { show: () => {} } } as any;

describe('useAlleleSelection.addAlleles', () => {
    const gene = { id: 'MGI:97490', symbol: 'Pax6', species: {}, genomeLocations: [] } as any;

    it('merges new alleles into alleleList and dedups by id', () => {
        const { result } = renderHook(() => useAlleleSelection({ gene, setupCompleted: true }, msRef));
        act(() => result.current.addAlleles([mkAllele('v1'), mkAllele('v2')]));
        act(() => result.current.addAlleles([mkAllele('v2'), mkAllele('v3')])); // v2 dup
        expect(result.current.alleleList.map(a => a.id)).toEqual(['v1', 'v2', 'v3']);
    });

    it('preserves an existing selection when new alleles are appended', () => {
        const { result } = renderHook(() => useAlleleSelection({ gene, setupCompleted: true }, msRef));
        act(() => result.current.addAlleles([mkAllele('v1')]));
        act(() => result.current.setSelectedAlleleIds(['v1']));
        act(() => result.current.addAlleles([mkAllele('v2')])); // append must NOT clear selection
        expect(result.current.selectedAlleleIds).toContain('v1');
        expect(result.current.alleleList.map(a => a.id)).toEqual(['v1', 'v2']);
    });
});
```

Note: the real signature is `useAlleleSelection(options, alleleMultiselectRef)` where `options = { gene, setupCompleted?, initialAlleleIds? }` (verified). The test above uses it correctly — do not change the hook's signature to fit the test.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd webui && npx jest useAlleleSelection.addAlleles`
Expected: FAIL — `addAlleles` is not a function.

- [ ] **Step 3: Add `addAlleles` and rework the reset effect**

Add the action (near `loadAllelesOnDemand`), using a functional update that returns the same reference when nothing changes (avoids needless renders):

```ts
    const addAlleles = useCallback((newAlleles: AlleleInfo[]) => {
        if (!newAlleles || newAlleles.length === 0) return;
        setAlleleList((prev) => {
            const existing = new Set(prev.map((a) => a.id));
            const additions = newAlleles.filter((a) => !existing.has(a.id));
            return additions.length === 0 ? prev : [...prev, ...additions];
        });
    }, []);
```

Rework the `[alleleList]` effect (currently lines ~109-123). Replace the blanket clear:

```ts
        if (selectedAlleleIds.length > 0) {
            console.log('Clearing prior selected allele ids.');
            setSelectedAlleleIds([]);
        }
```

with a keep-present filter:

```ts
        // Drop only selections no longer present in the list. A fresh gene
        // load (new list shares no ids) clears everything as before; an
        // append (addAlleles) preserves the in-progress selection.
        setSelectedAlleleIds((prev) => {
            const kept = prev.filter((id) => alleleList.some((a) => a.id === id));
            return kept.length === prev.length ? prev : kept;
        });
```

Leave the rest of that effect (the `setAlleleListLoading(false)` and panel-open logic) unchanged. Add `addAlleles` to the returned object (and to the hook's return-type interface at the top of the file). `useCallback` is already imported.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd webui && npx jest useAlleleSelection`
Expected: PASS — new tests plus any existing `useAlleleSelection` tests still green.

- [ ] **Step 5: Commit**

```bash
git add webui/src/hooks/useAlleleSelection.ts webui/src/hooks/__tests__/useAlleleSelection.addAlleles.test.ts
git commit -m "feat(webui): merge searched alleles into alleleList, preserve selection on append"
```

---

### Task 6: Wire debounced search into the Alleles MultiSelect

**Files:**
- Modify: `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx`
- Test: `webui/src/app/submit/components/AlignmentEntry/__tests__/AlignmentEntry.variantSearch.test.tsx`

**Interfaces:**
- Consumes: `lookupVariantByHgvs`, `searchVariants` (server actions), `looksLikeHgvs`, `normalizeHgvs` (`./hgvs`), `alleleSelection.addAlleles` (Task 5), `geneSearch.gene` (`{ id, symbol, species: { name } }`).
- Produces: user-facing search-on-type behavior; no exported API.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/AlignmentEntry.variantSearch.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const lookupVariantByHgvs = jest.fn();
const searchVariants = jest.fn();
jest.mock('../serverActions', () => ({
    ...jest.requireActual('../serverActions'),
    lookupVariantByHgvs: (...a: any[]) => lookupVariantByHgvs(...a),
    searchVariants: (...a: any[]) => searchVariants(...a),
}));

// ... render AlignmentEntry with a gene already selected (follow the harness
// used by the existing AlignmentEntry.test.tsx — reuse its providers/mocks).

describe('AlignmentEntry variant search', () => {
    it('resolves a pasted HGVS via lookupVariantByHgvs and adds it as an option', async () => {
        lookupVariantByHgvs.mockResolvedValue({
            id: 'MGI:1856155', displayName: 'Pax6Sey',
            variants: new Map([['NC_000068.8:g.105521966G>T', { id: 'NC_000068.8:g.105521966G>T', displayName: 'NC_000068.8:g.105521966G>T', consequences: [] }]]),
            hasDisease: false, hasPhenotype: false, source: 'lookup',
        });
        // open the Alleles MultiSelect, type the HGVS into its filter box,
        // then assert lookupVariantByHgvs was called with (geneId, hgvs) and
        // the option/chip 'Pax6Sey' appears.
        // (Use fake timers or waitFor to let the ~350ms debounce elapse.)
    });
});
```

The existing `AlignmentEntry.test.tsx` shows the exact mock/provider harness (gene utils mock, `genomefeatures` mock, gene prop). Reuse it; keep this test focused on the search behavior. If driving PrimeReact's internal filter input proves brittle, it is acceptable to assert at the handler boundary by extracting the debounced handler into a tiny local `useVariantSearch(gene, addAlleles)` hook in the same file and unit-testing that hook instead — but do not broaden scope beyond this wiring.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd webui && npx jest AlignmentEntry.variantSearch`
Expected: FAIL — no search wiring yet.

- [ ] **Step 3: Implement the wiring**

Add imports:

```tsx
import { lookupVariantByHgvs, searchVariants } from './serverActions';
import { looksLikeHgvs, normalizeHgvs } from './hgvs';
```

Add state + refs inside the component:

```tsx
    const [variantSearchStatus, setVariantSearchStatus] = useState<string | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const searchReqIdRef = useRef(0);
```

Add the debounced handler (latest-wins guard so a slow earlier response cannot overwrite a newer one):

```tsx
    const handleAlleleFilter = useCallback((rawValue: string) => {
        const gene = geneSearch.gene;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        const value = normalizeHgvs(rawValue ?? '');
        if (!gene || value.length < 3) { setVariantSearchStatus(null); return; }
        searchDebounceRef.current = setTimeout(async () => {
            const reqId = ++searchReqIdRef.current;
            setVariantSearchStatus('Searching…');
            try {
                if (looksLikeHgvs(value)) {
                    const found = await lookupVariantByHgvs(gene.id, value);
                    if (reqId !== searchReqIdRef.current) return;
                    if (found) { alleleSelection.addAlleles([found]); setVariantSearchStatus('Added — select it below'); }
                    else setVariantSearchStatus('No match for this gene');
                } else {
                    const hits = await searchVariants(gene.id, gene.symbol, gene.species?.name ?? '', value);
                    if (reqId !== searchReqIdRef.current) return;
                    if (hits.length) { alleleSelection.addAlleles(hits); setVariantSearchStatus(`${hits.length} match(es) added`); }
                    else setVariantSearchStatus('No matches');
                }
            } catch {
                if (reqId === searchReqIdRef.current) setVariantSearchStatus('Search unavailable');
            }
        }, 350);
    }, [geneSearch.gene, alleleSelection]);
```

Clear the timer on unmount:

```tsx
    useEffect(() => () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); }, []);
```

Add `onFilter` to the Alleles `<MultiSelect>` (alongside `filter` / `filterBy`):

```tsx
                        onFilter={(e) => handleAlleleFilter(e.filter)}
```

Render the status under the Alleles label (near the existing count `<span>` inside the `<label>`), shown only when set:

```tsx
                        {variantSearchStatus && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--agr-text-muted, #6c757d)' }}>
                                {variantSearchStatus}
                            </span>
                        )}
```

Ensure `useRef`, `useCallback`, `useState`, `useEffect` are imported.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd webui && npx jest AlignmentEntry`
Expected: PASS — new search test plus existing `AlignmentEntry` tests.

- [ ] **Step 5: Lint + full component test sweep**

Run:
```bash
cd webui && npx eslint src/app/submit/components/AlignmentEntry src/hooks/useAlleleSelection.ts --max-warnings 0 && npx jest AlignmentEntry serverActions useAlleleSelection hgvs
```
Expected: lint clean; all listed suites PASS.

- [ ] **Step 6: Commit**

```bash
git add webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx webui/src/app/submit/components/AlignmentEntry/__tests__/AlignmentEntry.variantSearch.test.tsx
git commit -m "feat(webui): search/paste a variant by HGVS in the Alleles box"
```

---

## Self-Review

**Spec coverage:**
- HGVS lookup path → Tasks 1 (detect), 3 (lookup action), 6 (wire). ✓
- Best-effort text search → Tasks 4 (search action), 6 (wire). ✓
- Merge into `alleleList` + preserve selection → Task 5. ✓
- `source` labeling → Task 2. ✓
- Pipeline-ready HGVS variant ids → enforced in Tasks 3/4 (HGVS as Map key) + Global Constraints. ✓
- Debounce + latest-wins + error handling → Task 6. ✓

**Type consistency:** `lookupVariantByHgvs(geneId, hgvs)` and `searchVariants(geneId, geneSymbol, speciesName, query, limit?)` are used identically in Task 6's handler. `addAlleles(AlleleInfo[])` matches Task 5's definition. `AlleleInfo.source` optional field (Task 2) is set in Tasks 2/3/4. `VariantInfo` imported into `serverActions.ts` in Task 3.

**Placeholder scan:** No TBD/TODO. Task 6's test body intentionally references the existing `AlignmentEntry.test.tsx` harness rather than duplicating provider setup — the implementer reuses concrete existing code, not a placeholder.

**Known integration caveats surfaced to the implementer:** real `useAlleleSelection` signature must be read before writing Task 5's `renderHook` call; PrimeReact `onFilter` event exposes `e.filter`; the repo's `tsc --noEmit --strict` has pre-existing test-file matcher errors (verify via `npx jest`, not raw tsc).
