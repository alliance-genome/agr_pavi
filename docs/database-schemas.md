# Database Schemas Reference

This document describes all data storage schemas used in PAVI.

## Overview

PAVI uses different storage backends depending on deployment mode:

| Mode | Job Storage | Result Storage |
|------|-------------|----------------|
| Local Pipeline (EC2) | SQLite | Local filesystem |
| Step Functions (AWS) | DynamoDB | S3 |
| Nextflow (Legacy) | In-memory | S3 |

## DynamoDB: Jobs Table

### Table Configuration

| Property | Value |
|----------|-------|
| **Table Name** | `pavi-jobs-{environment}` |
| **Billing Mode** | PAY_PER_REQUEST (on-demand) |
| **Point-in-Time Recovery** | Enabled |

### Schema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        pavi-jobs-{env}                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Partition Key: job_id (String)                                         │
│                                                                         │
│  Attributes:                                                            │
│  ┌────────────────────┬──────────┬─────────────────────────────────┐   │
│  │ Name               │ Type     │ Description                     │   │
│  ├────────────────────┼──────────┼─────────────────────────────────┤   │
│  │ job_id             │ S (PK)   │ UUID v4 identifier              │   │
│  │ status             │ S        │ PENDING | RUNNING | COMPLETED   │   │
│  │                    │          │ | FAILED                        │   │
│  │ stage              │ S        │ Current pipeline stage          │   │
│  │ created_at         │ S        │ ISO 8601 timestamp              │   │
│  │ completed_at       │ S        │ ISO 8601 timestamp (optional)   │   │
│  │ input_count        │ N        │ Number of input sequences       │   │
│  │ sequences_processed│ N        │ Sequences processed so far      │   │
│  │ result_s3_uri      │ S        │ S3 URI to alignment result      │   │
│  │ error_message      │ S        │ Error details (max 1000 chars)  │   │
│  │ execution_arn      │ S        │ Step Functions execution ARN    │   │
│  │ ttl                │ N        │ Expiration epoch (30 days)      │   │
│  └────────────────────┴──────────┴─────────────────────────────────┘   │
│                                                                         │
│  Global Secondary Index: status-created_at-index                        │
│  ┌────────────────────┬──────────┬─────────────────────────────────┐   │
│  │ Partition Key      │ status   │ Filter by job status            │   │
│  │ Sort Key           │ created_at│ Order by creation time         │   │
│  │ Projection         │ ALL      │ All attributes                  │   │
│  └────────────────────┴──────────┴─────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Example Item

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED",
  "stage": "DONE",
  "created_at": "2025-01-28T10:30:00Z",
  "completed_at": "2025-01-28T10:32:45Z",
  "input_count": 5,
  "sequences_processed": 5,
  "result_s3_uri": "s3://agr-pavi-pipeline-stepfunctions-prod/550e8400-e29b-41d4-a716-446655440000/alignment-output.aln",
  "execution_arn": "arn:aws:states:us-east-1:123456789:execution:pavi-pipeline-prod:pavi-job-550e8400",
  "ttl": 1740739945
}
```

### Status Values

| Value | Description |
|-------|-------------|
| `PENDING` | Job created, not yet started |
| `RUNNING` | Pipeline execution in progress |
| `COMPLETED` | Job finished successfully |
| `FAILED` | Job failed with error |

### Stage Values

| Value | Description |
|-------|-------------|
| `INITIALIZING` | Job initialization |
| `SEQUENCE_RETRIEVAL` | Fetching sequences |
| `ALIGNMENT` | Running Clustal Omega |
| `COLLECTING_RESULTS` | Merging results |
| `DONE` | Successfully completed |
| `ERROR` | Error occurred |

### TTL Configuration

- **Retention Period:** 30 days from creation
- **TTL Attribute:** `ttl` (epoch seconds)
- **Calculation:** `created_at + 30 days`

Items are automatically deleted by DynamoDB after TTL expiration.

## SQLite: Local Job Database

### Database Location

```
/var/lib/pavi/jobs/jobs.db
```

### Schema

```sql
CREATE TABLE jobs (
    job_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    stage TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    input_count INTEGER DEFAULT 0,
    sequences_processed INTEGER DEFAULT 0,
    error_message TEXT,
    input_data TEXT,      -- JSON string of input payload
    result_path TEXT      -- Local path to results directory
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

### Example Row

| Column | Value |
|--------|-------|
| job_id | `550e8400-e29b-41d4-a716-446655440000` |
| status | `completed` |
| stage | `DONE` |
| created_at | `2025-01-28T10:30:00Z` |
| completed_at | `2025-01-28T10:32:45Z` |
| input_count | `5` |
| sequences_processed | `5` |
| error_message | `NULL` |
| input_data | `[{"base_seq_name": ...}]` |
| result_path | `/var/lib/pavi/results/550e8400-e29b-41d4-a716-446655440000` |

### Notes

- SQLite database is created automatically on first API startup
- No automatic cleanup; manual maintenance required
- Use `result_path` to locate results on local filesystem

## S3: Bucket Structure

### Step Functions Bucket

**Bucket Name:** `agr-pavi-pipeline-stepfunctions-{environment}`

```
s3://agr-pavi-pipeline-stepfunctions-{env}/
│
├── executions/
│   └── {execution_name}/
│       ├── work/
│       │   ├── seq_0/
│       │   │   ├── sequences.fasta
│       │   │   └── seq_info_0.json
│       │   ├── seq_1/
│       │   │   ├── sequences.fasta
│       │   │   └── seq_info_1.json
│       │   └── combined.fasta
│       │
│       └── results/
│           ├── alignment-output.aln
│           └── aligned_seq_info.json
│
└── {job_id}/                          # Alternative flat structure
    ├── alignment-output.aln
    └── aligned_seq_info.json
```

### Lifecycle Rules

| Rule | Prefix | Action | Age |
|------|--------|--------|-----|
| Expire work files | `executions/*/work/` | Delete | 30 days |
| Results | `executions/*/results/` | Retain | Indefinite |

### Object Naming Conventions

| Object | Pattern | Example |
|--------|---------|---------|
| Work FASTA | `executions/{name}/work/seq_{i}/sequences.fasta` | `executions/pavi-job-550e8400/work/seq_0/sequences.fasta` |
| Work SeqInfo | `executions/{name}/work/seq_{i}/seq_info_{i}.json` | `executions/pavi-job-550e8400/work/seq_0/seq_info_0.json` |
| Alignment | `{job_id}/alignment-output.aln` | `550e8400-.../alignment-output.aln` |
| Seq Info | `{job_id}/aligned_seq_info.json` | `550e8400-.../aligned_seq_info.json` |

### Bucket Security

- Block all public access
- Server-side encryption (SSE-S3)
- Bucket policy restricts access to PAVI IAM roles

## Local Filesystem: Directory Structure

### Base Paths

| Path | Purpose | Default |
|------|---------|---------|
| `/var/lib/pavi/jobs/` | SQLite database | `PAVI_LOCAL_JOBS_PATH` |
| `/var/lib/pavi/work/` | Temporary work files | `PAVI_LOCAL_WORK_PATH` |
| `/var/lib/pavi/results/` | Final results | `PAVI_LOCAL_RESULTS_PATH` |

### Directory Layout

```
/var/lib/pavi/
│
├── jobs/
│   └── jobs.db                        # SQLite database
│
├── work/
│   └── {job_id}/
│       ├── input.json                 # Original input payload
│       ├── seq_0-protein.fa           # Per-sequence FASTA
│       ├── seq_0-seqinfo.json         # Per-sequence metadata
│       ├── seq_1-protein.fa
│       ├── seq_1-seqinfo.json
│       └── combined.fasta             # Merged FASTA for alignment
│
└── results/
    └── {job_id}/
        ├── alignment-output.aln       # Clustal format alignment
        └── aligned_seq_info.json      # Merged sequence metadata
```

### File Permissions

```bash
# Recommended permissions
drwxr-xr-x ec2-user:ec2-user /var/lib/pavi/
drwxr-xr-x ec2-user:ec2-user /var/lib/pavi/jobs/
drwxr-xr-x ec2-user:ec2-user /var/lib/pavi/work/
drwxr-xr-x ec2-user:ec2-user /var/lib/pavi/results/
```

### Cleanup

Work files should be cleaned periodically:

```bash
# Remove work directories older than 7 days
find /var/lib/pavi/work -type d -mtime +7 -exec rm -rf {} +
```

## Data Models

### JobInfo (API Internal)

```python
@dataclass
class JobInfo:
    job_id: str                    # UUID
    status: JobStatus              # Enum
    stage: Optional[JobStage]      # Enum
    created_at: str                # ISO 8601
    completed_at: Optional[str]    # ISO 8601
    input_count: int               # Number of inputs
    sequences_processed: int       # Progress counter
    result_s3_uri: Optional[str]   # S3 result location
    error_message: Optional[str]   # Error details
    execution_arn: Optional[str]   # Step Functions ARN
```

### Pipeline_seq_region (API Input)

```python
class Pipeline_seq_region(BaseModel):
    base_seq_name: str
    unique_entry_id: str
    seq_id: str
    seq_strand: str
    exon_seq_regions: list[str | dict[str, str | int]]
    cds_seq_regions: list[str | dict[str, str | int]]
    fasta_file_url: str
    variant_ids: list[str]
    alt_seq_name_suffix: Optional[str] = None
```

### SeqInfo (Pipeline Output)

```python
class SeqInfo:
    sequence: Optional[str]
    embedded_variants: Optional[SeqEmbeddedVariantsList]
    error: Optional[str]
```

## Result File Formats

### alignment-output.aln (Clustal Format)

```
CLUSTAL O(1.2.4) multiple sequence alignment


ZFIN:ZDB-GENE-1_ref      MSTQVNLRKDQKGEEVLKLWNGISADEEPAEELLKRLPPVHPSEEEVIHLMREAGFSR
ZFIN:ZDB-GENE-1_alt      MSTQVNLRKDQKGEEVLKLWNGISADEEPAEELLKRLPPVHPSEEEVIHLMREAGFSR
MGI:1234567              MSTQVNLRKDDQKGEEVLKLWNGISADEEPAEELLKRLPPVHPSEEEV-HLMREAGFSR
                         **********:*********************************** ***********

ZFIN:ZDB-GENE-1_ref      TLSYILADD...
ZFIN:ZDB-GENE-1_alt      TLSYILADD...
MGI:1234567              TLSYILADD...
                         *********
```

### aligned_seq_info.json

```json
{
  "ZFIN:ZDB-GENE-1_ref": {
    "py/object": "seq_info.seq_info.SeqInfo",
    "embedded_variants": null,
    "error": null
  },
  "ZFIN:ZDB-GENE-1_alt": {
    "py/object": "seq_info.alt_seq_info.AltSeqInfo",
    "embedded_variants": {
      "py/object": "seq_info.alignment_embedded_variants_list.AlignmentEmbeddedVariantsList",
      "_variants": [
        {
          "py/object": "variant.alignment_embedded_variant.AlignmentEmbeddedVariant",
          "variant_id": "ZFIN:ZDB-ALT-210128-3",
          "genomic_seq_id": "NC_007120.7",
          "genomic_start_pos": 46379800,
          "genomic_end_pos": 46379800,
          "genomic_ref_seq": "G",
          "genomic_alt_seq": "A",
          "seq_substitution_type": "SUBSTITUTION",
          "alignment_start_pos": 15,
          "alignment_end_pos": 15
        }
      ]
    }
  }
}
```

## Environment-Specific Configuration

### Development

| Storage | Value |
|---------|-------|
| DynamoDB Table | `pavi-jobs-dev` |
| S3 Bucket | `agr-pavi-pipeline-stepfunctions-dev` |

### Staging

| Storage | Value |
|---------|-------|
| DynamoDB Table | `pavi-jobs-staging` |
| S3 Bucket | `agr-pavi-pipeline-stepfunctions-staging` |

### Production

| Storage | Value |
|---------|-------|
| DynamoDB Table | `pavi-jobs-prod` |
| S3 Bucket | `agr-pavi-pipeline-stepfunctions-prod` |

### Local

| Storage | Value |
|---------|-------|
| SQLite | `/var/lib/pavi/jobs/jobs.db` |
| Results | `/var/lib/pavi/results/` |

## Related Documentation

- [Configuration Reference](configuration-reference.md) - Storage configuration variables
- [Data Flow Diagrams](data-flows.md) - How data moves through storage
- [Troubleshooting](troubleshooting.md) - Storage-related issues
