# Alliance v9 API migration

**Status:** In progress on `nuin/main`. WebUI gene info, gene autocomplete,
allele detail, and the seq-retrieval variant fetcher are migrated. Transcript
fetch (JBrowse-driven) being verified.

**Trigger:** Alliance Genome released API v9 (`releaseInfo.releaseVersion = 9.0.0`,
2026-05-13). Several PAVI-consumed endpoints changed payload shape — and one
endpoint stopped working entirely. PAVI components that read the affected
fields crashed with `undefined is not an object`, rendered empty dropdowns, or
returned `400 Bad Request` from the pipeline.

This document is the field-by-field migration map, with the commit that ships
each adapter, so future regressions on the same endpoints (or a rollback) can
be diagnosed and patched quickly.

## Official Alliance v9.0.0 release notes excerpt

Source: <https://www.alliancegenome.org/release-notes>

> **Note that rs IDs for variants are no longer used to construct URLs for
> high-throughput variants matching the rs IDs**, because a single rs ID can
> represent multiple individual variants for which we would like to render a
> Variant page. Instead, **HGVS.g names are used as unique identifiers in URLs
> to point to distinct and individual variants** in a more robust manner.
>
> Modified endpoints are now compliant with our LinkML data model and deliver
> a different JSON format from previous releases:
>
> - `/api/allele/{id}/variants`
> - `/api/allele/{id}/variants/download`
> - `/api/gene/{id}`
> - `/api/gene/{id}/alleles`
> - `/api/gene/{id}/alleles/download`
> - `/api/gene/{id}/allele-variant-detail`
> - `/api/variant/{id}`
>
> Removed endpoints (PAVI does not consume any of these): all `/api/cache/*`,
> all `/api/homologs/*` (homology data via the Orthology download or
> `/api/gene/{id}/orthologs` + `/api/gene/{id}/paralogs`), and various
> disease / expression / phenotype / geneMap / variant-alleles /
> variant-transcripts paths.

The root cause for the payload-shape changes is the move to a
**LinkML-defined data model**. Every changed endpoint now returns a payload
generated from that schema, which is why the envelope pattern
(`category, searchable, ...nested object...`) and the consistent rename of
plain-string enums into `{name, descendantCount, severityOrder?}` objects
appear uniformly across endpoints.

The rs-ID change is the official justification for `/api/variant/{id}` only
accepting HGVS.g now. A single rs ID can represent multiple distinct
variants (different ALT alleles at the same position), so the rs ID is no
longer a unique key. HGVS.g (`NC_xxx.v:g.POS[REF]>[ALT]`) is. This makes
HGVS the canonical cross-MOD variant identifier for PAVI as well.

---

## Common pattern across the reshape

1. **Envelope-on-the-outside.** Most endpoints now wrap the real payload in
   `{ category: '<resource>_summary', searchable: false, ...nested... }`.
   Fields the WebUI was reading at the top level moved under
   `.gene`, `.allele`, `.variant`, or
   `.geneToGeneOrthologyGenerated`.
2. **Strings → `{name, descendantCount, severityOrder?}` objects.**
   Plain string enums (impact, VEP consequence, SIFT/PolyPhen prediction)
   became objects. Adapters need to flatten `.name` when handing them to
   anything that renders or compares them.
3. **`id` → `curie` or `primaryExternalId`** depending on data provenance.
   Community-curated entities (variant rs IDs) get `curie`. MOD-curated
   entities (`MGI:*`, `FB:*`, `ZFIN:*`) get `primaryExternalId`. Adapters
   need both with a fallback chain.
4. **Multi-valued associations → arrays.** `geneIds`,
   `geneGenomicLocationAssociations`, `predictedVariantConsequences`, etc.
   Earlier single-value fields are gone; pick the first when single-value
   semantics are needed.

---

## 1. `/api/gene/{id}` — nested under `.gene`

| Before | After |
|---|---|
| `id` | `gene.primaryExternalId` |
| `symbol` | `gene.geneSymbol.displayText` |
| `species.shortName` | `gene.taxon.species.abbreviation` |
| `species.name` | `gene.taxon.name` |
| `species.taxonId` | `gene.taxon.curie` |
| `genomeLocations[].chromosome` | `gene.geneGenomicLocationAssociations[].geneGenomicLocationAssociationObject.name` |
| `genomeLocations[].{start,end,strand}` | `gene.geneGenomicLocationAssociations[].{start,end,strand}` |

**Symptom before fix:**
`TypeError: undefined is not an object (evaluating 'idMatch.species.shortName')`
in `useGeneSearch.ts`. Submit form rendered no displayName on selected gene
and transcript dropdowns were empty because downstream code read
`species.shortName` / `species.taxonId` / `genomeLocations[].chromosome`.

**Fix:** `adaptGeneResponse()` in
`webui/src/app/submit/components/AlignmentEntry/serverActions.ts`. Falls
through to the legacy shape if `body.id && body.symbol && body.species`
already exist (rollback-safe).

**Commit:** `e96df9d3`.

---

## 2. `/api/gene/{id}/orthologs` — same envelope pattern

`results[].geneToGeneOrthologyGenerated.{subjectGene, objectGene}` with:

- `primaryExternalId`
- `geneSymbol.displayText`
- `taxon.name`, `taxon.curie`
- `predictionMethodsMatched`
- `isBestScore.name`

**Symptom before fix:** Ortholog list empty on `/submit-ortholog`.

**Fix:** The submit-ortholog server action (`webui/src/app/submit-ortholog/serverActions.ts`)
was rewritten to consume the nested shape directly during the ortholog page
improvements work earlier in this branch.

---

## 3. `/api/gene/{id}/allele-variant-detail` — major reshape

Two row types coexist depending on `filter.alleleCategory`:

- `filter.alleleCategory='allele with one variant'` → named MOD alleles. The
  identifier is `allele.primaryExternalId` (e.g. `MGI:6157439`) and the symbol
  is `allele.alleleSymbol.{displayText, formatText}` (often carrying
  `<sup>...</sup>` markup).
- `filter.alleleCategory='variant'` → community variants. The identifier is
  `allele.curie` (e.g. `rs146579778`) and the symbol is at top-level
  `result.symbol` (HGVS).

| Before | After |
|---|---|
| `result.allele.id` | `result.allele.primaryExternalId` **or** `result.allele.curie` |
| `result.allele.symbol` | `result.allele.alleleSymbol.{displayText, formatText}` **or** `result.symbol` |
| `result.allele.hasDisease` / `hasPhenotype` | `result.hasDisease` / `hasPhenotype` (top-level) |
| `result.variant.id` | no direct id field — use HGVS from `variant.curatedVariantGenomicLocations[0].hgvs` |
| `result.variant.displayName` | `result.symbol` or HGVS |
| `result.consequence.transcript.id` | `result.consequence.variantTranscript.curie` |
| `result.consequence.transcript.name` | `result.consequence.variantTranscript.name` |
| `result.consequence.molecularConsequences` (string[]) | `result.consequence.vepConsequences` (`{name,descendantCount,severityOrder}[]`) |
| `result.consequence.impact` (string) | `result.consequence.vepImpact` (`{name}`) |
| `result.consequence.siftPrediction` (string) | sometimes `{name}` object |
| `result.consequence.polyphenPrediction` (string) | sometimes `{name}` object |

**Critical downstream constraint:** The variant identifier flows into the
pipeline's `variant_ids` payload field and is then passed to
`/api/variant/{id}` (see §4). That endpoint only accepts HGVS now, so the
WebUI must put HGVS in `variant_ids` regardless of which row-type produced
the allele. HGVS is genome-coordinate notation and is therefore a natural
cross-MOD identifier.

**Symptoms before fix:**
- Allele dropdown showed empty checkboxes with no labels.
- "1 available" but zero rendered selectable rows for MOD-curated alleles.
- Opening the Molecular consequence / Impact / SIFT / PolyPhen filter
  MultiSelects crashed with `Objects are not valid as a React child
  (found: object with keys {name})`.
- Example datasets with pre-selected MGI allele IDs failed to mark
  anything as selected after example load.
- Submitted jobs failed in seq-retrieval with
  `400 Bad Request for url: https://www.alliancegenome.org/api/variant/MGI:*`.

**Fix:** Multiple commits to `fetchAlleles` in
`webui/src/app/submit/components/AlignmentEntry/serverActions.ts`:

- `9e960a2e` — initial mapping of allele/variant/consequence fields, HGVS
  as fallback variant display name.
- `87c679d5` — recognize `primaryExternalId` and `alleleSymbol.{displayText,
  formatText}` for named alleles.
- `3cd8be7b` — use HGVS as `variant_ids` payload so the pipeline's
  `/api/variant/{id}` call succeeds across all MODs.
- `9cfc7e6f` — flatten `vepConsequences[]` and `vepImpact` to plain strings.
- `5d98e024` — flatten `siftPrediction` and `polyphenPrediction` to plain
  strings.

---

## 4. `/api/variant/{id}` — ID format AND shape

**ID rule changed.** Only HGVS strings (`NC_xxx:g.NNN[ref]>[alt]`) are now
accepted. `MGI:*`, `rs*`, `FB:*`, `ZFIN:*`, `RGD:*` all return `400 Bad
Request`. HGVS works for every organism because it's a genome-coordinate
identifier, not a MOD-namespaced one.

| Before | After |
|---|---|
| `location.chromosome` | `variantList[0].curatedVariantGenomicLocations[0].variantGenomicLocationAssociationObject.name` |
| `location.start` / `location.end` | `variantList[0].curatedVariantGenomicLocations[0].start` / `.end` |
| `genomicReferenceSequence` | `variantList[0].curatedVariantGenomicLocations[0].referenceSequence` |
| `genomicVariantSequence` | `variantList[0].curatedVariantGenomicLocations[0].variantSequence` |
| `transcriptLevelConsequence[]` | `variantList[0].curatedVariantGenomicLocations[0].predictedVariantConsequences[]` |
| `transcriptLevelConsequence[0].hgvsCodingNomenclature` | `…[].mostSevereConsequence.hgvsCodingNomenclature` (or first predicted consequence) |
| `transcriptLevelConsequence[0].hgvsProteinNomenclature` | `…[].mostSevereConsequence.hgvsProteinNomenclature` |
| `transcriptLevelConsequence[0].impact` | `…[].mostSevereConsequence.vepImpact.name` |
| `gene.id` | top-level `geneIds[0]` |

**Symptom before fix:**
`KeyError: 'location'` at
`pipeline_components/seq_retrieval/src/variant/variant.py:296`, then Clustal
Omega fails with `nothing to align` because seq-retrieval dropped every
variant.

**Fix:** Updated `Variant.from_variant_id()` to detect legacy vs new shape
via the presence of the top-level `location` key, then walk
`variantList[0].curatedVariantGenomicLocations[0]` for everything else.
Uses `mostSevereConsequence` as the canonical pick for HGVS/impact (better
signal than "first transcript" because transcript order is arbitrary).

**Commits:** `3cd8be7b` (WebUI passes HGVS as variant id), `3ebcb398`
(pipeline-side variant payload adapter).

---

## 5. `/api/search_autocomplete` — replaced

Old endpoint returns `{}` (zero-byte object) for every query in v9. The
working replacement is `/api/search` with `category=gene_search_result`.

| Before | After |
|---|---|
| URL `…/api/search_autocomplete/?category=gene&q=...` | `…/api/search?category=gene_search_result&q=...&limit=N` |
| `result.primaryKey` | `result.curie` (or `result.id`) |
| `result.name_key` | `result.nameKey` |
| Category string `gene` | `gene_search_result` |

Available categories in `/api/search` aggregations:
`variant_search_result`, `model`, `go_search_result`, `allele_search_result`,
`disease_search_result`, `htp_dataset_search_result`, `gene_search_result`.

**Symptom before fix:** Gene autocomplete dropdown empty for every query;
"Failed to find gene" on every submit.

**Fix:** `fetchGeneSuggestionsAutocomplete` in
`webui/src/app/submit/components/AlignmentEntry/serverActions.ts`. Keeps
the legacy field names as additional fallbacks for forward-compatibility.

**Commit:** `851a9774`.

---

## Endpoints verified unchanged

- `/api/releaseInfo` — same `{releaseVersion, releaseDate}` shape.
- `/api/allele/{id}` — still accepts MOD CURIEs (MGI:*, ZFIN:*, FB:*, RGD:*).
- `/api/allele/{id}/variants` — still accepts MOD CURIEs; useful path if PAVI
  ever needs to resolve a MOD allele to its constituent variants
  out-of-band.

---

## Rollback safety

Every adapter detects the new shape and uses the legacy field name as a
fallback. If Alliance ever rolls back to v8 semantics, the WebUI and pipeline
keep working without code changes. The detection key per adapter:

- gene info: `body.id && body.symbol && body.species` → legacy.
- variant info (pipeline): `'location' in variant_data` → legacy.
- allele-variant-detail: every field uses `?? legacyPath`.
- gene autocomplete: legacy field names listed in the `??` fallback chain.

---

## Commit log on `nuin/main`

| Commit | What |
|---|---|
| `e96df9d3` | Adapt `fetchGeneInfo` to nested `.gene` shape |
| `9e960a2e` | Adapt `fetchAlleles` to new allele-variant-detail shape |
| `87c679d5` | Recognize named alleles' `primaryExternalId` and `alleleSymbol` |
| `3cd8be7b` | Use HGVS as variant id for cross-MOD pipeline retrieval |
| `3ebcb398` | Adapt `Variant.from_variant_id` to new variant payload shape |
| `9cfc7e6f` | Flatten `vepConsequences` and `vepImpact` to plain strings |
| `5d98e024` | Flatten `siftPrediction` and `polyphenPrediction` to plain strings |
| `851a9774` | Switch gene autocomplete to `/api/search?category=gene_search_result` |

## Outstanding migration follow-ups

- Verify the transcript-fetch path (JBrowse-backed) still works once the
  gene info adapter populates `species.taxonId` and the
  `genomeLocations[].chromosome` chain end-to-end.
- The Alliance v9 per-row consequence response no longer carries SIFT or
  PolyPhen scores for `allele-variant-detail` rows (they survive only as
  top-level filter dropdown values via `supplementalData.distinctFieldValues`).
  PAVI's SIFT/PolyPhen filters in the allele filter panel will be empty
  until/unless Alliance restores them per-row.
- Step Functions execution mode and any production deployment still need
  the v9 adapters applied — confirm before re-enabling.
