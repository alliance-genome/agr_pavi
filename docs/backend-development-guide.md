# Backend Development Guide

This guide covers everything needed to develop, test, and extend the PAVI backend: the FastAPI API, the pipeline components (sequence retrieval and alignment), the job service layer, and the shared AWS package.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Getting Started](#getting-started)
3. [API Development](#api-development)
4. [Pipeline Development](#pipeline-development)
5. [Storage Layer](#storage-layer)
6. [Testing](#testing)
7. [Code Quality](#code-quality)
8. [Shared AWS Package](#shared-aws-package)

---

## Architecture Overview

### System Components

The PAVI backend consists of three main layers:

```
                    +--------------------------+
                    |        WebUI (Next.js)   |
                    |  /submit /progress /result|
                    +-----------+--------------+
                                |
                                | HTTP (REST)
                                v
+---------------------------------------------------------------+
|                      FastAPI API (api/)                         |
|  main.py   config.py   job_service.py   local_job_store.py     |
|                                                                 |
|  Endpoints:                                                     |
|    POST /api/pipeline-job/         (submit job)                 |
|    GET  /api/pipeline-job/{uuid}   (poll status)                |
|    GET  /api/pipeline-job/{uuid}/result/alignment               |
|    GET  /api/pipeline-job/{uuid}/result/seq-info                |
|    GET  /api/pipeline-job/{uuid}/logs                           |
|    GET  /api/health                                             |
|    GET  /api/deployment-status                                  |
+-------+-----------+-----------+-------------------------------+
        |           |           |
        v           v           v
  +-----------+ +---------+ +-------------------+
  |  SQLite   | | DynamoDB| | In-memory (legacy)|
  | (local)   | | + S3    | |                   |
  +-----------+ +---------+ +-------------------+
        |           |           |
        v           v           v
+---------------------------------------------------------------+
|               Pipeline Execution Layer                         |
|                                                                 |
|  LocalPipelineRunner    Step Functions + Batch    Nextflow      |
|  (local_pipeline.py)    (AWS orchestration)       (legacy)     |
+-------+-----------+------+-----------------------------------+
        |           |      |
        v           v      v
+--------------------+  +---------------------+
| seq_retrieval/     |  | alignment/          |
|   Fetch FASTA      |  |   Clustal Omega     |
|   Translate to     |  |   Multiple seq      |
|   protein          |  |   alignment         |
|   Embed variants   |  |                     |
+--------------------+  +---------------------+
```

### Three Execution Modes

| Mode | Storage | Orchestration | Compute | Use Case |
|------|---------|---------------|---------|----------|
| **Local Pipeline** | SQLite + local filesystem | `LocalPipelineRunner` | Direct Python + clustalo | EC2 dev server |
| **Step Functions** | DynamoDB + S3 | AWS Step Functions | AWS Batch containers | Production |
| **Nextflow** (legacy) | In-memory | Nextflow subprocess | Docker containers | Deprecated |

The mode is selected by environment variables in priority order:

```
1. USE_LOCAL_PIPELINE=true  --> Local Pipeline mode
2. USE_STEP_FUNCTIONS=true  --> Step Functions mode
3. Auto-detect by environment (dev/staging/prod = Step Functions, local = Nextflow)
```

### Request Flow

1. Client sends `POST /api/pipeline-job/` with a list of sequence regions
2. API creates a job record in the appropriate store (SQLite, DynamoDB, or in-memory)
3. Pipeline execution starts in a `BackgroundTasks` handler
4. Client polls `GET /api/pipeline-job/{uuid}` for status updates
5. Once completed, client fetches results from `/result/alignment` and `/result/seq-info`

### Pipeline Stages

```
PENDING --> RUNNING
              |
              +--> SEQUENCE_RETRIEVAL  (parallel per region)
              |         |
              |         v
              +--> ALIGNMENT           (Clustal Omega)
              |         |
              |         v
              +--> COLLECTING_RESULTS  (merge metadata + alignment positions)
              |         |
              |         v
              +--> DONE
              |
              +--> ERROR (on failure at any stage)
```

---

## Getting Started

### Prerequisites

- **Python 3.12** (exact version required -- see `requires-python = "==3.12.*"` in pyproject.toml)
- **Java 17** (required for Nextflow mode only -- `JAVA_HOME` set via `/usr/libexec/java_home -v 17`)
- **Clustal Omega** (required for local pipeline mode -- `clustalo` in PATH)
- **Make** (build orchestration)
- **Docker** (for container builds and integration tests)

### Setting Up the API

```bash
cd api/

# Create virtual environment and install dependencies (handled by Makefile)
make install-deps

# Install test dependencies
make install-test-deps

# Verify the virtual environment
.venv/bin/python --version
# Python 3.12.x
```

The Makefile creates `.venv/` automatically using `pip-tools` for dependency resolution. Dependencies are defined in `pyproject.toml`:

```
# Production dependencies
fastapi[standard-no-fastapi-cloud-cli]==0.120.*
smart-open[s3]==7.3.*

# Test dependencies (optional)
flake8==7.3.*
mypy==1.18.*
pytest==8.4.*
pytest-cov==7.0.*
pytest-mock==3.15.*
httpx==0.28.*
```

### Running the API Dev Server

```bash
cd api/

# Nextflow mode (requires Java 17, Nextflow artifacts)
make run-server-dev

# Local pipeline mode (requires clustalo, seq_retrieval venv)
cd src/
USE_LOCAL_PIPELINE=true ../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

# FastAPI dev mode uses port 8000 with auto-reload
# Docker container uses port 8080
```

The dev server auto-reloads on code changes. API docs are available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

### Setting Up seq_retrieval

```bash
cd pipeline_components/seq_retrieval/

# Install dependencies
make install-deps

# Verify key imports
.venv/bin/python -c "
import click
import pysam
import Bio
import jsonpickle
print('All imports successful')
"
```

Dependencies (`pyproject.toml`):

```
biopython==1.85
click==8.3.*
pysam==0.23.*
requests==2.32.*
jsonpickle==4.1.*
```

### Setting Up Clustal Omega

The alignment component uses Clustal Omega directly. For local development:

```bash
# macOS
brew install clustal-omega

# Amazon Linux 2
sudo yum install clustal-omega

# Verify
clustalo --version
```

The alignment component runs `clustalo` inside a Docker container in production. For local pipeline mode, it calls `clustalo` directly from PATH.

---

## API Development

### Application Structure

```
api/
  src/
    main.py              # FastAPI app, router, all endpoint handlers
    config.py            # Configuration dataclasses and environment loading
    job_service.py       # Job lifecycle management (create, start, get, sync)
    local_job_store.py   # SQLite-based job persistence
    local_pipeline.py    # Local pipeline runner (EC2 mode)
    constants.py         # Enums (JobStatus)
    log_mgmt/            # Logging configuration
  tests/
    a_unit/              # Unit tests (run first due to prefix)
      test_main.py       # API endpoint tests
      test_job_service.py # Job service tests
    b_integration/       # Integration tests (run second)
      test_main.py
      helper_fns.py
    resources/           # Test data files
  pyproject.toml         # Dependencies and tool config
  pytest.ini             # pytest configuration
  .coveragerc            # Coverage configuration
  Makefile               # Build and run targets
```

### Configuration System

Configuration is managed through dataclasses in `api/src/config.py`:

```python
@dataclass
class PipelineConfig:
    # Step Functions
    state_machine_arn: Optional[str]
    use_step_functions: bool

    # DynamoDB
    jobs_table_name: str

    # S3
    results_bucket: str
    work_bucket: str

    # Batch
    job_queue_arn: Optional[str]

    # Feature flags
    enable_step_functions_rollout: bool
    step_functions_rollout_percentage: int  # 0-100

    # Local pipeline execution (for EC2 deployment)
    use_local_pipeline: bool = False
    local_jobs_path: str = "/var/lib/pavi/jobs"
    local_results_path: str = "/var/lib/pavi/results"
    local_work_path: str = "/var/lib/pavi/work"
    local_max_workers: int = 4
    pipeline_components_path: str = "/home/ec2-user/agr_pavi/pipeline_components"

@dataclass
class APIConfig:
    environment: Environment  # LOCAL, DEV, STAGING, PROD
    debug: bool
    pipeline: PipelineConfig
    api_host: str
    api_port: int
    nextflow_out_dir: str
    pipeline_image_tag: str
```

Configuration is loaded from environment variables with sensible per-environment defaults. The singleton `get_api_config()` function builds and caches the config once at startup.

Key environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PAVI_ENVIRONMENT` | `local` | Environment name (local/dev/staging/prod) |
| `USE_LOCAL_PIPELINE` | `false` | Enable local pipeline mode |
| `USE_STEP_FUNCTIONS` | Auto-detect | Override Step Functions usage |
| `PAVI_LOCAL_JOBS_PATH` | `/var/lib/pavi/jobs` | SQLite database directory |
| `PAVI_LOCAL_RESULTS_PATH` | `/var/lib/pavi/results` | Results directory |
| `PAVI_LOCAL_WORK_PATH` | `/var/lib/pavi/work` | Work files directory |
| `PAVI_LOCAL_MAX_WORKERS` | `4` | Max parallel seq_retrieval tasks |
| `PAVI_PIPELINE_COMPONENTS_PATH` | `/home/ec2-user/agr_pavi/pipeline_components` | Path to pipeline components |

See [Configuration Reference](configuration-reference.md) for the complete list.

### Endpoints

All endpoints are prefixed with `/api` via `APIRouter(prefix="/api")` and defined in `api/src/main.py`.

#### POST /api/pipeline-job/ (Submit Job)

Creates a new alignment job and starts background execution.

```python
@router.post("/pipeline-job/", status_code=201, response_model_exclude_none=True)
async def create_new_pipeline_job(
    pipeline_seq_regions: list[Pipeline_seq_region], background_tasks: BackgroundTasks
) -> Pipeline_job:
```

Request body is a JSON list of `Pipeline_seq_region` objects:

```json
[
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
]
```

Response (201):

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "name": "pavi-job-550e8400-e29b-41d4-a716-446655440000",
  "input_count": 1
}
```

#### GET /api/pipeline-job/{uuid} (Poll Status)

Returns current job status. For Step Functions mode, auto-syncs status from the execution before returning.

```python
@router.get("/pipeline-job/{uuid}", response_model_exclude_none=True)
async def get_pipeline_job_handler(uuid: UUID) -> Pipeline_job:
```

#### GET /api/pipeline-job/{uuid}/result/alignment (Get Alignment)

Returns the Clustal format alignment file as `text/plain`. Returns 400 if job is not completed.

#### GET /api/pipeline-job/{uuid}/result/seq-info (Get Sequence Info)

Returns sequence metadata JSON with alignment-mapped variant positions. Returns 400 if job is not completed.

#### GET /api/health (Health Check)

Used by load balancers. Returns execution mode and environment info.

#### GET /api/deployment-status (Infrastructure Status)

Returns component-level health for API, Step Functions, Batch, DynamoDB, and S3.

### Job Lifecycle and Service Architecture

The `JobService` class in `api/src/job_service.py` abstracts all job management operations across the three execution modes.

```python
class JobService:
    def __init__(self, use_step_functions=True, use_local_pipeline=False):
        ...

    def create_job(self, seq_regions: list[dict]) -> JobInfo:
        # Routes to: local_store.create_job / _store_job_dynamodb / _local_jobs

    def start_job(self, job_id: str, seq_regions: list[dict]) -> Optional[JobInfo]:
        # Routes to: _start_local_pipeline_execution / _start_step_functions_execution / _start_local_execution

    def get_job(self, job_id: str) -> Optional[JobInfo]:
        # Routes to: _get_job_local_store / _get_job_dynamodb / _local_jobs.get

    def get_job_with_sync(self, job_id: str) -> Optional[JobInfo]:
        # For Step Functions: syncs status from execution before returning

    def get_job_result_alignment(self, job_id: str) -> Optional[bytes]:
        # Routes to: local filesystem / S3 / Nextflow filesystem

    def get_job_result_seqinfo(self, job_id: str) -> Optional[bytes]:
        # Same routing as alignment
```

Key design patterns:

- **Singleton access**: `get_job_service()` returns a cached instance configured from `get_api_config()`
- **Lazy initialization**: AWS clients (DynamoDB, SFN, S3) and local stores are created on first use
- **Background execution**: Pipeline runs via FastAPI `BackgroundTasks` to avoid blocking the request
- **Progress callbacks**: The `LocalPipelineRunner` accepts a callback to update job stage and progress

Exception hierarchy:

```python
JobServiceError          # Base
  JobNotFoundError       # Job ID not found
  JobExecutionError      # Pipeline execution failed (has .cause)
  JobResultNotReadyError # Results not available yet (has .job_id, .status)
```

### Pydantic Models

The API uses Pydantic models for request/response validation:

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
    species: Optional[str] = None

class Pipeline_job(BaseModel):
    uuid: UUID
    status: str = JobStatus.PENDING.name.lower()
    name: str
    stage: Optional[str] = None
    input_count: Optional[int] = None
    sequences_processed: Optional[int] = None
    error_message: Optional[str] = None
    task_events: Optional[list[str]] = None
```

### Adding a New Endpoint

1. Define the handler function in `api/src/main.py` under the existing `router`:

```python
@router.get("/pipeline-job/{uuid}/summary")
async def get_pipeline_job_summary(uuid: UUID) -> dict[str, Any]:
    """Return a summary of the job."""
    if USE_LOCAL_PIPELINE or USE_STEP_FUNCTIONS:
        job_service = get_job_service()
        job_info = job_service.get_job_with_sync(str(uuid))
        if job_info is None:
            raise HTTPException(status_code=404, detail="Job not found.")
        return {"uuid": str(uuid), "status": job_info.status.value.lower()}
    else:
        job = get_pipeline_job(uuid)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found.")
        return {"uuid": str(uuid), "status": job.status}
```

2. Add unit tests in `api/tests/a_unit/test_main.py`
3. Run validation checks: `make run-type-checks && make run-style-checks && make run-unit-tests`

---

## Pipeline Development

### Sequence Retrieval Module

Located at `pipeline_components/seq_retrieval/`, this component:

1. Fetches genomic sequences from faidx-indexed FASTA files (remote or local)
2. Assembles transcripts from exon regions
3. Translates coding sequences to protein
4. Embeds variant annotations from the Alliance Genome API
5. Outputs per-sequence FASTA and metadata JSON files

#### CLI Interface

```bash
python seq_retrieval.py \
    --output_type protein \
    --seq_id NC_007120.7 \
    --seq_strand "+" \
    --exon_seq_regions '[{"start": 46379756, "end": 46379851}]' \
    --cds_seq_regions '[{"start": 46379756, "end": 46379851, "frame": 0}]' \
    --fasta_file_url "https://ftp.ncbi.nlm.nih.gov/..." \
    --base_seq_name "ZFIN:ZDB-GENE-030131-3068" \
    --unique_entry_id "test-1" \
    --variant_ids '["ZFIN:ZDB-ALT-210128-3"]' \
    --reuse_local_cache
```

#### Key Classes

```
seq_retrieval/src/
  seq_retrieval.py          # CLI entry point (Click)
  seq_region/
    seq_region.py           # SeqRegion - single genomic region
    multi_part_seq_region.py # MultiPartSeqRegion - chained exons
    translated_seq_region.py # TranslatedSeqRegion - protein translation
  variant/
    variant.py              # Variant - genomic variant from Alliance API
    seq_embedded_variant.py # SeqEmbeddedVariant - variant with sequence positions
  seq_info/
    seq_info.py             # SeqInfo - metadata container
    alt_seq_info.py         # AltSeqInfo - alternative sequence metadata
  data_mover/
    data_file_mover.py      # FASTA file fetching and caching
```

#### Output Files

Each invocation produces two files in the working directory:

- `{unique_entry_id}-protein.fa` -- FASTA with reference (and optionally alternate) protein sequences
- `{unique_entry_id}-seqinfo.json` -- Metadata JSON with variant embedding information

See [Seq Retrieval Architecture](seq-retrieval-architecture.md) for detailed class diagrams and variant handling.

### Alignment Module

Located at `pipeline_components/alignment/`, this is a thin wrapper around Clustal Omega.

The Docker container runs:
```bash
clustalo -i /mnt/pavi/input.fa --outfmt=clustal --resno -o /mnt/pavi/output.aln
```

The unit test verifies output by running `clustalo` on a known input and diffing against expected output:
```bash
make run-unit-tests
# Runs clustalo in Docker, diffs output against tests/resources/clustal-output.aln
```

### Local Pipeline Runner

The `LocalPipelineRunner` in `api/src/local_pipeline.py` orchestrates the complete pipeline for EC2 deployments.

#### Execution Flow

```python
def run_pipeline(self, job_id, seq_regions):
    # 1. Create work/results directories
    # 2. Parallel sequence retrieval (ThreadPoolExecutor)
    fasta_files, seqinfo_files = self._run_sequence_retrieval(...)
    # 3. Merge FASTA files
    merged_fasta = self._merge_fastas(fasta_files, ...)
    # 4. Run Clustal Omega
    alignment_file = self._run_clustal(merged_fasta, ...)
    # 5. Collect and merge sequence info with alignment positions
    seq_info_file = self._run_collect_seq_info(...)
    # 6. Copy results to results directory
```

Key implementation details:

- **Parallel retrieval**: Uses `ThreadPoolExecutor(max_workers=self.max_workers)` for concurrent sequence retrieval
- **Subprocess execution**: `seq_retrieval` is invoked as a subprocess using its own venv Python to isolate dependencies
- **Path configuration**: Pipeline component paths come from `config.pipeline.pipeline_components_path` (defaults to `/home/ec2-user/agr_pavi/pipeline_components`)
- **Singleton access**: `get_local_pipeline_runner()` returns a cached instance

#### Invoking seq_retrieval

The runner calls `seq_retrieval.py` as a subprocess with its own virtual environment:

```python
python_path = str(_get_seq_retrieval_python())
# -> /home/ec2-user/agr_pavi/pipeline_components/seq_retrieval/.venv/bin/python

script_path = str(_get_seq_retrieval_src() / "seq_retrieval.py")
# -> /home/ec2-user/agr_pavi/pipeline_components/seq_retrieval/src/seq_retrieval.py

result = subprocess.run(
    cmd,
    cwd=str(work_dir),
    capture_output=True,
    text=True,
    env={**os.environ, "PYTHONPATH": str(_get_seq_retrieval_src())},
)
```

### Data Contracts Between Pipeline Stages

**seq_retrieval output -> alignment input:**
- FASTA files are merged (concatenated) into a single `alignment-input.fa`
- Each sequence has a header line from `base_seq_name` (with `_ref`/`_alt` suffixes when variants present)

**alignment output -> result:**
- `alignment-output.aln` in Clustal format with `--resno` (residue numbering)

**seq_retrieval output + alignment output -> aligned_seq_info.json:**
- Per-sequence metadata merged from individual `{id}-seqinfo.json` files
- Variant positions mapped from sequence coordinates to alignment coordinates using the Clustal position map

### Adding a New Pipeline Stage

1. Create the stage implementation (either as a Python module or a subprocess)
2. Add the stage invocation to `LocalPipelineRunner.run_pipeline()` in `api/src/local_pipeline.py`
3. Add a `JobStage` enum value in `api/src/job_service.py`
4. Update progress reporting via `_update_progress()`
5. For Step Functions mode, add the corresponding state to the state machine definition in `aws_infra/`
6. Add tests mocking the subprocess call

---

## Storage Layer

### DynamoDB Schema (Step Functions mode)

Table name: `pavi-jobs-{environment}`

| Attribute | Type | Description |
|-----------|------|-------------|
| `job_id` | String (PK) | UUID v4 identifier |
| `status` | String | PENDING, RUNNING, COMPLETED, FAILED |
| `stage` | String | Current pipeline stage |
| `created_at` | String | ISO 8601 timestamp |
| `completed_at` | String | ISO 8601 timestamp |
| `input_count` | Number | Number of input sequences |
| `sequences_processed` | Number | Progress counter |
| `result_s3_uri` | String | S3 URI to alignment result |
| `error_message` | String | Error details (max 1000 chars) |
| `execution_arn` | String | Step Functions execution ARN |
| `ttl` | Number | Expiration epoch (30 days from creation) |

Global Secondary Index: `status-created_at-index` (partition: `status`, sort: `created_at`)

### SQLite Schema (Local Pipeline mode)

Database location: `/var/lib/pavi/jobs/jobs.db`

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

Thread safety is achieved via `threading.local()` for connection-per-thread access from FastAPI's thread pool. The database is created automatically on first API startup.

### S3 Bucket Structure (Step Functions mode)

Bucket: `agr-pavi-pipeline-stepfunctions-{environment}`

```
s3://agr-pavi-pipeline-stepfunctions-{env}/
  executions/{execution_name}/
    work/
      seq_0/
        sequences.fasta
        seq_info_0.json
      seq_1/
        sequences.fasta
        seq_info_1.json
      combined.fasta
    results/
      alignment-output.aln
      aligned_seq_info.json
  {job_id}/
    alignment-output.aln
    aligned_seq_info.json
```

### Local Filesystem Structure

```
/var/lib/pavi/
  jobs/
    jobs.db                        # SQLite database
  work/
    {job_id}/
      {unique_entry_id}-protein.fa # Per-sequence FASTA
      {unique_entry_id}-seqinfo.json
      alignment-input.fa           # Merged FASTA
      alignment-output.aln         # Clustal output
      aligned_seq_info.json        # Merged metadata
  results/
    {job_id}/
      alignment-output.aln        # Final alignment
      aligned_seq_info.json       # Final metadata
```

See [Database Schemas](database-schemas.md) for the complete schema reference.

---

## Testing

### Test Organization

Python test directories use alphabetical prefixes to control execution order:

```
api/tests/
  a_unit/              # Unit tests -- run first
    test_main.py       # API endpoint tests using TestClient
    test_job_service.py # JobService with mocked AWS
  b_integration/       # Integration tests -- run second
    test_main.py       # Tests against running container
    helper_fns.py

pipeline_components/seq_retrieval/tests/
  unit/
    seq_info/
      conftest.py
      test_seq_info.py
    seq_region/
      conftest.py
      fixtures/
      test_seq_region.py
      test_multipart_seq_region.py
    variant/
      conftest.py
      fixtures/
      test_variant.py
  resources/           # Test data files (FASTA, JSON)
```

### Running Tests

```bash
# API unit tests only (no Nextflow artifacts needed)
cd api/
make run-unit-tests
# Runs: .venv/bin/python -m pytest -v tests/a_unit/

# Full test suite with coverage (requires Nextflow artifacts)
make run-tests
# Runs: .venv/bin/python -m pytest --cov

# Verbose with HTML coverage report
make run-tests-dev
# Runs: .venv/bin/python -m pytest --cov --cov-report html -v

# Single test file
.venv/bin/python -m pytest tests/a_unit/test_main.py -v

# Single test function
.venv/bin/python -m pytest tests/a_unit/test_main.py::test_health_reporting -v

# Integration tests (starts Docker container)
make run-integration-test-container

# seq_retrieval tests
cd pipeline_components/seq_retrieval/
make run-unit-tests

# alignment tests (Docker required)
cd pipeline_components/alignment/
make run-unit-tests
# Runs clustalo in Docker, diffs output against expected
```

### Unit Test Patterns

#### API Endpoint Tests

Tests use FastAPI's `TestClient` for synchronous HTTP testing:

```python
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app, follow_redirects=False)

def test_health_reporting() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200

def test_job_not_found() -> None:
    response = client.get(f"/api/pipeline-job/{NOT_FOUND_UUID}")
    assert response.status_code == 404
```

#### Mocking External Dependencies

Use `pytest-mock` for filesystem mocking and `unittest.mock` for AWS service mocking:

```python
# Mocking smart_open for result file access
def test_result_alignment(mocker: MockerFixture) -> None:
    def mock_alignment_open(uri=None, **kwargs):
        return open("../tests/resources/submit-workflow-success-output.aln", **kwargs)

    mocker.patch("smart_open.open", side_effect=mock_alignment_open)
    response = client.get(f"/api/pipeline-job/{mock_uuid}/result/alignment")
    assert response.status_code == 200

# Mocking boto3 for DynamoDB
@patch("src.job_service.boto3")
def test_create_job_step_functions(self, mock_boto3: MagicMock) -> None:
    mock_table = MagicMock()
    mock_dynamodb = MagicMock()
    mock_dynamodb.Table.return_value = mock_table
    mock_boto3.resource.return_value = mock_dynamodb

    service = JobService(
        dynamodb_table_name="test-table",
        use_step_functions=True,
    )
    job = service.create_job([{"test": "data"}])
    assert job.status == JobStatus.PENDING
    mock_table.put_item.assert_called_once()
```

#### Testing JobService Locally

The in-memory mode (`use_step_functions=False`) is useful for testing without AWS:

```python
def test_create_and_get_job() -> None:
    service = JobService(use_step_functions=False)
    created = service.create_job([{"test": "data"}])

    retrieved = service.get_job(created.job_id)
    assert retrieved is not None
    assert retrieved.job_id == created.job_id

def test_start_job_local() -> None:
    service = JobService(use_step_functions=False)
    job = service.create_job([{"test": "data"}])

    started = service._start_local_execution(job.job_id, [{"test": "data"}])
    assert started.status == JobStatus.RUNNING
```

#### seq_retrieval Test Patterns

Tests use fixtures organized in `conftest.py` files and `fixtures/` directories:

```python
# tests/unit/conftest.py
import pytest
from .fixtures.my_fixtures import *  # noqa: F401, F403

# tests/unit/fixtures/seq_regions.py
@pytest.fixture
def sample_seq_region():
    return SeqRegion(
        seq_id="NC_007120.7",
        start=46379756,
        end=46379851,
        strand="+",
    )
```

HTTP calls to the Alliance API are mocked with the `responses` library:

```python
import responses

@responses.activate
def test_variant_fetch() -> None:
    responses.add(
        responses.GET,
        "https://www.alliancegenome.org/api/variant/ZFIN:ZDB-ALT-210128-3",
        json={"id": "ZFIN:ZDB-ALT-210128-3"},
        status=200,
    )
    variant = Variant.from_variant_id("ZFIN:ZDB-ALT-210128-3")
    assert variant.variant_id == "ZFIN:ZDB-ALT-210128-3"
```

### Coverage Requirements

| Component | Metric | Requirement |
|-----------|--------|-------------|
| Python (API, seq_retrieval) | Line coverage | 90% minimum |
| Python (API, seq_retrieval) | Branch coverage | 90% minimum |

Coverage exclusions (`.coveragerc`):
- `__init__.py` files
- AWS infrastructure code
- CLI entry points
- Code with `# pragma: no cover`

### Test Directory Naming Convention

The `a_unit/` and `b_integration/` prefixes ensure pytest discovers and runs unit tests before integration tests. This matters because integration tests may depend on containers started by `make run-container-dev`.

---

## Code Quality

### Linting with flake8

```bash
cd api/
make run-style-checks
# Runs: .venv/bin/flake8 ./
```

Flake8 is the linter used across all Python components. The `flake8-unused-arguments` plugin flags unused function parameters.

### Type Checking with mypy

```bash
cd api/
make run-type-checks
# Runs: .venv/bin/mypy --install-types --non-interactive --warn-unused-config ./
```

mypy configuration is in `pyproject.toml`:

```toml
[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_configs = true
ignore_missing_imports = true

[[tool.mypy.overrides]]
module = ["boto3.*", "botocore.*", "smart_open.*"]
ignore_missing_imports = true
```

Type hints are required everywhere. All function signatures should include parameter and return type annotations:

```python
def create_job(self, seq_regions: list[dict[str, Any]]) -> JobInfo:
    ...

def get_job(self, job_id: str) -> Optional[JobInfo]:
    ...
```

### Dependency Management with pip-tools

Dependencies are declared in `pyproject.toml` and locked to `requirements.txt` via `pip-tools`:

```bash
# Update lock files
make update-deps-locks-all

# Install from lock files
make install-deps

# Install test dependencies
make install-test-deps
```

Conventions:
- Use `==` for exact pinning of direct dependencies (e.g., `biopython==1.85`)
- Use `==X.*` for minor version flexibility (e.g., `fastapi[standard-no-fastapi-cloud-cli]==0.120.*`)
- Lock files (`requirements.txt`) must be committed
- Lock files are auto-updated on PR merge unless the `no-deps-lock-updates` label is applied

### Running All Checks Before a PR

```bash
cd api/
make run-style-checks    # flake8
make run-type-checks     # mypy
make run-unit-tests      # pytest tests/a_unit/

cd ../pipeline_components/seq_retrieval/
make run-style-checks
make run-type-checks
make run-unit-tests
```

---

## Shared AWS Package

### What It Provides

The `shared_aws/py_package/` (`pavi_shared_aws`) package provides reusable AWS CDK constructs and helper utilities shared across all PAVI infrastructure components:

```
shared_aws/py_package/pavi_shared_aws/
  __init__.py
  agr_aws_env.py        # AGR AWS environment detection
  py.typed              # PEP 561 marker for type checking
  aws_helpers/          # AWS SDK helper functions
  shared_cdk_classes/   # Reusable CDK constructs
```

Dependencies:
```
aws-cdk-lib==2.*
boto3==1.*
click==8.3.*
```

### How to Modify and Rebuild

After making changes to the shared package:

```bash
cd shared_aws/py_package/

# Build the package (creates wheel in dist/)
make build

# Install locally (copies wheel to /tmp/)
make install

# The consuming components reference this wheel in their requirements.
# After rebuilding, reinstall deps in consuming components:
cd ../../api/
make install-deps
```

The full rebuild-and-install shortcut from the repo root:

```bash
make -C shared_aws/py_package/ clean build install
```

### Running Checks

```bash
cd shared_aws/py_package/

make run-style-checks    # flake8
make run-type-checks     # mypy
make run-unit-tests      # pytest
```

---

## Related Documentation

- [API Reference](api-reference.md) -- Complete endpoint reference with curl examples
- [Configuration Reference](configuration-reference.md) -- All environment variables
- [Database Schemas](database-schemas.md) -- DynamoDB, SQLite, and S3 schemas
- [Seq Retrieval Architecture](seq-retrieval-architecture.md) -- Detailed component design
- [Local Pipeline Implementation](local-pipeline-implementation.md) -- Implementation details for EC2 mode
- [Testing Guide](testing-guide.md) -- Full testing practices including frontend
- [Troubleshooting](troubleshooting.md) -- Common issues and solutions
- [Data Flow Diagrams](data-flows.md) -- System data flows
