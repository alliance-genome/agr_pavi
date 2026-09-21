# SAB Mockup Features — Design Document

**Date**: 2026-03-05
**Origin**: Alliance SAB Meeting mockup presentation (Feb 2022, Jennifer Smith)
**Approach**: Full-stack vertical slices — each feature implemented end-to-end (pipeline → API → WebUI) before moving to the next.

## Scope

Six features, in priority order:

1. Variant sequence display (mutant protein rows in alignment)
2. Protein domains track (InterPro/UniProt annotations)
3. Disease/phenotype tables (comparison matrix + phenotype display)
4. Guide tree capture + display (Clustal Omega guide tree as dendrogram)
5. Color scheme legend (visual key for alignment coloring)
6. UX improvements (allele loading, synonymous filtering, sequence limits, export formats)

## Current State Summary

| Capability | Status |
|---|---|
| MSA viewer with Clustal coloring | Implemented (Nightingale) |
| Conservation track/coloring | Implemented (linegraph + MSA overlay) |
| Variant position highlighting | Implemented (amber overlays + shape-coded track) |
| Mutant protein rows | Gap — alt sequences produced by pipeline but not identified in UI |
| Protein domains | Gap — no InterPro/UniProt integration |
| Disease/phenotype annotations | Gap — no infrastructure |
| Guide tree | Gap — computed by clustalo but discarded |
| PositionInfoPanel | Built but orphaned (never wired into any viewer) |
| AlignmentSearch | Built but orphaned |
| VisualizationToolbar | Built but orphaned |

---

## Feature 1: Variant Sequence Display

### Background

The seq_retrieval pipeline already produces alternative protein sequences as separate FASTA entries (e.g., `>TP53_NM_011640.3_alt1`). These go into the Clustal Omega alignment and appear as rows in the output. The `aligned_seq_info.json` contains `embedded_variants` with alignment positions. The WebUI does not currently distinguish alt sequence rows from reference rows.

### Pipeline Changes (seq_retrieval)

Add fields to the `SeqInfo` entries in `aligned_seq_info.json` for alt sequence entries:

- `is_alt_sequence: bool` — flag to identify alt rows
- `parent_sequence_name: string` — links alt row back to its reference sequence
- `variant_summary: string` — human-readable summary (e.g., "p.Leu278Ser")

These fields are added in `seq_retrieval.py` when constructing `alt_info` objects.

### WebUI Changes (VirtualizedAlignment)

- Parse alt sequence rows using the `is_alt_sequence` flag from seq info
- Group alt rows visually below their parent reference row
- Render alt rows with distinct styling:
  - Indented row label
  - Colored left border (red/salmon, consistent with mockup `mv1`/`mv2` styling)
  - Variant position highlighted in the sequence
- Wire up the existing orphaned `PositionInfoPanel` component:
  - Show on click/hover of a variant position
  - Display: variant ID, HGVS notation, ref→alt change, genomic coordinates, substitution type

### Data Flow

```
Pipeline: ref FASTA + alt FASTA → Clustal Omega → alignment.aln + aligned_seq_info.json
                                                    (with is_alt_sequence, parent_sequence_name)
WebUI: Parse alignment → identify alt rows via seq info → render grouped with distinct styling
```

---

## Feature 2: Protein Domains Track

### Data Source

InterPro REST API: `https://www.ebi.ac.uk/interpro/api/entry/interpro/protein/UniProt/{accession}`

Provides rich domain data including Pfam, PROSITE, CDD, grouped by type (Domain, Family, Homologous Superfamily). Fallback to UniProt Features API if InterPro is unavailable.

### Pipeline Changes (seq_retrieval)

- After sequence retrieval, map each protein to its UniProt accession:
  - Via NCBI RefSeq → UniProt mapping (UniProt ID mapping API)
  - Or from Alliance API gene data which includes cross-references
- Fetch InterPro domain annotations per protein
- Map domain coordinates from original protein positions to alignment positions (reuse the same position mapping used for variants in `_add_alignment_positions`)
- Store in `aligned_seq_info.json` as a new `domains` field per sequence:

```json
{
  "domains": [
    {
      "accession": "IPR009057",
      "name": "Homeobox Domain",
      "source": "Pfam:PF00046",
      "type": "domain",
      "start": 98,
      "end": 152,
      "alignment_start": 120,
      "alignment_end": 178
    }
  ]
}
```

### WebUI Changes

- New `DomainTrack` component using `nightingale-track` with rectangle shape features
- Render one track per unique domain, colored consistently across species (same domain = same color)
- Domain legend below the alignment with colored boxes and labels (matching mockup style: "Homeobox Domain", "Fictitious 1 Domain")
- Toggle visibility via the existing "Show" overlay checkbox panel (add "Protein Domains" checkbox)
- Domains rendered as semi-transparent colored bands spanning the alignment columns

---

## Feature 3: Disease/Phenotype Tables

### Data Source

Alliance of Genome Resources API — fetched during pipeline processing and included in result JSON.

### Pipeline Changes

For each variant ID in the job, fetch enriched annotations from the Alliance API:

- Variant details: HGVS notation, molecular consequence, type
- Disease annotations from associated alleles
- Phenotype annotations from associated alleles

Store as enriched variant data in `aligned_seq_info.json`:

```json
{
  "embedded_variants": [{
    "variant_id": "...",
    "hgvs_notation": "NP_000316.2:p.Leu278Ser",
    "molecular_consequence": "missense_variant",
    "diseases": [
      {
        "do_id": "DOID:0110048",
        "name": "Axenfeld-Rieger syndrome",
        "source": "ClinVar via RGD",
        "evidence_code": "IAGP",
        "references": ["PMID:12624268"]
      }
    ],
    "phenotypes": [
      {
        "term": "abnormal eye pressure",
        "source": "MGI",
        "evidence_code": "TAS",
        "allele_symbol": "Pitx2<tm1Abc>",
        "references": ["PMID:18424556"]
      }
    ]
  }]
}
```

### WebUI — Disease Comparison Matrix

New `DiseaseComparisonMatrix` component:

- Rows = Disease Ontology terms
- Columns = variants grouped by species
- Cells colored when association exists:
  - Blue = direct annotation
  - Orange = inferred from multi-variant allele (as in mockup)
- Expandable rows for disease hierarchy (e.g., "Axenfeld-Rieger syndrome" → subtypes)
- Toggle: "Include annotations from multi-variant alleles"
- Accessible from a "Show Disease/Phenotype Comparison" button on the result page

### WebUI — Phenotype Display Table

New `PhenotypeTable` component:

- Columns: Variant, Species, Associated Allele, Phenotype, Evidence, Source, References
- Filterable by variant and species
- Sortable columns
- Reference links to PubMed (PMID external links)

### Placement

New tabs or expandable sections below the alignment viewer on the result page.

---

## Feature 4: Guide Tree Capture + Display

### Pipeline Changes

Add `--guidetree-out=guidetree.nwk` to all clustalo invocations:

- `pipeline_components/alignment/scripts/alignment_wrapper.sh` (production/Step Functions)
- `api/src/local_pipeline.py` (local EC2 path)
- `pipeline_components/alignment/protein-msa.nf` (legacy Nextflow)

Copy `guidetree.nwk` alongside `alignment-output.aln` in results output.

### API Changes

New endpoint: `GET /api/pipeline-job/{uuid}/result/tree`

Returns the Newick-format guide tree file.

### WebUI Changes

- Fetch tree from the new endpoint alongside alignment and seq-info results
- New `PhylogeneticTree` component:
  - Parse Newick format (lightweight parser, e.g., `newick-js` npm package or custom — format is simple)
  - Render as horizontal SVG dendrogram/cladogram
  - Position to the left of the alignment (like PANTHER) or as a collapsible side panel
  - Species labels match the MSA row labels
  - Sequence order in the alignment should match tree leaf order for visual consistency

### Scope Limits

- Display only — no tree editing or rerooting
- No bootstrap values (Clustal Omega guide trees don't produce them)
- Optional toggle ("Show Tree" checkbox in the overlay panel)

---

## Orphaned Components to Wire Up

During implementation, the following existing but disconnected components should be integrated:

| Component | Current State | Integration Target |
|---|---|---|
| `PositionInfoPanel` | Built, never imported | Wire into VirtualizedAlignment for variant click/hover |
| `AlignmentSearch` | Built, never imported | Add to toolbar for sequence/position search |
| `VisualizationToolbar` | Built, never imported | Evaluate replacing current ad-hoc toolbar controls |

---

## Feature 5: Color Scheme Legend

### Background

Users have requested an explanation of what the alignment colors mean. The viewer supports 16+ color schemes (Clustal2, Hydrophobicity, Taylor, Zappo, etc.) but there is no visual legend explaining the mapping.

### WebUI Changes

- New `ColorSchemeLegend` component:
  - Displays a color key for the currently active color scheme
  - Shows amino acid → color mappings as colored swatches with residue labels
  - For property-based schemes (Hydrophobicity, Charged, Polar), group by property category
  - Collapsible/expandable panel below the color scheme dropdown
  - Updates dynamically when the user switches color schemes
- Position: adjacent to or below the existing color scheme dropdown in the toolbar

### No Pipeline/API Changes Required

Color scheme definitions are entirely client-side (in the Nightingale MSA component and/or local config).

---

## Feature 6: UX Improvements (Meeting Feedback)

### Source

Alliance all-hands meeting (March 2026) — feedback from participants during PAVI demo.

### 6a. Allele Dropdown Loading Indicator

**Problem**: Large genes (e.g., TP53) have thousands of alleles. The dropdown lazy-loads on open, but shows only a generic spinner with no feedback about progress or count.

**Current state**: PrimeReact MultiSelect `loading` prop shows a spinner icon. No text label, no count.

**Changes**:

- Add a loading label below the allele MultiSelect: "Loading alleles for {gene}..."
- After load completes, show count badge: "{n} alleles available" or "{n} alleles with variants"
- If count exceeds threshold (e.g., >500), show a hint: "Use the filter to search by allele name or variant ID"
- Consider paginated/virtual scrolling for the dropdown panel when >200 alleles

### 6b. Synonymous Variant Filtering

**Problem**: Many alleles contain only synonymous variants (no amino acid change), which are uninteresting for protein alignment comparison.

**Changes**:

- Add a toggle above the allele dropdown (or as a filter option inside it): "Hide synonymous variants" (on by default)
- Filter the allele list to exclude alleles whose only variants are synonymous
- When toggled off, show all alleles with synonymous ones visually dimmed
- Requires `molecular_consequence` data from the Alliance API (already planned in Feature 3 pipeline work)

### 6c. Sequence Limit Warning

**Problem**: Clustal Omega runs out of memory above ~100-150 sequences. Users get a cryptic failure.

**Changes**:

- Add a sequence counter on the submit page showing "N sequences will be aligned"
- Warn at soft limit (e.g., >80 sequences): "Large alignments may take longer"
- Block at hard limit (e.g., >150): "Too many sequences for alignment. Reduce the number of transcripts or alleles."
- Count includes: transcripts × species + alt sequences from alleles

### 6d. Additional Export Formats

**Problem**: Only Clustal W interleaved format is available for download.

**Changes**:

- Add format options to the existing export/download button:
  - Clustal W interleaved (current)
  - FASTA (aligned)
  - JSON (alignment + seq info combined)
- Conversion is client-side (alignment data is already loaded)
- No pipeline/API changes needed

---

## Implementation Order

1. **Variant sequence display** — Lowest risk, alt sequences already in alignment output. Pipeline: add metadata fields. WebUI: styling + PositionInfoPanel wiring.
2. **Color scheme legend** — WebUI-only, no pipeline changes. Quick win for user experience.
3. **Guide tree** — Small scope, well-defined. Pipeline: one flag addition. API: one new endpoint. WebUI: SVG tree component.
4. **Protein domains** — Medium scope. Pipeline: InterPro API integration + position mapping. WebUI: Nightingale track + legend.
5. **Disease/phenotype** — Largest scope. Pipeline: Alliance API integration. WebUI: two new table components.
6. **UX improvements** — Can be sprinkled in alongside other features:
   - 6a (allele loading) — do with Feature 1 or standalone quick win
   - 6b (synonymous filtering) — requires molecular_consequence from Feature 5 pipeline
   - 6c (sequence limit) — standalone, submit page only
   - 6d (export formats) — standalone, result page only

---

## Out of Scope (Future Work)

- Variant filtering by type/consequence/position/domain (from mockup slide 13)
- Isoform selection at result-display time (currently submit-time only)
- Logarithmic variant density bar graph (InterPro/JBrowse style, mockup slides 22-23)
- Per-ortholog "show variants" / "show protein" toggles at result time
- Exon boundary markers (data flows through pipeline but not visualized — partially related to Feature 1)
- Visual transcript selection widget (Chris Grove suggestion — embed sequence feature viewer for transcript picking)
- Transcript-scoped allele filtering (Chris Grove — limit allele dropdown to selected transcript only)
- Variant consequences table for allele selection (Chris Grove — show consequence types before selecting)
