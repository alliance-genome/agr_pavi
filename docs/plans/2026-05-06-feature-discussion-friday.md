# Pending feature discussion — Friday 2026-05-08

## TL;DR for tomorrow's meeting

**Branch `feature/ortholog-and-variant-improvements` (5 commits ahead of main):**

Already shipped on this branch:
- Wrong gene IDs in two examples (SOD1, MYH6) — `RGD:3727` was
  Sult2a6 (sulfotransferase) not Sod1; `ZFIN:ZDB-GENE-991019-3` was
  myl7 (light chain) not myh6. Verified against Alliance ortholog API.
- Per-row allele filter now auto-syncs to the selected transcript
  (curie-based, with a wipe-out safety net).
- Submit page spacing tightened (cards, header bars, page title,
  intro banner).
- Ortholog submission page: auto-fetch on gene select, parallel
  Alliance fetches, structured error handling, stale-state cleanup.

In another session (per parallel work): protein-altering variant
filter on the result page (toggle + splice-site SO terms included).

Items below need product/UX decisions before further work:

| # | Topic                                          | Blocker                                    |
|---|------------------------------------------------|---------------------------------------------|
| 5 | Visualize sequence transcript                  | Where + scope undefined                     |
| 6 | Per-ortholog variant + transcript selection    | Default transcript pick policy              |
| 7 | Add alleles to finished alignment              | Phase 1 (per-job DB + export) shipped       |

---


Three items from the working list need product/UX clarification before
implementation can proceed safely. Captured here so the Friday discussion
has concrete questions to anchor on.

## 5. Visualize sequence transcript

**Original ask:** "visualize sequence transcript" (vague).

**Possible interpretations:**

a. **Inline transcript schematic on the result page.**
   Show a per-sequence track depicting exon/CDS layout above or beside the
   alignment, so users can map alignment columns back to genomic transcript
   structure. Closest existing analog: Nightingale's `Track` /
   `LinegraphTrack` components (already used for variants and conservation).

b. **Standalone transcript viewer on submit / preview.**
   When a user picks a transcript in `useTranscriptSelection`, render a
   small JBrowse-style schematic showing the chosen transcript's exons so
   the user can visually confirm before submitting. Would reuse
   `selectedTranscriptsInfo[].exons` and `cds_regions` already collected
   in the hook.

c. **Per-row transcript map in `/jobs` history.**
   Show which transcript each historical job used.

**Open questions for Friday:**
- Where does the transcript visualization live — submit, result, or both?
- Do we need exon/intron schematic, just CDS regions, or full subfeature
  detail (5'/3' UTRs, splice sites)?
- Is this a new Nightingale track type, or a custom SVG component?
- Coordinate space — alignment columns (post-Clustal) or genomic
  coordinates (pre-pipeline)? They are not the same.
- Multi-transcript display — how to lay out N parallel transcript
  diagrams without crowding?

**Existing data we can reuse:**
- `TranscriptInfo` (in `webui/src/app/submit/components/AlignmentEntry/types.ts`)
  carries `exons` and `cds_regions` with `refStart`/`refEnd`/`phase`.
- The pipeline's `seq-info` JSON output already maps genomic regions to
  alignment positions (used today for variant overlay).

## 6. Improve submit ortholog alignment job

**Status:** in active development; small improvements landed alongside
this document. Larger items deferred pending Friday alignment.

**Audit punch list (full set):**

UX (per prior memory feedback "auto-fetch, tighter design, variant
selection per ortholog"):
1. Auto-fetch orthologs on gene select — *DONE in this branch*.
2. Per-ortholog variant selection (allele dropdown per row) — *deferred*.
3. Per-ortholog transcript selection (currently `transcripts[0]` is
   hard-picked, line 154 of `OrthologForm.tsx`) — *deferred*.
4. Tighter design matching `/submit` aesthetic — *partially addressed
   via global theme tightening in commit `a5bc49da`*.

Code quality:
5. Sequential `for-await` over Alliance API → `Promise.all` —
   *DONE in this branch*.
6. `(buildPayloadForGene as any).lastError` anti-pattern → return
   structured result — *DONE in this branch*.
7. Duplicated `jBrowseSubfeatureRelToRefPos` and transcript-payload
   logic between `OrthologForm.tsx` and `useTranscriptSelection.ts` →
   extract shared module — *deferred (touches both files, larger
   refactor; want test coverage first)*.
8. Stale `// eslint-disable-next-line react-hooks/exhaustive-deps` on
   `handleSubmit` (line 208) — *DONE in this branch*.
9. `any` leakage on transcript / subfeature types — *deferred*.
10. Stale `sourceGene` not cleared on gene reselect — *DONE in this
    branch*.
11. `${e}` error rendering produces poor messages — *DONE in this
    branch*.

**Open questions for Friday:**
- For per-ortholog variant selection: do we fetch alleles per ortholog
  (N×Alliance calls) or only on demand when user expands a row?
- For per-ortholog transcript selection: default to longest CDS,
  canonical, or first-returned? Currently first-returned is silent.
- Tighter design — what specifically to align with `/submit`? Card
  spacing, button placement, allele filter UX, or all three?

## 7. Add extra alleles / sequences to a finished alignment

**Direction:** one self-contained SQLite per finished job, written
alongside the existing alignment + seq-info files. Each job DB carries
the full input payload and both pipeline outputs, so it can be exported
as a single file (basis for a future PAVI desktop application) and is
the natural place to attach additional alleles / sequences when
extending an existing alignment.

**Phase 1 (this branch):**
- `api/src/job_db.py` module: per-job schema (`metadata`,
  `input_seq_regions`, `results`), write/read helpers.
- Hook in `api/src/local_pipeline.py` after the result files land:
  write a per-job `job.db` next to them. Failure is logged + swallowed
  so it never converts a successful pipeline run into a user-visible
  failure; the on-disk `.aln` / `.json` remain canonical.
- Export endpoint `GET /api/pipeline-job/{uuid}/export` returning the
  per-job DB as `application/x-sqlite3` with a download disposition.
  Local pipeline mode only for now (Step Functions emits no per-job
  DB yet).
- Unit tests covering round-trip, overwrite-on-rerun, missing file,
  and corrupt file tolerance.

**Phase 2 (future):**
- WebUI "Download job" link on the result page that hits the export
  endpoint.
- WebUI "Add alleles" flow that reads the per-job DB to pre-fill the
  submit form with the original input, lets the user add alleles, and
  submits a new derived job (lineage tracked via a parent UUID
  column added to the metadata table).
- Production parity: emit a per-job DB from the Step Functions
  pipeline as well, so prod jobs gain the same exportability.

**Open questions deferred to Friday:**
- Should the per-job DB also include a copy of the variant
  annotations fetched at result-render time, so the export is fully
  reproducible offline? Trade-off: bigger files, but a richer desktop
  experience.

---

## Implementation log (for reference)

Branch `feature/ortholog-and-variant-improvements`:
- `59afa907` task 1: fix wrong gene IDs in SOD1 and MYH6 examples
- `d46daed0` task 3: auto-filter alleles by selected transcript
- `a5bc49da` task 4: tighten spacing on submit page
- `07264f9b` document open feature questions for Friday discussion
- `753be6e2` task 6: improve ortholog submission page
  (auto-fetch, parallel API, structured errors, stale-state cleanup)

Task 2 (protein-altering variant filter) is being handled in a parallel
working session and is expected to land on this branch separately.

Larger items deliberately deferred from task 6 (require Friday
alignment): per-ortholog variant selection, per-ortholog transcript
selection, extracting the duplicated `useTranscriptSelection` payload
logic into a shared module.
