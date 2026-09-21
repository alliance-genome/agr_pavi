# Local Pipeline Implementation Details

This document provides detailed technical information about the local pipeline implementation, including all code changes, new modules, and design decisions.

## Table of Contents

1. [Overview](#overview)
2. [New Files Created](#new-files-created)
3. [Modified Files](#modified-files)
4. [Code Architecture](#code-architecture)
5. [Data Flow](#data-flow)
6. [Testing](#testing)

---

## Overview

The local pipeline implementation adds three execution modes to PAVI:

| Mode | Storage | Orchestration | Compute |
|------|---------|---------------|---------|
| **Local Pipeline** (new) | SQLite | LocalPipelineRunner | Direct Python + clustalo |
| Step Functions | DynamoDB | AWS Step Functions | AWS Batch containers |
| Nextflow (legacy) | In-memory | Nextflow | Docker containers |

---

## New Files Created

### 1. `api/src/local_job_store.py`

SQLite-based job storage that replaces DynamoDB for local deployments.

**Key Classes:**

```python
class LocalJobStore:
    """
    SQLite-based job storage for local deployment.
    Thread-safe implementation using connection-per-thread pattern.
    """

    def __init__(self, db_path: Optional[str] = None):
        """Initialize with optional custom database path."""

    def create_job(self, job_id: str, input_data: list[dict], input_count: int = 0) -> dict:
        """Create a new job record."""

    def get_job(self, job_id: str) -> Optional[dict]:
        """Get job by ID."""

    def update_job(self, job_id: str, **updates) -> bool:
        """Update job fields."""

    def list_jobs(self, limit: int = 100, status: Optional[str] = None) -> list[dict]:
        """List jobs ordered by creation time."""

    def delete_job(self, job_id: str) -> bool:
        """Delete a job record."""

    def cleanup_old_jobs(self, days: int = 30) -> int:
        """Delete jobs older than specified days."""
```

**Database Schema:**

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
    input_data TEXT,
    result_path TEXT
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

**Thread Safety:**

The implementation uses `threading.local()` to provide thread-local database connections, ensuring safe concurrent access from FastAPI's thread pool.

```python
def _get_connection(self) -> sqlite3.Connection:
    """Get thread-local database connection."""
    if not hasattr(self._local, "connection") or self._local.connection is None:
        self._local.connection = sqlite3.connect(
            self.db_path,
            check_same_thread=False,
            detect_types=sqlite3.PARSE_DECLTYPES,
        )
        self._local.connection.row_factory = sqlite3.Row
    conn: sqlite3.Connection = self._local.connection
    return conn
```

**Singleton Pattern:**

```python
_local_job_store: Optional[LocalJobStore] = None

def get_local_job_store() -> LocalJobStore:
    """Get or create the local job store singleton."""
    global _local_job_store
    if _local_job_store is None:
        _local_job_store = LocalJobStore()
    return _local_job_store
```

---

### 2. `api/src/local_pipeline.py`

Local pipeline runner that executes pipeline components directly without containers.

**Key Classes:**

```python
class LocalPipelineError(Exception):
    """Exception raised when local pipeline execution fails."""
    def __init__(self, message: str, stage: str, cause: Optional[str] = None):
        self.stage = stage
        self.cause = cause

class LocalPipelineRunner:
    """
    Local pipeline runner that executes pipeline components directly.
    Replaces AWS Step Functions + Batch for local EC2 deployment.
    """

    def __init__(
        self,
        work_dir: str = "/var/lib/pavi/work",
        results_dir: str = "/var/lib/pavi/results",
        max_workers: int = 4,
        progress_callback: Optional[Callable[[str, str, int], None]] = None,
    ):
        """Initialize the local pipeline runner."""
```

**Important:** The pipeline component paths use absolute paths instead of `Path(__file__)` to avoid issues with FastAPI's auto-reload mechanism and thread safety:

```python
# Use absolute paths - Path(__file__) can fail with FastAPI reload
PIPELINE_COMPONENTS_PATH = Path("/home/ec2-user/agr_pavi/pipeline_components")
SEQ_RETRIEVAL_SRC = PIPELINE_COMPONENTS_PATH / "seq_retrieval" / "src"
SEQ_RETRIEVAL_PYTHON = PIPELINE_COMPONENTS_PATH / "seq_retrieval" / ".venv" / "bin" / "python"
```

**Pipeline Execution Flow:**

```python
def run_pipeline(self, job_id: str, seq_regions: list[dict]) -> dict:
    """
    Run the complete pipeline synchronously.

    Pipeline stages:
    1. SEQUENCE_RETRIEVAL - Parallel retrieval of sequences
    2. ALIGNMENT - Merge FASTAs and run Clustal Omega
    3. COLLECTING_RESULTS - Merge sequence info with alignment
    """

    # Stage 1: Parallel sequence retrieval
    fasta_files, seqinfo_files = self._run_sequence_retrieval(...)

    # Stage 2: Merge and align
    merged_fasta = self._merge_fastas(fasta_files, job_work_dir)
    alignment_file = self._run_clustal(merged_fasta, job_work_dir)

    # Stage 3: Collect results
    seq_info_file = self._run_collect_seq_info(...)

    # Copy to results directory
    shutil.copy(alignment_file, job_results_dir / "alignment-output.aln")
    shutil.copy(seq_info_file, job_results_dir / "aligned_seq_info.json")
```

**Parallel Sequence Retrieval:**

Uses `ThreadPoolExecutor` for parallel execution:

```python
def _run_sequence_retrieval(self, job_id, seq_regions, work_dir):
    with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
        futures = {
            executor.submit(self._invoke_seq_retrieval, sr, work_dir): sr
            for sr in seq_regions
        }

        for future in as_completed(futures):
            fasta_file, seqinfo_file = future.result()
            # Collect results...
```

**seq_retrieval Invocation:**

Calls seq_retrieval as a subprocess with proper PYTHONPATH:

```python
def _invoke_seq_retrieval(self, seq_region, work_dir) -> tuple[Path, Path]:
    cmd = [
        sys.executable,
        str(SEQ_RETRIEVAL_SRC / "seq_retrieval.py"),
        "--output_type", "protein",
        "--unique_entry_id", unique_entry_id,
        # ... other arguments
    ]

    result = subprocess.run(
        cmd,
        cwd=str(work_dir),
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": str(SEQ_RETRIEVAL_SRC)},
    )
```

**Clustal Omega Execution:**

```python
def _run_clustal(self, input_fasta: Path, work_dir: Path) -> Path:
    clustalo_path = shutil.which("clustalo")
    if not clustalo_path:
        # Check common locations
        for path in ["/usr/bin/clustalo", "/usr/local/bin/clustalo"]:
            if os.path.exists(path):
                clustalo_path = path
                break

    cmd = [
        clustalo_path,
        "-i", str(input_fasta),
        "--outfmt=clustal",
        "--resno",
        "-o", str(output_path),
    ]

    subprocess.run(cmd, check=True)
```

**Alignment Position Mapping:**

The `_add_alignment_positions` method maps original sequence positions to alignment positions for variant coordinates:

```python
def _parse_clustal_positions(self, alignment_file: Path) -> dict[str, dict[int, int]]:
    """
    Parse Clustal alignment to build position maps.
    Maps original sequence positions to alignment positions.

    Returns:
        Dict mapping seq_name -> {original_pos -> alignment_pos}
    """
    # Parse alignment, build position maps accounting for gaps
```

---

## Modified Files

### 1. `api/src/config.py`

**Added Configuration Options:**

```python
@dataclass
class PipelineConfig:
    # ... existing fields ...

    # Local pipeline execution (for EC2 deployment)
    use_local_pipeline: bool = False
    local_jobs_path: str = "/var/lib/pavi/jobs"
    local_results_path: str = "/var/lib/pavi/results"
    local_work_path: str = "/var/lib/pavi/work"
    local_max_workers: int = 4  # Max parallel sequence retrieval tasks
```

**New Helper Function:**

```python
def should_use_local_pipeline(config: APIConfig) -> bool:
    """
    Determine if local pipeline execution should be used.

    Local pipeline mode runs seq_retrieval and alignment directly as Python
    modules instead of using Step Functions or Nextflow.
    """
    return config.pipeline.use_local_pipeline
```

**Updated get_config():**

```python
def get_config() -> APIConfig:
    # Check for local pipeline mode first (takes precedence)
    use_local_pipeline_env = os.environ.get("USE_LOCAL_PIPELINE")
    use_local_pipeline = use_local_pipeline_env is not None and \
                         use_local_pipeline_env.lower() == "true"

    # Local pipeline mode disables Step Functions
    if use_local_pipeline:
        use_step_functions = False
    # ... rest of config loading ...

    pipeline_config = PipelineConfig(
        # ... existing fields ...
        use_local_pipeline=use_local_pipeline,
        local_jobs_path=local_jobs_path,
        local_results_path=local_results_path,
        local_work_path=local_work_path,
        local_max_workers=local_max_workers,
    )
```

---

### 2. `api/src/job_service.py`

**Updated JobService Class:**

```python
class JobService:
    def __init__(
        self,
        dynamodb_table_name: Optional[str] = None,
        state_machine_arn: Optional[str] = None,
        s3_bucket: Optional[str] = None,
        use_step_functions: bool = True,
        use_local_pipeline: bool = False,  # NEW
    ):
        self.use_step_functions = use_step_functions
        self.use_local_pipeline = use_local_pipeline  # NEW

        # Local storage - lazily initialized
        self._local_store: Any = None  # NEW
```

**New local_store Property:**

```python
@property
def local_store(self) -> Any:
    """Lazy initialization of local job store."""
    if self._local_store is None and self.use_local_pipeline:
        from local_job_store import LocalJobStore, get_local_job_store
        store: LocalJobStore = get_local_job_store()
        self._local_store = store
    return self._local_store
```

**Updated create_job():**

```python
def create_job(self, seq_regions: list[dict]) -> JobInfo:
    # ...
    if self.use_local_pipeline:
        # Store in local SQLite database
        self.local_store.create_job(job_id, seq_regions, len(seq_regions))
    elif self.use_step_functions:
        self._store_job_dynamodb(job)
    else:
        self._local_jobs[job_id] = job
```

**Updated start_job():**

```python
def start_job(self, job_id: str, seq_regions: list[dict]) -> Optional[JobInfo]:
    if self.use_local_pipeline:
        return self._start_local_pipeline_execution(job_id, seq_regions)
    elif self.use_step_functions:
        return self._start_step_functions_execution(job_id, seq_regions)
    else:
        return self._start_local_execution(job_id, seq_regions)
```

**New _start_local_pipeline_execution():**

```python
def _start_local_pipeline_execution(
    self, job_id: str, seq_regions: list[dict]
) -> Optional[JobInfo]:
    """
    Start local pipeline execution (EC2 deployment mode).
    Runs seq_retrieval and alignment directly as Python modules.
    """
    from local_pipeline import get_local_pipeline_runner, LocalPipelineError

    # Update job status to RUNNING
    self.local_store.update_job(
        job_id,
        status=JobStatus.RUNNING.value,
        stage=JobStage.SEQUENCE_RETRIEVAL.value,
    )

    # Set up progress callback
    def progress_callback(jid, stage, sequences_processed):
        self.local_store.update_job(jid, stage=stage, sequences_processed=sequences_processed)

    runner = get_local_pipeline_runner()
    runner.progress_callback = progress_callback

    try:
        result = runner.run_pipeline(job_id, seq_regions)
        # Update as completed...
    except LocalPipelineError as e:
        # Update as failed...
```

**New _get_job_local_store():**

```python
def _get_job_local_store(self, job_id: str) -> Optional[JobInfo]:
    """Get job from local SQLite store."""
    job_dict = self.local_store.get_job(job_id)
    if not job_dict:
        return None

    return JobInfo(
        job_id=job_dict["job_id"],
        status=JobStatus(job_dict["status"]),
        stage=JobStage(job_dict["stage"]) if job_dict.get("stage") else None,
        # ... other fields ...
    )
```

**Updated get_job_result_alignment():**

```python
def get_job_result_alignment(self, job_id: str) -> Optional[bytes]:
    # ...
    if self.use_local_pipeline:
        # Local pipeline mode - read from local results directory
        filepath = os.path.join(
            self.local_results_path, job_id, "alignment-output.aln"
        )
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                return f.read()
        return None
    # ... existing Step Functions and Nextflow code ...
```

**Updated get_job_service():**

```python
def get_job_service() -> JobService:
    global _job_service
    if _job_service is None:
        from config import get_api_config
        config = get_api_config()
        _job_service = JobService(
            use_step_functions=config.pipeline.use_step_functions,
            use_local_pipeline=config.pipeline.use_local_pipeline,  # NEW
        )
    return _job_service
```

---

### 3. `api/src/main.py`

**New Imports and Constants:**

```python
from config import get_api_config, should_use_step_functions, should_use_local_pipeline

# Feature flags for execution mode (from config)
USE_STEP_FUNCTIONS = _config.pipeline.use_step_functions
USE_LOCAL_PIPELINE = _config.pipeline.use_local_pipeline  # NEW
```

**New run_pipeline_local() Function:**

```python
def run_pipeline_local(
    pipeline_seq_regions: list[Pipeline_seq_region],
    job_id: str,
    job_service: JobService,
) -> None:
    """
    Run the backend alignment pipeline using local execution (EC2 mode).
    """
    logger.info(f"Initiating local pipeline run for job {job_id}.")

    seq_regions = [sr.model_dump() for sr in pipeline_seq_regions]

    try:
        job_service.start_job(job_id, seq_regions)
        logger.info(f"Local pipeline execution completed for job {job_id}.")
    except JobServiceError as e:
        logger.error(f"Failed to run local pipeline for job {job_id}: {e}")
    except Exception as e:
        # Update job status to FAILED...
```

**Updated health() Endpoint:**

```python
@router.get("/health")
async def health() -> dict[str, Any]:
    if USE_LOCAL_PIPELINE:
        mode = "local_pipeline"
    elif USE_STEP_FUNCTIONS:
        mode = "step_functions"
    else:
        mode = "nextflow"

    response = {
        "status": "up",
        "execution_mode": mode,
        "environment": _config.environment.value,
    }

    # Add local pipeline paths if in local mode
    if USE_LOCAL_PIPELINE:
        response["local_paths"] = {
            "jobs": _config.pipeline.local_jobs_path,
            "results": _config.pipeline.local_results_path,
            "work": _config.pipeline.local_work_path,
        }

    return response
```

**Updated create_new_pipeline_job() Endpoint:**

```python
@router.post("/pipeline-job/")
async def create_new_pipeline_job(
    pipeline_seq_regions: list[Pipeline_seq_region],
    background_tasks: BackgroundTasks
) -> Pipeline_job:
    new_job_id = str(uuid1())

    # Check local pipeline mode first (takes precedence)
    use_local = should_use_local_pipeline(_config)

    if use_local:
        # Local pipeline mode (EC2 deployment)
        job_service = get_job_service()
        seq_regions = [sr.model_dump() for sr in pipeline_seq_regions]

        job_info = job_service.create_job(seq_regions)
        logger.info(f"Created local pipeline job {job_info.job_id}.")

        # Start local execution in background
        background_tasks.add_task(
            func=run_pipeline_local,
            pipeline_seq_regions=pipeline_seq_regions,
            job_id=job_info.job_id,
            job_service=job_service,
        )

        return Pipeline_job.from_job_info(job_info)

    # ... existing Step Functions and Nextflow code ...
```

**Updated deployment_status() Endpoint:**

```python
@router.get("/deployment-status")
async def deployment_status() -> dict[str, Any]:
    # Determine execution mode
    if USE_LOCAL_PIPELINE:
        exec_mode = "local_pipeline"
    elif USE_STEP_FUNCTIONS:
        exec_mode = "step_functions"
    else:
        exec_mode = "nextflow"

    # ... API status ...

    # Local Pipeline Status (if enabled)
    if USE_LOCAL_PIPELINE:
        local_status = {
            "name": "Local Pipeline",
            "status": "healthy",
            "details": {
                "jobs_path": _config.pipeline.local_jobs_path,
                "results_path": _config.pipeline.local_results_path,
                "work_path": _config.pipeline.local_work_path,
                "max_workers": _config.pipeline.local_max_workers,
            },
        }

        # Check if directories exist and are writable
        # Check if clustalo is available
        clustalo_path = shutil.which("clustalo")
        if clustalo_path:
            local_status["details"]["clustalo"] = clustalo_path
        else:
            local_status["details"]["clustalo"] = "not found"
            local_status["status"] = "degraded"

        components["local_pipeline"] = local_status
```

**Updated Result Endpoints:**

All result endpoints (`get_pipeline_job_handler`, `get_pipeline_job_alignment_result`, `get_pipeline_job_seq_info_result`) now check `USE_LOCAL_PIPELINE or USE_STEP_FUNCTIONS` to route to the appropriate storage backend.

---

## Code Architecture

### Execution Mode Decision Tree

```
create_new_pipeline_job()
    │
    ├── USE_LOCAL_PIPELINE = true?
    │   ├── Yes → job_service.create_job() [SQLite]
    │   │         → background: run_pipeline_local()
    │   │             → job_service.start_job()
    │   │                 → _start_local_pipeline_execution()
    │   │                     → LocalPipelineRunner.run_pipeline()
    │   └── No ↓
    │
    ├── should_use_step_functions() = true?
    │   ├── Yes → job_service.create_job() [DynamoDB]
    │   │         → background: run_pipeline_step_functions()
    │   │             → job_service.start_job()
    │   │                 → _start_step_functions_execution()
    │   └── No ↓
    │
    └── Nextflow mode
        → jobs[uuid] = Pipeline_job (in-memory)
        → background: run_pipeline()
            → subprocess: nextflow.sh
```

### Storage Backend Selection

```
JobService methods
    │
    ├── get_job()
    │   ├── use_local_pipeline → _get_job_local_store() [SQLite]
    │   ├── use_step_functions → _get_job_dynamodb() [DynamoDB]
    │   └── else → _local_jobs[job_id] [In-memory]
    │
    ├── get_job_result_alignment()
    │   ├── use_local_pipeline → /var/lib/pavi/results/{job_id}/alignment-output.aln
    │   ├── use_step_functions → S3: {result_s3_uri}
    │   └── else → ./results/pipeline-results_{job_id}/alignment-output.aln
```

---

## Data Flow

### Local Pipeline Data Flow

```
1. API receives POST /api/pipeline-job/
   Input: list[Pipeline_seq_region]

2. JobService.create_job()
   → SQLite: INSERT INTO jobs (job_id, status='PENDING', ...)

3. Background: run_pipeline_local()
   → JobService.start_job()
   → SQLite: UPDATE jobs SET status='RUNNING'

4. LocalPipelineRunner.run_pipeline()

   4a. _run_sequence_retrieval() [parallel]
       For each seq_region:
       → subprocess: python seq_retrieval.py ...
       → Output: {work_dir}/{entry_id}-protein.fa
       → Output: {work_dir}/{entry_id}-seqinfo.json
       → SQLite: UPDATE jobs SET stage='SEQUENCE_RETRIEVAL', sequences_processed=N

   4b. _merge_fastas()
       → Concatenate all .fa files
       → Output: {work_dir}/alignment-input.fa

   4c. _run_clustal()
       → subprocess: clustalo -i alignment-input.fa ...
       → Output: {work_dir}/alignment-output.aln
       → SQLite: UPDATE jobs SET stage='ALIGNMENT'

   4d. _run_collect_seq_info()
       → Merge all -seqinfo.json files
       → Add alignment positions
       → Output: {work_dir}/aligned_seq_info.json
       → SQLite: UPDATE jobs SET stage='COLLECTING_RESULTS'

5. Copy results
   → {results_dir}/{job_id}/alignment-output.aln
   → {results_dir}/{job_id}/aligned_seq_info.json
   → SQLite: UPDATE jobs SET status='COMPLETED', stage='DONE'

6. API GET /api/pipeline-job/{uuid}/result/alignment
   → Read from {results_dir}/{job_id}/alignment-output.aln
   → Return as StreamingResponse
```

---

## Testing

### Unit Test Considerations

```python
# Test LocalJobStore
def test_local_job_store_create_and_get():
    store = LocalJobStore(db_path=":memory:")  # Use in-memory SQLite

    job = store.create_job("test-id", [{"seq": "data"}], 1)
    assert job["status"] == "PENDING"

    retrieved = store.get_job("test-id")
    assert retrieved["job_id"] == "test-id"

# Test LocalPipelineRunner (mock subprocess)
def test_local_pipeline_runner_stages():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = Mock(returncode=0)

        runner = LocalPipelineRunner(
            work_dir="/tmp/test_work",
            results_dir="/tmp/test_results",
        )

        # Test individual stages...
```

### Integration Test

```bash
# Start API in local mode
USE_LOCAL_PIPELINE=true .venv/bin/uvicorn main:app --port 8000 &

# Submit test job
JOB_UUID=$(curl -s -X POST http://localhost:8000/api/pipeline-job/ \
  -H "Content-Type: application/json" \
  -d '[...]' | jq -r '.uuid')

# Poll for completion
while true; do
  STATUS=$(curl -s http://localhost:8000/api/pipeline-job/$JOB_UUID | jq -r '.status')
  echo "Status: $STATUS"
  [ "$STATUS" = "completed" ] && break
  [ "$STATUS" = "failed" ] && exit 1
  sleep 2
done

# Verify results
curl http://localhost:8000/api/pipeline-job/$JOB_UUID/result/alignment
```

### Linting and Type Checking

```bash
cd /home/ec2-user/agr_pavi/api

# Ruff linting
.venv/bin/ruff check src/

# Mypy type checking
.venv/bin/mypy src/local_job_store.py src/local_pipeline.py \
  src/config.py src/job_service.py src/main.py \
  --ignore-missing-imports
```
