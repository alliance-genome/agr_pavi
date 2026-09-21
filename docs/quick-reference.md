# PAVI Quick Reference

A quick reference card for common PAVI local deployment commands and configurations.

## Starting the API

```bash
# Local pipeline mode (must run from src/ directory)
cd /home/ec2-user/agr_pavi/api/src

# Development mode with verbose output (recommended)
USE_LOCAL_PIPELINE=true ../.venv/bin/fastapi dev main.py --host 0.0.0.0 --port 8000

# Alternative: uvicorn directly (less verbose)
USE_LOCAL_PIPELINE=true ../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

```bash
# Health check
curl http://localhost:8000/api/health

# Deployment status
curl http://localhost:8000/api/deployment-status

# Submit job
curl -X POST http://localhost:8000/api/pipeline-job/ \
  -H "Content-Type: application/json" \
  -d '[{"base_seq_name":"test","unique_entry_id":"test1",...}]'

# Get job status
curl http://localhost:8000/api/pipeline-job/{uuid}

# Get alignment result
curl http://localhost:8000/api/pipeline-job/{uuid}/result/alignment

# Get sequence info
curl http://localhost:8000/api/pipeline-job/{uuid}/result/seq-info
```

## Environment Variables

```bash
# Enable local pipeline mode
export USE_LOCAL_PIPELINE=true

# Configure paths
export PAVI_LOCAL_JOBS_PATH=/var/lib/pavi/jobs
export PAVI_LOCAL_RESULTS_PATH=/var/lib/pavi/results
export PAVI_LOCAL_WORK_PATH=/var/lib/pavi/work

# Configure parallelism
export PAVI_LOCAL_MAX_WORKERS=4

# Set environment
export PAVI_ENVIRONMENT=local
```

## Directory Structure

```
/var/lib/pavi/
├── jobs/jobs.db          # SQLite database
├── work/{job_id}/        # Intermediate files
└── results/{job_id}/     # Final results
```

## Code Quality

```bash
cd /home/ec2-user/agr_pavi/api

# Linting
.venv/bin/ruff check src/

# Type checking
.venv/bin/mypy src/ --ignore-missing-imports

# Fix linting issues
.venv/bin/ruff check --fix src/

# Format code
.venv/bin/ruff format src/
```

## SQLite Database

```bash
# Open database
sqlite3 /var/lib/pavi/jobs/jobs.db

# List recent jobs
SELECT job_id, status, stage, created_at FROM jobs ORDER BY created_at DESC LIMIT 10;

# Get specific job
SELECT * FROM jobs WHERE job_id = 'your-job-id';

# Count by status
SELECT status, COUNT(*) FROM jobs GROUP BY status;

# Delete old jobs
DELETE FROM jobs WHERE created_at < datetime('now', '-30 days');
```

## Clustal Omega

```bash
# Check version
clustalo --version

# Manual alignment
clustalo -i input.fa --outfmt=clustal --resno -o output.aln

# Test run
echo -e ">s1\nACDE\n>s2\nACDE" | clustalo --outfmt=clustal
```

## Python Environment

```bash
cd /home/ec2-user/agr_pavi/api

# Activate
source .venv/bin/activate

# Install packages
uv pip install package-name

# Install from requirements
uv pip install -r requirements.txt

# Check Python version
.venv/bin/python --version
```

## Debugging

```bash
# Check API logs (if running in foreground)
# Logs go to stdout

# Check work directory
ls -la /var/lib/pavi/work/{job_id}/

# Check results
ls -la /var/lib/pavi/results/{job_id}/

# View alignment output
cat /var/lib/pavi/results/{job_id}/alignment-output.aln

# View seq info
cat /var/lib/pavi/results/{job_id}/aligned_seq_info.json | python -m json.tool
```

## Cleanup

```bash
# Clean work directories older than 7 days
find /var/lib/pavi/work -type d -mtime +7 -exec rm -rf {} \;

# Clean results older than 30 days
find /var/lib/pavi/results -type d -mtime +30 -exec rm -rf {} \;

# Clean old SQLite records
sqlite3 /var/lib/pavi/jobs/jobs.db "DELETE FROM jobs WHERE created_at < datetime('now', '-30 days');"
```

## Status Codes

| Status | Description |
|--------|-------------|
| PENDING | Job created, not started |
| RUNNING | Pipeline executing |
| COMPLETED | Success |
| FAILED | Error occurred |

| Stage | Description |
|-------|-------------|
| INITIALIZING | Starting up |
| SEQUENCE_RETRIEVAL | Fetching sequences |
| ALIGNMENT | Running clustalo |
| COLLECTING_RESULTS | Merging outputs |
| DONE | Complete |
| ERROR | Failed |

## Ports

| Service | Port |
|---------|------|
| API (uvicorn) | 8000 |
| API (container) | 8080 |
| WebUI | 3000 |
