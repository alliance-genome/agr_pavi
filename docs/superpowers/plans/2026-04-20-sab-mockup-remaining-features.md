# SAB Mockup Remaining Features — Implementation Plan

**Project**: AGR PAVI (Proteins Annotations and Variants Inspector)
**Origin**: Alliance SAB Meeting mockup (February 2022, Jennifer Smith)
**Status**: 13 features remaining out of ~22 total SAB mockup features

---

## Already Implemented

- Auto-center alignment on first variant
- Variant type filter (seq_substitution_type)
- Molecular consequence filter (missense_variant, frameshift_variant, etc.)
- HGVS protein notation in variant cards
- Consequence badges in variant cards
- Disease/phenotype boolean badges (via server action proxying Alliance API)
- Protein accession display in transcript dropdown
- Non-coding variant cards (UTR/intronic shown with dashed border)
- Gene ID extraction from Alliance API
- Conservation linegraph overlay
- Variant location track with numbered circles

---

## Remaining Features

### Group A: Protein Domains & Exon Boundaries

#### Feature 1: Protein Domains Overlay

**Priority**: P1 | **Effort**: L | **Dependencies**: None (enabler for Feature 6)

**Data Source**: InterPro REST API (`https://www.ebi.ac.uk/interpro/api/entry/interpro/protein/UniProt/{accession}`). Requires RefSeq-to-UniProt ID mapping via UniProt ID mapping service. Protein accession already flows through the submit form.

**Approach**: Fetch InterPro domain annotations per protein accession during seq_retrieval, map domain start/end coordinates to alignment positions using the existing position mapping logic from `alignment_embedded_variant.py`, serialize as `domains` array in `aligned_seq_info.json`. Frontend renders colored rectangles on a dedicated Nightingale track and enables the currently disabled "Protein Domains" checkbox.

**Files**:
- Create: `pipeline_components/seq_retrieval/src/domain/interpro_client.py`
- Modify: `pipeline_components/seq_retrieval/src/seq_retrieval.py`, `seq_info/seq_info.py`
- Modify: `webui/src/app/result/components/InteractiveAlignment/types.ts`, `VirtualizedAlignment.tsx`

**Risks**: InterPro API rate limits; RefSeq-to-UniProt mapping is not always 1:1; some proteins have no InterPro annotations.

---

#### Feature 2: Exon Boundaries Overlay

**Priority**: P2 | **Effort**: M | **Dependencies**: None

**Data Source**: CDS region boundaries already provided to `seq_retrieval.py` via `--cds_seq_regions` CLI parameter. The `TranslatedSeqRegion` class holds both exon and CDS regions.

**Approach**: During seq_retrieval, compute exon-boundary protein positions by mapping CDS genomic coordinates to codon positions, then to alignment positions. Annotate each boundary with whether it bisects a codon (single X) or falls between codons (double XX). Serialize as `exon_boundaries` in `aligned_seq_info.json`. Frontend renders underline decorations and enables the "Exon Boundaries" checkbox.

**Files**:
- Modify: `pipeline_components/seq_retrieval/src/seq_retrieval.py`, `seq_info/seq_info.py`
- Modify: `webui/src/app/result/components/InteractiveAlignment/types.ts`, `VirtualizedAlignment.tsx`, CSS

**Risks**: Nightingale MSA doesn't natively support underline decorations -- may need CSS overlay with pixel calculation. Reverse-strand transcripts need coordinate inversion.

---

### Group B: Variant Sequence Display

#### Feature 3: Variant Sequence(s) Overlay

**Priority**: P1 | **Effort**: L | **Dependencies**: None

**Data Source**: Pipeline already produces alternative protein sequences as FASTA entries via `AltSeqInfo`. These are aligned by Clustal Omega. Need metadata to identify them as alt sequences in the frontend.

**Approach**: Add `is_alt_sequence`, `parent_sequence_name`, and `variant_summary` fields to SeqInfo entries for alt sequences. Frontend detects alt rows, groups them below their parent reference with indented labels (mv1, mv2), applies distinct styling (salmon border), and toggles visibility via "Variant Sequence(s)" checkbox in Show panel.

**Files**:
- Modify: `pipeline_components/seq_retrieval/src/seq_info/seq_info.py`, `seq_retrieval.py`
- Modify: `webui/src/app/result/components/InteractiveAlignment/types.ts`, `VirtualizedAlignment.tsx`, CSS

**Risks**: Alt sequences named with `_alt1` suffix but not explicitly tagged in JSON. Grouping must survive alignment reordering logic.

---

#### Feature 4: Per-Ortholog Show/Hide Toggles

**Priority**: P3 | **Effort**: S | **Dependencies**: Benefits from Feature 3

**Data Source**: No new data. Operates on existing alignment data.

**Approach**: Add per-sequence state (`Map<string, {showVariants, showProtein}>`) alongside existing sequence chip buttons. Render toggle icons on each chip. Filter `alignmentFeatures` and `visibleData` based on per-sequence toggles. Global "Variant Locations" checkbox acts as master toggle.

**Files**:
- Modify: `VirtualizedAlignment.tsx`, CSS

---

### Group C: Filtering

#### Feature 5: Filter by Disease/Phenotype Association

**Priority**: P1 | **Effort**: S | **Dependencies**: None (data already available)

**Data Source**: `variantAnnotations` state already populated from Alliance gene/alleles API via existing server action. Contains `hasDisease` and `hasPhenotype` booleans per variant.

**Approach**: Add two filter checkboxes ("Disease annotations" / "Phenotype annotations") to the filter panel. Apply as boolean filters in the same three useMemos where `variantTypeFilter` and `consequenceFilter` are applied. When active, only show variants with matching annotation flags.

**Files**:
- Modify: `VirtualizedAlignment.tsx`

**Risks**: Annotations fetched asynchronously -- filter UI should be disabled until data loads. Decide behavior for variants without annotations when filter is active.

---

#### Feature 6: Filter by Domain

**Priority**: P2 | **Effort**: S | **Dependencies**: Feature 1 (Protein Domains)

**Data Source**: Domain coordinate data from Feature 1.

**Approach**: Populate a domain filter dropdown from loaded domains. When selected, filter variants to those whose `alignment_start_pos` falls within the selected domain's alignment range.

**Files**:
- Modify: `VirtualizedAlignment.tsx`

---

### Group D: Detail Views

#### Feature 7: Variant Details Panel

**Priority**: P1 | **Effort**: M | **Dependencies**: None

**Data Source**: Existing variant data in `seqInfoDict`, `variantAnnotations`. Additional detail from Alliance variant API.

**Approach**: When user clicks a variant card or alignment position, show an expandable detail panel. Aggregate all variants at that alignment column across species into a cross-species table (Species, Genomic Coords, rs ID/Allele, Type, Protein Change, Disease, Phenotype). The existing `PositionInfoPanel` component provides ~80% of needed structure and can be extended.

**Files**:
- Modify: `webui/src/app/result/components/PositionInfoPanel/PositionInfoPanel.tsx`, CSS
- Modify: `VirtualizedAlignment.tsx` -- wire click handler, manage panel state

**Risks**: Fetching full variant details on click may introduce latency. Define "same position" across species (alignment column vs protein position).

---

#### Feature 8: Disease Comparison Matrix

**Priority**: P2 | **Effort**: XL | **Dependencies**: Disease data infrastructure from Feature 5

**Data Source**: Alliance API disease annotations per gene/allele. Disease Ontology hierarchy from OLS or Alliance.

**Approach**: New full-page or modal component. Fetch disease annotations for all variants/alleles. Build matrix: rows = Disease Ontology terms, columns = variants grouped by species. Cells color-coded (blue = direct, orange = inferred from multi-variant allele). Rows expandable for DO hierarchy. "Include multi-variant allele annotations" toggle.

**Files**:
- Create: `webui/src/app/result/components/DiseaseComparisonMatrix/DiseaseComparisonMatrix.tsx`, CSS
- Modify: `serverActions.ts`, result page layout

**Risks**: DO hierarchy fetching could be expensive. Matrix may be very large. "Inferred from multi-variant allele" logic is complex.

---

#### Feature 9: Phenotype Display Table

**Priority**: P2 | **Effort**: M | **Dependencies**: None

**Data Source**: Alliance API phenotype annotations per allele (`/api/allele/{id}/phenotypes` or `/api/gene/{id}/phenotypes`).

**Approach**: New `PhenotypeTable` component using PrimeReact DataTable. Server action fetches phenotype data. Columns: Variant, Species, Associated Allele, Phenotype, Evidence Code, Source, References (PubMed links). Client-side sorting and filtering.

**Files**:
- Create: `webui/src/app/result/components/PhenotypeTable/PhenotypeTable.tsx`, CSS
- Modify: `serverActions.ts`, result page layout

---

#### Feature 10: "Show Disease/Phenotype Comparison" Button

**Priority**: P3 | **Effort**: S | **Dependencies**: Features 7 + 8

**Approach**: Button in Variant Details panel that navigates to Disease Comparison Matrix (scroll, modal, or route).

---

### Group E: Advanced Visualization

#### Feature 11: Mouseover Residue Detail Panel

**Priority**: P2 | **Effort**: M | **Dependencies**: None

**Data Source**: Existing alignment, variant, and conservation data.

**Approach**: Wire the existing orphaned `PositionInfoPanel` component into VirtualizedAlignment. Calculate alignment column from mouse position using Nightingale's positioning formula. Compute residue distribution, conservation, and variants for that column. Display as floating tooltip or side panel with debouncing.

**Files**:
- Modify: `VirtualizedAlignment.tsx`, `PositionInfoPanel.tsx`, CSS

**Risks**: Nightingale MSA doesn't emit per-residue hover events natively -- need pixel-to-column calculation. Performance concern for per-hover computation.

---

#### Feature 12: Logarithmic Variant Density Bar Graph

**Priority**: P2 | **Effort**: M | **Dependencies**: None

**Data Source**: Variant positions from `allVariantsTrackData`.

**Approach**: New track component that bins variants into positional windows and displays count on log Y-axis. Render as SVG bar chart above MSA within the Nightingale manager. Click on bar shows popup with clickable variant list.

**Files**:
- Create: `webui/src/app/result/components/InteractiveAlignment/VariantDensityTrack.tsx`
- Modify: `VirtualizedAlignment.tsx`, CSS

---

#### Feature 13: Color-Coded Pathogenicity Indicator

**Priority**: P3 | **Effort**: M | **Dependencies**: None

**Data Source**: `impact` field already in pipeline (`Variant.impact`) and frontend (`EmbeddedVariant.impact`). Values: HIGH, MODERATE, LOW, MODIFIER. For richer data, ClinVar significance via Alliance variant detail.

**Approach**: Render color-coded dot on variant cards based on impact level (red=HIGH, orange=MODERATE, yellow=LOW, green=MODIFIER). Add legend. Optionally fetch ClinVar significance for richer labels.

**Files**:
- Modify: `VirtualizedAlignment.tsx`, CSS
- Optionally: `serverActions.ts`

**Risks**: `impact` (VEP) is a coarse proxy for ClinVar clinical significance. Color scheme must be accessible.

---

## Recommended Implementation Order

| Order | Feature | Priority | Effort | Rationale |
|-------|---------|----------|--------|-----------|
| 1 | #5 Filter by disease/phenotype | P1 | S | Quick win, data exists |
| 2 | #11 Mouseover residue detail | P2 | M | Wires in orphaned component |
| 3 | #3 Variant Sequences overlay | P1 | L | Core SAB feature |
| 4 | #7 Variant Details panel | P1 | M | Extends existing component |
| 5 | #1 Protein Domains overlay | P1 | L | Enabler, high value |
| 6 | #13 Pathogenicity indicator | P3 | M | Data already available |
| 7 | #2 Exon Boundaries overlay | P2 | M | Useful biological context |
| 8 | #6 Filter by Domain | P2 | S | Quick once #1 done |
| 9 | #4 Per-ortholog toggles | P3 | S | UX refinement |
| 10 | #12 Variant Density graph | P2 | M | Visual overview |
| 11 | #9 Phenotype table | P2 | M | New component |
| 12 | #8 Disease Comparison Matrix | P2 | XL | Major feature |
| 13 | #10 Disease/Phenotype button | P3 | S | Trivial once #8 done |

---

## Phased Roadmap

### Phase 1: Quick Wins & Interactivity (2-3 weeks)

| Feature | Effort | Deliverable |
|---------|--------|-------------|
| #5 Filter by disease/phenotype | S | Two checkboxes in filter panel |
| #11 Mouseover residue detail | M | PositionInfoPanel on hover/click |
| #13 Pathogenicity indicator | M | Color dots on variant cards |
| #4 Per-ortholog toggles | S | Toggle buttons on sequence chips |

No pipeline changes. All use existing data.

### Phase 2: Core SAB Features (4-6 weeks)

| Feature | Effort | Deliverable |
|---------|--------|-------------|
| #3 Variant Sequences overlay | L | mv1/mv2 rows in alignment |
| #7 Variant Details panel | M | Cross-species detail on click |
| #1 Protein Domains overlay | L | Colored domain rectangles |
| #2 Exon Boundaries overlay | M | Underlined residues |
| #6 Filter by Domain | S | "Within domain" filter |

Pipeline changes for domain/exon data. Core scientific features.

### Phase 3: Major Data Views (6-8 weeks)

| Feature | Effort | Deliverable |
|---------|--------|-------------|
| #12 Variant Density graph | M | Log-scale bar chart |
| #9 Phenotype table | M | Sortable phenotype table |
| #8 Disease Comparison Matrix | XL | Full DO x Variant matrix |
| #10 Disease/Phenotype button | S | Navigation link |

New pages/components. Heavy Alliance API integration.

---

## Cross-Cutting Concerns

**API Rate Limiting**: Features 1, 8, 9 fetch from external APIs. Consider server-side caching and pipeline-time enrichment vs runtime fetching.

**Performance**: Features 11, 12 involve per-frame computation -- use `useMemo` and debouncing. Feature 8 needs virtualized rendering for large matrices.

**Testing**: Each component gets Jest tests. Server actions need mocks for external APIs. Visual regression via Cypress for new tracks/panels.

**Backward Compatibility**: `aligned_seq_info.json` schema grows with Features 1, 2, 3. Use optional fields so old jobs still render.

**Accessibility**: Color-coded indicators (Feature 13) must include text/icon alternatives. All interactive features need keyboard support.
