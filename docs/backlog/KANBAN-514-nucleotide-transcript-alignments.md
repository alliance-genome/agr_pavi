# KANBAN-514: Enable Transcript Sequence (Nucleotide) Alignments

## Status
Backlog

## Summary
Extend PAVI to support nucleotide (DNA/RNA) sequence alignments in addition to the current protein (amino acid) alignments.

## Current State

PAVI currently supports:
- **Protein alignments only** (amino acid sequences)
- Uses Clustal Omega for multiple sequence alignment
- Retrieves protein sequences from genomic coordinates via CDS translation

## Proposed Feature

Add support for:
- **Nucleotide alignments** (DNA/RNA transcript sequences)
- User choice between protein and nucleotide alignment
- Appropriate visualization for nucleotide data

## Use Cases

1. **Codon-level analysis**: Compare synonymous vs non-synonymous changes
2. **UTR analysis**: Examine 5' and 3' untranslated regions
3. **Splice variant comparison**: Compare full transcript sequences
4. **Regulatory element analysis**: Study conserved non-coding regions

## Technical Analysis

### Alignment Tool Support

Clustal Omega supports both protein and nucleotide:
```bash
# Protein (current)
clustalo -i protein.fasta -o aligned.aln --outfmt=clu

# Nucleotide (new)
clustalo -i nucleotide.fasta -o aligned.aln --outfmt=clu --seqtype=DNA
```

### Sequence Retrieval Changes

Current `seq_retrieval.py` has `--output_type` parameter:
```python
# Current options
--output_type protein  # Translates CDS to amino acids

# New option needed
--output_type nucleotide  # Returns raw nucleotide sequence
```

### Data Flow

```
                    ┌─────────────────┐
                    │ User Selection  │
                    │ Protein / Nuc   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ Protein Mode    │           │ Nucleotide Mode │
    │ (current)       │           │ (new)           │
    └────────┬────────┘           └────────┬────────┘
             │                             │
             ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ Extract CDS     │           │ Extract Exons   │
    │ Translate to AA │           │ Keep as DNA     │
    └────────┬────────┘           └────────┬────────┘
             │                             │
             └──────────────┬──────────────┘
                            ▼
                  ┌─────────────────┐
                  │ Clustal Omega   │
                  │ (seqtype param) │
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │ Alignment View  │
                  │ (color scheme)  │
                  └─────────────────┘
```

## Implementation Plan

### Phase 1: Backend - Sequence Retrieval

Update `seq_retrieval.py`:

```python
def get_sequence(output_type: str, ...):
    if output_type == 'protein':
        # Current: extract CDS, translate
        return translate_cds(cds_regions, fasta)
    elif output_type == 'nucleotide':
        # New: extract exons, return DNA
        return extract_exons(exon_regions, fasta)
    elif output_type == 'cds_nucleotide':
        # Optional: CDS only, no translation
        return extract_cds(cds_regions, fasta)
```

### Phase 2: Backend - Alignment Pipeline

Update Nextflow pipeline:

```groovy
process alignment {
    input:
    path fasta_file
    val sequence_type  // 'protein' or 'nucleotide'

    script:
    def seqtype_flag = sequence_type == 'nucleotide' ? '--seqtype=DNA' : ''
    """
    clustalo -i ${fasta_file} -o alignment.aln ${seqtype_flag}
    """
}
```

### Phase 3: API Changes

Update job submission endpoint:

```python
class PipelineJobRequest(BaseModel):
    seq_regions: List[SeqRegion]
    alignment_type: Literal['protein', 'nucleotide'] = 'protein'  # New field
```

### Phase 4: Frontend - UI Updates

Add alignment type selector:

```typescript
// New component or addition to JobSubmitForm
<RadioGroup
    value={alignmentType}
    onChange={setAlignmentType}
    options={[
        { value: 'protein', label: 'Protein (Amino Acid)' },
        { value: 'nucleotide', label: 'Nucleotide (DNA)' }
    ]}
/>
```

### Phase 5: Frontend - Visualization

Update alignment viewer for nucleotide display:

```typescript
// Nightingale components support nucleotide
// May need different color scheme

const colorScheme = alignmentType === 'nucleotide'
    ? 'nucleotide'  // A=green, T=red, G=yellow, C=blue
    : 'clustal';    // Current protein coloring
```

## Visualization Considerations

### Nucleotide Color Schemes

| Base | Standard Color | Alternative |
|------|---------------|-------------|
| A | Green | Red |
| T/U | Red | Blue |
| G | Yellow/Orange | Yellow |
| C | Blue | Green |

### Display Differences

| Aspect | Protein | Nucleotide |
|--------|---------|------------|
| Alphabet | 20 amino acids | 4 bases (ATGC) |
| Sequence length | Shorter (~1/3) | Longer |
| Conservation colors | Clustal/Zappo/Taylor | Standard nucleotide |
| Gap representation | Same | Same |

### Codon View (Future Enhancement)

For nucleotide alignments, could add codon highlighting:
- Group nucleotides in triplets
- Show corresponding amino acid
- Highlight synonymous vs non-synonymous changes

## Files to Modify

### Backend
1. `pipeline_components/seq_retrieval/src/seq_retrieval.py` - Add nucleotide output
2. `pipeline_components/alignment/protein-msa.nf` - Add seqtype parameter
3. `api/src/main.py` - Add alignment_type to request model
4. `api/src/job_service.py` - Pass alignment type to pipeline

### Frontend
5. `webui/src/app/submit/components/JobSubmitForm/` - Add type selector
6. `webui/src/app/result/` - Handle nucleotide visualization
7. `webui/src/components/AlignmentViewer/` - Nucleotide color scheme

## Testing

1. Submit nucleotide alignment job
2. Verify correct sequence extraction (exons vs CDS)
3. Verify Clustal Omega handles DNA input
4. Check visualization renders correctly
5. Test mixed scenarios (protein for some, nucleotide for others - if supported)

## Edge Cases

1. **Very long transcripts**: Nucleotide sequences 3x longer than protein
2. **UTR regions**: Include or exclude based on user preference
3. **Partial transcripts**: Handle incomplete sequences
4. **RNA vs DNA**: Display as T or U?

## Future Enhancements

- Codon-aware alignment view
- Synonymous/non-synonymous variant highlighting
- CDS-only nucleotide option
- Mixed protein+nucleotide comparison view

## Related

- KANBAN-498 (PAVI MVP Epic)
- KANBAN-515 (if related to sequence types)
- Clustal Omega documentation
- Nightingale components
