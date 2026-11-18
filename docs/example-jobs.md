# Known-good example jobs

Canonical PAVI jobs that exercise the full biology stack. Useful for
smoke-testing changes to the alignment viewer, the Alliance resolver,
or the pipeline.

Each example lists:
- the live `/result?uuid=…` URL on dev-pavi (where the job lives on disk)
- the pipeline inputs so you can re-submit the same thing on any env
- what features the result demonstrates

## apl-1 ortholog alignment with coding variant

**UUID:** `27d94d8c-5670-46be-982d-0f50763f866e`
**Live:** https://dev-pavi.alliancegenome.org/result?uuid=27d94d8c-5670-46be-982d-0f50763f866e

**How to reproduce** (any PAVI env with `NEXT_PUBLIC_SHOW_EXPERIMENTAL=true`):

1. Open `/submit-ortholog`
2. Search `apl-1` → pick the C. elegans gene (WB:WBGene00000149)
3. On the source gene row, click **Variants** → pick the `yn32` allele
4. Click **Submit Alignment**

**Inputs the pipeline receives:**
- Focus: `WB:WBGene00000149` (apl-1, C. elegans)
- Orthologs: 16 across human, mouse, rat, zebrafish, Xenopus, fly, etc.
- `variant_ids`: `['NC_003284.9:g.5114224C>T']` on the apl-1 record only

**What this exercises:**

| Feature | What you see |
|---|---|
| Ortholog alignment with embedded variant | `apl-1_WB:C42D8.8a.1_alt` row with K at col 605 (the Glu377Lys sub) alongside `_ref` with E |
| Variant impact colouring (MODERATE missense) | Orange "1" pin on the Variants track |
| Impact hotspot overlay | Red peak centred on col 605 |
| SIFT chip (score 0.06, tolerated) | Green badge on the variant card |
| PolyPhen chip (score 0.98, probably_damaging) | Red badge on the variant card |
| Protein Domains panel — explicit gene_id path | apl-1 ref + alt rows → UniProt Q10651 · 32 domains |
| Protein Domains panel — within-alignment propagation | all three apl-1 variants share Q10651 without needing a second API call |
| Protein Domains panel — symbol-search fallback | 15 ortholog rows (Appl, APLP1, APLP2 families) resolve via Alliance search when their seq-info has no gene_id |
| Variant Information card | SUBSTITUTION, missense_variant, hgvs_protein `WB:CE04209:p.Glu377Lys` |

**Caveats worth knowing about this example:**
- Local-pipeline mode only (dev-pavi); the job directory lives at
  `/tmp/pavi-dev/results/27d94d8c-…/` on the EC2 box. Not reachable
  from the Step Functions / production API.
- The orthology set is Alliance's stringent-level output — may change
  if Alliance updates its ortholog calls, in which case re-submit via
  the UI to regenerate.
- The 15 ortholog domain rows rely on the symbol-search fallback,
  which is "best-effort ortholog hint" rather than citable annotation.
  See `docs/variant-impact-methodology.md` §6.
