# Seq Retrieval Architecture

This document describes the sequence retrieval pipeline component, which extracts protein sequences from genomic regions and embeds variant annotations.

## Overview

The `seq_retrieval` component:
1. Reads genomic sequences from faidx-indexed FASTA files
2. Assembles transcript sequences from exon regions
3. Translates coding sequences to protein
4. Embeds variant annotations from the Alliance Genome API
5. Outputs FASTA files and metadata JSON

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        seq_retrieval.py CLI                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐  │
│  │   data_file_    │     │     Variant     │     │  SeqRegion     │  │
│  │     mover       │     │   (from API)    │     │  (genomic)     │  │
│  │  ───────────    │     │  ────────────   │     │  ────────────  │  │
│  │  Fetch FASTA    │     │  Alliance API   │     │  Start/End     │  │
│  │  Cache locally  │     │  fetch variant  │     │  Strand/Frame  │  │
│  └────────┬────────┘     └────────┬────────┘     └────────┬───────┘  │
│           │                       │                       │          │
│           ▼                       ▼                       ▼          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    MultiPartSeqRegion                          │  │
│  │  ──────────────────────────────────────────────────────────    │  │
│  │  Chains multiple SeqRegions (exons)                            │  │
│  │  Maintains order by strand                                      │  │
│  │  Concatenates sequences                                         │  │
│  └─────────────────────────────┬──────────────────────────────────┘  │
│                                │                                     │
│                                ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   TranslatedSeqRegion                          │  │
│  │  ──────────────────────────────────────────────────────────    │  │
│  │  exon_seq_region (MultiPart) → transcript sequence             │  │
│  │  coding_seq_region (MultiPart or ORF) → CDS sequence           │  │
│  │  translate() → protein sequence                                 │  │
│  │  get_alt_sequence() → apply variants → AltSeqInfo              │  │
│  └─────────────────────────────┬──────────────────────────────────┘  │
│                                │                                     │
│                                ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                       Output Files                             │  │
│  │  ──────────────────────────────────────────────────────────    │  │
│  │  {unique_entry_id}-protein.fa   → FASTA sequences              │  │
│  │  {unique_entry_id}-seqinfo.json → Metadata with variants       │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## CLI Reference

```bash
seq_retrieval.py [OPTIONS]

Required Options:
  --seq_id TEXT           Chromosome/contig identifier (e.g., NC_007120.7)
  --exon_seq_regions JSON JSON list of exon regions
  --fasta_file_url TEXT   URL to faidx-indexed FASTA file
  --output_type [transcript|protein]
                          Output sequence type
  --base_seq_name TEXT    Base name for output sequences
  --unique_entry_id TEXT  Unique identifier for output file naming

Optional Options:
  --seq_strand [+|+1|pos|-|-1|neg]
                          Strand (default: +)
  --cds_seq_regions JSON  JSON list of CDS regions with frame
  --variant_ids JSON      JSON list of Alliance variant IDs
  --alt_seq_name_suffix TEXT
                          Suffix for alt sequences (default: _alt)
  --sequence_output_file TEXT
                          Custom output filename
  --reuse_local_cache     Reuse cached files
  --unmasked              Return unmasked sequences
  --s3_output_prefix TEXT S3 URI for output upload
  --debug                 Enable debug logging
```

## Input Formats

### Exon Regions

Regions can be specified in two formats:

**Object Format (preferred):**
```json
[
  {"start": 46379756, "end": 46379851},
  {"start": 46381473, "end": 46381609}
]
```

**String Format (auto-converted):**
```json
["46379756..46379851", "46381473..46381609"]
```

**Position Rules:**
- Coordinates are **1-based, inclusive** (start and end included)
- Regions don't need to be sorted; ordering is automatic by strand
- For negative strand: regions are reverse-complemented and concatenated in descending order

### CDS Regions

CDS regions include a `frame` field (0, 1, or 2):

```json
[
  {"start": 46379756, "end": 46379851, "frame": 0},
  {"start": 46381473, "end": 46381609, "frame": 1}
]
```

**Frame Values:**
- `0` - First nucleotide is first position of codon
- `1` - First nucleotide is second position of codon
- `2` - First nucleotide is third position of codon

If CDS regions are not provided, the component attempts ORF detection.

### FASTA File URLs

FASTA files must be faidx-indexed:

```
# Required files:
https://example.com/genome.fna.gz      # FASTA (optionally gzipped)
https://example.com/genome.fna.gz.fai  # faidx index
https://example.com/genome.fna.gz.gzi  # bgzip index (if compressed)
```

**Supported URL Schemes:**
- `https://` - NCBI, Ensembl, etc.
- `http://` - Local or network servers
- `file://` - Local filesystem

### Variant IDs

Variant IDs are Alliance Genome identifiers:

```json
["ZFIN:ZDB-ALT-210128-3", "MGI:12345678"]
```

## Output Formats

### FASTA Output (`{unique_entry_id}-protein.fa`)

**Without Variants:**
```fasta
>ZFIN:ZDB-GENE-030131-3068
MSTQVNLRKDQKGEEVLKLWNGISADEEPAEELLKRLPPVHPSEEEVIHLMREAGFSR...
```

**With Variants:**
```fasta
>ZFIN:ZDB-GENE-030131-3068_ref
MSTQVNLRKDQKGEEVLKLWNGISADEEPAEELLKRLPPVHPSEEEVIHLMREAGFSR...
>ZFIN:ZDB-GENE-030131-3068_alt
MSTQVNLRKDQKGEEVLKLWNGISADEEPAEELLKRLPPVHPSEEEVIHLMREAGFSR...
```

### Sequence Info JSON (`{unique_entry_id}-seqinfo.json`)

```json
{
  "ZFIN:ZDB-GENE-030131-3068_ref": {
    "py/object": "seq_info.seq_info.SeqInfo",
    "embedded_variants": null,
    "error": null
  },
  "ZFIN:ZDB-GENE-030131-3068_alt": {
    "py/object": "seq_info.alt_seq_info.AltSeqInfo",
    "embedded_variants": {
      "py/object": "seq_info.seq_embedded_variants_list.SeqEmbeddedVariantsList",
      "_variants": [
        {
          "py/object": "variant.seq_embedded_variant.SeqEmbeddedVariant",
          "variant_id": "ZFIN:ZDB-ALT-210128-3",
          "genomic_seq_id": "NC_007120.7",
          "genomic_start_pos": 46379800,
          "genomic_end_pos": 46379800,
          "genomic_ref_seq": "G",
          "genomic_alt_seq": "A",
          "seq_substitution_type": "SUBSTITUTION",
          "seq_start_pos": 15,
          "seq_end_pos": 15,
          "embedded_ref_seq_len": 1,
          "embedded_alt_seq_len": 1
        }
      ]
    }
  }
}
```

## External API Dependencies

### Alliance Genome API

**Endpoint:** `https://www.alliancegenome.org/api/variant/{variant_id}`

**Purpose:** Fetch variant details by ID

**Request:**
```bash
GET https://www.alliancegenome.org/api/variant/ZFIN:ZDB-ALT-210128-3
```

**Response (simplified):**
```json
{
  "id": "ZFIN:ZDB-ALT-210128-3",
  "location": {
    "chromosome": "NC_007120.7",
    "start": 46379800,
    "end": 46379800
  },
  "genomicReferenceSequence": "G",
  "genomicVariantSequence": "A"
}
```

**Error Handling:**
- Network errors raise exceptions
- Invalid variant IDs return 404
- API rate limiting may cause timeouts

### Remote FASTA Files

**Sources:**
- NCBI GenBank: `https://ftp.ncbi.nlm.nih.gov/genomes/...`
- Ensembl: `https://ftp.ensembl.org/pub/...`
- Alliance JBrowse: `https://s3.amazonaws.com/agrjbrowse/...`

**Caching:**
- Files cached in `/tmp/pavi/` by default
- Use `--reuse_local_cache` to skip re-downloading
- Index files (`.fai`, `.gzi`) fetched automatically

## Variant Handling

### Variant Types

| Type | Detection | Example |
|------|-----------|---------|
| **SUBSTITUTION** | `len(ref) == len(alt)` | G → A |
| **DELETION** | `alt` is empty | GAT → - |
| **INSERTION** | `ref` is empty | - → ATG |
| **INDEL** | `len(ref) != len(alt)` | GA → TCG |

### Variant Processing Flow

```
1. Fetch variant from Alliance API
           ↓
2. Parse genomic coordinates and sequences
           ↓
3. Validate variant within region boundaries
           ↓
4. Calculate sequence-relative positions
           ↓
5. Apply to sequence (replace ref with alt)
           ↓
6. Track embedded positions for output
           ↓
7. Translate positions for protein output
```

### Strand Handling

For negative strand:
- Variant ref/alt sequences are reverse-complemented
- Positions are translated to sequence coordinates
- Final positions reflect the transcribed strand

### Overlapping Variants

- Multiple variants must **not overlap**
- Overlapping variants raise `ValueError`
- Partial indel overlaps at region boundaries raise `NotImplementedError`

### Variant Position Translation (Protein)

For protein output, positions are translated:
```python
protein_pos = ceil(nucleotide_pos / 3)
```

## Error States

### Exception Types

| Exception | Description |
|-----------|-------------|
| `TranslationException` | Failed to translate sequence |
| `SequenceNotFoundException` | Sequence not found in FASTA |
| `OrfNotFoundException` | No valid ORF found |
| `InvalidatedOrfException` | ORF invalidated by variant |
| `ValueError` | Invalid input or coordinates |
| `FileNotFoundError` | Missing FASTA or index file |

### Error Messages

| Pattern | Cause | Solution |
|---------|-------|----------|
| `Missing index file matching path...` | FASTA index not found | Ensure `.fai` file exists |
| `Variant ... out of boundaries` | Variant outside region | Check variant coordinates |
| `variants_alt_sequence does not support overlapping variants` | Overlapping variants | Use non-overlapping variants |
| `No open reading frames found` | Invalid CDS | Provide explicit CDS regions |
| `Reference start codon different from alternative` | Variant destroys start codon | Expected for some variants |

### Error Recovery

When errors occur:
1. Error message stored in `SeqInfo.error` field
2. Reference sequence may still be output
3. Alternative sequence generation may fail
4. Downstream processes should check `error` field

## Class Reference

### SeqRegion

Represents a continuous genomic region.

```python
class SeqRegion:
    seq_id: str           # Chromosome/contig ID
    start: int            # Start position (1-based)
    end: int              # End position (inclusive)
    strand: str           # '+' or '-'
    frame: int            # Reading frame (0, 1, 2)
    fasta_file_path: str  # Path to FASTA file

    def fetch_seq(self) -> str: ...
    def get_sequence(self, unmasked=False) -> str: ...
    def get_alt_sequence(self, variants) -> AltSeqInfo: ...
    def to_rel_position(self, abs_pos) -> int: ...
```

### MultiPartSeqRegion

Chains multiple non-continuous regions.

```python
class MultiPartSeqRegion(SeqRegion):
    ordered_seqRegions: list[SeqRegion]

    def fetch_seq(self) -> str: ...
    def fetch_alt_seq(self, variants) -> AltSeqInfo: ...
```

### TranslatedSeqRegion

Manages transcript-to-protein translation.

```python
class TranslatedSeqRegion:
    exon_seq_region: MultiPartSeqRegion
    coding_seq_region: MultiPartSeqRegion

    def get_sequence(self, type) -> str: ...  # 'transcript', 'coding', 'protein'
    def get_alt_sequence(self, type, variants) -> AltSeqInfo: ...
    def translate(self) -> str: ...
```

### Variant

Represents a genomic variant.

```python
class Variant:
    variant_id: str
    genomic_seq_id: str
    genomic_start_pos: int
    genomic_end_pos: int
    genomic_ref_seq: str
    genomic_alt_seq: str
    seq_substitution_type: SubstitutionType

    @classmethod
    def from_variant_id(cls, variant_id: str) -> Variant: ...
    def overlaps(self, other) -> bool: ...
```

### SeqEmbeddedVariant

Variant with sequence embedding information.

```python
class SeqEmbeddedVariant(Variant):
    seq_start_pos: int       # Position in sequence (1-based)
    seq_end_pos: int
    embedded_ref_seq_len: int
    embedded_alt_seq_len: int

    def to_translated(self) -> SeqEmbeddedVariant: ...
```

### SeqInfo

Metadata container for sequences.

```python
class SeqInfo:
    sequence: str | None
    embedded_variants: SeqEmbeddedVariantsList | None
    error: str | None
```

## File Locations

| File | Path |
|------|------|
| Main CLI | `pipeline_components/seq_retrieval/src/seq_retrieval.py` |
| SeqRegion classes | `pipeline_components/seq_retrieval/src/seq_region/` |
| Variant classes | `pipeline_components/seq_retrieval/src/variant/` |
| SeqInfo classes | `pipeline_components/seq_retrieval/src/seq_info/` |
| Data file mover | `pipeline_components/seq_retrieval/src/data_mover/` |

## Related Documentation

- [Data Flow Diagrams](data-flows.md) - Pipeline execution flow
- [API Reference](api-reference.md) - Job submission format
- [Troubleshooting](troubleshooting.md) - Common seq_retrieval errors
