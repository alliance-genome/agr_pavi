# Design: Transcript viewer widget on the submit page

**Date:** 2026-07-03
**Status:** Approved (pending written-spec review)
**Component:** `webui/` (Next.js submit flow)

## Summary

Add a "View transcripts" modal to the PAVI `/submit` flow that displays
the same gene-model viewer users see in the "Alleles and Variants"
section of an Alliance gene page. When a user is choosing transcripts for
a gene, they can open a dialog that shows that gene's transcript/isoform
models (exon-intron structures) drawn on a genomic axis, so they can see
the structure before picking from the transcript dropdown.

The viewer is the Alliance `genomefeatures` D3/SVG library — the exact
renderer the main Alliance site uses — so the widget looks identical to
the main site.

**v1 is read-only and transcripts-only** (`type: 'ISOFORM'`). It is
designed so variant lollipops and click-to-select can be layered on later
without a rewrite.

## Goals

- Show a gene's transcript models visually during transcript selection,
  matching the Alliance gene-page look.
- Reuse data PAVI already fetches — no new data sources.
- Fit PAVI's existing UI patterns (PrimeReact `Dialog`, client-only
  dynamic import of a browser-only renderer).
- Leave a clean path to variants (`ISOFORM_AND_VARIANT`) and interactive
  transcript selection.

## Non-goals (v1)

- Variant lollipop markers (deferred; needs the S3 tabix VCF wiring).
- Click-a-transcript-to-select-it interactivity (deferred).
- Neighboring genes on the locus (the Alliance page shows them; PAVI's
  task is single-gene transcript choice, so they are noise here).
- Multi-gene comparison in one view.

## Background: what the Alliance widget is

The "Alleles and Variants" graphic on an Alliance gene page is rendered by
the **`genomefeatures`** library (`alliance-genome/genomefeatures`, a fork
of `GMOD/genomefeatures`) — a framework-agnostic **D3/SVG** renderer, *not*
JBrowse. agr_ui wraps it in a React class component
(`src/containers/genePage/genomeFeatureWrapper.jsx`) that does:

```js
this.gfc = new GenomeFeatureViewer(trackConfig, `#${id}`, 900, 500)
```

It fetches its data client-side from static S3 files, keyed by release:

- **Gene models:** JBrowse 1 NCList `trackData.jsonz` under
  `s3.amazonaws.com/agrjbrowse/docker/{release}/{MOD}/{organism}/tracks/All_Genes/...`
- **Variants (not in v1):** bgzipped tabix VCF under
  `s3.amazonaws.com/agrjbrowse/VCF/{release}/{species}-latest.vcf.gz`

The Alliance REST API only supplies the gene object (location, taxon,
symbol) and the allele/variant table — the graphical track data itself
comes from the `agrjbrowse` S3 bucket.

### Why this is a good fit for PAVI

PAVI **already reads the same NCList data**. `useTranscriptSelection`
uses `generic-sequence-panel`'s `fetchTranscripts` + `NCListFeature`
against the same `agrjbrowse` S3 NCList files, and already imports
`getSpecies` / `getSingleGenomeLocation` from agr_ui utils. So when a gene
is selected, PAVI already holds:

- the genome location (`GeneInfo.genomeLocations`: chromosome, start, end),
- the species' apollo name and NCList URL template (via `getSpecies()`),
- the data release version (`agrjBrowseDataRelease`).

These are exactly the inputs `GenomeFeatureViewer` needs. The widget adds
a rendering surface over data PAVI has in hand — it does not add a new
fetch path.

## Approach

Embed the real `genomefeatures` library (Approach A of three considered).

Alternatives rejected:

- **Native Nightingale render** (PAVI already uses Nightingale): no new
  dep, but would not match the Alliance look and would reimplement
  exon/intron/CDS/strand drawing (and later variant lollipops) as custom
  code we own.
- **Custom lightweight SVG**: most control, most drawing code to own,
  farthest from "this widget."

Approach A was chosen because the explicit goal is a widget similar to the
main site, PAVI already has the two inputs the library needs, and it is
the shortest path to the deferred variants/interactivity.

## Architecture & components

All new code lives under `webui/src/app/submit/components/`.

### `GenomeFeatureView` (renderer wrapper)

- Thin client-only React component that owns an `<svg id={uniqueId}>` and,
  on mount, instantiates `new GenomeFeatureViewer(trackConfig, '#'+id, width, height)`.
- Modeled on agr_ui's `genomeFeatureWrapper.jsx`, trimmed to
  `type: 'ISOFORM'`.
- The `genomefeatures` import is dynamic with `ssr: false` (the library
  touches `window`/DOM; PAVI already uses this pattern for Nightingale).
- Cleans up the SVG / viewer instance on unmount so reopening a different
  gene does not leak the prior render.
- Props: `{ trackConfig, width?, height? }` plus a future-friendly
  `onFeatureClick?` callback (unused in v1, reserved for interactivity).

### `buildTrackConfig(gene, release)` (pure)

- Pure function: `(GeneInfo, releaseString) -> trackConfig`.
- Mirrors the config agr_ui builds: `genome` (apollo species name),
  `transcriptTypes`, `geneBounds` (fmin/fmax), `geneSymbol`, `geneId`, and
  a single track with `type: 'ISOFORM'` and the NCList `urlTemplate`.
- Sources species name + NCList template from `getSpecies()` and location
  from `GeneInfo.genomeLocations`.
- Returns `null` when the gene has no usable genome location (drives the
  disabled-button state).
- Pure and dependency-light so it is unit-testable without a browser.

### `TranscriptViewerDialog`

- PrimeReact `Dialog` (same pattern/portal behavior as the existing Load
  Example dialog).
- Props: `{ visible, gene, release, onHide }`.
- Renders `GenomeFeatureView` with `buildTrackConfig(gene, release)` when
  visible and the config is non-null; otherwise renders the fallback
  message (see Error handling).
- Header shows gene symbol + genome location for context.

### Trigger button (in `AlignmentEntry`)

- A "View transcripts" button next to the transcript multiselect.
- Enabled only once `geneSearch.gene` is set **and**
  `buildTrackConfig(...)` would be non-null (gene has a location).
- Opens `TranscriptViewerDialog` for that entry's gene.

## Data flow

1. User selects a gene in an `AlignmentEntry` → `geneSearch.gene`
   (`GeneInfo`) is populated as today.
2. User clicks "View transcripts" → dialog opens with that gene.
3. `TranscriptViewerDialog` calls `buildTrackConfig(gene, release)`.
4. `GenomeFeatureView` mounts an `<svg>` and constructs
   `GenomeFeatureViewer`, which fetches the NCList `trackData.jsonz` from
   the `agrjbrowse` S3 bucket and draws the isoform models.
5. On close/unmount, the viewer and SVG are cleaned up.

No PAVI API calls are added; the only network traffic is the library's
own S3 NCList fetch, identical to what the Alliance page does.

## Dependency choice

`genomefeatures` is available two ways:

- **npm `genomefeatures@1.0.5`** — clean install.
- **GitHub pin** `github:alliance-genome/genomefeatures#<sha>` — exactly
  what agr_ui pins, guaranteed to match the main site.

**Decision:** target the same GitHub pin agr_ui uses, for main-site
fidelity, and verify the `GenomeFeatureViewer` constructor/API of that
pinned commit during the implementation spike. **Fallback:** if the pin
causes install/build friction in PAVI's Next build, use the npm release
(same public API). This is the primary risk in the design and is
front-loaded (see Build sequence).

## Error handling

- **No genome location:** `buildTrackConfig` returns `null`; the trigger
  button is disabled with a tooltip ("no genomic location for this gene").
- **NCList fetch fails / empty render:** the dialog shows a friendly
  message and a "View on Alliance" link to the real gene page as a
  fallback, so the user is never stuck.
- **Reopen leak:** `GenomeFeatureView` disposes the prior viewer/SVG on
  unmount and on `gene` change.

## Testing

- **Unit** — `buildTrackConfig`: given a `GeneInfo` (with and without a
  genome location) and a release, assert the produced config fields and
  the `null` case. No browser needed.
- **Component** — render `TranscriptViewerDialog` with `genomefeatures`
  mocked (`jest.mock`, mirroring the existing Nightingale mocks in
  `__tests__`); assert the SVG mounts and the constructed config is passed
  to the viewer; assert the fallback renders when config is `null`.
- **E2E (Cypress)** — one case: on `/submit`, select a gene, click "View
  transcripts", assert the dialog opens and the SVG contains rendered
  transcript path elements. Runs against the local stack like the existing
  `examples-catalog.cy.ts` sweep.

## Build sequence

1. **Spike (de-risk the dependency first):** add `genomefeatures`, get a
   single hard-coded gene rendering isoforms into an `<svg>` in a throwaway
   page. Confirm the pinned API and Next `ssr:false` dynamic import work.
2. `buildTrackConfig` + unit tests.
3. `GenomeFeatureView` wrapper (dynamic import, lifecycle/cleanup).
4. `TranscriptViewerDialog` + fallback + component test.
5. Wire the trigger button into `AlignmentEntry`.
6. Cypress E2E case.

## Open questions

- Exact `GenomeFeatureViewer` constructor signature/config keys of the
  pinned commit — resolved in the spike (step 1).
- Whether every PAVI-supported species has an `All_Genes` NCList at the
  configured release (expected yes, since PAVI already fetches transcripts
  from it; confirm during the spike across the catalog species).
