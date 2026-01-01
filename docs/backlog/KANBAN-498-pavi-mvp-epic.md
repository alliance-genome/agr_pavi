# KANBAN-498: PAVI MVP (Phase 1) - Epic

## Status
Backlog (Epic)

## Summary
The Minimum Viable Product for AGR PAVI (Protein Annotations and Variants Inspector) enabling public users to align protein sequences with variant annotations.

## Core MVP Features

### 1. Protein Sequence Alignment
- Align amino acid sequences using Clustal Omega
- Support for multiple sequences in single alignment

### 2. Gene and Transcript Selection
- Search for genes by ID or symbol
- Select specific transcripts for each gene
- Support multiple transcript selection per gene

### 3. Variant Integration
- Select variants of interest overlapping selected transcripts
- Embed variant sequences into transcript sequences
- Include variant sequences in alignment

### 4. Cross-Species Support
- **Paralogous alignment**: genes within one species
- **Orthologous alignment**: genes across multiple species
- Support all Alliance model organisms

### 5. Result Display
Must include:
- Amino acid conservation visualization
- Known variants annotation
- Interactive alignment viewer

## Current Implementation Status

### Completed
- [x] Basic alignment pipeline (Nextflow)
- [x] Gene search and selection UI
- [x] Transcript selection
- [x] Allele/variant selection (KANBAN-816)
- [x] Clustal Omega integration
- [x] Nightingale-based alignment viewer
- [x] Job submission and progress tracking
- [x] Cross-species gene selection

### In Progress / Remaining
- [ ] Variant annotations on alignment display
- [ ] Conservation visualization improvements
- [ ] Performance optimizations

## Metrics Collection (Future)

Recommended metrics for iterative improvement:

### Usage Metrics
| Metric | Purpose |
|--------|---------|
| Tool usage frequency | Measure adoption |
| Bounce rate | Users leaving before results |
| Job completion rate | Success vs failures |
| Time to result | Performance monitoring |

### Query Metrics
| Metric | Purpose |
|--------|---------|
| Proteins per alignment | Usage patterns |
| Species combinations | Popular comparisons |
| Variant selections | Feature adoption |
| Transcript selections | Complexity of queries |

### Implementation Approach
```python
# Example metrics publishing
def track_job_metrics(job):
    metrics = {
        'job_duration_seconds': job.duration,
        'sequence_count': len(job.sequences),
        'species_count': len(set(s.species for s in job.sequences)),
        'has_variants': any(s.variants for s in job.sequences),
        'completed_successfully': job.status == 'completed'
    }
    publish_to_cloudwatch('PAVI/Jobs', metrics)
```

### Metrics Dashboard Ideas
1. Daily/weekly job counts
2. Average job duration trends
3. Popular gene/species combinations
4. Error rate monitoring
5. User engagement funnel (submit → wait → view results)

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   WebUI     │────▶│   API       │────▶│   Pipeline      │
│  (Next.js)  │     │  (FastAPI)  │     │  (Nextflow)     │
└─────────────┘     └─────────────┘     └─────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
            ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
            │ Seq Retrieval│          │  Alignment   │          │ Result Merge │
            │  (Python)    │          │(Clustal Omega)│          │   (Python)   │
            └──────────────┘          └──────────────┘          └──────────────┘
```

## Related Backlog Items

| Ticket | Description | Status |
|--------|-------------|--------|
| KANBAN-816 | Same transcript with different alleles | Done |
| KANBAN-691 | Filter allele/transcript combos | Backlog |
| KANBAN-727 | Remove duplicate reference sequences | Backlog |
| KANBAN-623 | CloudWatch environment metrics | Backlog |

## Success Criteria

MVP is complete when users can:
1. Search and select genes from any Alliance organism
2. Choose transcripts and optionally add variants
3. Submit alignment job and track progress
4. View interactive alignment results with conservation
5. See variant positions annotated on alignment

## Future Phases (Post-MVP)

- Precomputed alignments for common orthologs
- Saved/shareable alignment results
- Batch job submission
- Advanced filtering and search
- Integration with Alliance gene pages
- Export options (PDF, image, data formats)
