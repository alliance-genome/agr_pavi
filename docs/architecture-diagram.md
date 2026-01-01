# PAVI Architecture Diagram

## Current Implementation (Phase 1 MVP)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PUBLIC WEBSITE                                        │
│                              (Alliance Genome - Future)                                  │
│                                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐                  │
│  │ Step 1: Browse   │    │ Step 2: Gene     │    │ Step 3: Select   │                  │
│  │ Alliance Genome  │───▶│ Page + Orthology │───▶│ Orthologs/Vars   │                  │
│  │ alliancegenome.  │    │ Table            │    │ "Align in PAVI"  │                  │
│  │ org              │    │                  │    │                  │                  │
│  └──────────────────┘    └──────────────────┘    └────────┬─────────┘                  │
│                                                           │                             │
│                                           URL params: ?source=alliance&gene=MGI:98834   │
└───────────────────────────────────────────────────────────┼─────────────────────────────┘
                                                            │
                    ┌───────────────────────────────────────┘
                    │ (Phase 2)
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                         PAVI                                             │
│                        https://pavi.alliancegenome.org/submit                           │
│                                                                                          │
│  ┌─────────────────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │           WEB INTERFACE                  │    │           API / BACKEND             │ │
│  │         (Next.js 15 + React 19)          │    │         (FastAPI + Python 3.12)     │ │
│  │                                          │    │                                     │ │
│  │  ┌────────────────────────────────────┐  │    │  ┌─────────────────────────────┐   │ │
│  │  │     Job Submission Form            │  │    │  │    POST /api/pipeline-job/  │   │ │
│  │  │  ┌──────────────────────────────┐  │  │    │  │                             │   │ │
│  │  │  │ AlignmentEntry (per gene)    │  │  │    │  │  1. Validate request        │   │ │
│  │  │  │  • Gene search (Alliance API)│  │  │───▶│  │  2. Create job UUID         │   │ │
│  │  │  │  • Transcript selector       │  │  │    │  │  3. Store in DynamoDB       │   │ │
│  │  │  │  • Allele/Variant selector   │  │  │    │  │  4. Trigger pipeline        │   │ │
│  │  │  │    (same transcript, diff    │  │  │    │  │                             │   │ │
│  │  │  │     alleles - KANBAN-816) ✓  │  │  │    │  └──────────────┬──────────────┘   │ │
│  │  │  └──────────────────────────────┘  │  │    │                 │                  │ │
│  │  │  ┌──────────────────────────────┐  │  │    │                 ▼                  │ │
│  │  │  │ + Add Another Gene           │  │  │    │  ┌─────────────────────────────┐   │ │
│  │  │  └──────────────────────────────┘  │  │    │  │  GET /api/pipeline-job/{id} │   │ │
│  │  │                                    │  │    │  │  (Status polling)           │   │ │
│  │  │  [Submit Alignment Job]            │  │◀───│  │                             │   │ │
│  │  └────────────────────────────────────┘  │    │  └─────────────────────────────┘   │ │
│  │                                          │    │                                     │ │
│  │  ┌────────────────────────────────────┐  │    │  ┌─────────────────────────────┐   │ │
│  │  │     Results Viewer                 │  │    │  │  GET /api/.../alignment     │   │ │
│  │  │  ┌──────────────────────────────┐  │  │    │  │  GET /api/.../seq-info      │   │ │
│  │  │  │ Nightingale MSA Viewer       │  │  │◀───│  │                             │   │ │
│  │  │  │  • Conservation coloring     │  │  │    │  │  Returns:                   │   │ │
│  │  │  │  • Variant positions         │  │  │    │  │  • alignment-output.aln     │   │ │
│  │  │  │  • Interactive navigation    │  │  │    │  │  • aligned_seq_info.json    │   │ │
│  │  │  │  • (Phase 2: domains, exons) │  │  │    │  │                             │   │ │
│  │  │  └──────────────────────────────┘  │  │    │  └─────────────────────────────┘   │ │
│  │  └────────────────────────────────────┘  │    │                                     │ │
│  └─────────────────────────────────────────┘    └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                                            │
                                                            │ Trigger
                                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ALIGNMENT PIPELINE                                          │
│                    (Nextflow on AWS Batch → Step Functions migration)                   │
│                                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                                    │  │
│  │   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐          │  │
│  │   │ seq_retrieval   │      │   alignment     │      │  collectAndAlign │          │  │
│  │   │   (parallel)    │─────▶│  (Clustal Omega)│─────▶│   SeqInfo        │          │  │
│  │   │                 │      │                 │      │                  │          │  │
│  │   │ For each entry: │      │ Merge FASTAs    │      │ Merge metadata   │          │  │
│  │   │ 1. Get transcript│     │ Run alignment   │      │ Map positions    │          │  │
│  │   │    coordinates  │      │                 │      │ Output JSON      │          │  │
│  │   │ 2. Fetch genome │      │ --seqtype=      │      │                  │          │  │
│  │   │    FASTA region │      │   Protein (MVP) │      │                  │          │  │
│  │   │ 3. Translate CDS│      │   DNA (Phase 2) │      │                  │          │  │
│  │   │ 4. Embed variant│      │                 │      │                  │          │  │
│  │   │    if selected  │      │                 │      │                  │          │  │
│  │   └─────────────────┘      └─────────────────┘      └─────────────────┘          │  │
│  │          │                                                   │                    │  │
│  │          │                                                   │                    │  │
│  │          ▼                                                   ▼                    │  │
│  │   ┌─────────────────┐                                ┌─────────────────┐          │  │
│  │   │ protein.fasta   │                                │ alignment.aln   │          │  │
│  │   │ seq_info.json   │                                │ seq_info.json   │          │  │
│  │   └─────────────────┘                                └─────────────────┘          │  │
│  │                                                                                    │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │                                               │
                    │ Reads from                                    │ Stores to
                    ▼                                               ▼
┌─────────────────────────────────────────┐    ┌─────────────────────────────────────────┐
│        EXTERNAL DATA SOURCES            │    │              AWS STORAGE                 │
│                                         │    │                                          │
│  ┌─────────────────────────────────┐   │    │  ┌─────────────────────────────────┐    │
│  │ Alliance API                    │   │    │  │ S3 Buckets                      │    │
│  │  • Gene search                  │   │    │  │  • work/  (Nextflow workdirs)   │    │
│  │  • Transcript data              │   │    │  │  • results/ (alignment outputs) │    │
│  │  • Variant/Allele data          │   │    │  │  • logs/                        │    │
│  │  • Ortholog relationships       │   │    │  │                                 │    │
│  └─────────────────────────────────┘   │    │  │  Lifecycle: 30-day retention    │    │
│                                         │    │  │  (KANBAN-831)                   │    │
│  ┌─────────────────────────────────┐   │    │  └─────────────────────────────────┘    │
│  │ Reference Genomes (S3)          │   │    │                                          │
│  │  s3://agrjbrowse/fasta/         │   │    │  ┌─────────────────────────────────┐    │
│  │  • GRCh38 (Human)               │   │    │  │ DynamoDB                        │    │
│  │  • GRCm39 (Mouse)               │   │    │  │  • Job metadata                 │    │
│  │  • mRatBN7.2 (Rat)              │   │    │  │  • Status tracking              │    │
│  │  • GRCz11 (Zebrafish)           │   │    │  └─────────────────────────────────┘    │
│  │  • Release 6 (Fly)              │   │    │                                          │
│  │  • WBcel235 (Worm)              │   │    │  ┌─────────────────────────────────┐    │
│  │  • R64 (Yeast)                  │   │    │  │ EFS (KANBAN-830 - Future)       │    │
│  │                                 │   │    │  │  • Cached genome FASTAs         │    │
│  │  Future: EFS cache (KANBAN-830) │   │    │  │  • Shared across all jobs       │    │
│  └─────────────────────────────────┘   │    │  └─────────────────────────────────┘    │
│                                         │    │                                          │
└─────────────────────────────────────────┘    └─────────────────────────────────────────┘
```

## Phase 2 Enhancements

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PHASE 2 ADDITIONS                                           │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         ALLIANCE INTEGRATION                                     │   │
│  │                                                                                  │   │
│  │   Gene Page                    Variant Page                                     │   │
│  │   ┌─────────────┐              ┌─────────────┐                                  │   │
│  │   │ Orthologs   │              │ Variant     │                                  │   │
│  │   │ Table       │              │ Detail      │                                  │   │
│  │   │             │              │             │                                  │   │
│  │   │ [Align in   │              │ [Align in   │                                  │   │
│  │   │  PAVI]      │              │  PAVI]      │                                  │   │
│  │   └──────┬──────┘              └──────┬──────┘                                  │   │
│  │          │                            │                                          │   │
│  │          └────────────┬───────────────┘                                          │   │
│  │                       ▼                                                          │   │
│  │            URL: /submit?source=alliance&gene=...&variants=...                   │   │
│  │                                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                      ENHANCED ALIGNMENT DISPLAY                                  │   │
│  │                                                                                  │   │
│  │   ┌─────────────────────────────────────────────────────────────────────────┐   │   │
│  │   │  Position: 1         50        100       150       200                  │   │   │
│  │   │            |----+----|----+----|----+----|----+----|                    │   │   │
│  │   │                                                                          │   │   │
│  │   │  Domains:  [======= P53_TAD =======]  [=== P53_DBD ================]    │   │   │
│  │   │                                                                          │   │   │
│  │   │  Exons:    [Ex1  ][  Ex2   ][   Ex3    ][  Ex4 ][    Ex5     ]          │   │   │
│  │   │                                                                          │   │   │
│  │   │  Human:    MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPS...                     │   │   │
│  │   │  Mouse:    MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPS...                     │   │   │
│  │   │  +Var A:   MEEPQSDPSVEPPLSQETFSDLWKLLPDNNVLSPLPS...                     │   │   │
│  │   │            ****************************^**********                       │   │   │
│  │   │                                                                          │   │   │
│  │   │  Variants:                         ▼ p.Asn29Asp                          │   │   │
│  │   │            pathogenic ──────────────┘  (recalculated: same)              │   │   │
│  │   │                                                                          │   │   │
│  │   │  ┌─────────────────────┐  ┌─────────────────────┐                       │   │   │
│  │   │  │ Filter Sequences    │  │ Filter Variants     │                       │   │   │
│  │   │  │ ☑ Human             │  │ ☑ Pathogenic        │                       │   │   │
│  │   │  │ ☑ Mouse             │  │ ☑ Likely pathogenic │                       │   │   │
│  │   │  │ ☐ +Var A            │  │ ☐ VUS               │                       │   │   │
│  │   │  └─────────────────────┘  │ ☐ Benign            │                       │   │   │
│  │   │                           └─────────────────────┘                       │   │   │
│  │   └─────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                       NUCLEOTIDE ALIGNMENT (KANBAN-514)                          │   │
│  │                                                                                  │   │
│  │   Alignment Type:  ◉ Protein (Amino Acid)   ○ Nucleotide (DNA)                  │   │
│  │                                                                                  │   │
│  │   Nucleotide display uses:                                                       │   │
│  │   • --seqtype=DNA flag for Clustal Omega                                        │   │
│  │   • Standard nucleotide coloring (A=green, T=red, G=yellow, C=blue)             │   │
│  │   • 3x longer sequences than protein                                            │   │
│  │                                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                    VARIANT EFFECT RECALCULATION (KANBAN-532)                     │   │
│  │                                                                                  │   │
│  │   When Variant A is embedded → Reading frame may shift                          │   │
│  │   → Other variant effects must be recalculated                                  │   │
│  │                                                                                  │   │
│  │   Display: Original effect vs Recalculated effect                               │   │
│  │            ⚠️ p.Pro50Leu → "Downstream of stop" (due to upstream stop-gain)     │   │
│  │                                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│   User     │     │   WebUI    │     │    API     │     │  Pipeline  │     │  Storage   │
│            │     │ (Next.js)  │     │ (FastAPI)  │     │ (Nextflow) │     │   (AWS)    │
└─────┬──────┘     └─────┬──────┘     └─────┬──────┘     └─────┬──────┘     └─────┬──────┘
      │                  │                  │                  │                  │
      │ 1. Select genes  │                  │                  │                  │
      │    transcripts   │                  │                  │                  │
      │    variants      │                  │                  │                  │
      │─────────────────▶│                  │                  │                  │
      │                  │                  │                  │                  │
      │                  │ 2. POST job      │                  │                  │
      │                  │─────────────────▶│                  │                  │
      │                  │                  │                  │                  │
      │                  │                  │ 3. Store job     │                  │
      │                  │                  │─────────────────────────────────────▶│
      │                  │                  │                  │                  │
      │                  │                  │ 4. Trigger       │                  │
      │                  │                  │─────────────────▶│                  │
      │                  │                  │                  │                  │
      │                  │ 5. Return UUID   │                  │                  │
      │                  │◀─────────────────│                  │                  │
      │                  │                  │                  │                  │
      │ 6. Redirect to   │                  │                  │ 7. Fetch seqs   │
      │    /result/{id}  │                  │                  │◀────────────────│
      │◀─────────────────│                  │                  │                  │
      │                  │                  │                  │                  │
      │                  │ 8. Poll status   │                  │ 9. Run Clustal  │
      │                  │─────────────────▶│                  │    Omega        │
      │                  │◀─────────────────│                  │                  │
      │                  │  (repeat)        │                  │                  │
      │                  │                  │                  │ 10. Store       │
      │                  │                  │                  │     results     │
      │                  │                  │                  │────────────────▶│
      │                  │                  │                  │                  │
      │                  │ 11. Status:done  │ 12. Update job   │                  │
      │                  │◀─────────────────│◀─────────────────│                  │
      │                  │                  │                  │                  │
      │                  │ 13. GET results  │                  │                  │
      │                  │─────────────────▶│                  │                  │
      │                  │                  │ 14. Fetch from   │                  │
      │                  │                  │     S3           │                  │
      │                  │                  │─────────────────────────────────────▶│
      │                  │                  │◀─────────────────────────────────────│
      │                  │ 15. Return       │                  │                  │
      │                  │    alignment     │                  │                  │
      │                  │◀─────────────────│                  │                  │
      │                  │                  │                  │                  │
      │ 16. Display      │                  │                  │                  │
      │    results       │                  │                  │                  │
      │◀─────────────────│                  │                  │                  │
      │                  │                  │                  │                  │
```

## Component Technology Stack

| Component | Current | Future |
|-----------|---------|--------|
| **Frontend** | Next.js 15, React 19, TypeScript | Same |
| **UI Components** | PrimeReact, MUI | Same |
| **Visualization** | Nightingale (EMBL-EBI) | + Domain/Exon tracks |
| **API** | FastAPI (Python 3.12) | Same |
| **Pipeline Orchestration** | Nextflow on AWS Batch | AWS Step Functions |
| **Alignment Tool** | Clustal Omega | Same |
| **Sequence Processing** | BioPython, pysam | Same |
| **Job Storage** | DynamoDB | Same |
| **File Storage** | S3 | + EFS for genomes |
| **Infrastructure** | AWS CDK (Python) | Same |

## AWS Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Account                                     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           VPC                                         │  │
│  │                                                                       │  │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │  │
│  │   │   ALB       │    │   ECS       │    │   Batch     │             │  │
│  │   │             │───▶│   Fargate   │───▶│   Compute   │             │  │
│  │   │ (HTTPS)     │    │   (API)     │    │ (Pipeline)  │             │  │
│  │   └─────────────┘    └─────────────┘    └─────────────┘             │  │
│  │                                                                       │  │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │  │
│  │   │ CloudFront  │    │  S3 Static  │    │   EFS       │             │  │
│  │   │   (CDN)     │───▶│  (WebUI)    │    │ (Genomes)   │             │  │
│  │   └─────────────┘    └─────────────┘    │ (Future)    │             │  │
│  │                                          └─────────────┘             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │  DynamoDB   │    │     S3      │    │ CloudWatch  │                    │
│   │  (Jobs)     │    │  (Results)  │    │  (Metrics)  │                    │
│   └─────────────┘    └─────────────┘    └─────────────┘                    │
│                                                                              │
│   ┌─────────────┐    ┌─────────────┐                                       │
│   │    ECR      │    │Step Functions│                                       │
│   │ (Containers)│    │  (Future)   │                                       │
│   └─────────────┘    └─────────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
