# Design: Bulk gene-list upload

**Date:** 2026-07-30
**Status:** Approved (pending written-spec review)
**Component:** `webui/` (Next.js submit flow)

## Summary

Add a `/submit-bulk` page that lets a user upload a file listing many
genes (CSV, TSV, or `.xlsx`) and land in the normal PAVI alignment form
with all resolved genes pre-populated as entries — instead of adding
each gene by hand on `/submit`. Rows that don't resolve are skipped and
reported (best-effort), never blocking the ones that do.

The gene → transcript → allele resolution, the interactive per-gene
editing, the payload build, and the submit path are all **reused** from
the existing `JobSubmitForm` / `AlignmentEntry`. The new work is the
page shell, a file parser, a row resolver, a best-effort report, and a
small extension letting `JobSubmitForm` accept pre-filled entries.

## Goals

- Populate a single alignment submission from an uploaded gene list.
- Reuse the existing submit machinery — the user lands in the editable
  form, can tweak, then submits through the normal path.
- Be tolerant: load every row that resolves; report the rest.

## Non-goals

- Multiple separate jobs from one file (this is one job, many entries —
  same as `/submit` today).
- A full preview/confirm table with inline row editing before load
  (the user chose best-effort load + report, not a gated preview).
- HGVS variant identifiers in the `variants` column (v1 uses allele IDs;
  HGVS is a possible later extension).
- Server-side parsing (parsing and resolution stay client-side, reusing
  the WebUI's existing Alliance-facing server actions).

## Background: what already exists

The `/submit` "Load Example" flow already does most of this. Selecting
an example calls `handleLoadExample(example)`, which sets
`initialGenes: ExampleGene[]` state and bumps a `loadVersion` counter;
`AlignmentEntryList` receives `initialGenes` and mounts one
`AlignmentEntry` per gene, each of which:

- resolves the gene from its id (`useGeneSearch` / `fetchGeneInfo`),
- loads and (default-) selects transcripts (`useTranscriptSelection`),
- pre-selects any `alleleIds` (`useAlleleSelection`, via the
  `initialAlleleIds` option),
- builds its slice of the submission payload,

and `JobSubmitForm` assembles and submits the whole payload. `ExampleGene`
is `{ geneId, geneName, species, alleleIds? }`.

`/submit-ortholog` is the precedent for a *separate page* that feeds the
alignment flow. It does not reuse `JobSubmitForm` — it resolves genes and
builds/submits the payload directly. This design deliberately takes the
other integration style (reuse the interactive `JobSubmitForm`), because
the user wants to land in the editable, pre-filled form.

## Approach

Separate `/submit-bulk` page that, after parsing and resolving the file,
renders the existing `JobSubmitForm` pre-populated with the resolved
entries plus a best-effort report of skipped rows.

Rejected alternatives:

- **Bulk-upload dialog on `/submit`** — least new code, but the user
  chose a dedicated page.
- **Server-side parsing (new PAVI API endpoint)** — would split the
  symbol→gene→transcript resolution (which currently lives in the
  WebUI's server actions against the Alliance API) across two codebases
  and add a file-upload endpoint. Overkill for v1.

## File format

A header row (case-insensitive column names), one gene per data row.
CSV and TSV are distinguished by delimiter sniffing; `.xlsx` is read
from the first sheet via SheetJS.

| Column        | Required | Example                     | Meaning |
|---------------|----------|-----------------------------|---------|
| `species`     | yes      | `Homo sapiens`              | Disambiguates the symbol; matched against the Alliance species list (scientific or common name). |
| `gene_symbol` | yes      | `TP53`                      | Resolved to a gene id within that species. |
| `transcript`  | no       | `ENST00000269305.9`         | If present, that transcript is pre-selected; otherwise the form auto-picks its default. |
| `variants`    | no       | `MGI:6157439;MGI:6157441`   | Semicolon-separated **allele IDs**, pre-selected via the existing allele mechanism. |

Assumptions (locked for v1):

- `variants` are allele IDs (e.g. `MGI:6157439`), matching the form's
  existing allele pre-selection. HGVS support is out of scope.
- A **downloadable template** (headers + one example row) is offered on
  the page so users get the exact column names.
- `.xlsx` support requires adding the client-side `xlsx` (SheetJS)
  dependency. CSV/TSV use a small built-in parser.

## Components & data flow

New files under `webui/src/app/submit-bulk/`:

- **`page.tsx`** — route shell: breadcrumbs, heading, renders
  `BulkUploadForm`. Reads `agrjBrowseDataRelease` the same way `/submit`
  does and passes it down.
- **`BulkUploadForm.tsx`** — client component owning the flow. Holds
  file state, `resolvedGenes`, `skippedRows`, and a page-level parse
  error. Renders: the upload control + template link, the
  `BulkUploadReport`, and the pre-filled `JobSubmitForm`.
- **`parseGeneListFile.ts`** — pure/async: `File -> { rows: RawRow[];
  fileError?: string }`. Delimiter sniff for CSV/TSV; SheetJS for
  `.xlsx`. Normalizes header names (lowercase, trims). `RawRow` is
  `{ species: string; symbol: string; transcript?: string;
  variants?: string[]; lineNumber: number }`.
- **`resolveRows.ts`** — async: `RawRow[] -> { entries: BulkEntry[];
  skipped: SkippedRow[] }`. Per row: validate required cells, match the
  species, resolve `symbol + species -> geneId` via the existing
  gene-search server action, attach `transcriptNames` and `alleleIds`.
  `BulkEntry` is just an `ExampleGene` (which gains `transcriptNames?`
  below and already has `alleleIds?`) — no extra fields are needed to
  feed the form. `SkippedRow` is `{ lineNumber: number; raw: RawRow;
  reason: string }`.
- **`BulkUploadReport.tsx`** — renders "Loaded N genes · skipped M rows"
  with an expandable, dismissible list of skipped rows (line number +
  original values + reason).
- **`bulkTemplate.ts`** — builds the downloadable template file content.

Reused, with one small extension each:

- **`JobSubmitForm`** gains an optional `initialGenes?: ExampleGene[]`
  prop that seeds its existing `initialGenes` state on mount (the same
  state "Load Example" sets internally). This is the entire integration
  point — no duplication of the form.
- **`ExampleGene`** gains an optional `transcriptNames?: string[]`
  (it already has `alleleIds?`). **`useTranscriptSelection`** gains an
  `initialTranscriptNames` option that pre-selects those transcripts
  once the transcript list has loaded, mirroring how
  `useAlleleSelection` already handles `initialAlleleIds`. When absent,
  behavior is unchanged (current default auto-pick).

Data flow:

```
File
  -> parseGeneListFile      -> RawRow[]  (or fileError)
  -> resolveRows (async)    -> { entries: BulkEntry[], skipped: SkippedRow[] }
  -> <JobSubmitForm initialGenes={entries} agrjBrowseDataRelease=... />
   + <BulkUploadReport skipped={skipped} loaded={entries.length} />
```

## Error handling (best-effort)

No failure blocks the whole upload; each is isolated to its row and
reported.

| Failure | Handling |
|---|---|
| Unreadable file / wrong type / zero data rows | Page-level error ("Couldn't read the file — expected CSV, TSV, or .xlsx with a header row"); nothing loaded. |
| Missing required cell (`species` or `gene_symbol`) | Row skipped, reason "missing species/symbol". |
| Species not recognized | Row skipped, reason "unknown species '<x>'". |
| Symbol resolves to 0 genes | Row skipped, reason "no gene found for '<symbol>' in <species>". |
| Symbol resolves to >1 gene (ambiguous) | Row skipped, reason "ambiguous — matched N genes"; never silently guessed. |
| Transcript or variant not found | Gene still loads; a non-fatal note is recorded on that entry ("transcript X not found — using default"). The form's own resolution is the source of truth, so these do not hard-fail the row. |
| Duplicate gene (id already loaded) | Deduped with a note, reusing the existing dedupe behavior. |

The report shows the loaded/skipped counts, an expandable list of skipped
rows (original line + reason), and is dismissible.

## Testing

- **Unit — `parseGeneListFile`:** CSV, TSV, and `.xlsx` inputs; header
  name variants and ordering; missing/extra columns; empty file;
  semicolon-split `variants`.
- **Unit — `resolveRows`:** gene-search action mocked to return
  ok / not-found / ambiguous; missing-cell and unknown-species rows;
  assert the produced `entries` and each `skipped` reason.
- **Unit — `bulkTemplate`:** produced content has the exact headers and
  a usable example row.
- **Extension — `useTranscriptSelection`:** pre-selects
  `initialTranscriptNames` once the transcript list loads; no-ops when
  absent (mirrors the existing `initialAlleleIds` test).
- **Component — `BulkUploadForm`:** parser + resolver mocked; uploading a
  file passes the resolved `initialGenes` to a mocked `JobSubmitForm`
  and renders the skipped-row report.
- **E2E (Cypress):** upload a small fixture CSV on `/submit-bulk`; assert
  the alignment form shows the expected gene entries and the skipped-row
  report; then submit and reach `/progress`.

## Navigation

Add a nav entry for the bulk page alongside the existing "Submit Job"
and "Ortholog Alignment" links, and a link/hint from `/submit` pointing
users who have a gene list to the bulk page.

## Open questions

- Exact wording of the species match (scientific name vs common name):
  resolve during implementation against the Alliance species list the
  app already uses (`getSpecies`), accepting either form.
- Whether the downloadable template is CSV only or also `.xlsx`: CSV is
  sufficient for v1 (opens in Excel); revisit if users ask.
