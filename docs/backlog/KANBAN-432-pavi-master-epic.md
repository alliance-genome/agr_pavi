# KANBAN-432: PAVI Master Epic - Transcript and Protein Alignment Tool

## Status
Backlog (Master Epic)

## Summary
Create the Protein Annotations and Variants Inspector (PAVI) - a public-facing tool for Alliance end-users to align transcript (DNA) or protein (amino acid) sequences with variant annotations across model organisms.

## User Story

> As a **user/researcher/clinician**,
> I want to be able to **see protein alignments** of proteins which I have picked, these proteins being:
> 1. Different isoforms from the same species
> 2. Orthologous proteins between species
>
> And **see where known variants are located** in these proteins, and:
> - See if these variants affect conserved amino acids
> - See if these variants are located in specific protein domains
> - See where these variants are located compared to exon boundaries
>
> So I can:
> - Find corresponding variants between species
> - Compare whether phenotypes are related to where the variant is located within the protein
> - Determine whether my variant (e.g. from a patient) could be a candidate to explain phenotypes I see in my patient

## Biological Requirements

1. **Align proteins**
   - Same species or different species
   - Reference and/or variant proteins
   - Ability to pick proteins to align

2. **Display alignments with annotations**
   - Amino acid conservation
   - Protein domains
   - Exon boundaries

## Original Design Subtasks

### Sequence Calculation
- Calculate all protein sequences from transcript in-silico translation
- Note: VEP results come from in-silico transcript translation
- Alliance already calculates variant protein sequences (in-silico translation)

### Alignment Infrastructure
- Install Clustal Omega at Alliance to run locally
- Align protein sequences "on the fly" by running Clustal Omega

### User Selection
- Allow users to pick proteins to align
- Options: proteins from any transcripts of a gene + any transcripts from orthologous genes
- Orthology as defined at the Alliance (DIOPT)

### Progress Communication
- Display message communicating job is running
- Options: refresh page every 30 sec, "please wait" message
- Option to have link to check later and/or email notification

### Enhanced Display
- Considered tools: MARRVEL, react-msa-viewer (EBI)
- **Must display:**
  - AA conservation
  - Variants (maybe in pop-up)
  - Protein domains
  - Exon boundaries (future iteration)
- **Filtering:**
  - "Has phenotype/has disease" association
  - Molecular consequences

### Metrics Collection
- How often is the tool used
- Bounce rate (users leaving because they don't want to wait)
- How long each job takes
- How many proteins/orthologs are picked

## Vision

Enable researchers to:
1. Compare protein/transcript sequences across species (orthologs) or within species (paralogs)
2. Visualize how variants affect conserved regions
3. Understand variant impact in evolutionary context
4. Explore protein domains and exon structures in aligned sequences

## Core Capabilities

### 1. Sequence Alignment
- **Protein alignment**: Amino acid sequences via Clustal Omega
- **Transcript alignment**: Nucleotide/DNA sequences via Clustal Omega
- User choice of alignment type

### 2. Gene and Transcript Selection
- Search genes by ID, symbol, or name
- Select specific transcripts/isoforms per gene
- Support all Alliance model organisms:
  - Human (*Homo sapiens*)
  - Mouse (*Mus musculus*)
  - Rat (*Rattus norvegicus*)
  - Zebrafish (*Danio rerio*)
  - Fly (*Drosophila melanogaster*)
  - Worm (*Caenorhabditis elegans*)
  - Yeast (*Saccharomyces cerevisiae*)

### 3. Variant Integration
- Select variants overlapping selected transcripts
- Embed variant sequences into transcript sequences
- Include variant-modified sequences in alignment
- See: [KANBAN-816](./KANBAN-816-same-transcript-different-alleles.md) for implementation

### 4. Cross-Species Comparisons
- **Paralogous alignment**: Compare genes within one species
- **Orthologous alignment**: Compare genes across multiple species
- Leverage Alliance ortholog data

### 5. Alignment Display

#### Required Features

| Feature | Description | Status |
|---------|-------------|--------|
| Conservation visualization | Color-coded conservation scores | MVP |
| Known variants | Variant positions on alignment | MVP |
| Molecular consequences | Variant effect annotations | Phase 2 |
| Protein domains | Domain boundaries overlay | Phase 2 |
| Exon boundaries | Exon structure visualization | Phase 2 |

#### Filtering Capabilities

| Filter | Description |
|--------|-------------|
| Sequence visibility | Hide/show aligned sequences |
| Variant properties | Filter by consequence type |
| Disease associations | Filter by disease/phenotype |
| Conservation threshold | Filter by conservation score |

### 6. Metrics Collection

| Metric | Purpose |
|--------|---------|
| Tool usage frequency | Measure adoption |
| Bounce rate | Users leaving before results |
| Job duration | Performance monitoring |
| Proteins per alignment | Usage patterns |
| Orthologs selected | Popular comparisons |
| Species combinations | Cross-species usage |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Alliance Website                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│   │ Gene Page   │  │ Variant Page│  │ Ortholog    │                │
│   │ "→ PAVI"    │  │ "→ PAVI"    │  │ "→ PAVI"    │                │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
└──────────┼─────────────────┼─────────────────┼──────────────────────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PAVI WebUI                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Job Submission                            │   │
│   │  • Gene search & selection                                   │   │
│   │  • Transcript selection                                      │   │
│   │  • Variant selection                                         │   │
│   │  • Alignment type (protein/nucleotide)                       │   │
│   └─────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Results Viewer                            │   │
│   │  • Interactive alignment display (Nightingale)               │   │
│   │  • Conservation coloring                                     │   │
│   │  • Variant annotations                                       │   │
│   │  • Domain/exon overlays                                      │   │
│   │  • Filtering controls                                        │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PAVI API                                     │
│   • Job submission & orchestration                                   │
│   • Status tracking                                                  │
│   • Result retrieval                                                 │
│   • Metrics publishing                                               │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Alignment Pipeline                                │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│   │ Sequence     │  │  Alignment   │  │   Result     │             │
│   │ Retrieval    │──│  (Clustal)   │──│   Merge      │             │
│   │              │  │              │  │              │             │
│   └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│   Inputs:                     Outputs:                               │
│   • Genomic coordinates       • Aligned sequences (.aln)            │
│   • Variant info              • Sequence metadata (.json)           │
│   • Reference FASTAs          • Position mappings                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: MVP (KANBAN-498) ✅ In Progress
- [x] Basic alignment pipeline
- [x] Gene/transcript selection UI
- [x] Protein alignment support
- [x] Clustal Omega integration
- [x] Nightingale visualization
- [x] Job submission/tracking
- [x] Cross-species support
- [x] Variant embedding (KANBAN-816)
- [ ] Conservation visualization polish
- [ ] Variant position display

### Phase 2: Enhanced Features (KANBAN-500)
- [ ] Nucleotide alignment support (KANBAN-514)
- [ ] Alliance website integration
- [ ] Protein domain overlay
- [ ] Exon boundary display
- [ ] Enhanced variant annotations
- [ ] Sequence/variant filtering
- [ ] Metrics collection (KANBAN-623)

### Phase 3: Optimization
- [ ] Reference genome caching (KANBAN-830)
- [ ] Intermediate storage cleanup (KANBAN-831)
- [ ] Precomputed common alignments
- [ ] Performance tuning

## External References

- **Design Document**: [Google Doc](https://docs.google.com/document/d/1UXdkGNd3Aj8W1IlH-zX3nbC_9CRpo5clxQaI1KBzrB0/edit?usp=sharing)
- **Live Application**: https://pavi.alliancegenome.org/submit
- **Alliance Website**: https://www.alliancegenome.org

## Related Epics and Tickets

### Epics
| Ticket | Description | Status |
|--------|-------------|--------|
| KANBAN-498 | Phase 1 MVP | In Progress |
| KANBAN-500 | Phase 2 | Backlog |

### Features
| Ticket | Description | Status |
|--------|-------------|--------|
| KANBAN-514 | Nucleotide alignments | Backlog |
| KANBAN-532 | Recalculate variant effects | Backlog |
| KANBAN-691 | Limit allele/transcript combos | Backlog |
| KANBAN-727 | Remove duplicate references | Backlog |
| KANBAN-816 | Same transcript, different alleles | Done |

### Infrastructure
| Ticket | Description | Status |
|--------|-------------|--------|
| KANBAN-623 | CloudWatch metrics | Backlog |
| KANBAN-830 | Genome file caching | Backlog |
| KANBAN-831 | Storage optimization | Backlog |
| KANBAN-832 | Deployment strategy | Backlog |

## Success Criteria

PAVI is successful when:
1. Public users can access the tool from Alliance or directly
2. Alignments complete in reasonable time (<2 minutes for typical jobs)
3. Results are scientifically accurate and visually clear
4. Variant annotations correctly reflect embedded sequence context
5. Tool adoption grows based on metrics
6. Community feedback is positive

## Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Visualization | Nightingale (EMBL-EBI) |
| API | FastAPI (Python 3.12) |
| Pipeline | Nextflow → Step Functions |
| Alignment | Clustal Omega |
| Infrastructure | AWS (ECS, Batch, S3, CDK) |
| Sequence Data | Alliance API, NCBI |
