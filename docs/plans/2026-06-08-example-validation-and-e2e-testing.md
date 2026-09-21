# Example validation, CLI testing harness, and Playwright E2E

**Status:** plan — not yet implemented.

**Goal:** Catch the entire class of regressions we hit during the Alliance
v9 migration (broken example datasets, dropdowns staying empty, pipeline
crashing on payload shape, result page exploding) **before** they reach
production. Three complementary layers:

1. **Example validation suite** — every shipped example dataset runs an
   actual end-to-end alignment and the output is asserted against a
   reference fingerprint.
2. **CLI testing harness** — talk to the API directly with a Python
   script so the alignment-layer regressions surface even if the WebUI
   stops working.
3. **Playwright E2E + visual** — full-browser flow, screenshot diff per
   key page, drives the same example dataset list so failures triangulate
   between API and UI cleanly.

All three reuse a single source of truth for the example datasets so
adding or editing an example only changes one place.

---

## Why now

The Alliance v9 migration produced a long sequence of one-symptom fixes
(`fetchGeneInfo` shape, `fetchAlleles` shape, `vepConsequences` flatten,
`siftPrediction` flatten, autocomplete endpoint replacement, dedupe for
auto-select, variant.py shape, HGVS as cross-MOD identifier, …). The
common thread: each break manifested as a different symptom because the
example datasets are the *only* path that exercises the full submit ➝
pipeline ➝ result chain. A failure anywhere in that chain breaks the
demo, and we discover it one symptom at a time.

A validation harness keyed off the example list would have surfaced
every one of those breaks as a single failing CI job.

---

## 0. Shared example catalog

Move the 9 example datasets out of `webui/.../ExampleDataLoader.tsx` into
a language-neutral fixture so the CLI runner, Playwright suite, and the
WebUI all read the same canonical list.

### File layout

```
tests/examples/
  catalog.json              # ordered list of example metadata
  fixtures/                 # per-example expected outputs
    tp53-orthologs/
      expected.aln          # reference Clustal Omega output
      expected.seq-info.json
      assertions.json       # tolerances + identity bounds
    brca1-comparison/
      ...
  scripts/
    refresh_fixtures.py     # regenerates expected.* from a known-good run
```

### `catalog.json` schema

```json
{
  "version": 1,
  "examples": [
    {
      "id": "tp53-orthologs",
      "name": "TP53 Orthologs",
      "category": "cross-species",
      "description": "...",
      "genes": [
        { "geneId": "HGNC:11998", "geneName": "TP53", "species": "Homo sapiens", "alleleIds": [] },
        { "geneId": "MGI:98834",  "geneName": "Trp53", "species": "Mus musculus", "alleleIds": [] },
        { "geneId": "ZFIN:ZDB-GENE-990415-270", "geneName": "tp53", "species": "Danio rerio", "alleleIds": [] }
      ],
      "expectations": {
        "minSequenceCount": 3,
        "minPairwiseIdentityPct": 50,
        "expectedConsequenceCategories": []
      }
    }
  ]
}
```

### Migration

- WebUI: `ExampleDataLoader.tsx` imports the catalog (via a generated TS
  module so types stay).
- CLI runner: reads `catalog.json` directly.
- Playwright: reads `catalog.json`, iterates over `examples`, each example
  is its own `test()`.

**Acceptance:** Adding an example dataset = single edit to
`tests/examples/catalog.json`. WebUI list, CLI assertions, and
Playwright tests all pick it up automatically.

---

## 1. Example validation suite

Smoke-grade end-to-end test per example, run as the alignment layer's
integration test. Lives in `pipeline_components/seq_retrieval/tests/b_integration/`
or a new `tests/examples/` runner — TBD per where it makes sense to land
in CI.

### Per-example test outline

1. Resolve gene info via `fetchGeneInfo` equivalent (Python: hit
   `/api/gene/{id}` and use the v9 adapter logic ported to Python — same
   field-map doc).
2. Pick the first transcript per gene (matches current submit-form
   behavior).
3. Build `JobSumbissionPayloadRecord[]` per the API schema.
4. POST to a local API instance; poll status until terminal.
5. Assert:
   - status == `COMPLETED`
   - alignment file present
   - `aligned_seq_info.json` parses and contains
     `sequences.length >= expectations.minSequenceCount`
   - pairwise identity (computed from the alignment) for at least one
     pair >= `expectations.minPairwiseIdentityPct`
   - if `alleleIds` non-empty: `embedded_variants` in `seq-info` is
     non-empty for that gene's sequence
   - if `expectations.expectedConsequenceCategories` non-empty: those
     consequences appear in `embedded_variants[].molecular_consequences`

### Reference comparison strategy

Two-tier:

- **Strict**: byte-diff `alignment-output.aln` against
  `expected.aln`. Useful but brittle — Clustal Omega output can shift
  with minor input changes (different transcript exon coords if Alliance
  data refreshes).
- **Tolerant**: parse alignment + compute fingerprints
  (sequence count, per-sequence aligned length, pairwise identity to two
  decimals). Compare fingerprints against `assertions.json` thresholds.

Run tolerant comparison in CI; strict comparison on demand
(`make refresh-example-fixtures` writes new `expected.*` files for the
maintainer to inspect+commit).

### Why not direct golden-file diff only

Alliance data changes over time (sequence assembly updates, transcript
annotation refreshes). A pure golden diff produces false failures.
Fingerprint thresholds catch real regressions (sequences missing, MSA
collapsing, identity dropping to noise) while tolerating minor upstream
data drift.

---

## 2. CLI testing harness

A standalone Python script that drives the API directly without the
WebUI. Same job-submit flow PAVI exposes to the WebUI.

### Layout

```
tests/cli/
  Makefile                  # run-all, run-example NAME=…, refresh-fixtures
  pyproject.toml
  pavi_cli/
    __init__.py
    api_client.py           # thin requests wrapper over /api/pipeline-job
    alliance_client.py      # gene info / transcript resolution (v9 adapters)
    payload_builder.py      # JobSumbissionPayloadRecord builder from gene id
    runner.py               # orchestrates one example end-to-end
    assertions.py           # fingerprint compute + bounds check
    cli.py                  # entry point: `pavi-cli run --example tp53-orthologs`
```

### Commands

```
pavi-cli run --example tp53-orthologs
pavi-cli run --all
pavi-cli run --all --json-report report.json
pavi-cli list
pavi-cli refresh-fixtures --example tp53-orthologs
```

### What the runner does per example

1. Read `tests/examples/catalog.json` entry.
2. Call `alliance_client.get_gene_info(gene_id)` — same v9 envelope
   adapter, ported from
   `webui/src/app/submit/components/AlignmentEntry/serverActions.ts`.
3. Resolve transcript via the JBrowse NCList path (or via
   `/api/gene/{id}/alleles` for variant ids, paralleling
   `useTranscriptSelection.ts`).
4. Build the payload, POST, poll, fetch the alignment + seq-info.
5. Run `assertions` and emit a per-example pass/fail + diagnostic.
6. Final report: JUnit XML for CI consumption, plus optional JSON
   report for human review.

### Why a CLI runner (vs only Playwright)

- Runs in seconds, no browser cold-start.
- Catches API/pipeline regressions even when the WebUI is broken (as
  was the case multiple times during the v9 migration — submit form
  rendered but submitting did nothing).
- Easy to gate on PRs that touch the API or pipeline only.
- Provides a fixture-refresh workflow that doesn't need a browser
  running.

---

## 3. Playwright E2E + visual regression

Replaces the Cypress E2E suite (which is built around `cypress-image-diff`
and a Docker-only run path). Playwright gives faster cold start,
cross-browser per project, built-in screenshot diff, and better trace
viewer for debugging failures.

### Layout

```
webui/playwright/
  playwright.config.ts
  fixtures/
    catalog.ts              # imports tests/examples/catalog.json
  utils/
    submit-example.ts       # helper: load example, wait for resolution, submit
    wait-for-pipeline.ts    # helper: poll progress page until completed
  e2e/
    submit-form.spec.ts     # base submit form interactions
    examples.spec.ts        # one test() per example in the catalog
    result-page.spec.ts     # MSA renders, matrix shows, conservation toggle
    fullscreen-alignment.spec.ts
    ortholog-submit.spec.ts
  visual/
    submit-form.spec.ts     # screenshot diffs of key page states
    result-summary.spec.ts  # matrix, variant cards
    fullscreen.spec.ts
```

### Test outline — `examples.spec.ts`

```ts
import { test, expect } from '@playwright/test'
import { catalog } from '../fixtures/catalog'

for (const example of catalog.examples) {
  test(`example "${example.id}" runs to completion`, async ({ page }) => {
    await page.goto('/submit')
    await page.getByRole('button', { name: 'Load Example' }).click()
    await page.getByRole('button', { name: example.name }).click()

    // gene + transcript + (optionally) alleles resolve
    for (const gene of example.genes) {
      await expect(page.getByRole('textbox', { name: 'Gene' }))
        .toContainText(gene.geneId, { timeout: 15_000 })
    }
    await expect(page.getByRole('combobox', { name: 'Transcripts' })
      .filter({ hasText: /\w/ })).toHaveCount(example.genes.length, { timeout: 30_000 })

    await page.getByRole('button', { name: 'Submit Job' }).click()
    await page.waitForURL(/\/progress\?uuid=/, { timeout: 5_000 })
    await page.waitForURL(/\/result\?uuid=/, { timeout: 5 * 60_000 })

    // result page sanity
    await expect(page.getByText(/sequences? .{1,3} positions/)).toBeVisible()
    await expect(page.locator('[class*="pairwiseMatrix"]')).toBeVisible()
  })
}
```

### Visual regression

Per-screen snapshot diff using
`expect(page).toHaveScreenshot('submit-form.png', { maxDiffPixelRatio: 0.01 })`.

Tolerances:

- Component-level snapshots (not full-page) so anti-aliasing differences
  in unrelated areas don't fail the test.
- Mask dynamic regions (job UUID, timestamps) with
  `mask: [page.locator('.agr-job-uuid')]`.
- One baseline per browser × OS pair, committed under
  `webui/playwright/__snapshots__/`.

Docker-only CI run path mirrors the current Cypress approach (consistent
font rendering across host machines).

### Migration from Cypress

- Phase A: Playwright suite runs alongside Cypress; we port one spec at
  a time.
- Phase B: Cypress's `cypress-image-diff` baselines are translated into
  Playwright snapshot baselines (one-time `--update-snapshots` pass).
- Phase C: Cypress removed from `package.json`, `webui/cypress/`
  archived to a tag.

---

## CI integration

| Job | Triggers | Layer |
|---|---|---|
| `webui-unit` | every push | Jest (existing) |
| `pipeline-unit` | every push | pytest (existing) |
| `cli-examples-quick` | every push | `pavi-cli run --example tp53-orthologs` (one fastest example) |
| `cli-examples-full` | nightly + label `run-full-validation` | `pavi-cli run --all` |
| `playwright-e2e` | every push | `npm run test:e2e:playwright` (no visual) |
| `playwright-visual` | every push, blocking | `npm run test:e2e:playwright:visual` |
| `playwright-cross-browser` | nightly | chromium + firefox + webkit |

The cli-examples-quick + playwright-visual blocking pair is the minimum
viable safety net: an API/payload shape regression fails the CLI job; a
UI rendering regression fails the visual job; an Alliance API reshape
fails both within seconds of merging.

---

## Phasing

### Phase 1 — shared catalog + CLI quick run (~3 days)

- Extract example data → `tests/examples/catalog.json`.
- Generate TS export from JSON at build time so WebUI keeps compile-time
  types.
- Build `tests/cli/` minimum viable: one example, full API round-trip,
  tolerant assertions.
- Add `cli-examples-quick` CI job.

### Phase 2 — full CLI coverage + fixture-refresh (~3 days)

- Port v9 adapters to Python for the CLI's Alliance client.
- All 9 examples assertable.
- `refresh-fixtures` workflow with a recorded reference run.
- Add `cli-examples-full` nightly CI job.

### Phase 3 — Playwright bring-up (~5 days)

- Project scaffolding, Docker-ised run path, baseline snapshots.
- Port the highest-value Cypress specs (submit-workflow, health
  endpoints) to Playwright.
- New examples.spec.ts using the shared catalog.
- Add `playwright-e2e` CI job (non-visual first).

### Phase 4 — visual regression + Cypress retirement (~3 days)

- Generate visual baselines per browser × OS.
- Add `playwright-visual` blocking CI job.
- Remove Cypress from `package.json`, archive `webui/cypress/`.

---

## Open questions for review

1. **Alliance API mocking?** The CLI runner hitting live Alliance APIs
   makes CI flaky if Alliance is down. Should we record API responses
   into VCR cassettes (`vcrpy`) so the validation suite is deterministic,
   and have a separate `cli-examples-live` job that runs against the real
   API on a schedule? Recommended yes — CI stability outweighs the
   freshness loss for the regular pipeline.
2. **Reference data freshness.** Alliance refreshes occasionally change
   transcript coordinates. Should fixture refresh be automated on a
   schedule (PR opened for review) or manual?
3. **Where do CLI tests live?** Top-level `tests/cli/` (independent), or
   `pipeline_components/seq_retrieval/tests/integration/` (co-located
   with the layer they exercise)? Independent is cleaner.
4. **Playwright vs Cypress migration timeline.** Soft cutover (both
   alongside for a month) vs hard cutover (next release). Recommend
   soft — visual baselines need stabilising before we trust them as the
   sole gate.
