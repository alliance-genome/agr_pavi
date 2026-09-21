# Bulk Gene-List Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/submit-bulk` page that parses an uploaded gene list (CSV/TSV/`.xlsx`) and lands the user in the editable alignment form pre-populated with the resolved genes, plus a best-effort report of skipped rows.

**Architecture:** A new page parses the file client-side, resolves each row's `species + symbol → geneId` via a server action against the Alliance search API, and feeds the resolved entries into the existing `JobSubmitForm` through a new optional `initialGenes` prop. Transcript pre-selection reuses the existing example-injection path, extended with an `initialTranscriptNames` option on `useTranscriptSelection` (mirroring the existing `initialAlleleIds` allele pre-selection).

**Tech Stack:** Next.js 15 App Router (React 19, TypeScript strict), PrimeReact, `xlsx` (SheetJS) for spreadsheet parsing, Jest + React Testing Library, Cypress.

## Global Constraints

- TypeScript strict mode; ESLint must pass with `--max-warnings 0` on every changed file.
- PAVI's ESLint config treats an unused `eslint-disable` directive as a warning under `--max-warnings 0`; do not add a disable comment for a rule that would not otherwise fire. The repo's convention for an unused function-type parameter (including in an interface method signature) is to prefix its name with `_`.
- Jest in this repo uses `--testPathPatterns` (PLURAL); `--testPathPattern` (singular) errors out. Run focused suites with `npx jest --testPathPatterns="<name>"`.
- All new UI components that use hooks/state are client components (`'use client'`).
- v1 is one alignment job from many rows; `variants` cells are allele IDs (not HGVS); species is matched against the Alliance scientific name, case-insensitively.
- New files live under `webui/src/app/submit-bulk/`. Run all commands from `webui/`.
- Reuse `ExampleGene` (`webui/src/app/submit/components/ExampleDataLoader/ExampleDataLoader.tsx`) as the entry shape fed to the form; do not create a parallel entry type for the form boundary.

---

## File structure

- Create `webui/src/app/submit-bulk/types.ts` — `RawRow`, `SkippedRow`, `ResolveResult`.
- Create `webui/src/app/submit-bulk/parseGeneListFile.ts` — file → `RawRow[]` (+ file-level error).
- Create `webui/src/app/submit-bulk/serverActions.ts` — `resolveGeneBySymbolSpecies`.
- Create `webui/src/app/submit-bulk/resolveRows.ts` — `RawRow[]` → `{ entries, skipped }`.
- Create `webui/src/app/submit-bulk/bulkTemplate.ts` — template CSV text + filename.
- Create `webui/src/app/submit-bulk/BulkUploadReport.tsx` — loaded/skipped report UI.
- Create `webui/src/app/submit-bulk/BulkUploadForm.tsx` — owns the flow, renders report + `JobSubmitForm`.
- Create `webui/src/app/submit-bulk/page.tsx` — route shell.
- Modify `webui/src/app/submit/components/ExampleDataLoader/ExampleDataLoader.tsx` — add `transcriptNames?` to `ExampleGene`.
- Modify `webui/src/hooks/useTranscriptSelection.ts` — add `initialTranscriptNames` option + pre-select.
- Modify `webui/src/app/submit/components/AlignmentEntryList/AlignmentEntryList.tsx` — thread `initialTranscriptNames`.
- Modify `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx` — pass `initialTranscriptNames` to the hook.
- Modify `webui/src/app/submit/components/JobSubmitForm/JobSubmitForm.tsx` — add optional `initialGenes` prop.
- Modify `webui/src/app/components/Header/Header.tsx` — add a "Bulk Upload" nav link.
- Modify `webui/package.json` — add `xlsx`.
- Create `webui/cypress/e2e/bulk-upload.cy.ts` + `webui/cypress/fixtures/bulk-genes.csv`.

---

## Task 1: Add the `xlsx` (SheetJS) dependency

**Files:**
- Modify: `webui/package.json`

**Interfaces:**
- Produces: a resolvable `xlsx` module exporting `read` and `utils.sheet_to_json`.

- [ ] **Step 1: Install the dependency**

Run (from `webui/`):

```bash
npm install --strict-peer-deps --engine-strict=false xlsx
```

Expected: `package.json` gains an `xlsx` entry under `dependencies`.

- [ ] **Step 2: Verify the API surface**

Run:

```bash
node -e "const XLSX=require('xlsx'); console.log('read:', typeof XLSX.read, '| sheet_to_json:', typeof XLSX.utils.sheet_to_json);"
```

Expected output:

```
read: function | sheet_to_json: function
```

- [ ] **Step 3: Commit**

```bash
git add webui/package.json webui/package-lock.json
git commit -m "build(webui): add xlsx (SheetJS) for bulk gene-list parsing"
```

---

## Task 2: Shared types + `parseGeneListFile`

**Files:**
- Create: `webui/src/app/submit-bulk/types.ts`
- Create: `webui/src/app/submit-bulk/parseGeneListFile.ts`
- Test: `webui/src/app/submit-bulk/__tests__/parseGeneListFile.test.ts`

**Interfaces:**
- Consumes: `xlsx` (Task 1).
- Produces:
  - `interface RawRow { species: string; symbol: string; transcript?: string; variants: string[]; lineNumber: number }`
  - `interface SkippedRow { lineNumber: number; raw: RawRow; reason: string }`
  - `interface ResolveResult { entries: ExampleGene[]; skipped: SkippedRow[] }` (defined here for reuse; `ExampleGene` imported from the ExampleDataLoader).
  - `async function parseGeneListFile(file: File): Promise<{ rows: RawRow[]; fileError?: string }>`

- [ ] **Step 1: Write the failing test**

Create `webui/src/app/submit-bulk/__tests__/parseGeneListFile.test.ts`:

```ts
import { parseGeneListFile } from '../parseGeneListFile';

// jsdom's File.text() is available; construct File objects from strings.
function csvFile(name: string, content: string): File {
    return new File([content], name, { type: 'text/plain' });
}

describe('parseGeneListFile', () => {
    it('parses a CSV with a header row and optional columns', async () => {
        const file = csvFile(
            'genes.csv',
            'species,gene_symbol,transcript,variants\n' +
                'Homo sapiens,TP53,ENST00000269305.9,\n' +
                'Mus musculus,Sod1,,MGI:6157439;MGI:6157441\n'
        );
        const { rows, fileError } = await parseGeneListFile(file);
        expect(fileError).toBeUndefined();
        expect(rows).toEqual([
            { species: 'Homo sapiens', symbol: 'TP53', transcript: 'ENST00000269305.9', variants: [], lineNumber: 2 },
            { species: 'Mus musculus', symbol: 'Sod1', transcript: undefined, variants: ['MGI:6157439', 'MGI:6157441'], lineNumber: 3 },
        ]);
    });

    it('parses TSV and is case-insensitive about header names', async () => {
        const file = csvFile(
            'genes.tsv',
            'Species\tGene_Symbol\n' + 'Rattus norvegicus\tSod1\n'
        );
        const { rows } = await parseGeneListFile(file);
        expect(rows).toEqual([
            { species: 'Rattus norvegicus', symbol: 'Sod1', transcript: undefined, variants: [], lineNumber: 2 },
        ]);
    });

    it('reports a file error when required columns are missing', async () => {
        const file = csvFile('bad.csv', 'foo,bar\n1,2\n');
        const { rows, fileError } = await parseGeneListFile(file);
        expect(rows).toEqual([]);
        expect(fileError).toMatch(/species/i);
    });

    it('reports a file error when there are no data rows', async () => {
        const file = csvFile('empty.csv', 'species,gene_symbol\n');
        const { fileError } = await parseGeneListFile(file);
        expect(fileError).toMatch(/no data rows/i);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest --testPathPatterns="parseGeneListFile" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '../parseGeneListFile'`.

- [ ] **Step 3: Write the types**

Create `webui/src/app/submit-bulk/types.ts`:

```ts
import { ExampleGene } from '@/app/submit/components/ExampleDataLoader/ExampleDataLoader';

export interface RawRow {
    species: string;
    symbol: string;
    transcript?: string;
    variants: string[];
    lineNumber: number;
}

export interface SkippedRow {
    lineNumber: number;
    raw: RawRow;
    reason: string;
}

export interface ResolveResult {
    entries: ExampleGene[];
    skipped: SkippedRow[];
}
```

- [ ] **Step 4: Write `parseGeneListFile`**

Create `webui/src/app/submit-bulk/parseGeneListFile.ts`:

```ts
import * as XLSX from 'xlsx';
import { RawRow } from './types';

// Header aliases → canonical field. Matching is lowercase + trimmed.
const HEADER_MAP: Record<string, 'species' | 'symbol' | 'transcript' | 'variants'> = {
    'species': 'species',
    'gene_symbol': 'symbol',
    'gene symbol': 'symbol',
    'symbol': 'symbol',
    'gene': 'symbol',
    'transcript': 'transcript',
    'variants': 'variants',
    'variant': 'variants',
    'alleles': 'variants',
};

function normalizeHeader(h: string): 'species' | 'symbol' | 'transcript' | 'variants' | undefined {
    return HEADER_MAP[h.trim().toLowerCase()];
}

function splitVariants(cell: string | undefined): string[] {
    if (!cell) return [];
    return cell
        .split(/[;,]/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
}

// Read the file into a 2-D array of string cells. CSV/TSV are sniffed by
// delimiter; .xlsx is read via SheetJS from the first sheet.
async function readGrid(file: File): Promise<string[][]> {
    const isXlsx = /\.xlsx$/i.test(file.name);
    if (isXlsx) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
            header: 1,
            blankrows: false,
            defval: '',
            raw: false,
        });
        return grid.map((row) => row.map((c) => String(c ?? '')));
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const delimiter = (lines[0] ?? '').includes('\t') ? '\t' : ',';
    return lines.map((l) => l.split(delimiter).map((c) => c.trim()));
}

export async function parseGeneListFile(
    file: File
): Promise<{ rows: RawRow[]; fileError?: string }> {
    let grid: string[][];
    try {
        grid = await readGrid(file);
    } catch (e) {
        return { rows: [], fileError: `Couldn't read the file: ${e instanceof Error ? e.message : String(e)}` };
    }

    if (grid.length === 0) {
        return { rows: [], fileError: 'The file appears to be empty.' };
    }

    const headerCells = grid[0];
    const colIndex: Partial<Record<'species' | 'symbol' | 'transcript' | 'variants', number>> = {};
    headerCells.forEach((cell, i) => {
        const field = normalizeHeader(cell);
        if (field && colIndex[field] === undefined) colIndex[field] = i;
    });

    if (colIndex.species === undefined || colIndex.symbol === undefined) {
        return {
            rows: [],
            fileError:
                'The file needs a header row with at least "species" and "gene_symbol" columns.',
        };
    }

    const rows: RawRow[] = [];
    for (let i = 1; i < grid.length; i++) {
        const cells = grid[i];
        const get = (idx?: number) => (idx === undefined ? '' : (cells[idx] ?? '').trim());
        rows.push({
            species: get(colIndex.species),
            symbol: get(colIndex.symbol),
            transcript: get(colIndex.transcript) || undefined,
            variants: splitVariants(get(colIndex.variants)),
            lineNumber: i + 1,
        });
    }

    if (rows.length === 0) {
        return { rows: [], fileError: 'The file has a header but no data rows.' };
    }

    return { rows };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
npx jest --testPathPatterns="parseGeneListFile" 2>&1 | tail -15
```

Expected: PASS (4 tests).

- [ ] **Step 6: Lint**

Run:

```bash
npx eslint --max-warnings 0 src/app/submit-bulk/types.ts src/app/submit-bulk/parseGeneListFile.ts src/app/submit-bulk/__tests__/parseGeneListFile.test.ts 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add webui/src/app/submit-bulk/types.ts webui/src/app/submit-bulk/parseGeneListFile.ts webui/src/app/submit-bulk/__tests__/parseGeneListFile.test.ts
git commit -m "feat(webui): parse bulk gene-list files (CSV/TSV/xlsx)"
```

---

## Task 3: Gene resolution — server action + `resolveRows`

**Files:**
- Create: `webui/src/app/submit-bulk/serverActions.ts`
- Create: `webui/src/app/submit-bulk/resolveRows.ts`
- Test: `webui/src/app/submit-bulk/__tests__/resolveRows.test.ts`

**Interfaces:**
- Consumes: `RawRow`, `SkippedRow`, `ResolveResult` (Task 2); `ExampleGene`.
- Produces:
  - `interface GeneMatch { id: string; symbol: string; species: string }`
  - `async function resolveGeneBySymbolSpecies(symbol: string, species: string): Promise<GeneMatch[]>` (server action; returns exact symbol+species matches).
  - `async function resolveRows(rows: RawRow[], resolver?: (symbol: string, species: string) => Promise<GeneMatch[]>): Promise<ResolveResult>` — `resolver` defaults to `resolveGeneBySymbolSpecies`; injectable for tests.

- [ ] **Step 1: Write the failing test**

Create `webui/src/app/submit-bulk/__tests__/resolveRows.test.ts`:

```ts
import { resolveRows } from '../resolveRows';
import { RawRow } from '../types';
import type { GeneMatch } from '../serverActions';

function row(partial: Partial<RawRow> & { lineNumber: number }): RawRow {
    return { species: 'Homo sapiens', symbol: 'TP53', variants: [], ...partial };
}

describe('resolveRows', () => {
    it('resolves a unique symbol+species match into an ExampleGene entry', async () => {
        const resolver = async (): Promise<GeneMatch[]> => [
            { id: 'HGNC:11998', symbol: 'TP53', species: 'Homo sapiens' },
        ];
        const { entries, skipped } = await resolveRows(
            [row({ lineNumber: 2, transcript: 'ENST1', variants: ['HGNC:a'] })],
            resolver
        );
        expect(skipped).toEqual([]);
        expect(entries).toEqual([
            {
                geneId: 'HGNC:11998',
                geneName: 'TP53',
                species: 'Homo sapiens',
                transcriptNames: ['ENST1'],
                alleleIds: ['HGNC:a'],
            },
        ]);
    });

    it('skips a row with a missing required cell', async () => {
        const resolver = async (): Promise<GeneMatch[]> => [];
        const { entries, skipped } = await resolveRows(
            [row({ lineNumber: 2, symbol: '' })],
            resolver
        );
        expect(entries).toEqual([]);
        expect(skipped[0].reason).toMatch(/missing/i);
    });

    it('skips when no gene is found', async () => {
        const resolver = async (): Promise<GeneMatch[]> => [];
        const { skipped } = await resolveRows([row({ lineNumber: 2, symbol: 'NOPE' })], resolver);
        expect(skipped[0].reason).toMatch(/no gene found/i);
    });

    it('skips an ambiguous match without guessing', async () => {
        const resolver = async (): Promise<GeneMatch[]> => [
            { id: 'A:1', symbol: 'Sod1', species: 'Mus musculus' },
            { id: 'A:2', symbol: 'Sod1', species: 'Mus musculus' },
        ];
        const { entries, skipped } = await resolveRows(
            [row({ lineNumber: 2, species: 'Mus musculus', symbol: 'Sod1' })],
            resolver
        );
        expect(entries).toEqual([]);
        expect(skipped[0].reason).toMatch(/ambiguous/i);
    });

    it('dedupes a gene already resolved from an earlier row', async () => {
        const resolver = async (): Promise<GeneMatch[]> => [
            { id: 'HGNC:11998', symbol: 'TP53', species: 'Homo sapiens' },
        ];
        const { entries, skipped } = await resolveRows(
            [row({ lineNumber: 2 }), row({ lineNumber: 3 })],
            resolver
        );
        expect(entries).toHaveLength(1);
        expect(skipped[0].reason).toMatch(/duplicate/i);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest --testPathPatterns="resolveRows" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '../resolveRows'`.

- [ ] **Step 3: Write the server action**

Create `webui/src/app/submit-bulk/serverActions.ts`:

```ts
'use server';

export interface GeneMatch {
    id: string;
    symbol: string;
    species: string;
}

// Resolve an exact gene symbol within a species using the Alliance search
// API (same endpoint the /submit gene autocomplete uses). Returns every
// result whose symbol and species match the request case-insensitively —
// the caller decides what to do with 0, 1, or many.
export async function resolveGeneBySymbolSpecies(
    symbol: string,
    species: string
): Promise<GeneMatch[]> {
    const url = `https://www.alliancegenome.org/api/search?category=gene_search_result&q=${encodeURIComponent(
        symbol
    )}&limit=20`;
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) {
        throw new Error(`Gene search failed with HTTP ${response.status}`);
    }
    const body = await response.json();
    const results = (body?.['results'] ?? []) as Array<Record<string, unknown>>;

    const wantSymbol = symbol.trim().toLowerCase();
    const wantSpecies = species.trim().toLowerCase();

    return results
        .map((r): GeneMatch | undefined => {
            const id = (r['curie'] ?? r['id']) as string | undefined;
            const sym = r['symbol'] as string | undefined;
            const sp = r['species'] as string | undefined;
            if (!id || !sym || !sp) return undefined;
            return { id, symbol: sym, species: sp };
        })
        .filter((m): m is GeneMatch => m !== undefined)
        .filter(
            (m) =>
                m.symbol.toLowerCase() === wantSymbol &&
                m.species.toLowerCase() === wantSpecies
        );
}
```

- [ ] **Step 4: Write `resolveRows`**

Create `webui/src/app/submit-bulk/resolveRows.ts`:

```ts
import { ExampleGene } from '@/app/submit/components/ExampleDataLoader/ExampleDataLoader';
import { RawRow, ResolveResult, SkippedRow } from './types';
import { GeneMatch, resolveGeneBySymbolSpecies } from './serverActions';

type Resolver = (symbol: string, species: string) => Promise<GeneMatch[]>;

// Turn parsed rows into form entries, best-effort: every row that resolves
// to exactly one gene becomes an ExampleGene; the rest are reported with a
// reason. Genes already resolved from an earlier row are deduped.
export async function resolveRows(
    rows: RawRow[],
    resolver: Resolver = resolveGeneBySymbolSpecies
): Promise<ResolveResult> {
    const entries: ExampleGene[] = [];
    const skipped: SkippedRow[] = [];
    const seenGeneIds = new Set<string>();

    for (const raw of rows) {
        if (!raw.species || !raw.symbol) {
            skipped.push({ lineNumber: raw.lineNumber, raw, reason: 'missing species or gene symbol' });
            continue;
        }

        let matches: GeneMatch[];
        try {
            matches = await resolver(raw.symbol, raw.species);
        } catch (e) {
            skipped.push({
                lineNumber: raw.lineNumber,
                raw,
                reason: `lookup failed: ${e instanceof Error ? e.message : String(e)}`,
            });
            continue;
        }

        if (matches.length === 0) {
            skipped.push({
                lineNumber: raw.lineNumber,
                raw,
                reason: `no gene found for "${raw.symbol}" in ${raw.species}`,
            });
            continue;
        }
        if (matches.length > 1) {
            skipped.push({
                lineNumber: raw.lineNumber,
                raw,
                reason: `ambiguous — matched ${matches.length} genes`,
            });
            continue;
        }

        const match = matches[0];
        if (seenGeneIds.has(match.id)) {
            skipped.push({
                lineNumber: raw.lineNumber,
                raw,
                reason: `duplicate — ${match.symbol} (${match.id}) already loaded`,
            });
            continue;
        }
        seenGeneIds.add(match.id);

        entries.push({
            geneId: match.id,
            geneName: match.symbol,
            species: match.species,
            transcriptNames: raw.transcript ? [raw.transcript] : undefined,
            alleleIds: raw.variants.length > 0 ? raw.variants : undefined,
        });
    }

    return { entries, skipped };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
npx jest --testPathPatterns="resolveRows" 2>&1 | tail -15
```

Expected: PASS (5 tests). Note: this task depends on Task 4 adding `transcriptNames?` to `ExampleGene`; if the type errors on `transcriptNames`, do Task 4's Step 3 (the one-line `ExampleGene` field addition) first, then return here.

- [ ] **Step 6: Lint**

```bash
npx eslint --max-warnings 0 src/app/submit-bulk/serverActions.ts src/app/submit-bulk/resolveRows.ts src/app/submit-bulk/__tests__/resolveRows.test.ts 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add webui/src/app/submit-bulk/serverActions.ts webui/src/app/submit-bulk/resolveRows.ts webui/src/app/submit-bulk/__tests__/resolveRows.test.ts
git commit -m "feat(webui): resolve bulk rows to gene entries (best-effort)"
```

---

## Task 4: Transcript pre-selection — extend `ExampleGene` and the injection path

**Files:**
- Modify: `webui/src/app/submit/components/ExampleDataLoader/ExampleDataLoader.tsx`
- Modify: `webui/src/hooks/useTranscriptSelection.ts`
- Modify: `webui/src/app/submit/components/AlignmentEntryList/AlignmentEntryList.tsx`
- Modify: `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx`
- Test: `webui/src/hooks/__tests__/useTranscriptSelection.initialTranscripts.test.ts`

**Interfaces:**
- Consumes: existing `ExampleGene`, `useTranscriptSelection`.
- Produces: `ExampleGene` gains `transcriptNames?: string[]`; `UseTranscriptSelectionOptions` gains `initialTranscriptNames?: string[]`; the injection threads `initialGene.transcriptNames` down to the hook.

- [ ] **Step 1: Add `transcriptNames?` to `ExampleGene`**

In `webui/src/app/submit/components/ExampleDataLoader/ExampleDataLoader.tsx`, extend the interface:

```ts
export interface ExampleGene {
    geneId: string;
    geneName: string;
    species: string;
    alleleIds?: string[];
    transcriptNames?: string[];
}
```

- [ ] **Step 2: Write the failing hook test**

Create `webui/src/hooks/__tests__/useTranscriptSelection.initialTranscripts.test.ts`:

```ts
import { selectInitialTranscriptIds } from '../useTranscriptSelection';

// A minimal stand-in for the generic-sequence-panel Feature: only the
// members selectInitialTranscriptIds uses.
function feature(id: string, name: string) {
    return {
        id: () => id,
        get: (key: string) => (key === 'name' ? name : undefined),
    };
}

describe('selectInitialTranscriptIds', () => {
    const list = [feature('id-a', 'ENST-A'), feature('id-b', 'ENST-B'), feature('id-c', 'ENST-C')];

    it('returns the ids of transcripts whose name matches (in list order)', () => {
        expect(selectInitialTranscriptIds(list as any, ['ENST-C', 'ENST-A'])).toEqual(['id-a', 'id-c']);
    });

    it('ignores names that are not present', () => {
        expect(selectInitialTranscriptIds(list as any, ['ENST-A', 'MISSING'])).toEqual(['id-a']);
    });

    it('returns an empty array when no names match', () => {
        expect(selectInitialTranscriptIds(list as any, ['NONE'])).toEqual([]);
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx jest --testPathPatterns="useTranscriptSelection.initialTranscripts" 2>&1 | tail -15
```

Expected: FAIL — `selectInitialTranscriptIds` is not exported.

- [ ] **Step 4: Add the exported helper and the option to `useTranscriptSelection`**

In `webui/src/hooks/useTranscriptSelection.ts`:

(a) Add the option to the interface:

```ts
export interface UseTranscriptSelectionOptions {
    gene: GeneInfo | undefined;
    agrjBrowseDataRelease: string;
    onStatusChange?: (_status: AlignmentEntryStatus, _payloadPart?: undefined) => void;
    setupCompleted?: boolean;
    initialGeneId?: string;
    initialTranscriptNames?: string[];
}
```

(b) Near the top of the file (module scope, exported), add the pure helper. `Feature` is already imported in this file from `@/app/submit/components/AlignmentEntry/utils`:

```ts
// Map transcript names (as they appear in the file / MultiSelect label,
// e.g. "ENST00000269305.9") to the transcript feature ids the selection
// state uses. Preserves transcriptList order; names not present are dropped.
export function selectInitialTranscriptIds(
    transcriptList: Feature[],
    names: string[]
): string[] {
    const wanted = new Set(names);
    return transcriptList
        .filter((t) => wanted.has(t.get('name') as string))
        .map((t) => t.id());
}
```

(c) Destructure the new option where the others are read:

```ts
const { gene, agrjBrowseDataRelease, onStatusChange, setupCompleted, initialGeneId, initialTranscriptNames } = options;
```

(d) Replace the existing "Auto-select first transcript when loaded via initialGeneId" effect so it honors explicit names first, falling back to the canonical/first pick when none are given or none match:

```ts
    // Select initial transcripts once the list has loaded: explicit names
    // from the caller take priority; otherwise fall back to the canonical
    // (or first) transcript, preserving the prior initialGeneId behavior.
    useEffect(() => {
        if ((initialGeneId || initialTranscriptNames?.length) && !transcriptListLoading && transcriptList.length > 0 && selectedTranscriptIds.length === 0) {
            if (initialTranscriptNames && initialTranscriptNames.length > 0) {
                const matched = selectInitialTranscriptIds(transcriptList, initialTranscriptNames);
                if (matched.length > 0) {
                    setSelectedTranscriptIds(matched);
                    return;
                }
            }
            const canonicalTranscript =
                transcriptList.find(
                    (t) => t.get('name')?.includes('canonical') || t.get('is_canonical') === true
                ) || transcriptList[0];
            if (canonicalTranscript) {
                setSelectedTranscriptIds([canonicalTranscript.id()]);
            }
        }
    }, [initialGeneId, initialTranscriptNames, transcriptListLoading, transcriptList, selectedTranscriptIds.length]);
```

- [ ] **Step 5: Run the hook test to verify it passes**

```bash
npx jest --testPathPatterns="useTranscriptSelection.initialTranscripts" 2>&1 | tail -15
```

Expected: PASS (3 tests).

- [ ] **Step 6: Thread `initialTranscriptNames` through the injection**

In `webui/src/app/submit/components/AlignmentEntryList/AlignmentEntryList.tsx`, the `initListItem` builder currently passes `initialGeneId` and `initialAlleleIds` (around lines 34-35). Add the transcript names alongside:

```tsx
                initialGeneId: initialGene?.geneId,
                initialAlleleIds: initialGene?.alleleIds,
                initialTranscriptNames: initialGene?.transcriptNames,
```

Then in `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx`, the component reads `props.initialAlleleIds` and passes it to `useAlleleSelection`. Find where the props interface declares `initialAlleleIds` and add:

```tsx
    readonly initialTranscriptNames?: string[];
```

and where `useTranscriptSelection({ ... })` is called (it already passes `initialGeneId`), add the option:

```tsx
            initialTranscriptNames: props.initialTranscriptNames,
```

(If `AlignmentEntryList` builds a typed props object, add `initialTranscriptNames?: string[]` to that local type too so `--strict` is satisfied. Run the type-check in Step 7 to confirm.)

- [ ] **Step 7: Type-check, lint, and run the affected unit tests**

```bash
npm run type-check 2>&1 | tail -15
npx eslint --max-warnings 0 src/hooks/useTranscriptSelection.ts src/app/submit/components/AlignmentEntryList/AlignmentEntryList.tsx src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx src/app/submit/components/ExampleDataLoader/ExampleDataLoader.tsx 2>&1 | tail -8
npx jest --testPathPatterns="useTranscriptSelection|AlignmentEntry" 2>&1 | tail -20
```

Expected: no new type errors from these files; eslint clean; the transcript-selection tests pass and the pre-existing AlignmentEntry suite is unchanged (it has one pre-existing failure, "accepts gene input string and correctly processes it to populate transcript and allele fields", that also fails on `main` — not introduced here).

- [ ] **Step 8: Commit**

```bash
git add webui/src/hooks/useTranscriptSelection.ts webui/src/hooks/__tests__/useTranscriptSelection.initialTranscripts.test.ts webui/src/app/submit/components/ExampleDataLoader/ExampleDataLoader.tsx webui/src/app/submit/components/AlignmentEntryList/AlignmentEntryList.tsx webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx
git commit -m "feat(webui): pre-select transcripts by name via initialTranscriptNames"
```

---

## Task 5: `JobSubmitForm` accepts an optional `initialGenes` prop

**Files:**
- Modify: `webui/src/app/submit/components/JobSubmitForm/JobSubmitForm.tsx`
- Test: `webui/src/app/submit/components/JobSubmitForm/__tests__/JobSubmitForm.initialGenes.test.tsx`

**Interfaces:**
- Consumes: `ExampleGene`, `AlignmentEntryList` (already receives `initialGenes`).
- Produces: `JobSumbitProps` gains `initialGenes?: ExampleGene[]`; when provided, the form seeds its internal `initialGenes` state (and bumps `loadVersion`) once on mount so `AlignmentEntryList` renders those entries.

- [ ] **Step 1: Write the failing test**

Create `webui/src/app/submit/components/JobSubmitForm/__tests__/JobSubmitForm.initialGenes.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react';
import { JobSubmitForm } from '../JobSubmitForm';

// Capture what AlignmentEntryList receives, without rendering the real one.
const listSpy = jest.fn();
jest.mock('../../AlignmentEntryList/AlignmentEntryList', () => ({
    AlignmentEntryList: (props: unknown) => {
        listSpy(props);
        return null;
    },
}));

// The example loader is irrelevant to this test.
jest.mock('../../ExampleDataLoader/ExampleDataLoader', () => ({
    ExampleDataLoader: () => null,
    EXAMPLE_DATASETS: [],
}));

describe('JobSubmitForm initialGenes', () => {
    beforeEach(() => listSpy.mockClear());

    it('seeds AlignmentEntryList with the initialGenes prop when provided', () => {
        const genes = [{ geneId: 'HGNC:1', geneName: 'TP53', species: 'Homo sapiens' }];
        render(<JobSubmitForm agrjBrowseDataRelease="8.2.0" initialGenes={genes} />);
        const lastProps = listSpy.mock.calls.at(-1)?.[0] as { initialGenes?: unknown };
        expect(lastProps.initialGenes).toEqual(genes);
    });

    it('passes undefined initialGenes when the prop is omitted', () => {
        render(<JobSubmitForm agrjBrowseDataRelease="8.2.0" />);
        const lastProps = listSpy.mock.calls.at(-1)?.[0] as { initialGenes?: unknown };
        expect(lastProps.initialGenes).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPatterns="JobSubmitForm.initialGenes" 2>&1 | tail -15
```

Expected: FAIL — either `initialGenes` is not an accepted prop (type/undefined) or the assertion fails because the prop is ignored.

- [ ] **Step 3: Add the prop and seed state**

In `webui/src/app/submit/components/JobSubmitForm/JobSubmitForm.tsx`:

(a) Extend the props interface (it currently has only `agrjBrowseDataRelease`):

```ts
interface JobSumbitProps {
    readonly agrjBrowseDataRelease: string
    readonly initialGenes?: ExampleGene[]
}
```

(`ExampleGene` is already imported in this file — it imports from `../ExampleDataLoader/ExampleDataLoader`. If not, add it to that import.)

(b) Seed the existing `initialGenes` state from the prop. The component already has `const [initialGenes, setInitialGenes] = useState<ExampleGene[]>()` and `const [loadVersion, setLoadVersion] = useState(0)`. Change the `initialGenes` state initializer to fall back to the prop, and bump `loadVersion` once on mount when the prop is present:

```ts
    const [initialGenes, setInitialGenes] = useState<ExampleGene[]>(props.initialGenes)
```

and add, next to the other effects in the component body:

```ts
    // When entries are provided by a parent (e.g. the bulk-upload page),
    // load them once on mount just as selecting an example would.
    useEffect(() => {
        if (props.initialGenes && props.initialGenes.length > 0) {
            setLoadVersion(v => v + 1)
        }
        // Mount-only: the parent passes a fresh entry set per navigation.
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest --testPathPatterns="JobSubmitForm.initialGenes" 2>&1 | tail -15
```

Expected: PASS (2 tests).

- [ ] **Step 5: Lint + type-check**

```bash
npx eslint --max-warnings 0 src/app/submit/components/JobSubmitForm/JobSubmitForm.tsx src/app/submit/components/JobSubmitForm/__tests__/JobSubmitForm.initialGenes.test.tsx 2>&1 | tail -5
npm run type-check 2>&1 | grep -i "JobSubmitForm" || echo "no JobSubmitForm type errors"
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add webui/src/app/submit/components/JobSubmitForm/JobSubmitForm.tsx webui/src/app/submit/components/JobSubmitForm/__tests__/JobSubmitForm.initialGenes.test.tsx
git commit -m "feat(webui): let JobSubmitForm accept pre-filled initialGenes"
```

---

## Task 6: `bulkTemplate` + `BulkUploadReport`

**Files:**
- Create: `webui/src/app/submit-bulk/bulkTemplate.ts`
- Create: `webui/src/app/submit-bulk/BulkUploadReport.tsx`
- Test: `webui/src/app/submit-bulk/__tests__/bulkTemplate.test.ts`
- Test: `webui/src/app/submit-bulk/__tests__/BulkUploadReport.test.tsx`

**Interfaces:**
- Consumes: `SkippedRow` (Task 2).
- Produces:
  - `const TEMPLATE_FILENAME = 'pavi-bulk-genes-template.csv'`
  - `function buildTemplateCsv(): string`
  - `BulkUploadReport` — props `{ loaded: number; skipped: SkippedRow[] }`, a default-exported or named React component (named export `BulkUploadReport`).

- [ ] **Step 1: Write the failing tests**

Create `webui/src/app/submit-bulk/__tests__/bulkTemplate.test.ts`:

```ts
import { buildTemplateCsv, TEMPLATE_FILENAME } from '../bulkTemplate';

describe('bulkTemplate', () => {
    it('has the exact header row', () => {
        expect(buildTemplateCsv().split(/\r?\n/)[0]).toBe('species,gene_symbol,transcript,variants');
    });

    it('includes at least one example data row', () => {
        expect(buildTemplateCsv().split(/\r?\n/).length).toBeGreaterThanOrEqual(2);
    });

    it('names the template file with a .csv extension', () => {
        expect(TEMPLATE_FILENAME).toMatch(/\.csv$/);
    });
});
```

Create `webui/src/app/submit-bulk/__tests__/BulkUploadReport.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BulkUploadReport } from '../BulkUploadReport';
import { SkippedRow } from '../types';

const skipped: SkippedRow[] = [
    { lineNumber: 3, raw: { species: 'X', symbol: 'NOPE', variants: [], lineNumber: 3 }, reason: 'no gene found for "NOPE" in X' },
];

describe('BulkUploadReport', () => {
    it('summarizes loaded and skipped counts', () => {
        render(<BulkUploadReport loaded={5} skipped={skipped} />);
        expect(screen.getByText(/5/)).toBeInTheDocument();
        expect(screen.getByText(/skipped 1/i)).toBeInTheDocument();
    });

    it('lists each skipped row with its line number and reason', () => {
        render(<BulkUploadReport loaded={5} skipped={skipped} />);
        expect(screen.getByText(/line 3/i)).toBeInTheDocument();
        expect(screen.getByText(/no gene found for "NOPE"/i)).toBeInTheDocument();
    });

    it('renders nothing when there is nothing to report', () => {
        const { container } = render(<BulkUploadReport loaded={0} skipped={[]} />);
        expect(container).toBeEmptyDOMElement();
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest --testPathPatterns="bulkTemplate|BulkUploadReport" 2>&1 | tail -15
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Write `bulkTemplate`**

Create `webui/src/app/submit-bulk/bulkTemplate.ts`:

```ts
export const TEMPLATE_FILENAME = 'pavi-bulk-genes-template.csv';

// A ready-to-edit template: the canonical header plus two example rows
// showing an optional-transcript row and an optional-variants row.
export function buildTemplateCsv(): string {
    return [
        'species,gene_symbol,transcript,variants',
        'Homo sapiens,TP53,ENST00000269305.9,',
        'Mus musculus,Sod1,,MGI:6157439;MGI:6157441',
    ].join('\n');
}
```

- [ ] **Step 4: Write `BulkUploadReport`**

Create `webui/src/app/submit-bulk/BulkUploadReport.tsx`:

```tsx
'use client';

import React from 'react';
import { SkippedRow } from './types';

export interface BulkUploadReportProps {
    readonly loaded: number;
    readonly skipped: SkippedRow[];
}

export function BulkUploadReport({ loaded, skipped }: BulkUploadReportProps) {
    if (loaded === 0 && skipped.length === 0) {
        return null;
    }
    return (
        <div className="agr-card" style={{ marginBottom: '1rem' }}>
            <div className="agr-card-body">
                <p>
                    Loaded <strong>{loaded}</strong> gene{loaded === 1 ? '' : 's'}
                    {skipped.length > 0 ? <> · skipped {skipped.length} row{skipped.length === 1 ? '' : 's'}</> : null}.
                </p>
                {skipped.length > 0 && (
                    <details>
                        <summary>Skipped rows</summary>
                        <ul>
                            {skipped.map((s) => (
                                <li key={s.lineNumber}>
                                    Line {s.lineNumber}: {s.raw.symbol || '(no symbol)'} — {s.reason}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx jest --testPathPatterns="bulkTemplate|BulkUploadReport" 2>&1 | tail -15
```

Expected: PASS (6 tests).

- [ ] **Step 6: Lint**

```bash
npx eslint --max-warnings 0 src/app/submit-bulk/bulkTemplate.ts src/app/submit-bulk/BulkUploadReport.tsx src/app/submit-bulk/__tests__/bulkTemplate.test.ts src/app/submit-bulk/__tests__/BulkUploadReport.test.tsx 2>&1 | tail -5
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add webui/src/app/submit-bulk/bulkTemplate.ts webui/src/app/submit-bulk/BulkUploadReport.tsx webui/src/app/submit-bulk/__tests__/bulkTemplate.test.ts webui/src/app/submit-bulk/__tests__/BulkUploadReport.test.tsx
git commit -m "feat(webui): bulk upload template + skipped-rows report"
```

---

## Task 7: `BulkUploadForm` + page + nav link

**Files:**
- Create: `webui/src/app/submit-bulk/BulkUploadForm.tsx`
- Create: `webui/src/app/submit-bulk/page.tsx`
- Modify: `webui/src/app/components/Header/Header.tsx`
- Test: `webui/src/app/submit-bulk/__tests__/BulkUploadForm.test.tsx`

**Interfaces:**
- Consumes: `parseGeneListFile` (Task 2), `resolveRows` (Task 3), `JobSubmitForm` initialGenes (Task 5), `BulkUploadReport` + `buildTemplateCsv` (Task 6).
- Produces: `BulkUploadForm` — props `{ agrjBrowseDataRelease: string }`; a `/submit-bulk` route.

- [ ] **Step 1: Write the failing component test**

Create `webui/src/app/submit-bulk/__tests__/BulkUploadForm.test.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkUploadForm } from '../BulkUploadForm';

// Mock parse + resolve so the test is deterministic and offline.
jest.mock('../parseGeneListFile', () => ({
    parseGeneListFile: jest.fn(async () => ({
        rows: [{ species: 'Homo sapiens', symbol: 'TP53', variants: [], lineNumber: 2 }],
    })),
}));
jest.mock('../resolveRows', () => ({
    resolveRows: jest.fn(async () => ({
        entries: [{ geneId: 'HGNC:11998', geneName: 'TP53', species: 'Homo sapiens' }],
        skipped: [{ lineNumber: 3, raw: { species: 'X', symbol: 'NOPE', variants: [], lineNumber: 3 }, reason: 'no gene found for "NOPE" in X' }],
    })),
}));

// Capture the entries handed to the form without rendering the real one.
const formSpy = jest.fn();
jest.mock('@/app/submit/components/JobSubmitForm/JobSubmitForm', () => ({
    JobSubmitForm: (props: unknown) => {
        formSpy(props);
        return <div data-testid="job-submit-form" />;
    },
}));

describe('BulkUploadForm', () => {
    beforeEach(() => formSpy.mockClear());

    it('parses + resolves an uploaded file, then renders the form and the report', async () => {
        render(<BulkUploadForm agrjBrowseDataRelease="8.2.0" />);

        const file = new File(['species,gene_symbol\nHomo sapiens,TP53\n'], 'genes.csv', { type: 'text/plain' });
        const input = screen.getByLabelText(/gene list file/i);
        await userEvent.upload(input, file);

        await waitFor(() => expect(screen.getByTestId('job-submit-form')).toBeInTheDocument());

        const props = formSpy.mock.calls.at(-1)?.[0] as { initialGenes?: unknown };
        expect(props.initialGenes).toEqual([
            { geneId: 'HGNC:11998', geneName: 'TP53', species: 'Homo sapiens' },
        ]);
        expect(screen.getByText(/skipped 1 row/i)).toBeInTheDocument();
    });

    it('shows a file-level error and no form when parsing fails', async () => {
        const { parseGeneListFile } = jest.requireMock('../parseGeneListFile');
        parseGeneListFile.mockResolvedValueOnce({ rows: [], fileError: 'The file appears to be empty.' });

        render(<BulkUploadForm agrjBrowseDataRelease="8.2.0" />);
        const file = new File([''], 'empty.csv', { type: 'text/plain' });
        await userEvent.upload(screen.getByLabelText(/gene list file/i), file);

        await waitFor(() => expect(screen.getByText(/file appears to be empty/i)).toBeInTheDocument());
        expect(screen.queryByTestId('job-submit-form')).toBeNull();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest --testPathPatterns="BulkUploadForm" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '../BulkUploadForm'`.

- [ ] **Step 3: Write `BulkUploadForm`**

Create `webui/src/app/submit-bulk/BulkUploadForm.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { ExampleGene } from '@/app/submit/components/ExampleDataLoader/ExampleDataLoader';
import { JobSubmitForm } from '@/app/submit/components/JobSubmitForm/JobSubmitForm';
import { parseGeneListFile } from './parseGeneListFile';
import { resolveRows } from './resolveRows';
import { BulkUploadReport } from './BulkUploadReport';
import { buildTemplateCsv, TEMPLATE_FILENAME } from './bulkTemplate';
import { SkippedRow } from './types';

export interface BulkUploadFormProps {
    readonly agrjBrowseDataRelease: string;
}

type Status = 'idle' | 'processing' | 'ready' | 'error';

export function BulkUploadForm({ agrjBrowseDataRelease }: BulkUploadFormProps) {
    const [status, setStatus] = useState<Status>('idle');
    const [fileError, setFileError] = useState<string | null>(null);
    const [entries, setEntries] = useState<ExampleGene[]>([]);
    const [skipped, setSkipped] = useState<SkippedRow[]>([]);

    async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setStatus('processing');
        setFileError(null);
        setEntries([]);
        setSkipped([]);

        const { rows, fileError: parseError } = await parseGeneListFile(file);
        if (parseError) {
            setFileError(parseError);
            setStatus('error');
            return;
        }

        const result = await resolveRows(rows);
        setEntries(result.entries);
        setSkipped(result.skipped);
        setStatus('ready');
    }

    function downloadTemplate() {
        const blob = new Blob([buildTemplateCsv()], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = TEMPLATE_FILENAME;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div>
            <div className="agr-card" style={{ marginBottom: '1rem' }}>
                <div className="agr-card-body">
                    <label htmlFor="bulk-file">Gene list file (CSV, TSV, or .xlsx)</label>
                    <input
                        id="bulk-file"
                        type="file"
                        accept=".csv,.tsv,.txt,.xlsx"
                        onChange={handleFile}
                    />
                    <button type="button" className="p-button-text" onClick={downloadTemplate}>
                        Download template
                    </button>
                    {status === 'processing' && <p>Resolving genes…</p>}
                    {fileError && <p role="alert">{fileError}</p>}
                </div>
            </div>

            {status === 'ready' && (
                <>
                    <BulkUploadReport loaded={entries.length} skipped={skipped} />
                    {entries.length > 0 && (
                        <JobSubmitForm
                            agrjBrowseDataRelease={agrjBrowseDataRelease}
                            initialGenes={entries}
                        />
                    )}
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest --testPathPatterns="BulkUploadForm" 2>&1 | tail -20
```

Expected: PASS (2 tests).

- [ ] **Step 5: Create the page**

`getAgrDataRelease` is NOT a shared export — it is a local `async function getAgrDataRelease(publicDataPortalUrl: string)` duplicated verbatim in both `submit/page.tsx` and `submit-ortholog/page.tsx`, alongside a `const PUBLIC_DATA_PORTAL_URL = 'https://www.alliancegenome.org'`. `Breadcrumbs` takes an `items` prop. Replicate that exact pattern (do not import a non-existent export).

Create `webui/src/app/submit-bulk/page.tsx`:

```tsx
import { Breadcrumbs } from '../components/Breadcrumbs';
import { BulkUploadForm } from './BulkUploadForm';

const PUBLIC_DATA_PORTAL_URL = 'https://www.alliancegenome.org';

async function getAgrDataRelease(publicDataPortalUrl: string): Promise<string> {
    const releaseInfoURL = `${publicDataPortalUrl}/api/releaseInfo`;
    return fetch(releaseInfoURL, { next: { revalidate: 3600 } })
        .then((response) => {
            if (response.ok) {
                return response.json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            } else {
                throw new Error('Error while retrieving releaseInfo.');
            }
        })
        .then((data) => {
            return data.releaseVersion as string;
        });
}

export default async function SubmitBulkPage() {
    const agrDataRelease = await getAgrDataRelease(PUBLIC_DATA_PORTAL_URL);

    return (
        <article>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'Bulk Upload' },
                ]}
            />
            <header>
                <h1 className="agr-page-title">Bulk Gene-List Upload</h1>
            </header>
            <section>
                <BulkUploadForm agrjBrowseDataRelease={agrDataRelease} />
            </section>
        </article>
    );
}
```

Note: the `eslint-disable-line @typescript-eslint/no-explicit-any` mirrors the existing pages. If the existing pages do NOT carry that disable on their identical line (check `submit-ortholog/page.tsx`), remove it here too so this file matches — an unused disable would fail `--max-warnings 0`.

- [ ] **Step 6: Add the nav link**

In `webui/src/app/components/Header/Header.tsx`, next to the existing "Submit Job" and "Ortholog Alignment" links (around lines 67-72), add:

```tsx
                    <Link href="/submit-bulk" onClick={() => setMobileMenuOpen(false)}>
                        Bulk Upload
                    </Link>
```

- [ ] **Step 7: Type-check, lint, and build the route**

```bash
npm run type-check 2>&1 | tail -15
npx eslint --max-warnings 0 src/app/submit-bulk/BulkUploadForm.tsx src/app/submit-bulk/page.tsx src/app/components/Header/Header.tsx src/app/submit-bulk/__tests__/BulkUploadForm.test.tsx 2>&1 | tail -8
```

Expected: no new type errors; eslint clean. If `@testing-library/user-event` is not already a dev dependency, either install it (`npm install --save-dev --strict-peer-deps @testing-library/user-event`) or rewrite the test's upload step using `fireEvent.change(input, { target: { files: [file] } })` from `@testing-library/react` — check `package.json` first and prefer whichever is already present.

- [ ] **Step 8: Commit**

```bash
git add webui/src/app/submit-bulk/BulkUploadForm.tsx webui/src/app/submit-bulk/page.tsx webui/src/app/components/Header/Header.tsx webui/src/app/submit-bulk/__tests__/BulkUploadForm.test.tsx webui/package.json webui/package-lock.json
git commit -m "feat(webui): /submit-bulk page wiring upload to the alignment form"
```

---

## Task 8: Cypress end-to-end coverage

**Files:**
- Create: `webui/cypress/e2e/bulk-upload.cy.ts`
- Create: `webui/cypress/fixtures/bulk-genes.csv`

**Interfaces:**
- Consumes: the running WebUI + API (same convention as `examples-catalog.cy.ts`).

- [ ] **Step 1: Create the fixture**

Create `webui/cypress/fixtures/bulk-genes.csv`:

```
species,gene_symbol,transcript,variants
Homo sapiens,TP53,,
Mus musculus,Trp53,,
ZzzNotAGene,Nope,,
```

- [ ] **Step 2: Write the test**

Create `webui/cypress/e2e/bulk-upload.cy.ts`:

```ts
/// <reference types="cypress" />

// Uploads a small gene list on /submit-bulk and asserts the alignment
// form is populated with the resolved genes and the skipped-row report
// shows the unresolvable one.

describe('bulk gene-list upload', () => {
    Cypress.on('uncaught:exception', (err) => {
        if (err.message.includes('CanvasRenderingContext2D')) return false;
        return undefined;
    });

    it('resolves a file into pre-filled alignment entries + a skipped-row report', () => {
        cy.visit('/submit-bulk');

        cy.get('input#bulk-file').selectFile('cypress/fixtures/bulk-genes.csv', { force: true });

        // Two rows resolve (human TP53, mouse Trp53); one is skipped.
        cy.contains(/loaded\s+2\s+genes/i, { timeout: 60_000 }).should('be.visible');
        cy.contains(/skipped 1 row/i).should('be.visible');

        // The gene inputs are populated in the alignment form.
        cy.get('.p-inputgroup #gene input', { timeout: 60_000 }).should('have.length.at.least', 2);
        cy.get('.p-inputgroup #gene input').first().should('have.value', 'TP53 (Hsa)');
    });
});
```

- [ ] **Step 3: Ensure services are running**

```bash
curl -fs http://localhost:3001 >/dev/null && echo "webui up"
curl -fs http://localhost:8001/api/health >/dev/null && echo "api up"
```

Expected: both print "up". (Start them as in the repo's local-dev notes if not: API on 8001 with `USE_LOCAL_PIPELINE=true`, WebUI on 3001 with `PAVI_API_BASE_URL=http://localhost:8001`.)

- [ ] **Step 4: Run the E2E test**

```bash
CYPRESS_BASE_URL=http://localhost:3001 ./node_modules/.bin/cypress run \
  --spec 'cypress/e2e/bulk-upload.cy.ts' \
  --env API_BASE_URL=http://localhost:8001 2>&1 | tail -25
```

Expected: 1 passing test. If the first gene input value differs (e.g. the app formats it as `TP53` without the `(Hsa)` suffix), read the actual value from the run output and adjust the assertion to match what the app renders — do not weaken it to a bare existence check.

- [ ] **Step 5: Commit**

```bash
git add webui/cypress/e2e/bulk-upload.cy.ts webui/cypress/fixtures/bulk-genes.csv
git commit -m "test(webui): e2e for bulk gene-list upload"
```

---

## Self-review notes

- **Spec coverage:** `/submit-bulk` page (Task 7); CSV/TSV/xlsx parse (Task 2); symbol+species→gene resolution, best-effort with reasons + dedupe (Task 3); land in editable pre-filled `JobSubmitForm` (Task 5 prop + Task 7 wiring); transcript pre-select from the `transcript` column (Task 4); allele pre-select from `variants` reuses the existing `initialAlleleIds` path (Task 3 populates `alleleIds`); best-effort report (Task 6); downloadable template (Task 6 + Task 7); nav entry (Task 7); tests at unit/component/E2E (all tasks + Task 8). All spec sections map to a task.
- **Deferred (spec non-goals):** multiple jobs per file, HGVS variants, a gated preview table, server-side parsing — none implemented.
- **Type consistency:** `RawRow`, `SkippedRow`, `ResolveResult`, `GeneMatch`, `ExampleGene` (+ `transcriptNames?`), `selectInitialTranscriptIds`, `resolveGeneBySymbolSpecies`, `resolveRows`, `buildTemplateCsv`/`TEMPLATE_FILENAME`, `BulkUploadReport`, `BulkUploadForm`, and `JobSubmitForm`'s `initialGenes` prop are used with identical names/shapes across tasks.
- **Known caveat:** the pre-existing AlignmentEntry test failure ("accepts gene input string…") also fails on `main`; Task 4 must not be blamed for it.
