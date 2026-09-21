# Example dataset catalog

`catalog.json` is the single source of truth for the example datasets
that ship with PAVI's submit form. Three consumers share it:

| Consumer | Path | How it reads the catalog |
|---|---|---|
| WebUI submit form | `webui/src/app/submit/components/ExampleDataLoader/ExampleDataLoader.tsx` | Imports `tests/examples` (`index.ts` re-exports a typed `exampleCatalog`). |
| CLI test harness | `tests/cli/pavi_cli/` | `json.load(open('tests/examples/catalog.json'))`. |
| Playwright suite | `webui/playwright/fixtures/catalog.ts` | Same TS import as WebUI. |

Adding or editing an example = single edit to `catalog.json`. All three
consumers pick it up automatically.

## Schema

See `types.ts` for the typed schema. Each example carries:

- `id`, `name`, `category` (`basic` / `cross-species` / `advanced`),
  `description` — UI-facing metadata.
- `genes` — list of `{ geneId, geneName, species, alleleIds? }`. The
  pipeline payload is built from these.
- `expectations` — assertion thresholds for the CLI / Playwright
  runners. Tolerant by design (see `2026-06-08-example-validation-and-e2e-testing.md`).

## Phase 1 scope

Phase 1 ships:

- `catalog.json` (this file).
- `types.ts` + `index.ts` (TS export).
- Updated WebUI `ExampleDataLoader.tsx` consuming the catalog.
- `tests/cli/` CLI runner skeleton with `capture-payload`, `run`, and
  `run-all` commands.

Per-example payload fixtures (`fixtures/<id>/payload.json`) are not yet
captured — Phase 1 sets up the harness so the team can generate them
incrementally from known-good runs.
