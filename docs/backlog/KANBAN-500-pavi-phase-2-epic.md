# KANBAN-500: PAVI Phase 2 - Epic

## Status
Backlog (Epic)

## Summary
Extend the PAVI MVP with nucleotide alignment support, Alliance website integration, enhanced visualization features, and usage metrics collection.

## Phase 2 Features Overview

### 1. Nucleotide (DNA) Alignment Support
Align transcript sequences (DNA) in addition to protein sequences (Amino Acid).

See: [KANBAN-514](./KANBAN-514-nucleotide-transcript-alignments.md) for detailed implementation plan.

### 2. Alliance Website Integration

Enable users to enter PAVI from within the main Alliance website context.

#### Entry Point A: Gene Page → Orthologs/Paralogs
```
Alliance Gene Page
       │
       ▼
┌─────────────────────────────┐
│ Select orthologs/paralogs   │
│ "Send to PAVI" button       │
└─────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ PAVI: Pre-populated with    │
│ selected genes              │
│ → Select transcripts        │
│ → Select variants           │
│ → Submit alignment          │
└─────────────────────────────┘
```

#### Entry Point B: Gene Page → Variants
```
Alliance Gene Page
       │
       ▼
┌─────────────────────────────┐
│ Select variants of interest │
│ "Send to PAVI" button       │
└─────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ PAVI: Pre-populated with    │
│ gene + selected variants    │
│ → Select orthologs/paralogs │
│ → Select transcripts        │
│ → Submit alignment          │
└─────────────────────────────┘
```

#### Entry Point C: Variant Page
```
Alliance Variant Page
       │
       ▼
┌─────────────────────────────┐
│ "Align in PAVI" button      │
└─────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ PAVI: Pre-populated with    │
│ variant's gene + variant    │
│ → Select orthologs/paralogs │
│ → Select transcripts        │
│ → Submit alignment          │
└─────────────────────────────┘
```

### 3. Enhanced Alignment Display

#### Required Features

| Feature | Description |
|---------|-------------|
| Nucleotide conservation | Conservation visualization for DNA alignments |
| Variant annotations | Molecular consequences, disease/phenotype associations |
| Protein domains | Domain boundaries overlaid on alignment |
| Exon boundaries | Exon structure visualization |

#### Visualization Mockup
```
Position:    1         10        20        30        40
             |----+----|----+----|----+----|----+----|
Domains:     [====PF00001====]         [==PF00002==]
Exons:       [Exon 1    ][  Exon 2  ][   Exon 3    ]

Human:       MKTAY...PROTEIN...SEQUENCE...HERE...
Mouse:       MKTAY...PROTEIN...SEQUENCE...HERE...
             *****   ********  *********  ****

Variants:        ▼ p.Gly12Asp (pathogenic)
                     ▼ p.Arg23Cys (benign)
```

### 4. Filtering Capabilities

#### Sequence Filtering
- Hide/show individual sequences in alignment display
- Filter by species
- Filter by sequence similarity threshold

#### Variant Filtering
- Filter by molecular consequence (missense, nonsense, etc.)
- Filter by clinical significance (pathogenic, benign, VUS)
- Filter by disease/phenotype association
- Show/hide variant annotations

### 5. Metrics Collection

| Metric | Purpose | Implementation |
|--------|---------|----------------|
| Tool usage frequency | Measure adoption | CloudWatch counter |
| Bounce rate | Users leaving before results | Session tracking |
| Job duration | Performance monitoring | Job metadata |
| Proteins per alignment | Usage patterns | Job metadata |
| Orthologs selected | Popular comparisons | Job metadata |
| Entry point source | Alliance integration usage | URL parameters |

## Technical Implementation

### Alliance Integration

#### URL Parameter Scheme
```
https://pavi.alliancegenome.org/submit?
  source=alliance&
  entry=gene|variant&
  gene=MGI:98834&
  orthologs=RGD:3889,ZFIN:ZDB-GENE-040426-2&
  variants=HGVS:...
```

#### Frontend Changes
```typescript
// Parse URL parameters on page load
const searchParams = useSearchParams();
const source = searchParams.get('source');
const entryType = searchParams.get('entry');
const geneId = searchParams.get('gene');
const orthologIds = searchParams.get('orthologs')?.split(',');
const variantIds = searchParams.get('variants')?.split(',');

// Pre-populate form with data from Alliance
useEffect(() => {
  if (source === 'alliance') {
    // Fetch gene/variant data and populate entries
    populateFromAlliance(entryType, geneId, orthologIds, variantIds);
  }
}, []);
```

#### Alliance Website Changes
Add "Align in PAVI" buttons to:
- Gene page ortholog/paralog section
- Gene page variant table
- Variant detail page

### Protein Domain Integration

#### Data Source
UniProt domain annotations via Alliance API or direct UniProt query.

```python
# Example domain data structure
{
    "transcript_id": "NM_011640.3",
    "domains": [
        {
            "name": "P53 DNA-binding domain",
            "start": 94,
            "end": 292,
            "source": "Pfam",
            "accession": "PF00870"
        }
    ]
}
```

#### Visualization Component
```typescript
// Nightingale track for domains
<nightingale-track
  type="domain"
  data={domainData}
  color-scheme="categorical"
/>
```

### Exon Boundary Visualization

#### Data Retrieval
Exon coordinates from transcript structure in Alliance API.

```python
# Exon data from transcript
{
    "transcript_id": "NM_011640.3",
    "exons": [
        {"number": 1, "start": 1, "end": 150},
        {"number": 2, "start": 151, "end": 320},
        {"number": 3, "start": 321, "end": 500}
    ]
}
```

#### Coordinate Mapping
Map genomic exon coordinates to alignment positions after alignment.

### Variant Annotation Enhancement

#### Extended Variant Data
```python
{
    "variant_id": "...",
    "hgvs": "p.Gly12Asp",
    "molecular_consequence": "missense_variant",
    "clinical_significance": "pathogenic",
    "diseases": [
        {"name": "Li-Fraumeni syndrome", "id": "DOID:3012"}
    ],
    "phenotypes": [
        {"name": "Cancer predisposition", "id": "HP:0002664"}
    ]
}
```

## Implementation Phases

### Phase 2.1: Nucleotide Alignment
- Implement DNA/RNA alignment support
- Add sequence type selector in UI
- See KANBAN-514

### Phase 2.2: Enhanced Visualization
- Protein domain track
- Exon boundary track
- Enhanced variant annotations

### Phase 2.3: Alliance Integration
- URL parameter handling in PAVI
- "Send to PAVI" buttons in Alliance
- Pre-population logic

### Phase 2.4: Filtering & Metrics
- Sequence filtering UI
- Variant filtering UI
- CloudWatch metrics integration

## Files to Modify

### PAVI WebUI
- `webui/src/app/submit/page.tsx` - URL parameter parsing
- `webui/src/app/result/` - Enhanced visualization components
- New filtering components
- New domain/exon track components

### PAVI API
- `api/src/main.py` - Extended job metadata for metrics
- `api/src/job_service.py` - Metrics publishing

### Alliance Website (separate repo)
- Gene page components
- Variant page components
- PAVI integration links

### Pipeline
- Domain data retrieval
- Exon coordinate mapping
- Extended variant annotations

## Dependencies

- KANBAN-514 (Nucleotide alignments) - Core feature
- KANBAN-623 (CloudWatch metrics) - Metrics infrastructure
- Alliance website team coordination - Integration points

## Success Criteria

Phase 2 is complete when:
1. Users can align nucleotide sequences with appropriate visualization
2. Users can launch PAVI from Alliance gene/variant pages with pre-populated data
3. Alignment display shows domains, exon boundaries, and detailed variant info
4. Users can filter sequences and variants in the display
5. Usage metrics are being collected and viewable

## Related

- [KANBAN-498](./KANBAN-498-pavi-mvp-epic.md) - Phase 1 MVP
- [KANBAN-514](./KANBAN-514-nucleotide-transcript-alignments.md) - Nucleotide alignments
- [KANBAN-623](./KANBAN-623-cloudwatch-environment-metrics.md) - Metrics infrastructure
- Alliance website repository
- UniProt API documentation
