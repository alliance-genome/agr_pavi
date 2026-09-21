# SAB Mockup Features — Implementation Plan

**Date**: 2026-03-05
**Design doc**: `docs/plans/2026-03-05-sab-mockup-features-design.md`
**Approach**: Full-stack vertical slices, 5 features

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CURRENT SYSTEM                                 │
│                                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌────────────┐    ┌────────────────┐  │
│  │  WebUI   │───▶│   PAVI API   │───▶│  Pipeline   │───▶│  Clustal Omega │  │
│  │ (Next.js)│◀───│  (FastAPI)   │◀───│ (Python)    │◀───│  (alignment)   │  │
│  └──────────┘    └──────────────┘    └────────────┘    └────────────────┘  │
│       │                │                    │                               │
│       │           ┌────┴────┐         ┌────┴─────┐                         │
│       │           │ Results │         │ Sequence │                          │
│       │           │  Store  │         │ Retrieval│                          │
│       │           └─────────┘         └──────────┘                         │
│       │                                    │                                │
│       │                              ┌─────┴──────┐                        │
│       │                              │ Alliance   │                        │
│       │                              │ genome API │                        │
│       ▼                              └────────────┘                        │
│  ┌──────────┐                                                              │
│  │Nightingale                                                              │
│  │Components│                                                              │
│  └──────────┘                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## What Changes Per Feature

```
┌─────────────────┬────────────┬──────────┬──────────┬─────────────────────────┐
│     Feature     │  Pipeline  │   API    │  WebUI   │  External APIs          │
├─────────────────┼────────────┼──────────┼──────────┼─────────────────────────┤
│ 1. Variant seq  │  ◉ modify  │          │ ◉ new    │                         │
│ 2. Color legend │            │          │ ◉ new    │                         │
│ 3. Guide tree   │  ◉ modify  │ ◉ new   │ ◉ new    │                         │
│ 4. Domains      │  ◉ modify  │          │ ◉ new    │ ◉ InterPro/UniProt     │
│ 5. Disease/phen │  ◉ modify  │          │ ◉ new    │ ◉ Alliance API         │
│ 6a. Allele UX   │            │          │ ◉ modify │                         │
│ 6b. Syn. filter │            │          │ ◉ modify │ ◉ Alliance API         │
│ 6c. Seq limit   │            │          │ ◉ new    │                         │
│ 6d. Export fmt  │            │          │ ◉ modify │                         │
└─────────────────┴────────────┴──────────┴──────────┴─────────────────────────┘
```

---

## Feature 1: Variant Sequence Display

### Data Flow

```
                    CURRENT FLOW
                    ════════════

  seq_retrieval                    Clustal Omega              WebUI
  ┌──────────┐                    ┌───────────┐         ┌──────────────┐
  │ ref FASTA │──┐                │           │         │  All rows    │
  │ alt FASTA │──┼──▶ merge ──▶  │ alignment │──▶ .aln │  look the   │
  │ seq_info  │──┘                │           │         │  same :(     │
  └──────────┘                    └───────────┘         └──────────────┘


                    NEW FLOW
                    ════════

  seq_retrieval                    Clustal Omega              WebUI
  ┌──────────────┐                ┌───────────┐         ┌──────────────┐
  │ ref FASTA    │──┐             │           │         │ ref: TP53    │
  │ alt FASTA    │──┼──▶ merge ▶ │ alignment │──▶ .aln │  └ alt: mv1  │ ◀── red border
  │ seq_info     │──┘             │           │         │ ref: Trp53   │     + indented
  │  + is_alt ◀──── NEW          └───────────┘         │  └ alt: mv1  │
  │  + parent ◀──── NEW                                │ ref: unc-30  │
  │  + summary◀──── NEW                                └──────────────┘
  └──────────────┘
```

### Files to Modify

```
pipeline_components/seq_retrieval/
├── src/
│   ├── seq_retrieval.py          ◀── Add is_alt_sequence, parent_sequence_name,
│   │                                  variant_summary to alt_info construction
│   └── seq_info/
│       ├── alt_seq_info.py       ◀── Add new fields to AltSeqInfo dataclass
│       └── seq_info.py           ◀── Add new fields to SeqInfo dataclass
└── tests/a_unit/
    └── test_seq_retrieval.py     ◀── Test new fields are populated

webui/src/app/result/
├── components/
│   ├── VirtualizedAlignment/
│   │   ├── VirtualizedAlignment.tsx  ◀── Detect alt rows, group below parent,
│   │   │                                  apply distinct styling
│   │   └── __tests__/                ◀── Tests for alt row grouping
│   └── PositionInfoPanel/
│       └── PositionInfoPanel.tsx     ◀── Wire into VirtualizedAlignment
│                                          (currently orphaned)
└── types.ts                          ◀── Update SeqInfo TypeScript interface
```

### Steps

| # | Step | Description |
|---|---|---|
| 1.1 | Add fields to Python SeqInfo | `is_alt_sequence`, `parent_sequence_name`, `variant_summary` |
| 1.2 | Populate fields in seq_retrieval | Set flags when building alt_info in `write_output_files()` |
| 1.3 | Unit tests (pipeline) | Verify new fields in seq_info JSON output |
| 1.4 | Update TypeScript SeqInfo | Add matching fields to webui type definitions |
| 1.5 | Alt row detection logic | Parse seq_info to identify and group alt rows |
| 1.6 | Alt row styling | Indented label, red/salmon left border, variant highlight |
| 1.7 | Wire PositionInfoPanel | Connect orphaned component to variant click/hover events |
| 1.8 | Update mock data | Add alt sequence entries to mockData.ts |
| 1.9 | Unit tests (webui) | Test alt row rendering and grouping |

---

## Feature 2: Color Scheme Legend

### Visual Layout

```
  ┌─────────────────────────────────────────────────────────┐
  │ Color Scheme: [Clustal2        ▼]   [? Legend]          │
  │                                                          │
  │ ┌─ Legend (expandable) ────────────────────────────────┐ │
  │ │                                                      │ │
  │ │  Hydrophobic    Positive     Negative    Polar       │ │
  │ │  ┌──┐ A  I     ┌──┐ K  R   ┌──┐ D  E   ┌──┐ S  T  │ │
  │ │  │██│ V  L     │██│ H      │██│        │██│ N  Q  │ │
  │ │  └──┘ M  F     └──┘        └──┘        └──┘       │ │
  │ │       W  P                                          │ │
  │ │                                                      │ │
  │ │  Aromatic      Glycine      Proline     Cysteine    │ │
  │ │  ┌──┐ F  Y     ┌──┐ G      ┌──┐ P      ┌──┐ C     │ │
  │ │  │██│ W        │██│        │██│        │██│       │ │
  │ │  └──┘          └──┘        └──┘        └──┘       │ │
  │ └──────────────────────────────────────────────────────┘ │
  │                                                          │
  │  hs  AEKDKSQQGKNE----DVGAEDP----SKKKRQRRQRTHFTSQQLQE... │
  │  mm  AEKDKGQQGKNE----DVGAEDP----SKKKRQRRQRTHFTSQQLQE... │
  └─────────────────────────────────────────────────────────┘
```

### Files to Modify

```
webui/src/app/result/
├── components/
│   ├── ColorSchemeLegend/
│   │   ├── ColorSchemeLegend.tsx      ◀── NEW: Legend component
│   │   ├── colorSchemeDefinitions.ts  ◀── NEW: AA→color mappings per scheme
│   │   └── __tests__/
│   │       └── ColorSchemeLegend.test.tsx
│   └── VirtualizedAlignment/
│       └── VirtualizedAlignment.tsx   ◀── Add Legend toggle to toolbar area
```

### Steps

| # | Step | Description |
|---|---|---|
| 2.1 | Extract color scheme definitions | Map each scheme's amino acid → color rules into a data structure |
| 2.2 | Build ColorSchemeLegend component | Grouped swatches with residue labels, collapsible |
| 2.3 | Property-based grouping | For Clustal2/Hydrophobicity etc., group by biochemical property |
| 2.4 | Dynamic switching | Legend updates when user changes color scheme dropdown |
| 2.5 | Integration | Add expand/collapse toggle near the color scheme dropdown |
| 2.6 | Tests | Verify legend renders correct colors for each scheme |

---

## Feature 3: Guide Tree

### Data Flow

```
                         CURRENT
                         ═══════
  clustalo -i input.fa -o alignment.aln
                │
                └──▶ alignment.aln  ──▶  WebUI

                         NEW
                         ═══
  clustalo -i input.fa -o alignment.aln --guidetree-out=guidetree.nwk
                │                              │
                └──▶ alignment.aln  ──▶  WebUI │
                                               │
                     guidetree.nwk  ◀───────────┘
                         │
                    GET /result/tree  ──▶  WebUI
```

### Result Page Layout

```
  ┌──────────────────────────────────────────────────────────────┐
  │  [Show Tree ☑]                                               │
  │                                                              │
  │  ┌─ Tree ─────┐  ┌─ Alignment ────────────────────────────┐ │
  │  │         ┌ hs│  │ AEKDKSQQGKNE----DVGAEDP--------SKKKRQ │ │
  │  │     ┌───┤   │  │ AEKDKGQQGKNE----DVGAEDP--------SKKKRQ │ │
  │  │  ┌──┤  └ mm│  │ AEKDKGQQGKNE----DVGAEDP--------SKKKRQ │ │
  │  │  │  └── rn │  │ ADKDKSHQSKNE----DSSTDDP--------SKKKRQ │ │
  │  │──┤          │  │ VEKEKG-QSKNE----DSN-DDP--------SKKKRQ │ │
  │  │  │  ┌── xt │  │ RDRKDGNRSVNE----ENI-SSSGHDEP---KNDKKN │ │
  │  │  └──┤      │  │ --DSTGNGSTNG--------------------GKIQKP │ │
  │  │     └── dm │  │ ---------DSG----P---------------QRPKRT │ │
  │  └────────────┘  └────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────────────────┘
```

### Files to Modify

```
pipeline_components/alignment/
├── scripts/
│   └── alignment_wrapper.sh            ◀── Add --guidetree-out flag
│
api/src/
├── main.py                             ◀── New GET /result/tree endpoint
├── local_pipeline.py                   ◀── Add --guidetree-out to clustalo cmd

webui/src/app/result/
├── components/
│   ├── PhylogeneticTree/
│   │   ├── PhylogeneticTree.tsx        ◀── NEW: SVG dendrogram renderer
│   │   ├── newickParser.ts             ◀── NEW: Newick format parser
│   │   └── __tests__/
│   │       ├── PhylogeneticTree.test.tsx
│   │       └── newickParser.test.ts
│   └── VirtualizedAlignment/
│       └── VirtualizedAlignment.tsx    ◀── Add tree panel + row order sync
├── hooks/
│   └── useAlignmentData.ts             ◀── Fetch tree alongside alignment
```

### Steps

| # | Step | Description |
|---|---|---|
| 3.1 | Add `--guidetree-out` to alignment scripts | All 3 paths: wrapper.sh, local_pipeline.py, protein-msa.nf |
| 3.2 | Copy tree to results | Include guidetree.nwk in result artifacts |
| 3.3 | New API endpoint | `GET /api/pipeline-job/{uuid}/result/tree` serving Newick file |
| 3.4 | Newick parser | Parse Newick string → tree data structure (nodes, branch lengths) |
| 3.5 | SVG dendrogram component | Horizontal cladogram rendering with leaf labels |
| 3.6 | Row order sync | Match MSA sequence order to tree leaf order |
| 3.7 | Toggle integration | "Show Tree" checkbox in overlay panel |
| 3.8 | Tests | Parser tests + component rendering tests |

---

## Feature 4: Protein Domains

### Data Flow

```
  seq_retrieval            InterPro API            WebUI
  ┌──────────┐     ┌──────────────────────┐    ┌──────────────────┐
  │ protein   │────▶│ Map RefSeq → UniProt │    │                  │
  │ accession │     │ Fetch domains        │    │  ═══ Domain A ══ │ ◀── green band
  │           │     │ Map to alignment pos │    │    ══ Domain B ══│ ◀── blue band
  │           │     └──────────┬───────────┘    │                  │
  │           │                │                │  [Homeobox    ]  │
  │           │                ▼                │  [Peptidase   ]  │ ◀── legend
  │           │         aligned_seq_info.json   │                  │
  │           │         + domains[]             └──────────────────┘
  └──────────┘
```

### Domain Track Layout

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │  hs  SCH---H---------PQP----------LAMASVLAPGQPRSLDSSKHRLEVH... │
  │  mm  FCH---H---------PQA----------LAMASVLAPGQPRSLDSSKHRLEVH... │
  │  rn  FCH---H---------TQA----------LAMASVLAPGQPRSLDASKHRLEVH... │
  │                                                                 │
  │  ┌─ Domains ─────────────────────────────────────────────────┐  │
  │  │  ██████████████████████████████  Homeobox (IPR009057)     │  │
  │  │          ████████████████████████████  Paired box (PF...)  │  │
  │  └───────────────────────────────────────────────────────────┘  │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

### Files to Modify

```
pipeline_components/seq_retrieval/
├── src/
│   ├── seq_retrieval.py             ◀── Add domain fetching after seq retrieval
│   ├── domain_fetcher.py            ◀── NEW: InterPro/UniProt API client
│   ├── seq_info/
│   │   └── seq_info.py              ◀── Add domains field to SeqInfo
│   └── utils/
│       └── uniprot_mapping.py       ◀── NEW: RefSeq → UniProt ID mapping
├── tests/a_unit/
│   ├── test_domain_fetcher.py       ◀── NEW
│   └── test_uniprot_mapping.py      ◀── NEW

webui/src/app/result/
├── components/
│   ├── DomainTrack/
│   │   ├── DomainTrack.tsx          ◀── NEW: Nightingale track for domains
│   │   ├── DomainLegend.tsx         ◀── NEW: Color-coded legend
│   │   ├── domainColors.ts          ◀── NEW: Consistent color assignment
│   │   └── __tests__/
│   └── VirtualizedAlignment/
│       └── VirtualizedAlignment.tsx ◀── Add domain track below sequences
├── types.ts                         ◀── Add Domain TypeScript interface
```

### Steps

| # | Step | Description |
|---|---|---|
| 4.1 | UniProt ID mapping module | RefSeq protein accession → UniProt accession lookup |
| 4.2 | InterPro domain fetcher | Fetch domain annotations from InterPro REST API |
| 4.3 | Position mapping | Map protein domain coords → alignment coords (reuse variant logic) |
| 4.4 | Add domains to seq_info | New `domains` field in SeqInfo dataclass + JSON output |
| 4.5 | Pipeline integration | Call domain fetcher during seq_retrieval, store results |
| 4.6 | Unit tests (pipeline) | Mock InterPro responses, test mapping |
| 4.7 | Update TypeScript types | Add Domain interface to webui types |
| 4.8 | DomainTrack component | Nightingale track with rectangle features |
| 4.9 | DomainLegend component | Color swatches with domain names |
| 4.10 | Domain color assignment | Consistent colors across species for same domain |
| 4.11 | Toggle integration | "Protein Domains" checkbox in overlay panel |
| 4.12 | Update mock data | Add domain data to mockData.ts |
| 4.13 | Unit tests (webui) | Component rendering + color consistency tests |

---

## Feature 5: Disease/Phenotype Tables

### Data Flow

```
  seq_retrieval          Alliance API              WebUI
  ┌──────────┐     ┌─────────────────────┐    ┌──────────────────────────┐
  │ variant   │────▶│ GET /variant/{id}   │    │                          │
  │ IDs       │     │  → HGVS, consequence│    │ ┌─ Disease Matrix ─────┐│
  │           │     │                     │    │ │          HsA HsB MmD ││
  │           │────▶│ GET /variant/{id}/  │    │ │ Axenfeld  ██  ██  ██ ││
  │           │     │   disease           │    │ │ glaucoma      ██     ││
  │           │     │  → DO terms, refs   │    │ └──────────────────────┘│
  │           │     │                     │    │                          │
  │           │────▶│ GET /variant/{id}/  │    │ ┌─ Phenotype Table ────┐│
  │           │     │   phenotype         │    │ │ Variant │ Phenotype  ││
  │           │     │  → MP/HP terms, refs│    │ │ HsA     │ abn. eye  ││
  │           │     └─────────┬───────────┘    │ │ MmD     │ abn. aorta││
  │           │               │                │ └──────────────────────┘│
  │           │               ▼                │                          │
  │           │        aligned_seq_info.json   │  [Show Comparison]       │
  │           │        + diseases[]            └──────────────────────────┘
  │           │        + phenotypes[]
  └──────────┘
```

### Disease Comparison Matrix Layout

```
  ┌─────────────────────────────────────────────────────────────────┐
  │  Diseases associated with selected variants                     │
  │                                                                 │
  │  ☑ Include annotations from multi-variant alleles               │
  │                                                                 │
  │  ┌──────────────────┬───────┬───────┬───────┬───────┬─────────┐│
  │  │ Disease (DO)     │ Hs    │ Hs    │ Mm    │ Mm    │ Dm      ││
  │  │                  │ var A │ var B │ var D │ var E*│ var F   ││
  │  ├──────────────────┼───────┼───────┼───────┼───────┼─────────┤│
  │  │▶Axenfeld-Rieger  │  ██   │  ██   │       │  ██   │  ██     ││
  │  │  └ ARS type 1    │       │  ██   │  ██   │       │         ││
  │  ├──────────────────┼───────┼───────┼───────┼───────┼─────────┤│
  │  │ glaucoma         │       │       │  ██   │       │         ││
  │  ├──────────────────┼───────┼───────┼───────┼───────┼─────────┤│
  │  │ Arts syndrome    │  ██   │       │       │       │         ││
  │  └──────────────────┴───────┴───────┴───────┴───────┴─────────┘│
  │                                                                 │
  │  ██ = direct    ██ = inferred    * = multi-variant allele       │
  └─────────────────────────────────────────────────────────────────┘
```

### Phenotype Table Layout

```
  ┌───────────────────────────────────────────────────────────────────────┐
  │  Variant 🔽 │ Species 🔽 │ Allele      │ Phenotype        │ Source  │
  ├─────────────┼────────────┼─────────────┼──────────────────┼─────────┤
  │  Hs var A   │ H. sapiens │             │ Abn. eye press.  │ ClinVar │
  │  Hs var A   │ H. sapiens │             │ Ataxia           │ ClinVar │
  │  Mm var D   │ M. musculus│ Pitx2^tm1Abc│ abn. eye press.  │ MGI     │
  │  Mm var D   │ M. musculus│ Pitx2^tm1Abc│ abn. aorta morph.│ MGI     │
  └───────────────────────────────────────────────────────────────────────┘
```

### Files to Modify

```
pipeline_components/seq_retrieval/
├── src/
│   ├── seq_retrieval.py               ◀── Call annotation fetcher for variant IDs
│   ├── variant_annotator.py           ◀── NEW: Alliance API client for disease/phenotype
│   ├── seq_info/
│   │   ├── seq_info.py                ◀── Extend EmbeddedVariant with diseases/phenotypes
│   │   └── alt_seq_info.py            ◀── Ensure annotations propagate to alt entries
├── tests/a_unit/
│   └── test_variant_annotator.py      ◀── NEW: Mock Alliance API tests

api/src/
└── local_pipeline.py                  ◀── Ensure annotations pass through local pipeline

webui/src/app/result/
├── components/
│   ├── DiseaseComparisonMatrix/
│   │   ├── DiseaseComparisonMatrix.tsx ◀── NEW: Matrix grid component
│   │   ├── DiseaseRow.tsx             ◀── NEW: Expandable disease row
│   │   └── __tests__/
│   ├── PhenotypeTable/
│   │   ├── PhenotypeTable.tsx         ◀── NEW: Filterable/sortable table
│   │   └── __tests__/
│   └── AlignmentResultView.tsx        ◀── Add disease/phenotype section
├── types.ts                           ◀── Add Disease, Phenotype interfaces
```

### Steps

| # | Step | Description |
|---|---|---|
| 5.1 | Alliance API client module | Fetch variant details, disease, phenotype from Alliance API |
| 5.2 | Extend EmbeddedVariant | Add `hgvs_notation`, `molecular_consequence`, `diseases[]`, `phenotypes[]` |
| 5.3 | Pipeline integration | Call annotator for each variant_id during seq_retrieval |
| 5.4 | Handle missing data gracefully | Not all variants have disease/phenotype — degrade gracefully |
| 5.5 | Unit tests (pipeline) | Mock Alliance API, test annotation enrichment |
| 5.6 | Update TypeScript types | Add Disease, Phenotype interfaces |
| 5.7 | DiseaseComparisonMatrix component | Matrix grid with colored cells, expandable rows |
| 5.8 | Multi-variant allele toggle | Filter/include annotations inferred from multi-variant alleles |
| 5.9 | PhenotypeTable component | Sortable/filterable table with PMID links |
| 5.10 | Result page integration | Add tabbed section below alignment for disease/phenotype |
| 5.11 | Update mock data | Add disease/phenotype to mock variant data |
| 5.12 | Unit tests (webui) | Matrix rendering, filtering, sorting, expandable rows |

---

## Feature 6: UX Improvements (Meeting Feedback)

### 6a. Allele Dropdown Loading Indicator

#### Visual Layout

```
  BEFORE (current)                    AFTER
  ┌────────────────────────┐          ┌────────────────────────┐
  │ Alleles (optional)     │          │ Alleles (optional)     │
  │ ┌──────────────────┐   │          │ ┌──────────────────┐   │
  │ │ ◌ (spinner only) │   │          │ │ ◌ Loading...     │   │
  │ └──────────────────┘   │          │ └──────────────────┘   │
  │                        │          │ Loading alleles for    │
  │                        │          │ TP53...                │
  └────────────────────────┘          └────────────────────────┘

  AFTER LOAD (count feedback)
  ┌────────────────────────┐
  │ Alleles (optional)     │
  │ ┌──────────────────┐   │
  │ │ Select alleles ▼ │   │
  │ └──────────────────┘   │
  │ 2,847 alleles with     │
  │ variants available.    │
  │ Use filter to search.  │
  └────────────────────────┘
```

#### Files to Modify

```
webui/src/
├── hooks/
│   └── useAlleleSelection.ts           ◀── Add count tracking, loading message state
├── app/submit/components/
│   └── AlignmentEntry/
│       └── AlignmentEntry.tsx          ◀── Add loading label + count badge below MultiSelect
```

#### Steps

| # | Step | Description |
|---|---|---|
| 6a.1 | Add loading label state | Track loading gene name, show "Loading alleles for {gene}..." |
| 6a.2 | Add count badge | After load, display "{n} alleles with variants" below dropdown |
| 6a.3 | Large list hint | If >500 alleles, show "Use the filter to search" message |
| 6a.4 | Virtual scroll | Enable PrimeReact `virtualScrollerOptions` for large allele lists |

### 6b. Synonymous Variant Filtering

#### Visual Layout

```
  ┌─────────────────────────────────────────────────────┐
  │  Gene: [TP53          ]                              │
  │  Transcripts: [NM_000546, NM_001126112]             │
  │  Alleles (optional):                                 │
  │  ┌─────────────────────────────────────────────┐    │
  │  │ ☑ Hide synonymous variants (2,847 → 412)    │    │
  │  │ ┌─────────────────────────────────────┐      │    │
  │  │ │ Select alleles                    ▼ │      │    │
  │  │ └─────────────────────────────────────┘      │    │
  │  └─────────────────────────────────────────────┘    │
  └─────────────────────────────────────────────────────┘
```

#### Steps

| # | Step | Description |
|---|---|---|
| 6b.1 | Fetch molecular consequence | Include consequence type in allele/variant data from Alliance API |
| 6b.2 | Filter toggle | Add "Hide synonymous variants" checkbox above allele dropdown |
| 6b.3 | Filter logic | Exclude alleles whose only variants are `synonymous_variant` |
| 6b.4 | Count display | Show filtered/total count: "(2,847 → 412)" |

### 6c. Sequence Limit Warning

#### Visual Layout

```
  ┌─────────────────────────────────────────────────────┐
  │  Species entries: [+ Add species]                    │
  │                                                      │
  │  ┌─ Sequence Counter ─────────────────────────────┐ │
  │  │ 87 sequences will be aligned                    │ │
  │  │ (6 transcripts × 8 species + 39 alt sequences) │ │
  │  └─────────────────────────────────────────────────┘ │
  │                                                      │
  │  ⚠ Warning: Alignments with >100 sequences may      │
  │  take significantly longer or fail.  (shown >80)     │
  │                                                      │
  │  ⛔ Too many sequences (163). Maximum is ~150.       │
  │  Reduce transcripts or alleles.  (shown >150)        │
  │                                                      │
  │  [Submit Job]                                        │
  └─────────────────────────────────────────────────────┘
```

#### Steps

| # | Step | Description |
|---|---|---|
| 6c.1 | Sequence counter component | Count total sequences from all entries (transcripts + alt seqs) |
| 6c.2 | Soft warning at >80 | Show amber warning message |
| 6c.3 | Hard block at >150 | Disable submit button, show error message |
| 6c.4 | Live update | Counter updates as user adds/removes entries |

### 6d. Additional Export Formats

#### Steps

| # | Step | Description |
|---|---|---|
| 6d.1 | Format selector | Add dropdown to export button: Clustal W, FASTA, JSON |
| 6d.2 | FASTA conversion | Convert aligned sequences to FASTA format (client-side) |
| 6d.3 | JSON export | Bundle alignment + seq_info into single JSON download |
| 6d.4 | Update ExportMenu | Wire format options into existing ExportMenu component |

---

## Overall Timeline View

```
  Feature 1: Variant Sequence Display
  ════════════════════════
  │ 1.1─1.3 Pipeline │ 1.4─1.9 WebUI │
  └───────────────────┴───────────────┘

  Feature 2: Color Scheme Legend
  ═══════════════
  │ 2.1─2.6 WebUI only │
  └─────────────────────┘

  Feature 3: Guide Tree
  ══════════════════════════
  │ 3.1─3.2 Pipeline │ 3.3 API │ 3.4─3.8 WebUI │
  └──────────────────┴─────────┴───────────────┘

  Feature 4: Protein Domains
  ══════════════════════════════════
  │ 4.1─4.6 Pipeline + InterPro │ 4.7─4.13 WebUI │
  └─────────────────────────────┴────────────────┘

  Feature 5: Disease/Phenotype
  ═══════════════════════════════════════
  │ 5.1─5.5 Pipeline + Alliance API │ 5.6─5.12 WebUI │
  └─────────────────────────────────┴────────────────┘

  Feature 6: UX Improvements (can be sprinkled across features)
  ══════════════════════════════════════════════════════
  │ 6a Allele loading │ 6b Synonym filter │ 6c Seq limit │ 6d Export │
  │   (standalone)    │ (after 5.1─5.3)   │ (standalone) │(standalone│
  └───────────────────┴───────────────────┴──────────────┴──────────┘
```

## Dependencies Between Features

```
  ┌──────────────────┐
  │ 1. Variant Seq   │──────────────────┐
  │    Display       │                  │
  └──────────────────┘                  ▼
                                 ┌──────────────────┐
  ┌──────────────────┐           │ 5. Disease/       │
  │ 2. Color Legend  │           │    Phenotype      │
  │   (independent)  │           └──────────────────┘
  └──────────────────┘                  ▲
                                        │ (uses variant data
  ┌──────────────────┐                  │  enriched in step 1)
  │ 3. Guide Tree    │                  │
  │   (independent)  │─ ─ ─ ─ ─ ─ ─ ─ ─┘ (tree reorders rows,
  └──────────────────┘                      affects matrix columns)

  ┌──────────────────┐
  │ 4. Domains       │
  │   (independent)  │
  └──────────────────┘

  ┌──────────────────┐
  │ 6. UX Fixes      │
  │  6a standalone   │
  │  6b ──▶ needs 5  │─ ─ ─ ─ ─▶ (6b needs molecular_consequence
  │  6c standalone   │              from Feature 5 pipeline work)
  │  6d standalone   │
  └──────────────────┘
```

Features 2, 3, 4, 6a, 6c, and 6d are independent and can be worked on in parallel.
Feature 5 builds on the variant data model established in Feature 1.
Feature 6b (synonymous filtering) depends on molecular_consequence data from Feature 5.

---

## Submit Page — Updated Layout (Feature 6)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  PAVI — Protein Alignment Submission                                       │
│                                                                            │
│  ┌─ Entry 1 ─────────────────────────────────────────────────────────┐    │
│  │ Gene: [TP53          ]  Transcripts: [NM_000546 ▼]                │    │
│  │                                                                    │    │
│  │ ☑ Hide synonymous variants (2,847 → 412)                ◀── 6b   │    │
│  │ Alleles (optional): [Select alleles              ▼]               │    │
│  │ 412 alleles with variants. Use filter to search.         ◀── 6a   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ┌─ Entry 2 ─────────────────────────────────────────────────────────┐    │
│  │ Gene: [Trp53         ]  Transcripts: [NM_011640 ▼]                │    │
│  │ Alleles (optional): [Select alleles              ▼]               │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  ┌─ Sequence Counter ────────────────────────────────────────────┐        │
│  │ 87 sequences will be aligned                          ◀── 6c │        │
│  │ (6 transcripts × 8 species + 39 alt sequences)                │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                            │
│  [Submit Job]                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Result Page — Final Composed Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  PAVI Alignment Result                                                     │
│                                                                            │
│  ┌─ Summary Card ──────────────────────────────────────────────────────┐   │
│  │ Sequences: 8  │ Length: 324aa │ Variants: 12 │ Conservation: 78%   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─ Controls ──────────────────────────────────────────────────────────┐   │
│  │ Color: [Clustal2 ▼] [? Legend]   Show: ☑Domains ☑Variants ☑Tree   │   │
│  │                                        ☐Conservation ☐Exons        │   │
│  │ ┌ Legend (collapsible) ──────────────────────────────────────────┐  │   │
│  │ │  Hydrophobic ██ A I V L    Positive ██ K R H    ...           │  │   │
│  │ └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─ Variant Overview Track ───────────────────────────────────────────┐   │
│  │  ◆   ◆  ▼     ◆        ◆◆  ▼    ◆                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─ Navigation Ruler ─────────────────────────────────────────────────┐   │
│  │  |10   |20   |30   |40   |50   |60   |70   |80   |90   |100      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─ Tree ──────┐ ┌─ MSA ──────────────────────────────────────────────┐   │
│  │         ┌ hs│ │ SCH---H-------PQP-------LAMASVLAPGQPRSLDSSKHR...  │   │
│  │     ┌───┤   │ │  └ mv1  (variant p.L278S, red border)             │   │
│  │  ┌──┤  └ mm│ │ FCH---H-------PQA-------LAMASVLAPGQPRSLDSSKHR...  │   │
│  │  │  └── rn │ │ FCH---H-------TQA-------LAMASVLAPGQPRSLDASKHR...  │   │
│  │──┤         │ │ HQH---HHQQHQ--QHQHH-----HQQHHHQQ---HQQPQPQAV...  │   │
│  │  │  ┌── xt │ │ HHN---HHVTGS--KHAP-------------------------------  │   │
│  │  └──┤      │ │ HSL---HDSSSSV-ISPAISSLMPISSLSHLHHSAGQDLVGGYSQH...  │   │
│  │     └── dm │ │ HSLLPEHSISSS--LAPLTHNPYAFNYSI----PLPP-----------   │   │
│  └─────────────┘ └────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─ Domain Track ─────────────────────────────────────────────────────┐   │
│  │  ████████████████████████████  Homeobox Domain                     │   │
│  │          ████████████████████████████  Paired box                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─ Disease / Phenotype (tabbed) ─────────────────────────────────────┐   │
│  │  [Disease Matrix] [Phenotype Table]                                 │   │
│  │  ┌──────────────┬──────┬──────┬──────┐                              │   │
│  │  │ Disease (DO) │ Hs A │ Mm D │ Dm F │                              │   │
│  │  ├──────────────┼──────┼──────┼──────┤                              │   │
│  │  │ Axenfeld-R.  │  ██  │  ██  │  ██  │                              │   │
│  │  │ glaucoma     │      │  ██  │      │                              │   │
│  │  └──────────────┴──────┴──────┴──────┘                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─ Export ──────────────────────────────────────────────────────────┐    │
│  │  Download: [Clustal W ▼]  [⬇ Download]                  ◀── 6d  │    │
│  │            ├─ Clustal W (interleaved)                             │    │
│  │            ├─ FASTA (aligned)                                     │    │
│  │            └─ JSON (alignment + metadata)                         │    │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```
