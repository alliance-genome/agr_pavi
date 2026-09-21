# API Reference

This document provides a complete reference for the PAVI REST API.

## Base URL

| Environment | Base URL |
|-------------|----------|
| Local Development | `http://localhost:8000/api` |
| Local Docker | `http://localhost:8080/api` |
| Production | `https://pavi.alliancegenome.org/api` |

## Authentication

Currently, **no authentication is required** for any endpoints. All endpoints are publicly accessible.

## Endpoints

### GET /api/

Returns a welcome message with API documentation link.

**Response:**
```json
{
  "help": "Welcome to the PAVI API! For more information on how to use it, see the docs at {host}/docs"
}
```

**curl Example:**
```bash
curl http://localhost:8000/api/
```

---

### GET /api/health

Health check endpoint used by load balancers and monitoring systems.

**Response (Local Pipeline mode):**
```json
{
  "status": "up",
  "execution_mode": "local_pipeline",
  "environment": "local",
  "local_paths": {
    "jobs": "/var/lib/pavi/jobs",
    "results": "/var/lib/pavi/results",
    "work": "/var/lib/pavi/work"
  }
}
```

**Response (Step Functions mode):**
```json
{
  "status": "up",
  "execution_mode": "step_functions",
  "environment": "prod"
}
```

**Response (with rollout enabled):**
```json
{
  "status": "up",
  "execution_mode": "step_functions",
  "environment": "dev",
  "rollout": {
    "enabled": true,
    "percentage": 50
  }
}
```

**curl Example:**
```bash
curl http://localhost:8000/api/health
```

---

### GET /api/deployment-status

Returns detailed status of all PAVI infrastructure components.

**Response:**
```json
{
  "overall_status": "healthy",
  "environment": "prod",
  "components": {
    "api": {
      "name": "API Service",
      "status": "healthy",
      "environment": "prod",
      "execution_mode": "step_functions",
      "details": {
        "host": "0.0.0.0",
        "port": 8080,
        "debug": false
      }
    },
    "step_functions": {
      "name": "Step Functions",
      "status": "healthy",
      "details": {
        "arn": "arn:aws:states:us-east-1:...",
        "name": "pavi-pipeline-prod",
        "state": "ACTIVE"
      }
    },
    "batch": {
      "name": "AWS Batch",
      "status": "healthy",
      "details": {
        "arn": "arn:aws:batch:us-east-1:...",
        "name": "pavi-job-queue-prod",
        "state": "ENABLED",
        "status": "VALID"
      }
    },
    "dynamodb": {
      "name": "DynamoDB Jobs Table",
      "status": "healthy",
      "details": {
        "table_name": "pavi-jobs-prod",
        "status": "ACTIVE",
        "item_count": 1234
      }
    },
    "s3_results": {
      "name": "S3 Results Bucket",
      "status": "healthy",
      "details": {
        "bucket_name": "agr-pavi-pipeline-stepfunctions-prod"
      }
    }
  }
}
```

**Component Status Values:**
- `healthy` - Component is operational
- `degraded` - Component has issues but is functional
- `unhealthy` - Component is failing
- `unavailable` - Component cannot be reached
- `disabled` - Component is not configured
- `error` - Error checking component status

**Overall Status Values:**
- `healthy` - All components healthy
- `degraded` - Some components have issues
- `unavailable` - Critical components unavailable
- `unknown` - Unable to determine status

**curl Example:**
```bash
curl http://localhost:8000/api/deployment-status
```

---

### POST /api/pipeline-job/

Submit a new alignment job.

**Request Body:**
```json
[
  {
    "base_seq_name": "ZFIN:ZDB-GENE-030131-3068-R67G",
    "unique_entry_id": "zfin-gene-1",
    "seq_id": "NC_007120.7",
    "seq_strand": "+",
    "exon_seq_regions": [
      {"start": 46379756, "end": 46379851},
      {"start": 46381473, "end": 46381609}
    ],
    "cds_seq_regions": [
      {"start": 46379756, "end": 46379851, "frame": 0},
      {"start": 46381473, "end": 46381609, "frame": 1}
    ],
    "fasta_file_url": "https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/002/035/GCF_000002035.6_GRCz11/GCF_000002035.6_GRCz11_genomic.fna.gz",
    "variant_ids": ["ZFIN:ZDB-ALT-210128-3"]
  }
]
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `base_seq_name` | string | Yes | Base name for the sequence (displayed in alignment) |
| `unique_entry_id` | string | Yes | Unique identifier for output file naming |
| `seq_id` | string | Yes | Chromosome/contig identifier (e.g., NC_007120.7) |
| `seq_strand` | string | Yes | Strand: `+`, `+1`, `pos` (positive) or `-`, `-1`, `neg` (negative) |
| `exon_seq_regions` | array | Yes | Exon regions as objects or strings |
| `cds_seq_regions` | array | No | CDS regions with frame (0-2) |
| `fasta_file_url` | string | Yes | URL to faidx-indexed FASTA file |
| `variant_ids` | array | No | Alliance variant IDs to embed |
| `alt_seq_name_suffix` | string | No | Suffix for alternative sequences (default: `_alt`) |

**Region Formats:**
```json
// Object format (preferred)
{"start": 1234, "end": 5678, "frame": 0}

// String format (auto-converted)
"1234..5678"
```

**Response (201 Created):**
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "name": "pavi-job-550e8400-e29b-41d4-a716-446655440000",
  "input_count": 1
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | string | Job UUID for status polling and result retrieval |
| `status` | string | Job status: `pending`, `running`, `completed`, `failed` |
| `name` | string | Internal job name |
| `stage` | string | Current pipeline stage (optional) |
| `input_count` | integer | Number of input sequences |
| `sequences_processed` | integer | Sequences processed so far (optional) |
| `error_message` | string | Error details if failed (optional) |
| `task_events` | array | List of task event descriptions (optional) |

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/pipeline-job/ \
  -H "Content-Type: application/json" \
  -d '[
    {
      "base_seq_name": "ZFIN:ZDB-GENE-030131-3068-R67G",
      "unique_entry_id": "test-1",
      "seq_id": "NC_007120.7",
      "seq_strand": "+",
      "exon_seq_regions": [{"start": 46379756, "end": 46379851}],
      "cds_seq_regions": [{"start": 46379756, "end": 46379851, "frame": 0}],
      "fasta_file_url": "https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/002/035/GCF_000002035.6_GRCz11/GCF_000002035.6_GRCz11_genomic.fna.gz",
      "variant_ids": []
    }
  ]'
```

---

### GET /api/pipeline-job/{uuid}

Get job status and details.

**Path Parameters:**
- `uuid` (required) - Job UUID returned from POST /api/pipeline-job/

**Response (Running):**
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "name": "pavi-job-550e8400-e29b-41d4-a716-446655440000",
  "stage": "ALIGNMENT",
  "input_count": 5,
  "sequences_processed": 5
}
```

**Response (Completed):**
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "name": "pavi-job-550e8400-e29b-41d4-a716-446655440000",
  "stage": "DONE",
  "input_count": 5,
  "sequences_processed": 5
}
```

**Response (Failed):**
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "name": "pavi-job-550e8400-e29b-41d4-a716-446655440000",
  "stage": "ERROR",
  "input_count": 5,
  "error_message": "Sequence retrieval failed: FASTA file not found"
}
```

**Pipeline Stages:**
- `INITIALIZING` - Job initialization
- `SEQUENCE_RETRIEVAL` - Fetching protein sequences
- `ALIGNMENT` - Running Clustal Omega
- `COLLECTING_RESULTS` - Merging results and metadata
- `DONE` - Completed successfully
- `ERROR` - Error occurred

**Error Responses:**
- `404 Not Found` - Job not found
- `500 Internal Server Error` - Error retrieving job

**curl Example:**
```bash
curl http://localhost:8000/api/pipeline-job/550e8400-e29b-41d4-a716-446655440000
```

---

### GET /api/pipeline-job/{uuid}/result/alignment

Retrieve the alignment result file in Clustal format.

**Path Parameters:**
- `uuid` (required) - Job UUID

**Response:**
- Content-Type: `text/plain`
- Body: Clustal format alignment file

**Example Response:**
```
CLUSTAL O(1.2.4) multiple sequence alignment

ZFIN:ZDB-GENE-1    MSTQVNLRK-DQKGEEVLKLWNGISADEEPAEELLKRLPPVHPSEEEVIHLMREAGFSR
MGI:1234567        MSTQVNLRKDDQKGEEVLKLWNGISADEEPAEELLKRLPPVHPSEEEV-HLMREAGFSR
                   **********:*********************************** ***********
```

**Error Responses:**
- `400 Bad Request` - Job not completed or failed
  - `{"detail": "Results not ready. Job status: running"}`
  - `{"detail": "Job failed: error_message"}`
- `404 Not Found` - Job or result file not found
  - `{"detail": "Job not found."}`
  - `{"detail": "Result file not found."}`
- `500 Internal Server Error` - Error retrieving job

**curl Example:**
```bash
curl http://localhost:8000/api/pipeline-job/550e8400-e29b-41d4-a716-446655440000/result/alignment
```

---

### GET /api/pipeline-job/{uuid}/result/seq-info

Retrieve sequence metadata with alignment coordinates.

**Path Parameters:**
- `uuid` (required) - Job UUID

**Response:**
- Content-Type: `application/json`
- Body: JSON object with sequence information

**Example Response:**
```json
{
  "ZFIN:ZDB-GENE-1": {
    "py/object": "seq_info.seq_info.SeqInfo",
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

**Error Responses:**
- Same as `/result/alignment` endpoint

**curl Example:**
```bash
curl http://localhost:8000/api/pipeline-job/550e8400-e29b-41d4-a716-446655440000/result/seq-info
```

---

### GET /api/pipeline-job/{uuid}/logs

Retrieve job execution logs.

**Path Parameters:**
- `uuid` (required) - Job UUID

**Response:**
- Content-Type: `text/plain`
- Body: Log output text

**Implementation Status:**
- Nextflow mode: Implemented
- Step Functions mode: Not yet implemented
- Local pipeline mode: Not yet implemented

**Error Responses:**
- `400 Bad Request` - Job not completed or failed
  - `{"detail": "Job logs only available for failed or completed jobs"}`
- `404 Not Found` - Job or logs not found
- `501 Not Implemented` - Log retrieval not implemented for current mode

**curl Example:**
```bash
curl http://localhost:8000/api/pipeline-job/550e8400-e29b-41d4-a716-446655440000/logs
```

---

## Error Response Format

All error responses use the standard FastAPI HTTP exception format:

```json
{
  "detail": "Error message describing the problem"
}
```

## Job Lifecycle

```
         ┌──────────────────────────────────────────────────┐
         │                                                  │
         ▼                                                  │
     ┌───────┐        ┌─────────┐        ┌───────────┐     │
     │PENDING│───────▶│ RUNNING │───────▶│ COMPLETED │     │
     └───────┘        └─────────┘        └───────────┘     │
                           │                                │
                           │                                │
                           ▼                                │
                      ┌────────┐                            │
                      │ FAILED │────────────────────────────┘
                      └────────┘         (retry possible)
```

## Polling Strategy

When polling for job status, use exponential backoff:

```javascript
const pollJob = async (uuid) => {
  const delays = [500, 1000, 2000, 5000, 10000]; // ms
  let attempt = 0;

  while (true) {
    const response = await fetch(`/api/pipeline-job/${uuid}`);
    const job = await response.json();

    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    await sleep(delays[Math.min(attempt++, delays.length - 1)]);
  }
};
```

## Rate Limits

Currently, **no rate limits** are enforced. However, the following practices are recommended:

- Poll job status no more frequently than once per second
- Submit jobs in batches rather than individually when processing many sequences
- Use exponential backoff for retries

## OpenAPI Documentation

Interactive API documentation is available at:

- Swagger UI: `{base_url}/docs`
- ReDoc: `{base_url}/redoc`
- OpenAPI JSON: `{base_url}/openapi.json`

## Related Documentation

- [Configuration Reference](configuration-reference.md) - Environment variables
- [Troubleshooting](troubleshooting.md) - Common API errors
- [Data Flow Diagrams](data-flows.md) - Request/response flows
