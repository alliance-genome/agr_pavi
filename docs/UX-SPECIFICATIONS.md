# PAVI UX Specifications

## Overview

This document provides detailed UX specifications for PAVI (Proteins Annotations and Variants Inspector), focusing on user flows, interaction patterns, and UI component requirements for Alliance integration and enhanced alignment visualization.

**Document Version**: 1.0
**Last Updated**: 2025-12-31
**Related Documents**:
- [KANBAN-432: Master Epic](./backlog/KANBAN-432-pavi-master-epic.md)
- [KANBAN-500: Phase 2 Epic](./backlog/KANBAN-500-pavi-phase-2-epic.md)
- [KANBAN-532: Recalculate Variant Effects](./backlog/KANBAN-532-recalculate-variant-effects.md)

---

## Table of Contents

1. [User Personas and Context](#user-personas-and-context)
2. [Entry Points and User Flows](#entry-points-and-user-flows)
3. [Alignment Results Display](#alignment-results-display)
4. [Filtering and Interaction](#filtering-and-interaction)
5. [Variant Effect Recalculation](#variant-effect-recalculation)
6. [Component Specifications](#component-specifications)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Responsive Behavior](#responsive-behavior)

---

## User Personas and Context

### Primary Persona: Research Geneticist
- **Name**: Dr. Sarah Chen
- **Role**: Postdoctoral researcher in human genetics
- **Context**: Investigating disease-causing variants in cancer susceptibility genes
- **Goals**:
  - Compare human variants with corresponding positions in model organisms
  - Determine if variants affect conserved protein regions
  - Identify protein domains containing variants
- **Pain Points**:
  - Needs to switch between multiple tools to gather alignment context
  - Difficulty determining variant impact when multiple variants are present
  - Lacks clear visualization of evolutionary conservation

### Secondary Persona: Clinical Variant Scientist
- **Name**: Dr. Michael Rodriguez
- **Role**: Clinical laboratory director
- **Context**: Interpreting variants of unknown significance (VUS)
- **Goals**:
  - Assess variant pathogenicity using cross-species conservation
  - Identify similar variants in model organisms with phenotype data
  - Understand variant position relative to functional domains
- **Pain Points**:
  - Time pressure requires quick, clear answers
  - Needs high confidence in data accuracy
  - Must communicate findings to non-specialists

### Tertiary Persona: Bioinformatics Student
- **Name**: Alex Kim
- **Role**: Graduate student learning comparative genomics
- **Context**: Learning to analyze protein alignments for thesis research
- **Goals**:
  - Understand how to interpret multiple sequence alignments
  - Learn to identify conserved regions and functional domains
  - Explore variant effects in evolutionary context
- **Pain Points**:
  - Overwhelmed by complex bioinformatics interfaces
  - Needs guidance on interpreting results
  - Unsure which features to use when

---

## Entry Points and User Flows

### Flow 1: Alliance Gene Page to PAVI

**Entry Point**: Alliance Genome gene detail page (e.g., PAX6 gene page)

#### Scenario A: Ortholog Comparison

```
Alliance Gene Page: PAX6 (Human)
┌─────────────────────────────────────────────────────────────┐
│ Gene: PAX6 (HGNC:8620)                                      │
│                                                              │
│ [Overview] [Orthologs] [Variants] [Expression]              │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Orthologs                                                │ │
│ │                                                          │ │
│ │ ☑ Mouse (Pax6) - MGI:97490                              │ │
│ │ ☑ Zebrafish (pax6a) - ZFIN:ZDB-GENE-990415-200          │ │
│ │ ☐ Fly (ey) - FB:FBgn0005558                             │ │
│ │                                                          │ │
│ │ [Select All] [Clear All]                                │ │
│ │                                                          │ │
│ │ [Compare in PAVI →]    ← Primary CTA                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │
         │ User clicks "Compare in PAVI"
         │ URL: pavi.alliancegenome.org/submit?
         │      source=alliance&
         │      entry=gene-orthologs&
         │      gene=HGNC:8620&
         │      orthologs=MGI:97490,ZFIN:ZDB-GENE-990415-200
         ▼
PAVI Submit Form
┌─────────────────────────────────────────────────────────────┐
│ Create New Alignment                                        │
│                                                              │
│ ✓ Pre-populated from Alliance                               │
│                                                              │
│ Gene 1: PAX6 (Homo sapiens)             [Remove]            │
│   Transcripts: [Select transcripts ▼] ← User action needed  │
│                                                              │
│ Gene 2: Pax6 (Mus musculus)              [Remove]           │
│   Transcripts: [Select transcripts ▼]                       │
│                                                              │
│ Gene 3: pax6a (Danio rerio)              [Remove]           │
│   Transcripts: [Select transcripts ▼]                       │
│                                                              │
│ [+ Add Another Gene]                                         │
│                                                              │
│ Next Steps:                                                  │
│ 1. Select specific transcripts for each gene                │
│ 2. (Optional) Select alleles to include variants            │
│ 3. Submit alignment                                          │
│                                                              │
│ [Submit Alignment]                                           │
└─────────────────────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Pre-population Banner**
   - Display informational alert at top: "Pre-filled from Alliance Gene Page: PAX6"
   - Include "Start Fresh" link to clear pre-populated data
   - Banner dismissible after user acknowledges

2. **Gene Entry State**
   - Each pre-populated gene shows:
     - Gene symbol and organism name
     - Gene ID in smaller text below
     - "Remove" button (keyboard accessible)
     - Expandable transcript selector (initially collapsed)

3. **Visual Hierarchy**
   - Pre-populated entries use blue accent border (2px)
   - User-added entries use neutral gray border (1px)
   - Clear visual distinction between required and completed steps

4. **Guidance**
   - Inline help text: "Select at least one transcript per gene"
   - Tooltip on transcript selector explaining isoform selection
   - Progress indicator: "2 of 3 genes have transcripts selected"

#### Scenario B: Variant-Focused Entry

```
Alliance Gene Page: TP53 (Human)
┌─────────────────────────────────────────────────────────────┐
│ Gene: TP53 (HGNC:11998)                                     │
│                                                              │
│ [Overview] [Orthologs] [Variants] [Expression]              │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Variants                                                 │ │
│ │                                                          │ │
│ │ ☑ p.Arg175His - Missense (Pathogenic)                   │ │
│ │ ☑ p.Arg248Gln - Missense (Pathogenic)                   │ │
│ │ ☐ p.Arg273His - Missense (Pathogenic)                   │ │
│ │ ☐ p.Tyr220Cys - Missense (VUS)                          │ │
│ │                                                          │ │
│ │ Showing 4 of 1,247 variants                              │ │
│ │ [Filter by consequence ▼] [Filter by significance ▼]    │ │
│ │                                                          │ │
│ │ [Align Selected Variants in PAVI →]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │
         │ User clicks "Align Selected Variants in PAVI"
         │ URL: pavi.alliancegenome.org/submit?
         │      source=alliance&
         │      entry=gene-variants&
         │      gene=HGNC:11998&
         │      variants=p.Arg175His,p.Arg248Gln
         ▼
PAVI Submit Form
┌─────────────────────────────────────────────────────────────┐
│ Create Alignment with Variants                              │
│                                                              │
│ ✓ Pre-populated: TP53 with 2 variants                       │
│                                                              │
│ Gene: TP53 (Homo sapiens)                [Remove]           │
│   Transcript: [Select transcript ▼]  ← Required             │
│   Alleles: ● Selected alleles (2)                           │
│     ☑ p.Arg175His                                           │
│     ☑ p.Arg248Gln                                           │
│     [+ Add more alleles from TP53]                          │
│                                                              │
│ Add Orthologs for Comparison:                               │
│ [+ Add Ortholog]  ← Suggested next action                   │
│                                                              │
│ ℹ️ Tip: Add orthologs to see conservation at variant sites  │
│                                                              │
│ [Submit Alignment]                                           │
└─────────────────────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Variant Context Display**
   - Show variant count in header: "2 variants from TP53"
   - List selected variants with:
     - HGVS notation (protein)
     - Consequence type badge
     - Clinical significance indicator (colored dot)
   - Allow removing individual variants before submission

2. **Guided Workflow**
   - Progressive disclosure: Show "Add Orthologs" section after transcript selected
   - Contextual help: Suggest adding orthologs for conservation context
   - Smart defaults: Pre-select canonical transcript if only one selected variant

3. **Variant Limit Handling**
   - If more than 10 variants selected, show warning:
     - "⚠ Large number of variants (12) may slow alignment"
     - Suggest filtering to most relevant variants
     - Provide "Continue anyway" option

### Flow 2: Alliance Variant Page to PAVI

**Entry Point**: Alliance variant detail page

```
Alliance Variant Page: TP53 p.Arg175His
┌─────────────────────────────────────────────────────────────┐
│ Variant: NM_000546.6:c.524G>A (p.Arg175His)                │
│                                                              │
│ Gene: TP53 (HGNC:11998)                                     │
│ Type: Missense                                               │
│ Clinical Significance: Pathogenic                            │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Molecular Context                                        │ │
│ │                                                          │ │
│ │ Protein Position: 175                                    │ │
│ │ Domain: DNA-binding domain (94-292)                      │ │
│ │                                                          │ │
│ │ [View Alignment in PAVI →]                              │ │
│ │                                                          │ │
│ │ See this variant in evolutionary context                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │
         │ URL: pavi.alliancegenome.org/submit?
         │      source=alliance&
         │      entry=variant&
         │      variant=NM_000546.6:c.524G>A&
         │      gene=HGNC:11998
         ▼
PAVI Submit Form
┌─────────────────────────────────────────────────────────────┐
│ Alignment for Variant: TP53 p.Arg175His                     │
│                                                              │
│ ✓ Pre-populated variant context                             │
│                                                              │
│ Gene: TP53 (Homo sapiens)                                   │
│   Transcript: NM_000546.6 (auto-selected) ✓                 │
│   Alleles: ● p.Arg175His (from link)                        │
│                                                              │
│ Suggested Orthologs: (Based on TP53)                        │
│ ☑ Mouse Trp53 (MGI:98834)                                   │
│ ☑ Zebrafish tp53 (ZFIN:ZDB-GENE-990415-270)                 │
│                                                              │
│ [Customize Selection] [Submit Alignment]                    │
└─────────────────────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Single Variant Focus**
   - Prominent display of variant being investigated
   - Show variant details in summary card:
     - HGVS notation (genomic, transcript, protein)
     - Affected gene and transcript
     - Consequence and significance badges
   - Highlight variant position in results view

2. **Smart Ortholog Suggestions**
   - Auto-suggest 2-3 most studied orthologs
   - Pre-select suggested orthologs (user can deselect)
   - Explain selection: "Commonly compared for TP53 variants"
   - Allow manual addition of other orthologs

3. **Quick Submit Path**
   - Minimize required user input
   - Default configuration ready to submit
   - "Advanced Options" link for full customization
   - Expected time estimate: "Results in ~60 seconds"

### Flow 3: Direct PAVI Access (Manual Entry)

**Entry Point**: User navigates directly to pavi.alliancegenome.org

```
PAVI Landing Page
┌─────────────────────────────────────────────────────────────┐
│                     🧬 PAVI                                  │
│         Protein Alignments & Variants Inspector              │
│                                                              │
│ Visualize protein sequence alignments with variant          │
│ annotations across model organisms                          │
│                                                              │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                  │
│ │ Compare   │ │ Explore   │ │ Assess    │                  │
│ │ Orthologs │ │ Variants  │ │ Conserv.  │                  │
│ └───────────┘ └───────────┘ └───────────┘                  │
│                                                              │
│ [Start New Alignment →]  [View Examples]                    │
│                                                              │
│ Recent Alignments: (if user has history)                    │
│ • TP53 human/mouse/zebrafish - 2 hours ago                  │
│ • PAX6 orthologs - Yesterday                                │
│                                                              │
│ [Documentation] [Help] [Tutorial]                           │
└─────────────────────────────────────────────────────────────┘
         │
         │ User clicks "Start New Alignment"
         ▼
PAVI Submit Form (Empty State)
┌─────────────────────────────────────────────────────────────┐
│ Create New Alignment                                        │
│                                                              │
│ Select genes to align:                                      │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search for genes...                                   │ │
│ │                                                          │ │
│ │ Examples: TP53, PAX6, BRCA1                              │ │
│ │ Formats: Gene symbol, HGNC ID, Ensembl ID               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ OR                                                           │
│                                                              │
│ [Try Example: TP53 Orthologs] [Try Example: PAX6 Variants]  │
│                                                              │
│ ℹ️ Need help? See our step-by-step guide                    │
└─────────────────────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Clear Empty State**
   - Welcoming message with value proposition
   - Search-first interface (large, prominent search box)
   - Example data buttons for immediate exploration
   - Link to tutorial/documentation
   - No overwhelming form fields initially

2. **Progressive Disclosure**
   - Show full form only after first gene added
   - Reveal transcript/allele options one step at a time
   - Provide "Advanced Options" collapse for power users
   - Keep interface clean and uncluttered

3. **Onboarding for New Users**
   - Optional quick tour overlay (dismissible)
   - Tooltips appear on first visit
   - "Getting Started" checklist in sidebar
   - Link to video tutorial (if available)

---

## Alignment Results Display

### Overview Layout

The results page displays alignment output with conservation visualization, variant annotations, protein domains, and exon boundaries. The interface uses a tabbed layout for different view modes.

```
Results Page Layout
┌─────────────────────────────────────────────────────────────┐
│ [Home] > [Results]                      Breadcrumbs         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Alignment Summary                        [Export ▼]     │ │
│ │                                                          │ │
│ │ Job: TP53 orthologs with variants                       │ │
│ │ Status: Complete ✓                                       │ │
│ │ Sequences: 4 (Human, Mouse, Zebrafish, Fly)             │ │
│ │ Length: 393 amino acids                                  │ │
│ │ Conservation: 67% identical, 81% similar                 │ │
│ │ Variants: 3 displayed                                    │ │
│ │ Domains: 2 (DNA-binding, Oligomerization)                │ │
│ │                                                          │ │
│ │ [Share Link] [Download Data] [Resubmit with Changes]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Interactive View] [Text View] [Conservation Plot]      │ │
│ │─────────────────────────────────────────────────────────│ │
│ │                                                          │ │
│ │ Active Tab: Interactive View                            │ │
│ │                                                          │ │
│ │ (See detailed layouts below)                             │ │
│ │                                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Filters & Display Options              [Collapse ▲]     │ │
│ │                                                          │ │
│ │ Show/Hide Sequences:                                     │ │
│ │ ☑ Human TP53                                             │ │
│ │ ☑ Mouse Trp53                                            │ │
│ │ ☑ Zebrafish tp53                                         │ │
│ │ ☐ Fly p53                                                │ │
│ │                                                          │ │
│ │ Variant Filters:                                         │ │
│ │ ☑ Show all variants (3)                                  │ │
│ │ Consequence: [All ▼]                                     │ │
│ │ Significance: [All ▼]                                    │ │
│ │                                                          │ │
│ │ Annotation Tracks:                                       │ │
│ │ ☑ Conservation                                           │ │
│ │ ☑ Protein Domains                                        │ │
│ │ ☑ Exon Boundaries                                        │ │
│ │ ☑ Variant Markers                                        │ │
│ │                                                          │ │
│ │ [Reset Filters] [Save View Configuration]               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Interactive View Tab - Detailed Layout

```
Interactive Alignment View (Nightingale-based)
┌─────────────────────────────────────────────────────────────┐
│ Position: 1-100 of 393           [Zoom: + = -] [Fit Width] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Navigation Bar:                                              │
│ [←] [→]  |▓▓▓▓▓░░░░░░░░░░|  Position: 1-100   [Jump to ▼]  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Conservation Track:                                          │
│ ▁▂▃█▇▆▅▄▃█▇▆▅▄▃▂▁▂▃▄▅█▇▆▅  (Histogram showing conservation)│
│ └────────────────────────┘                                  │
│  Low           High                                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Annotation Tracks:                                           │
│                                                              │
│ Domains:  [====== DNA-binding (94-292) ======]              │
│           [Tetramer (325-356)]                               │
│                                                              │
│ Exons:    [Exon1][Ex2  ][Exon 3   ][Ex4][Exon 5      ]      │
│           └─ Coding boundaries for reference transcript      │
│                                                              │
│ Variants:    ↓175        ↓248        ↓273                   │
│           p.Arg→His  p.Arg→Gln  p.Arg→His                   │
│           Path.      Path.      Path.                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Sequence Alignment (MSA Viewer):                             │
│                                                              │
│ Pos    10        20        30        40        50           │
│        |----+----|----+----|----+----|----+----|             │
│                                                              │
│ Human   MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSP... │
│ Mouse   MTAMEESQSDISLELPLSQETFSGLWKLLPPEDILPSPHCMDDLLLSP... │
│ Zfish   MCEPQEELQADLNFPPLSAETFEGLWKLLPPEDILPSAHCMDDLLLSP... │
│ Fly     ------MSDQVNTQLAFLPMLQSSYKDLPLFTEEGSSQPSSSSSSSSS... │
│         **    * *    ***** **** *  .    . *    **          │
│         │     │      │                                       │
│         │     │      └─ Highly conserved region              │
│         │     └─ Moderately conserved                        │
│         └─ Variable region                                   │
│                                                              │
│ Conservation Legend:                                         │
│ * = Identical   : = Conserved   . = Semi-conserved          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Navigation Controls**
   - Position indicator always visible (sticky header)
   - Smooth horizontal scrolling with momentum
   - Keyboard navigation:
     - Arrow keys: Move by 10 positions
     - Page Up/Down: Move by viewport width
     - Home/End: Jump to alignment start/end
   - "Jump to position" input field
   - "Jump to variant" dropdown for quick navigation

2. **Conservation Visualization**
   - Color-coded amino acids:
     - Red: 100% conserved across all sequences
     - Orange: >75% conserved
     - Yellow: >50% conserved
     - Gray: <50% conserved (variable)
   - Histogram track showing per-position conservation score
   - Tooltip on hover: Exact conservation percentage and amino acid distribution

3. **Protein Domain Track**
   - Horizontal bars representing domain boundaries
   - Domain name and ID on hover
   - Color-coded by domain family (consistent within alignment)
   - Click domain to highlight all positions in that domain
   - Domains from InterPro/Pfam shown for reference sequence

4. **Exon Boundary Track**
   - Alternating colors for adjacent exons
   - Exon number labels
   - Boundaries marked with vertical divider lines
   - Only shown for transcripts with exon data
   - Tooltip shows genomic coordinates

5. **Variant Markers**
   - Position indicators above alignment (colored markers)
   - Color scheme:
     - Red: Pathogenic/Likely pathogenic
     - Orange: VUS (Variant of Unknown Significance)
     - Green: Benign/Likely benign
     - Gray: Not classified
   - Marker shows:
     - Position number
     - HGVS protein change (e.g., p.Arg175His)
     - Significance badge
   - Click variant marker to:
     - Center alignment on variant position
     - Open variant detail popover (see below)
     - Highlight affected column in alignment

6. **Sequence Display**
   - Monospace font optimized for alignment
   - Amino acids color-coded by chemical properties:
     - Hydrophobic: Pale yellow background
     - Polar: Light blue background
     - Positive: Light red background
     - Negative: Light purple background
     - Special (Cys, Gly, Pro): Light green background
   - Alternative color scheme for conservation (user toggle)
   - Gaps ('-') shown with gray background
   - Row selection highlights entire sequence
   - Residue selection highlights single position across all sequences

7. **Interactivity**
   - Click amino acid: Show position details popover
   - Hover amino acid: Tooltip with residue name and position
   - Click sequence name: Expand metadata (gene, organism, transcript ID)
   - Right-click: Context menu with "Copy sequence", "Export FASTA", "Hide sequence"

### Variant Detail Popover

When user clicks a variant marker, show detailed popover:

```
┌─────────────────────────────────────────────┐
│ Variant Details                      [×]    │
├─────────────────────────────────────────────┤
│                                             │
│ Position: 175                               │
│ Change: Arg → His (CGC → CAC)               │
│                                             │
│ On Reference Sequence:                      │
│ • Consequence: Missense variant             │
│ • Clinical Significance: Pathogenic ⚠       │
│ • Domain: DNA-binding domain                │
│ • Conservation: 100% (Arg conserved)        │
│                                             │
│ On Sequences with Embedded Variants:        │
│ ⚠ Effect may differ - see recalculated      │
│                                             │
│ Sequence: Human TP53 + p.Arg175His          │
│ • Recalculated Effect: Missense ✓          │
│ • No change from reference effect           │
│                                             │
│ Sequence: Human TP53 + p.Pro152Leu          │
│ • Original Effect: Missense                 │
│ • Recalculated Effect: Downstream of stop   │
│ • Reason: Upstream variant introduces stop  │
│ • ⚠ Variant effect nullified                │
│                                             │
│ Associated Phenotypes:                      │
│ • Li-Fraumeni syndrome                      │
│ • Multiple cancer types                     │
│                                             │
│ Cross-Species Comparison:                   │
│ Human:     R (Arg) → H (His)  Pathogenic    │
│ Mouse:     R (Arg) - conserved              │
│ Zebrafish: R (Arg) - conserved              │
│ Fly:       - (gap)                          │
│                                             │
│ [View in Alliance] [Copy Variant ID]       │
│ [Hide this variant]                         │
│                                             │
└─────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Popover Positioning**
   - Appears near clicked variant marker
   - Adjusts position to stay within viewport
   - Does not obscure the variant position in alignment
   - Arrow pointer indicates associated variant

2. **Recalculated Effects Section**
   - Only shown when variant effects differ from reference
   - Warning icon for changed effects
   - Clear explanation of why effect changed:
     - "Frameshift from upstream variant"
     - "Downstream of stop codon introduced at position X"
     - "Codon context altered by nearby indel"
   - Original vs. recalculated effects shown side-by-side

3. **Cross-Species Context**
   - Table showing position in all aligned sequences
   - Highlight differences in residue at this position
   - Conservation indicator
   - Link to organism-specific variant databases (if applicable)

4. **Phenotype Associations**
   - List known disease/phenotype associations
   - Link to Alliance disease pages
   - Model organism phenotype data (if available)

5. **Actions**
   - "View in Alliance": Link to variant detail page
   - "Copy Variant ID": Copy HGVS notation to clipboard
   - "Hide this variant": Remove from current view (reversible via filter)
   - "Export variant context": Download surrounding sequence

### Text View Tab

Simple text-based alignment for copying/exporting:

```
Text Alignment View
┌─────────────────────────────────────────────────────────────┐
│ Format: [Clustal ▼] [FASTA] [Phylip] [Nexus]               │
│ [Copy All] [Download]                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ CLUSTAL O(1.2.4) multiple sequence alignment                │
│                                                              │
│                                                              │
│ Human_TP53        MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQA  │
│ Mouse_Trp53       MTAMEESQSDISLELPLSQETFSGLWKLLPPEDILPSPH  │
│ Zebrafish_tp53    MCEPQEELQADLNFPPLSAETFEGLWKLLPPEDILPSAH  │
│ Fly_p53           ------MSDQVNTQLAFLPMLQSSYKDLPLFTEEGSSQP  │
│                   **    * *    ***** **** *  .    . *       │
│                                                              │
│ Human_TP53        MDDLMLSPDDIEQWFTEDPGPDEAPRMPEAAPPVAPAAP  │
│ Mouse_Trp53       CMDDLLLSPDDIEQWFTEDPGPDEAPRMPEAAPRVAEVQ  │
│ Zebrafish_tp53    CMDDLLLSPDDIEQWFTEDDGPDEAPRMPEAAPRVAEVQ  │
│ Fly_p53           SSSSSSASSSSSCFKTVDPVEPDPRSRAAIPPVQAYAAF  │
│                     **    ***** *  *** **  . * .  *  .       │
│                                                              │
│ (Full alignment displayed with line wrapping)                │
│                                                              │
│ Variant positions marked with:                              │
│ Position 175: Arg>His (Pathogenic) in Human_TP53            │
│ Position 248: Arg>Gln (Pathogenic) in Human_TP53            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Format Options**
   - Support standard alignment formats
   - Preserve variant annotations in comments/headers
   - Include metadata in output

2. **Copy/Export**
   - "Copy All" button: Copy formatted text to clipboard with success toast
   - "Download" button: Trigger file download with appropriate extension
   - Filename auto-generated: `pavi-alignment-{genes}-{date}.aln`

3. **Readability**
   - Monospace font
   - Adequate line spacing
   - Line numbers option (toggle)
   - Wrap at standard width (60 or 80 characters)

### Conservation Plot Tab

Statistical visualization of conservation across alignment:

```
Conservation Analysis
┌─────────────────────────────────────────────────────────────┐
│ Analysis Type: [Conservation Score ▼]                       │
│                [Similarity Score]                            │
│                [Hydrophobicity]                              │
│                [Secondary Structure Prediction]              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Conservation Score by Position                               │
│                                                              │
│ 100% │                                                       │
│      │   █                  █                                │
│  80% │  ███  █    █  █     ███   █                          │
│      │ █████ ██  ███ ██ █ █████ ███  █                      │
│  60% │ ██████████████████████████████ █  █                  │
│      │ ███████████████████████████████████                  │
│  40% │ ████████████████████████████████████                 │
│      │ ████████████████████████████████████  █              │
│  20% │ ████████████████████████████████████████             │
│      │ ████████████████████████████████████████             │
│   0% └┴───────────────────────────────────────────────────  │
│      1   50  100 150 200 250 300 350 393                    │
│                    Position                                  │
│                                                              │
│ Highly Conserved Regions:                                    │
│ • Positions 94-292 (DNA-binding domain): 89% conservation   │
│ • Positions 325-356 (Oligomerization): 76% conservation     │
│                                                              │
│ Variant Positions:                                           │
│ ▼175 (67% conservation) - High conservation                 │
│ ▼248 (92% conservation) - Very high conservation            │
│ ▼273 (88% conservation) - Very high conservation            │
│                                                              │
│ [Export Plot as SVG] [Export Data as CSV]                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Interactive Plot**
   - Hover over position: Show exact conservation percentage
   - Click bar: Jump to position in Interactive View
   - Drag to select region: Show detailed statistics for selection
   - Variant positions marked with colored indicators

2. **Analysis Options**
   - Toggle between different scoring methods
   - Adjust window size for smoothing
   - Highlight conservation thresholds (>80%, >60%, <40%)

3. **Export Options**
   - High-resolution SVG for publications
   - CSV data for further analysis
   - Include metadata in exports

---

## Filtering and Interaction

### Sequence Filtering Panel

```
Show/Hide Sequences
┌─────────────────────────────────────────────┐
│ Filter by Species:                          │
│ ☑ Homo sapiens (1)                          │
│ ☑ Mus musculus (1)                          │
│ ☑ Danio rerio (1)                           │
│ ☐ Drosophila melanogaster (1)               │
│                                             │
│ Filter by Sequence Type:                    │
│ ☑ Reference sequences (3)                   │
│ ☑ Variant-embedded sequences (2)            │
│                                             │
│ Similarity Threshold:                       │
│ [====|====] 50%                             │
│ Show only sequences >50% similar to:        │
│ [Human TP53 ▼]                              │
│                                             │
│ Showing 4 of 5 sequences                    │
│                                             │
│ [Select All] [Clear All] [Reset]            │
└─────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Real-time Filtering**
   - Changes apply immediately to alignment view
   - Smooth animation when hiding/showing sequences
   - Maintain scroll position when filtering

2. **Filter Persistence**
   - Remember filters across page reloads (localStorage)
   - Include in shareable URLs
   - Reset button restores defaults

3. **Visual Feedback**
   - Count of visible vs. total sequences
   - Disabled checkboxes for unavailable options
   - Clear indication when filters result in no sequences

### Variant Filtering Panel

```
Variant Display Options
┌─────────────────────────────────────────────┐
│ Consequence Type:                           │
│ ☑ Missense (2)                              │
│ ☑ Nonsense (1)                              │
│ ☐ Frameshift (0)                            │
│ ☐ Splice site (0)                           │
│ ☐ Synonymous (0)                            │
│                                             │
│ Clinical Significance:                      │
│ ☑ Pathogenic (2)                            │
│ ☑ Likely pathogenic (0)                     │
│ ☑ VUS (1)                                   │
│ ☐ Likely benign (0)                         │
│ ☐ Benign (0)                                │
│                                             │
│ Conservation at Variant Site:               │
│ [====|====] >75%                            │
│ Show variants where position is >75% cons.  │
│                                             │
│ Protein Domain:                             │
│ ☐ DNA-binding domain (2)                    │
│ ☐ Oligomerization domain (0)                │
│ ☑ Not in domain (1)                         │
│                                             │
│ Show Recalculated Effects:                  │
│ ☑ Highlight changed effects ⚠               │
│ ☐ Show only variants with changed effects   │
│                                             │
│ Showing 3 of 3 variants                     │
│                                             │
│ [Reset Filters]                             │
└─────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Filter Combinations**
   - Multiple filters work as AND conditions
   - Show result count for each filter option
   - Gray out options with zero results

2. **Recalculated Effect Highlighting**
   - When enabled, variants with changed effects show warning icon
   - Tooltip explains difference
   - Option to show ONLY variants with changed effects
   - Clear legend explaining color coding

3. **Conservation Threshold**
   - Slider with percentage display
   - Live update as slider moves
   - Tooltip showing how many variants match threshold

---

## Variant Effect Recalculation

### Display Strategy

When variants are embedded in sequences, their effects may change due to:
- Upstream frameshifts altering reading frame
- Upstream stop codons rendering downstream variants irrelevant
- Position shifts from insertions/deletions

**Visual Indicators**:

1. **Unchanged Effects** (Default)
   - Display as normal variant marker
   - No special indicator needed

2. **Changed Effects** (Warning State)
   ```
   Position 248
   ┌─────────────────────────────────────────┐
   │ ⚠ Effect Recalculated                  │
   │                                         │
   │ Original: Missense (Arg→Gln)            │
   │ Actual: Downstream of stop              │
   │                                         │
   │ Reason: Upstream variant at position    │
   │ 175 introduces stop codon               │
   │                                         │
   │ This variant has no functional effect   │
   │ in this sequence context.               │
   └─────────────────────────────────────────┘
   ```

3. **Frameshift-Affected** (Info State)
   ```
   Position 248
   ┌─────────────────────────────────────────┐
   │ ℹ Effect in Altered Frame               │
   │                                         │
   │ Original: Missense (Arg→Gln)            │
   │ In Frame +1: Missense (Ser→Leu)         │
   │                                         │
   │ Reason: Upstream frameshift variant     │
   │ at position 200 shifts reading frame    │
   └─────────────────────────────────────────┘
   ```

**UX Requirements**:

1. **Warning Badge on Variant Markers**
   - Small orange warning triangle on marker
   - Distinct from pathogenicity indicators
   - Tooltip on hover: "Effect recalculated - click for details"

2. **Variant Detail Popover**
   - Dedicated section comparing original vs. recalculated
   - Clear explanation of why effect changed
   - Link to upstream variant causing change
   - Visual diagram of reading frame (for frameshifts)

3. **Sequence-Specific Display**
   - Reference sequence: Show original effect only
   - Variant-embedded sequence: Show recalculated effect
   - Side-by-side comparison when viewing multiple sequences

4. **Filter Integration**
   - Option to show only variants with changed effects
   - Option to hide variants nullified by upstream changes
   - Highlight in filter panel: "2 of 5 variants have altered effects"

### Recalculation Logic Display

For technical users, provide transparency into recalculation:

```
Advanced: Recalculation Details
┌─────────────────────────────────────────────┐
│ Sequence: Human TP53 + p.Glu180del          │
│                                             │
│ Embedded Variants:                          │
│ 1. p.Glu180del (position 180, frameshift)  │
│                                             │
│ Variant Being Assessed:                     │
│ • p.Arg248Gln (position 248)                │
│                                             │
│ Position Mapping:                           │
│ • Reference position: 248                   │
│ • Embedded sequence position: 247           │
│   (shifted -1 due to deletion at 180)       │
│                                             │
│ Reading Frame:                              │
│ Reference:       ...CGC... (Arg)            │
│ With frameshift: ...TCG... (Ser)            │
│                                             │
│ Effect:                                     │
│ • Original: p.Arg248Gln (Missense)          │
│ • Recalculated: p.Ser247Leu (Missense)      │
│ • Type change: None (still missense)        │
│ • Severity may differ                       │
└─────────────────────────────────────────────┘
```

**UX Requirements**:

1. **Collapsible Advanced Section**
   - Hidden by default
   - "Show calculation details" link
   - Technical audience feature

2. **Clear Position Mapping**
   - Before/after position numbers
   - Cumulative offset from all upstream variants
   - Visual diagram of position shift

3. **Reading Frame Visualization**
   - Show original codon triplets
   - Show shifted codon triplets
   - Highlight affected amino acids
   - Color-code by reading frame (0, +1, +2)

---

## Component Specifications

### Component: AlleleSelector

**Purpose**: Allow user to select specific alleles for a gene/transcript to embed variants.

**Props**:
```typescript
interface AlleleSelectorProps {
  geneId: string;
  transcriptId: string;
  preselectedAlleles?: string[];
  maxSelections?: number;
  onSelectionChange: (alleleIds: string[]) => void;
  disabled?: boolean;
}
```

**Visual Design**:
```
┌─────────────────────────────────────────────┐
│ Select Alleles (Optional)        [Expand ▼]│
├─────────────────────────────────────────────┤
│                                             │
│ 🔍 Search alleles...                        │
│                                             │
│ ☐ All available alleles (102)               │
│                                             │
│ Consequence Type:                           │
│ ☑ Missense (45)                             │
│ ☑ Nonsense (12)                             │
│ ☐ Frameshift (8)                            │
│                                             │
│ Clinical Significance:                      │
│ ☑ Pathogenic (23)                           │
│ ☐ VUS (67)                                  │
│ ☐ Benign (12)                               │
│                                             │
│ Filtered: 35 alleles                        │
│                                             │
│ ☐ p.Arg175His - Missense, Pathogenic        │
│ ☑ p.Arg248Gln - Missense, Pathogenic   ✓   │
│ ☐ p.Arg273His - Missense, Pathogenic        │
│ ...                                         │
│                                             │
│ [Load more...] (Showing 10 of 35)           │
│                                             │
│ Selected: 1 allele                          │
│ [Clear Selection]                           │
│                                             │
└─────────────────────────────────────────────┘
```

**Interaction States**:
1. **Collapsed** (default): Shows count of selected alleles
2. **Expanded**: Shows filter options and searchable list
3. **Loading**: Skeleton loaders while fetching alleles
4. **Error**: Error message with retry button
5. **No Results**: "No alleles match filters" empty state

**Accessibility**:
- Checkbox group with aria-label
- Filter checkboxes keyboard navigable
- Search input has autocomplete
- Selected count announced to screen reader
- "X of Y selected" live region

### Component: VariantMarker

**Purpose**: Display a clickable marker for a variant position in the alignment.

**Props**:
```typescript
interface VariantMarkerProps {
  variant: Variant;
  position: number;
  significance: 'pathogenic' | 'likely-pathogenic' | 'vus' | 'likely-benign' | 'benign' | 'not-provided';
  hasRecalculatedEffect: boolean;
  recalculationStatus?: 'changed' | 'nullified' | 'same';
  onMarkerClick: (variant: Variant) => void;
  isHighlighted?: boolean;
}
```

**Visual Design**:
```
Normal Marker:
   ▼175
 ──┼─── (Pathogenic = red)

Recalculated Marker:
   ⚠▼175
 ──┼─── (Warning triangle + color)

Nullified Marker:
   ⓧ▼175
 ──┼─── (Crossed out + gray)
```

**Color Scheme**:
- Pathogenic: `#dc2626` (red-600)
- Likely Pathogenic: `#ea580c` (orange-600)
- VUS: `#ca8a04` (yellow-600)
- Likely Benign: `#65a30d` (lime-600)
- Benign: `#16a34a` (green-600)
- Not Provided: `#6b7280` (gray-500)

**Interaction**:
- Hover: Tooltip with variant HGVS and significance
- Click: Open VariantDetailPopover
- Focus: Keyboard-visible outline
- Active highlight: Blue border when variant is selected

**Accessibility**:
- Button with `aria-label`: "Variant at position 175, p.Arg175His, Pathogenic"
- `aria-describedby` linking to recalculation status if applicable
- Keyboard accessible (Tab, Enter)

### Component: ConservationTrack

**Purpose**: Display per-position conservation scores as a histogram.

**Props**:
```typescript
interface ConservationTrackProps {
  scores: number[]; // 0-1 for each alignment position
  width: number;
  height: number;
  variantPositions?: number[];
  onPositionClick?: (position: number) => void;
  colorScheme?: 'default' | 'heatmap' | 'grayscale';
}
```

**Visual Design**:
```
Conservation Histogram
┌─────────────────────────────────────────────┐
│ 1.0 ┤                                        │
│     │   █                                    │
│ 0.8 ┤  ███    █                              │
│     │ █████  ███                             │
│ 0.6 ┤ ██████████                             │
│     │ ███████████   █                        │
│ 0.4 ┤ ████████████████                       │
│     │ ████████████████                       │
│ 0.2 ┤ ████████████████                       │
│     │ ████████████████                       │
│ 0.0 └┴───────────────────────────────────────│
│     1   50  100 150 200 250 300              │
└─────────────────────────────────────────────┘
```

**Color Coding**:
- 90-100%: Dark blue `#1e40af`
- 75-89%: Blue `#3b82f6`
- 50-74%: Light blue `#60a5fa`
- 25-49%: Yellow `#fbbf24`
- 0-24%: Orange `#f97316`

**Interaction**:
- Hover bar: Tooltip shows exact conservation %
- Click bar: Scroll alignment to position
- Variant positions marked with vertical line

**Accessibility**:
- SVG with `role="img"` and descriptive `aria-label`
- Interactive bars have `role="button"`
- Keyboard navigation with arrow keys
- Text alternative available via data export

### Component: DomainTrack

**Purpose**: Display protein domain boundaries on alignment.

**Props**:
```typescript
interface DomainTrackProps {
  domains: Domain[];
  alignmentLength: number;
  sequenceId: string;
  onDomainClick?: (domain: Domain) => void;
}

interface Domain {
  name: string;
  accession: string;
  start: number;
  end: number;
  source: string; // "Pfam", "InterPro", etc.
}
```

**Visual Design**:
```
Domain Track
┌─────────────────────────────────────────────┐
│ [====== DNA-binding (PF00870) ======]       │
│ 94                                 292      │
│                                             │
│                      [Tetramer (PF08563)]   │
│                      325            356     │
└─────────────────────────────────────────────┘
```

**Color Palette** (categorical):
- Domain 1: `#3b82f6` (blue)
- Domain 2: `#8b5cf6` (purple)
- Domain 3: `#ec4899` (pink)
- Domain 4: `#f59e0b` (amber)
- Domain 5: `#10b981` (green)

**Interaction**:
- Hover: Tooltip with domain details and source
- Click: Highlight all positions within domain in alignment
- Double-click: Filter alignment to show only domain region

**Accessibility**:
- Each domain is a focusable element
- `aria-label`: "DNA-binding domain, Pfam PF00870, positions 94 to 292"
- Keyboard navigation with Tab
- Text list alternative available

### Component: ExonBoundaryTrack

**Purpose**: Display exon structure for transcripts.

**Props**:
```typescript
interface ExonBoundaryTrackProps {
  exons: Exon[];
  transcriptId: string;
  proteinLength: number;
}

interface Exon {
  number: number;
  proteinStart: number;
  proteinEnd: number;
  genomicStart?: number;
  genomicEnd?: number;
}
```

**Visual Design**:
```
Exon Track
┌─────────────────────────────────────────────┐
│ [Exon 1][Exon 2  ][Exon 3    ][Exon 4][5]   │
│ 1──────50│51────120│121────250│251─300│301─┤│
│ └Coding start                              ││
└─────────────────────────────────────────────┘
```

**Color Scheme**:
- Alternating exons: `#dbeafe` / `#bfdbfe` (light blue shades)
- Exon boundaries: Darker blue line `#1e40af`

**Interaction**:
- Hover exon: Tooltip with exon number and coordinates
- Click exon: Highlight exon region in alignment
- Exon boundaries visible as subtle vertical lines in MSA

**Accessibility**:
- List of exons announced to screen reader
- Each exon focusable
- `aria-label`: "Exon 1, amino acids 1 to 50"

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

All components must meet WCAG 2.1 Level AA standards:

1. **Color Contrast**
   - Normal text: 4.5:1 minimum
   - Large text (18pt or 14pt bold): 3.1 minimum
   - UI components and graphics: 3:1 minimum
   - Exception: Inactive/disabled elements

2. **Keyboard Navigation**
   - All functionality available via keyboard
   - Logical tab order
   - Visible focus indicators (3px outline with 2px offset)
   - No keyboard traps
   - Escape key closes modals/popovers

3. **Screen Reader Support**
   - Semantic HTML (header, nav, main, aside, footer)
   - ARIA landmarks for page regions
   - ARIA labels for all interactive elements
   - Live regions for dynamic content
   - Alternative text for images/visualizations
   - Table structure for data tables

4. **Forms**
   - Associated labels for all inputs
   - Error messages linked with aria-describedby
   - Required fields marked with aria-required
   - Autocomplete attributes where appropriate
   - Grouped controls use fieldset/legend

### Keyboard Shortcuts

Global shortcuts (work from any page):

| Key | Action |
|-----|--------|
| / | Focus search field |
| ? | Show keyboard shortcuts help |
| Esc | Close modal/popover/dropdown |
| h | Go to home page |
| s | Go to submit page |

Alignment view shortcuts:

| Key | Action |
|-----|--------|
| ← → | Scroll left/right by 10 positions |
| Home / End | Jump to start/end of alignment |
| Page Up/Down | Scroll by viewport width |
| Space | Toggle play/pause (if animated) |
| + / - | Zoom in/out |
| 0 | Reset zoom to fit width |
| v | Toggle variant markers |
| c | Toggle conservation colors |
| d | Toggle domain track |
| e | Toggle exon track |

### Focus Management

1. **Modal Dialogs**
   - Focus trapped within modal when open
   - Focus returns to trigger element when closed
   - First focusable element focused on open

2. **Dynamic Content**
   - Focus moves to new content when loaded
   - Announce content changes via aria-live
   - Maintain focus position during filtering

3. **Skip Links**
   - "Skip to main content" link at top
   - "Skip to navigation" option
   - "Skip to results" in results page
   - Visible on keyboard focus

---

## Responsive Behavior

### Breakpoints

```css
/* Mobile */
@media (max-width: 640px) { }

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) { }

/* Desktop */
@media (min-width: 1025px) { }

/* Large Desktop */
@media (min-width: 1536px) { }
```

### Mobile Adaptations (320px - 640px)

1. **Navigation**
   - Hamburger menu for main navigation
   - Breadcrumbs truncate with ellipsis
   - Workflow stepper switches to vertical orientation

2. **Forms**
   - Single column layout
   - Full-width inputs
   - Collapsible sections default to collapsed
   - Larger touch targets (44x44px minimum)

3. **Results Display**
   - Tabs become accordion
   - Side panels move below content
   - Alignment scrolls horizontally (with momentum)
   - Filters in slide-out drawer

4. **Alignment Visualization**
   - Simplified view by default
   - Zoom controls more prominent
   - Variant markers stack vertically if needed
   - Popover repositions to avoid overflow

### Tablet Adaptations (641px - 1024px)

1. **Forms**
   - Two-column layout where space allows
   - Side-by-side gene entries

2. **Results**
   - Tabs remain horizontal
   - Filters in collapsible sidebar
   - Alignment uses available width

### Desktop Optimization (1025px+)

1. **Forms**
   - Multi-column layout
   - Inline help always visible
   - Larger preview areas

2. **Results**
   - Multi-panel layout
   - Persistent filter sidebar
   - Alignment optimized for width
   - More details visible without scrolling

3. **Large Screens (1536px+)**
   - Max content width to maintain readability
   - Additional metadata panels
   - Split-screen comparison mode option

---

## Design Tokens

### Colors

```css
/* Primary Colors */
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-500: #3b82f6; /* Alliance blue */
--color-primary-700: #1d4ed8;
--color-primary-900: #1e3a8a;

/* Semantic Colors */
--color-success: #16a34a;
--color-warning: #ca8a04;
--color-error: #dc2626;
--color-info: #0284c7;

/* Variant Significance */
--color-pathogenic: #dc2626;
--color-likely-pathogenic: #ea580c;
--color-vus: #ca8a04;
--color-likely-benign: #65a30d;
--color-benign: #16a34a;

/* Neutral Grays */
--color-gray-50: #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-500: #6b7280;
--color-gray-700: #374151;
--color-gray-900: #111827;
```

### Spacing Scale

```css
--spacing-0: 0;
--spacing-1: 0.25rem; /* 4px */
--spacing-2: 0.5rem;  /* 8px */
--spacing-3: 0.75rem; /* 12px */
--spacing-4: 1rem;    /* 16px */
--spacing-6: 1.5rem;  /* 24px */
--spacing-8: 2rem;    /* 32px */
--spacing-12: 3rem;   /* 48px */
--spacing-16: 4rem;   /* 64px */
```

### Typography

```css
/* Font Families */
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'Fira Code', 'Courier New', monospace;

/* Font Sizes */
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
--text-2xl: 1.5rem;   /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem;  /* 36px */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

### Border Radius

```css
--radius-sm: 0.125rem; /* 2px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem;   /* 8px */
--radius-xl: 0.75rem;  /* 12px */
--radius-full: 9999px; /* Circular */
```

---

## Empty States

### No Alignment Results

```
┌─────────────────────────────────────────────┐
│                                             │
│              🔬                             │
│                                             │
│     No alignment results yet                │
│                                             │
│  Submit your first alignment to see         │
│  protein sequences with variant             │
│  annotations and conservation analysis.     │
│                                             │
│  [Start New Alignment]                      │
│                                             │
│  Or try an example:                         │
│  • TP53 orthologs with variants             │
│  • PAX6 cross-species comparison            │
│                                             │
└─────────────────────────────────────────────┘
```

### No Variants in Alignment

```
┌─────────────────────────────────────────────┐
│                                             │
│  ℹ No variants in this alignment            │
│                                             │
│  This alignment contains only reference     │
│  sequences without embedded variants.       │
│                                             │
│  To include variants:                       │
│  1. Select alleles when submitting          │
│  2. Ensure alleles have known variants      │
│                                             │
│  [Resubmit with Variants]                   │
│                                             │
└─────────────────────────────────────────────┘
```

### All Sequences Filtered Out

```
┌─────────────────────────────────────────────┐
│                                             │
│  ⚠ No sequences match current filters       │
│                                             │
│  Active filters:                            │
│  • Species: Drosophila melanogaster         │
│  • Similarity: >80%                         │
│                                             │
│  Try:                                       │
│  • Adjusting similarity threshold           │
│  • Selecting different species              │
│  • Resetting all filters                    │
│                                             │
│  [Reset Filters]                            │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Loading States

### Alignment Submission

```
Submitting Alignment...
┌─────────────────────────────────────────────┐
│                                             │
│  Step 1: Validating input       ✓           │
│  Step 2: Retrieving sequences   ⏳          │
│  Step 3: Running alignment      ⋯           │
│  Step 4: Processing results     ⋯           │
│                                             │
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░ 40%                  │
│                                             │
│  Estimated time: 45 seconds remaining       │
│                                             │
│  [View Status Details]                      │
│                                             │
└─────────────────────────────────────────────┘
```

### Results Loading (Skeleton)

```
┌─────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ Loading...            │
├─────────────────────────────────────────────┤
│                                             │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░                │
│ ▓▓▓▓░░░░░░░░░░  ▓▓▓▓▓░░░░░░                │
│                                             │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Error States

### Alignment Failed

```
┌─────────────────────────────────────────────┐
│                                             │
│  ⚠ Alignment Failed                         │
│                                             │
│  Error: Unable to retrieve sequence for     │
│  Drosophila melanogaster p53 (FBgn0005558)  │
│                                             │
│  Possible causes:                           │
│  • Gene ID may be incorrect                 │
│  • Sequence not available in database       │
│  • Temporary database connection issue      │
│                                             │
│  What you can do:                           │
│  1. Verify the gene ID is correct           │
│  2. Try removing this gene and resubmit     │
│  3. Contact support if issue persists       │
│                                             │
│  [Edit Submission] [Remove Failed Gene]     │
│  [Retry] [Contact Support]                  │
│                                             │
│  Job ID: a1b2c3d4 (for support reference)   │
│                                             │
└─────────────────────────────────────────────┘
```

### Network Error

```
┌─────────────────────────────────────────────┐
│                                             │
│  🔌 Connection Lost                         │
│                                             │
│  Unable to reach the PAVI server.           │
│                                             │
│  Your alignment is still running.           │
│  Refresh the page to check status.          │
│                                             │
│  [Refresh Page] [View Offline Data]         │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Success States

### Alignment Completed

```
┌─────────────────────────────────────────────┐
│                                             │
│  ✓ Alignment Complete!                      │
│                                             │
│  Your alignment of 4 sequences is ready.    │
│                                             │
│  Summary:                                   │
│  • 393 aligned positions                    │
│  • 67% identical residues                   │
│  • 3 variants annotated                     │
│  • 2 protein domains identified             │
│                                             │
│  [View Results] [Share] [Export]            │
│                                             │
│  Job saved: Access anytime via My Jobs      │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Implementation Notes

### Priority Order

1. **Critical Path (Week 1-4)**
   - Alliance integration URL handling
   - Basic results display with conservation
   - Variant markers with basic popover
   - Sequence filtering

2. **Enhanced Features (Week 5-8)**
   - Recalculated variant effects
   - Protein domain track
   - Exon boundary track
   - Advanced filtering

3. **Polish (Week 9-12)**
   - Micro-interactions
   - Advanced analytics
   - Export options
   - Performance optimization

### Testing Requirements

Each component must have:
1. Unit tests (Jest + React Testing Library)
2. Accessibility tests (jest-axe)
3. Visual regression tests (Cypress)
4. Manual keyboard navigation test
5. Manual screen reader test

### Performance Targets

- Initial page load: < 2 seconds
- Alignment visualization render: < 3 seconds
- Filter application: < 500ms
- Smooth scrolling: 60fps
- Lighthouse Performance score: > 90

---

## Document Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-31 | Initial UX specifications | Claude |

---

## Appendix: User Flow Diagrams

### Flow A: Gene Page to Alignment

```
Alliance Gene Page
       │
       ▼
Select Orthologs/Variants
       │
       ▼
Click "Compare in PAVI"
       │
       ▼
PAVI Submit (Pre-populated)
       │
       ▼
Select Transcripts
       │
       ▼
(Optional) Refine Alleles
       │
       ▼
Submit Alignment
       │
       ▼
Progress Page
       │
       ▼
Results Page
       │
       ├─> Interactive View
       ├─> Text View
       └─> Conservation Plot
```

### Flow B: Variant Page to Alignment

```
Alliance Variant Page
       │
       ▼
Click "View in PAVI"
       │
       ▼
PAVI Submit (Auto-configured)
       │
       ▼
(Optional) Adjust Orthologs
       │
       ▼
Submit Alignment
       │
       ▼
Results (Variant Highlighted)
       │
       └─> Focus on Variant Position
```

### Flow C: Direct PAVI Access

```
PAVI Home
       │
       ▼
Start New Alignment
       │
       ▼
Search Genes
       │
       ▼
Select Genes
       │
       ▼
Select Transcripts
       │
       ▼
Select Alleles
       │
       ▼
Submit
       │
       ▼
Results
```
