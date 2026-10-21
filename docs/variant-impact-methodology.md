# Variant Impact Methodology

Documents the biological scores and derived metrics shown on the PAVI
alignment viewer, with sources and known caveats. Written for the people
maintaining PAVI and for scientists reading PAVI output who want to know
what the colors and numbers actually mean.

Last reviewed 2026-10-21.

## 1. Source of all predictions

Every per-variant score and label on PAVI comes from
**Alliance of Genome Resources** at
`https://www.alliancegenome.org/api/variant/{curie}`. Alliance
re-exposes [Ensembl VEP](https://ensembl.org/info/docs/tools/vep/)
output curated by each model-organism database (WormBase, FlyBase, MGI,
RGD, ZFIN, SGD) plus the human alliance submission. PAVI itself does
not run VEP; it reads the pre-computed scores.

The response path we read is:

```
variantList[0].curatedVariantGenomicLocations[0].mostSevereConsequence
    .vepImpact.name           → "HIGH" | "MODERATE" | "LOW" | "MODIFIER"
    .siftScore                 → 0..1 (lower = more deleterious)
    .siftPrediction.name       → "deleterious" | "tolerated" | ...
    .polyphenScore             → 0..1 (higher = more damaging)
    .polyphenPrediction.name   → "probably_damaging" | "possibly_damaging"
                                 | "benign" | "unknown"
    .vepConsequences[0].name   → "missense_variant", "stop_gained", ...
```

See `webui/src/app/result/components/InteractiveAlignment/serverActions.ts`
(`fetchVariantPrediction`).

## 2. SIFT (Sorting Intolerant From Tolerant)

**What it measures.** Likelihood that a protein substitution affects
function, based on sequence conservation of the position across
homologous proteins. SIFT runs PSI-BLAST against a reference database to
build a PSSM, then scores the probability of each possible residue.

**Score interpretation (standard VEP/Ensembl thresholds):**

| SIFT score | Prediction |
|---|---|
| ≤ 0.05 | deleterious |
| > 0.05 | tolerated |

Low confidence predictions ("low_confidence_deleterious" / "low_confidence_tolerated")
are returned by Ensembl when the alignment behind SIFT is sparse — PAVI
treats them identically to the high-confidence versions for colour but
preserves the label text.

**PAVI colour mapping** (`VirtualizedAlignment.tsx` prediction badges):
- SIFT < 0.05 → red tint (`#dc262633`), `#fca5a5` text
- SIFT ≥ 0.05 → green tint (`#16a34a33`), `#86efac` text
- missing score → slate tint

**References.** Sim et al. (2012) *SIFT web server*, Nucl Acids Res
40:W452. VEP documentation:
https://ensembl.org/info/genome/variation/prediction/protein_function.html#sift

**Known caveats.**
- Non-mammalian pipelines (worm, fly, yeast) may not populate SIFT at
  all — the badge is hidden rather than shown as unknown.
- SIFT ignores physicochemical similarity; a conservative substitution
  (K→R) can still score low if the position is conserved.

## 3. PolyPhen-2

**What it measures.** Impact of a missense substitution on structure
and function via sequence + structure features (SIFT-style conservation
plus 3D/chemical properties) run through a naïve Bayes classifier.

**Score interpretation (VEP thresholds):**

| PolyPhen score | Prediction |
|---|---|
| ≤ 0.446 | benign |
| 0.446 < s ≤ 0.908 | possibly_damaging |
| > 0.908 | probably_damaging |

Also returns "unknown" when inputs are insufficient.

**PAVI colour mapping:**
- > 0.908 → red tint
- 0.446 – 0.908 → orange tint
- ≤ 0.446 → green tint
- missing / unknown → slate tint

**References.** Adzhubei et al. (2010) *A method and server for
predicting damaging missense mutations*, Nat Methods 7:248. Ensembl
docs as above.

**Caveats.**
- PolyPhen-2 is parameterised on human data. Scores for non-human
  variants exist but reflect human-structure extrapolation.
- "Possibly_damaging" (0.446–0.908) is a wide band; the numeric score
  is more informative than the label alone — PAVI shows both.

## 4. VEP impact bucket (HIGH / MODERATE / LOW / MODIFIER)

Ensembl's rolled-up severity bucket for the most severe consequence of
a variant across its transcripts. Documented at
https://ensembl.org/info/genome/variation/prediction/predicted_data.html#consequences

| Bucket | Example consequences |
|---|---|
| HIGH | stop_gained, frameshift_variant, splice_acceptor_variant |
| MODERATE | missense_variant, inframe_insertion/deletion |
| LOW | synonymous_variant, splice_region_variant |
| MODIFIER | intron_variant, 5_prime_UTR_variant, intergenic_variant |

**PAVI colour mapping** (`variantImpact.ts`):

| Bucket | Hex | Hotspot weight |
|---|---|---|
| HIGH | `#dc2626` red | 4 |
| MODERATE | `#ea580c` orange | 2 |
| LOW | `#ca8a04` amber | 1 |
| MODIFIER | `#64748b` slate | 0.25 |
| unknown | `#6b7280` gray | 1 |

## 5. Variant Impact Hotspot track

**Not a standard published method.** This is PAVI-specific derived
signal — a quick comparative-genomics summary of where impact
concentrates along the alignment. It is NOT a replacement for
dedicated hotspot callers like OncodriveFML (Mularoni et al. 2016,
Genome Biol 17:128) or HotMAPS (Tokheim et al. 2016, Cancer Res 76:3719)
which are built on tumour-mutation statistics and 3D structure.

**Formula** (`VirtualizedAlignment.tsx`, computed in `hotspotPeaks` useMemo):

For each alignment column *c*:

```
hotspot[c] = Σᵥ weight(vᵢ) · fall(|cᵢ − c|)   for cᵢ ∈ [c−W, c+W]
```

where
- *vᵢ* = each variant with alignment position *cᵢ*
- *W* = 2 residues (half-window)
- `weight(v)` = per-impact numeric weight from `impactWeight()` above
- `fall(d)` = `1 − 0.8·(|d|/W)` → full weight at centre, 20% at edge

Rendered as a left-to-right gradient bar where column intensity is
`hotspot[c] / max(hotspot)` — relative to the strongest peak on the
current alignment, not an absolute cross-dataset scale.

**Why these parameters.**
- Half-window = 2 chosen so a single HIGH variant lights up a 5-residue
  peak (±2 of its position), roughly the width of one secondary
  structure turn. Prevents visual flooding on short alignments.
- Weight ratios 4 : 2 : 1 : 0.25 reflect the rough log-odds of
  functional effect between VEP buckets (HIGH ~ truncation = ~4× the
  prior for a missense; MODIFIER mostly regulatory = ¼ of a missense).
- Linear falloff was chosen over Gaussian for simplicity and to avoid
  implying statistical rigour. Peaks are a visual summary, not a p-value.

**Known limits.**
- Normalisation is per-alignment, so cross-alignment peak heights are
  not comparable.
- A single HIGH variant will always peg the maximum; the bar is more
  useful when ≥ 3-5 variants are present.
- No background-rate correction. A region with high variant density
  may just be well-studied, not biologically hot.
- No consideration of 3D proximity — two variants ten residues apart
  in sequence may be adjacent in the folded protein.

## 6. Protein Domain lookup (InterPro via UniProt)

**Primary path.** When a sequence's seq-info carries a
`gene_id` (Alliance curie), PAVI resolves it to a canonical UniProt
accession via Alliance's `/api/gene/{id}` endpoint
(`gcrpCrossReference` → first SwissProt-shaped xref → first UniProtKB
xref). The UniProt accession is then queried against EBI InterPro at
`/api/entry/all/protein/uniprot/{acc}` to list domain-type matches with
residue ranges. See `domains.ts` (`resolveUniProtForGene`,
`fetchProteinDomains`).

**Fallback paths** (both introduced because PAVI's pipeline only
populates `gene_id` for sequences with embedded variants):

1. **Within-alignment propagation.** Sequences whose name shares the
   first underscore token (gene symbol in PAVI naming convention) with
   a sequence that DID resolve a `gene_id` share that gene_id. Covers
   "ref + variant allele of the same gene". Zero added API calls, zero
   ambiguity.

2. **Symbol search.** For sequences still without a `gene_id`, parse
   the symbol from the first underscore token of the name and search
   Alliance via `/api/search?category=gene_search_result`. Pick the
   first exact-symbol match across all species.

**Validation caveat for the symbol search.** Gene symbols are NOT unique
across species. `Appl` matches the Drosophila APP-like gene and also
the mouse APPL1/APPL2 adapter family. PAVI's fallback currently takes
the first result — this can be the wrong ortholog, in which case the
domain layout shown is for a different (though often related) protein.
Reasonable for a visual comparison, scientifically wrong for citation.

**Recommended user interpretation.** Treat domain tracks that come
from the symbol-search fallback as "best-effort ortholog hint", not as
authoritative annotation. A future PAVI release should attach species
or taxon to each sequence so the symbol search can filter unambiguously.

## 7. Where to find the code

| Concern | File |
|---|---|
| Impact colour / weight / label | `webui/src/app/result/components/InteractiveAlignment/variantImpact.ts` |
| Hotspot aggregation | `VirtualizedAlignment.tsx` → `hotspotPeaks` useMemo |
| Hotspot gradient render | `VirtualizedAlignment.tsx` → `Impact Hotspots` track block |
| SIFT / PolyPhen chip layout | `VirtualizedAlignment.tsx` → `variantPredictions` block + `.predictionBadge` CSS |
| Alliance variant fetch | `webui/src/app/result/components/InteractiveAlignment/serverActions.ts` → `fetchVariantPrediction` |
| Domain resolver (incl. fallbacks) | `webui/src/app/result/components/InteractiveAlignment/domains.ts` + `ProteinDomainsPanel.tsx` |

## 8. Tests

- `webui/src/app/result/components/InteractiveAlignment/__tests__/variantImpact.test.ts`
  validates the hotspot calc against TP53 R175H / R248Q / R273H
  (classic hotspots in the DNA-binding domain) — a dense cluster of
  three HIGH / MODERATE missense variants should produce a single
  continuous peak spanning positions ~175 – 282 at full normalised
  intensity (1.0) at the three variant columns.
