# Data Flow Diagrams

This document describes data flows through PAVI for different operations and execution modes.

## Job Submission Flow

### WebUI → API → Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  /submit page                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. User enters gene/allele selection                             │   │
│  │ 2. AlignmentEntry components fetch gene data from Alliance API   │   │
│  │ 3. User clicks "Run Pipeline"                                    │   │
│  │ 4. JobSubmitForm builds payload from entries                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              │ POST /api/pipeline-job/                  │
│                              ▼                                          │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               │ JSON payload:
                               │ [{ base_seq_name, unique_entry_id,
                               │    seq_id, seq_strand, exon_seq_regions,
                               │    cds_seq_regions, fasta_file_url,
                               │    variant_ids }]
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  main.py: submit_pipeline_job()                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Validate request body (Pydantic)                              │   │
│  │ 2. Generate UUID                                                 │   │
│  │ 3. Determine execution mode (config)                             │   │
│  │ 4. Create job record                                             │   │
│  │ 5. Start background execution                                    │   │
│  │ 6. Return job UUID immediately (201 Created)                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              │ Async execution                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ execution mode switch:                                           │   │
│  │   - USE_LOCAL_PIPELINE=true  → LocalPipelineRunner               │   │
│  │   - USE_STEP_FUNCTIONS=true  → Step Functions                    │   │
│  │   - default (legacy)         → Nextflow                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Pipeline Execution Flow

### Mode 1: Local Pipeline (EC2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LOCAL PIPELINE RUNNER                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Stage: INITIALIZING                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Create job directory: /var/lib/pavi/work/{job_id}/           │   │
│  │ 2. Write input JSON to work directory                           │   │
│  │ 3. Update job status in SQLite                                  │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│  Stage: SEQUENCE_RETRIEVAL    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ For each input sequence (parallel, max_workers=4):              │   │
│  │                                                                  │   │
│  │   ┌──────────────────────────────────────────────────────────┐  │   │
│  │   │ seq_retrieval module:                                     │  │   │
│  │   │ 1. Fetch FASTA file (HTTP → local cache)                 │  │   │
│  │   │ 2. Fetch variants from Alliance API                       │  │   │
│  │   │ 3. Extract exon sequences from FASTA                      │  │   │
│  │   │ 4. Translate to protein                                   │  │   │
│  │   │ 5. Embed variants                                         │  │   │
│  │   │ 6. Write: work/{job_id}/seq_{i}-protein.fa               │  │   │
│  │   │ 7. Write: work/{job_id}/seq_{i}-seqinfo.json             │  │   │
│  │   └──────────────────────────────────────────────────────────┘  │   │
│  │                                                                  │   │
│  │ Output: N FASTA files + N seqinfo JSON files                    │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│  Stage: ALIGNMENT             ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Merge all FASTA files → combined.fasta                       │   │
│  │ 2. Run clustalo:                                                │   │
│  │    clustalo -i combined.fasta -o alignment-output.aln           │   │
│  │ 3. Wait for completion                                          │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│  Stage: COLLECTING_RESULTS    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Parse alignment file                                         │   │
│  │ 2. Merge all seqinfo JSON files                                 │   │
│  │ 3. Update variant positions with alignment coordinates          │   │
│  │ 4. Write: results/{job_id}/alignment-output.aln                │   │
│  │ 5. Write: results/{job_id}/aligned_seq_info.json               │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│  Stage: DONE                  ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Update job status: COMPLETED                                 │   │
│  │ 2. Clean up work directory (optional)                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Storage:
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ /var/lib/pavi/jobs/  │  │ /var/lib/pavi/work/  │  │/var/lib/pavi/results/│
│ └── jobs.db          │  │ └── {job_id}/        │  │ └── {job_id}/        │
│     (SQLite)         │  │     ├── seq_0-*.fa   │  │     ├── alignment-   │
│                      │  │     ├── seq_0-*.json │  │     │   output.aln   │
│                      │  │     └── combined.fa  │  │     └── aligned_     │
│                      │  │                      │  │         seq_info.json│
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

### Mode 2: AWS Step Functions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STEP FUNCTIONS                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  API: start_execution()                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Create DynamoDB job record                                   │   │
│  │ 2. Start Step Functions execution with input JSON               │   │
│  │ 3. Store execution ARN in job record                            │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    STATE MACHINE                                 │   │
│  │                                                                  │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │   │
│  │  │ InitJob     │──▶│ SeqRetrieval│──▶│ Alignment   │            │   │
│  │  │ (Lambda)    │   │ (Map State) │   │ (Batch)     │            │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘            │   │
│  │                           │                   │                  │   │
│  │                           │ Parallel          │                  │   │
│  │                           │ (N tasks)         │                  │   │
│  │                           ▼                   ▼                  │   │
│  │                    ┌─────────────┐   ┌─────────────┐            │   │
│  │                    │ SeqRetrieval│   │ CollectInfo │            │   │
│  │                    │ (Batch)     │   │ (Lambda)    │            │   │
│  │                    └─────────────┘   └─────────────┘            │   │
│  │                                              │                   │   │
│  │                                              ▼                   │   │
│  │                                      ┌─────────────┐            │   │
│  │                                      │ FinalizeJob │            │   │
│  │                                      │ (Lambda)    │            │   │
│  │                                      └─────────────┘            │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Storage:
┌──────────────────────┐  ┌───────────────────────────────────────────────┐
│ DynamoDB             │  │ S3: agr-pavi-pipeline-stepfunctions-{env}/    │
│ Table: pavi-jobs-{env}│  │                                               │
│                      │  │ executions/{execution_name}/                  │
│ Item:                │  │ ├── work/                                     │
│ ├── job_id (PK)      │  │ │   ├── seq_0/                                │
│ ├── status           │  │ │   │   ├── sequences.fasta                   │
│ ├── stage            │  │ │   │   └── seq_info_0.json                   │
│ ├── execution_arn    │  │ │   └── ...                                   │
│ ├── result_s3_uri    │  │ └── results/                                  │
│ └── ttl (30 days)    │  │     ├── alignment-output.aln                  │
│                      │  │     └── aligned_seq_info.json                 │
└──────────────────────┘  └───────────────────────────────────────────────┘
```

### Mode 3: Nextflow (Legacy)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            NEXTFLOW                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  API: submit via subprocess                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Create in-memory job record                                  │   │
│  │ 2. Write input to S3                                            │   │
│  │ 3. Spawn nextflow process                                       │   │
│  │ 4. Background thread monitors execution                         │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    NEXTFLOW PIPELINE                             │   │
│  │                                                                  │   │
│  │  nextflow run main.nf                                           │   │
│  │    --input_file s3://bucket/input.json                          │   │
│  │    --out_dir s3://bucket/output/                                │   │
│  │                                                                  │   │
│  │  Processes:                                                      │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │   │
│  │  │ getSeqInfo  │──▶│ runAlignment│──▶│ collectInfo │            │   │
│  │  │ (parallel)  │   │ (clustalo)  │   │ (merge)     │            │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘            │   │
│  │                                                                  │   │
│  │  AWS Batch execution via Nextflow Tower or direct               │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Storage:
┌──────────────────────┐  ┌───────────────────────────────────────────────┐
│ In-Memory            │  │ S3: agr-pavi-pipeline-nextflow/               │
│                      │  │                                               │
│ Dict[job_id, Job]    │  │ {tag}/                                        │
│                      │  │ ├── work/                                     │
│ (lost on restart)    │  │ │   └── ... (nextflow work dirs)              │
│                      │  │ └── output/                                   │
│                      │  │     ├── alignment-output.aln                  │
│                      │  │     └── aligned_seq_info.json                 │
└──────────────────────┘  └───────────────────────────────────────────────┘
```

## Result Retrieval Flow

### GET /api/pipeline-job/{uuid}/result/alignment

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           WebUI                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  AlignmentResultView component                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Poll job status until COMPLETED                              │   │
│  │ 2. Fetch alignment: GET /api/pipeline-job/{uuid}/result/alignment│  │
│  │ 3. Fetch seq-info: GET /api/pipeline-job/{uuid}/result/seq-info │   │
│  │ 4. Parse Clustal format with clustal-js                         │   │
│  │ 5. Extract variants from seq-info JSON                          │   │
│  │ 6. Render InteractiveAlignment or VirtualizedAlignment          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  get_alignment_result()                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Get job from store (DynamoDB/SQLite/memory)                  │   │
│  │ 2. Verify status == COMPLETED                                   │   │
│  │ 3. Determine result location:                                   │   │
│  │    - Local: /var/lib/pavi/results/{uuid}/alignment-output.aln   │   │
│  │    - S3: s3://bucket/{uuid}/alignment-output.aln                │   │
│  │ 4. Stream file content to response                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Storage                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Local Mode:                                                            │
│  /var/lib/pavi/results/{uuid}/                                         │
│  ├── alignment-output.aln                                              │
│  └── aligned_seq_info.json                                             │
│                                                                         │
│  AWS Mode:                                                              │
│  s3://agr-pavi-pipeline-{env}/{uuid}/                                  │
│  ├── alignment-output.aln                                              │
│  └── aligned_seq_info.json                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

### Pipeline Error

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Error Occurs                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  At any stage:                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Exception raised in:                                            │   │
│  │   - seq_retrieval (FASTA fetch, variant fetch, translation)     │   │
│  │   - alignment (clustalo execution)                              │   │
│  │   - result collection (file merge)                              │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  Error capture:                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Catch exception                                              │   │
│  │ 2. Extract error message (including __notes__)                  │   │
│  │ 3. Truncate if > 1000 characters                                │   │
│  │ 4. Update job record:                                           │   │
│  │    - status = FAILED                                            │   │
│  │    - stage = ERROR                                              │   │
│  │    - error_message = exception description                      │   │
│  │ 5. Stop further processing                                      │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│                               ▼                                         │
│  Client retrieval:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ GET /api/pipeline-job/{uuid}                                    │   │
│  │                                                                  │   │
│  │ Response:                                                        │   │
│  │ {                                                                │   │
│  │   "uuid": "...",                                                │   │
│  │   "status": "failed",                                           │   │
│  │   "stage": "ERROR",                                             │   │
│  │   "error_message": "Sequence retrieval failed: ..."             │   │
│  │ }                                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Result endpoints:                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ GET /api/pipeline-job/{uuid}/result/alignment                   │   │
│  │                                                                  │   │
│  │ Response: 400 Bad Request                                       │   │
│  │ { "detail": "Job failed: Sequence retrieval failed: ..." }      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Partial Errors (Sequence-Level)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Partial Error Handling                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  During sequence retrieval:                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Input: [seq_1, seq_2, seq_3]                                    │   │
│  │                                                                  │   │
│  │ seq_1: Success → FASTA + SeqInfo                                │   │
│  │ seq_2: Error → SeqInfo with error field                         │   │
│  │ seq_3: Success → FASTA + SeqInfo                                │   │
│  │                                                                  │   │
│  │ SeqInfo for seq_2:                                              │   │
│  │ {                                                                │   │
│  │   "sequence": null,                                             │   │
│  │   "embedded_variants": null,                                    │   │
│  │   "error": "FASTA file not accessible: 404 Not Found"           │   │
│  │ }                                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Pipeline continues with available sequences:                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ - Alignment runs with seq_1 and seq_3                           │   │
│  │ - Result includes seq_2 error in aligned_seq_info.json          │   │
│  │ - Job completes with COMPLETED status                           │   │
│  │ - WebUI displays warning for failed sequence                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Status Polling Flow

### Recommended Polling Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WebUI Polling                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  JobProgressTracker component                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  poll() {                                                        │   │
│  │    delays = [500, 1000, 2000, 5000, 10000] // ms                 │   │
│  │    attempt = 0                                                   │   │
│  │                                                                  │   │
│  │    while (true) {                                                │   │
│  │      response = GET /api/pipeline-job/{uuid}                     │   │
│  │                                                                  │   │
│  │      if (response.status in ['completed', 'failed']) {           │   │
│  │        return response                                           │   │
│  │      }                                                           │   │
│  │                                                                  │   │
│  │      // Update UI with stage/progress                            │   │
│  │      updateProgress(response.stage, response.sequences_processed)│   │
│  │                                                                  │   │
│  │      // Exponential backoff with cap                             │   │
│  │      delay = delays[min(attempt++, delays.length - 1)]          │   │
│  │      sleep(delay)                                                │   │
│  │    }                                                             │   │
│  │  }                                                               │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Timeline:                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ t=0s     t=0.5s   t=1.5s   t=3.5s   t=8.5s   t=18.5s ...       │   │
│  │   │        │        │        │        │        │                │   │
│  │   ▼        ▼        ▼        ▼        ▼        ▼                │   │
│  │ poll()  poll()   poll()   poll()   poll()   poll()              │   │
│  │                                                                  │   │
│  │ Delays:  500ms   1000ms   2000ms   5000ms   10000ms (capped)    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Related Documentation

- [API Reference](api-reference.md) - Endpoint details
- [seq-retrieval Architecture](seq-retrieval-architecture.md) - Pipeline component details
- [Configuration Reference](configuration-reference.md) - Environment variables
- [Troubleshooting](troubleshooting.md) - Error diagnosis
