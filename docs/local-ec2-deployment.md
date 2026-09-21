# PAVI Local EC2 Deployment Guide

This document describes the local EC2 deployment mode for PAVI, which allows running the complete pipeline on a single EC2 instance without AWS Step Functions, Batch, DynamoDB, or S3.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Comparison](#architecture-comparison)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [API Behavior](#api-behavior)
8. [Directory Structure](#directory-structure)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The local EC2 deployment mode provides a simplified execution environment for PAVI that:

- **Replaces DynamoDB** with SQLite for job persistence
- **Replaces S3** with local filesystem storage for results
- **Replaces Step Functions/Batch** with direct Python execution of pipeline components
- **Runs Clustal Omega** directly as a local binary instead of containerized execution

This mode is ideal for:
- Development and testing
- Single-instance deployments
- Environments without full AWS infrastructure
- Cost-sensitive deployments

---

## Architecture Comparison

### AWS Distributed Architecture (Production)

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│   WebUI     │───▶│   API (FastAPI)  │───▶│  DynamoDB   │
│  (Next.js)  │    │  Elastic Beanstalk│    │  (Jobs)     │
└─────────────┘    └────────┬─────────┘    └─────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ Step Functions │
                   └───────┬────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Batch   │ │  Batch   │ │  Batch   │
        │seq_retr. │ │alignment │ │ collect  │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                    ┌──────────┐
                    │    S3    │
                    │ (Results)│
                    └──────────┘
```

### Local EC2 Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│   WebUI     │───▶│   API (FastAPI)  │───▶│   SQLite    │
│  (Next.js)  │    │   uvicorn        │    │  (Jobs)     │
└─────────────┘    └────────┬─────────┘    └─────────────┘
                            │
                            ▼
                   ┌────────────────────┐
                   │ LocalPipelineRunner│
                   │  (ThreadPoolExec)  │
                   └───────┬────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Python   │ │ clustalo │ │ Python   │
        │seq_retr. │ │ (binary) │ │ collect  │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                   ┌────────────┐
                   │ Local FS   │
                   │ /var/lib/  │
                   │   pavi/    │
                   └────────────┘
```

---

## Prerequisites

### System Requirements

- **OS**: Amazon Linux 2023 (or compatible Linux distribution)
- **CPU**: 2+ vCPUs recommended
- **RAM**: 4GB+ recommended (7.6GB for t3.large)
- **Disk**: 20GB+ for work files and results

### Current Dev Instance (t3.large)

| Resource | Value |
|----------|-------|
| vCPUs | 2 |
| RAM | 7.6 GB total (~5 GB available) |
| Disk | 50 GB (43 GB free) |
| Max parallel workers | 4 (configurable via `PAVI_LOCAL_MAX_WORKERS`) |

### Capacity Estimates

Clustal Omega scales approximately O(N²) with sequence count. Memory is typically the bottleneck before CPU.

| Sequences | Expected Performance |
|-----------|---------------------|
| 2-10 | Seconds, trivial |
| 10-50 | Seconds to ~1 min |
| 50-100 | Minutes, comfortable |
| 100-200 | Several minutes, may stress memory |
| 200+ | Could hit memory limits depending on sequence length |

For larger alignments (200+ sequences), consider:
- Upgrading to t3.xlarge (16 GB RAM) or larger
- Using the distributed AWS architecture (Step Functions + Batch)

### Software Requirements

- Python 3.12
- uv (Python package manager)
- gcc, g++ (for building clustalo)
- cmake, autoconf, automake, libtool (build tools)

---

## Installation

### 1. Install System Dependencies

```bash
# Install build tools
sudo yum install -y gcc gcc-c++ make cmake autoconf automake libtool

# Verify installations
gcc --version
cmake --version
```

### 2. Build and Install argtable2

Clustal Omega requires argtable2 for command-line argument parsing.

```bash
cd /tmp

# Clone argtable2
git clone https://github.com/jonathanmarvens/argtable2.git
cd argtable2-master

# Build with cmake
mkdir -p build && cd build
cmake ..
make -j4
sudo make install

# Copy header file (cmake doesn't install it)
sudo cp /tmp/argtable2-master/src/argtable2.h /usr/local/include/

# Verify installation
ls /usr/local/include/argtable2.h
ls /usr/local/lib/libargtable2.a
```

### 3. Build and Install Clustal Omega

```bash
cd /tmp

# Clone clustal-omega
git clone https://github.com/GSLBiotech/clustal-omega.git
cd clustal-omega

# Generate configure script
autoreconf -fi

# Configure with argtable2 paths
./configure CFLAGS="-I/usr/local/include" LDFLAGS="-L/usr/local/lib"

# Build
make -j4

# Install
sudo make install

# Verify installation
which clustalo
clustalo --version
# Expected output: 1.2.4
```

### 4. Set Up Python Environment

```bash
cd /home/ec2-user/agr_pavi/api

# Create virtual environment with Python 3.12
uv venv --python 3.12 .venv

# Install dependencies
uv pip install -r requirements.txt

# Install development tools
uv pip install ruff mypy

# Verify
.venv/bin/python --version
.venv/bin/ruff --version
```

### 5. Set Up Pipeline Components

```bash
cd /home/ec2-user/agr_pavi/pipeline_components/seq_retrieval

# Create virtual environment
uv venv --python 3.12 .venv

# Install dependencies
uv pip install -r requirements.txt

# Verify
.venv/bin/python -c "import click; import pysam; import biopython; print('OK')"
```

### 6. Create Data Directories

```bash
# Create directories for local storage
sudo mkdir -p /var/lib/pavi/{jobs,results,work}

# Set ownership to ec2-user (or your application user)
sudo chown -R ec2-user:ec2-user /var/lib/pavi

# Verify permissions
ls -la /var/lib/pavi/
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_LOCAL_PIPELINE` | `false` | Enable local pipeline mode |
| `PAVI_LOCAL_JOBS_PATH` | `/var/lib/pavi/jobs` | SQLite database directory |
| `PAVI_LOCAL_RESULTS_PATH` | `/var/lib/pavi/results` | Final results directory |
| `PAVI_LOCAL_WORK_PATH` | `/var/lib/pavi/work` | Intermediate work files |
| `PAVI_LOCAL_MAX_WORKERS` | `4` | Max parallel sequence retrievals |
| `PAVI_ENVIRONMENT` | `local` | Environment name |
| `API_HOST` | `0.0.0.0` | API bind address |
| `API_PORT` | `8080` | API port (uvicorn uses 8000 by default) |

### Configuration Priority

The API uses this priority for execution mode:

1. **Local Pipeline** (`USE_LOCAL_PIPELINE=true`) - highest priority
2. **Step Functions** (`USE_STEP_FUNCTIONS=true` or non-local environment)
3. **Nextflow** (legacy, default for local environment)

### Example Configuration

```bash
# Create environment file
cat > /home/ec2-user/agr_pavi/api/.env.local << 'EOF'
USE_LOCAL_PIPELINE=true
PAVI_ENVIRONMENT=local
PAVI_LOCAL_JOBS_PATH=/var/lib/pavi/jobs
PAVI_LOCAL_RESULTS_PATH=/var/lib/pavi/results
PAVI_LOCAL_WORK_PATH=/var/lib/pavi/work
PAVI_LOCAL_MAX_WORKERS=4
EOF

# Source before running
source /home/ec2-user/agr_pavi/api/.env.local
```

---

## Usage

### Starting the API Server

```bash
cd /home/ec2-user/agr_pavi/api

# Option 1: Direct uvicorn
USE_LOCAL_PIPELINE=true .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

# Option 2: With environment file
source .env.local
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

# Option 3: Development mode with auto-reload
USE_LOCAL_PIPELINE=true .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Verifying the Setup

```bash
# Check health endpoint
curl http://localhost:8000/api/health

# Expected response for local pipeline mode:
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

# Check deployment status (includes clustalo check)
curl http://localhost:8000/api/deployment-status
```

### Submitting a Test Job

```bash
# Submit a job
curl -X POST http://localhost:8000/api/pipeline-job/ \
  -H "Content-Type: application/json" \
  -d '[{
    "base_seq_name": "test_gene",
    "unique_entry_id": "test_001",
    "seq_id": "1",
    "seq_strand": "+",
    "exon_seq_regions": [{"start": 1000, "end": 2000}],
    "cds_seq_regions": [{"start": 1000, "end": 2000}],
    "fasta_file_url": "https://example.com/genome.fa",
    "variant_ids": []
  }]'

# Check job status (replace UUID)
curl http://localhost:8000/api/pipeline-job/{uuid}

# Get alignment result
curl http://localhost:8000/api/pipeline-job/{uuid}/result/alignment

# Get sequence info
curl http://localhost:8000/api/pipeline-job/{uuid}/result/seq-info
```

### Starting the WebUI

```bash
cd /home/ec2-user/agr_pavi/webui

# Point to local API
PAVI_API_BASE_URL=http://localhost:8000 npm run dev

# Or use mock API for frontend-only development
npm run dev:mock
```

---

## API Behavior

### Execution Mode Detection

The API automatically detects the execution mode based on configuration:

| Mode | `USE_LOCAL_PIPELINE` | `USE_STEP_FUNCTIONS` | Storage | Execution |
|------|---------------------|---------------------|---------|-----------|
| Local Pipeline | `true` | (ignored) | SQLite | Direct Python |
| Step Functions | `false` | `true` | DynamoDB | AWS Step Functions |
| Nextflow | `false` | `false` | In-memory | Nextflow subprocess |

### Endpoint Behavior by Mode

| Endpoint | Local Pipeline | Step Functions | Nextflow |
|----------|---------------|----------------|----------|
| `POST /api/pipeline-job/` | Creates SQLite record, runs LocalPipelineRunner | Creates DynamoDB record, starts SF execution | Creates in-memory job, runs Nextflow |
| `GET /api/pipeline-job/{uuid}` | Reads from SQLite | Reads from DynamoDB + syncs SF status | Reads from memory |
| `GET /api/.../alignment` | Reads from local results dir | Reads from S3 | Reads from Nextflow output dir |
| `GET /api/.../seq-info` | Reads from local results dir | Reads from S3 | Reads from Nextflow output dir |
| `GET /api/.../logs` | Not implemented (501) | Not implemented (501) | Reads Nextflow logs |

### Job Status Flow

```
PENDING → RUNNING → COMPLETED
              ↓
           FAILED

Stages (in order):
INITIALIZING → SEQUENCE_RETRIEVAL → ALIGNMENT → COLLECTING_RESULTS → DONE
                                                                      ↓
                                                                    ERROR
```

---

## Directory Structure

### Application Structure

```
/home/ec2-user/agr_pavi/
├── api/
│   ├── src/
│   │   ├── config.py           # Configuration with local pipeline options
│   │   ├── main.py             # FastAPI application
│   │   ├── job_service.py      # Job management (DynamoDB/SQLite/memory)
│   │   ├── local_job_store.py  # SQLite storage backend [NEW]
│   │   ├── local_pipeline.py   # Local pipeline runner [NEW]
│   │   ├── constants.py        # Shared constants
│   │   └── log_mgmt/           # Logging utilities
│   ├── .venv/                  # Python virtual environment
│   └── requirements.txt        # Python dependencies
├── pipeline_components/
│   ├── seq_retrieval/
│   │   ├── src/
│   │   │   ├── seq_retrieval.py    # Main CLI entry point
│   │   │   ├── seq_info_align.py   # Sequence info alignment
│   │   │   └── ...                 # Supporting modules
│   │   └── .venv/                  # Component venv
│   └── alignment/
│       └── ...                     # Alignment container (not used in local mode)
├── webui/                          # Next.js frontend
└── docs/                           # Documentation [NEW]
```

### Runtime Data Structure

```
/var/lib/pavi/
├── jobs/
│   └── jobs.db                 # SQLite database
├── work/
│   └── {job_id}/               # Per-job work directory
│       ├── seq_regions.json    # Input data
│       ├── {entry_id}-protein.fa       # Retrieved sequences
│       ├── {entry_id}-seqinfo.json     # Sequence metadata
│       ├── alignment-input.fa          # Merged FASTA
│       ├── alignment-output.aln        # Clustal alignment
│       └── aligned_seq_info.json       # Merged seq info
└── results/
    └── {job_id}/               # Per-job results
        ├── alignment-output.aln        # Final alignment
        └── aligned_seq_info.json       # Final seq info
```

### SQLite Schema

```sql
CREATE TABLE jobs (
    job_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,           -- PENDING, RUNNING, COMPLETED, FAILED
    stage TEXT,                     -- INITIALIZING, SEQUENCE_RETRIEVAL, etc.
    created_at TEXT NOT NULL,       -- ISO 8601 timestamp
    completed_at TEXT,              -- ISO 8601 timestamp
    input_count INTEGER DEFAULT 0,  -- Number of input sequences
    sequences_processed INTEGER DEFAULT 0,
    error_message TEXT,             -- Error details if failed
    input_data TEXT,                -- JSON blob of seq_regions
    result_path TEXT                -- Path to results directory
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

---

## Troubleshooting

### Common Issues

#### 1. "clustalo not found"

**Symptom**: API returns error about missing clustalo binary

**Solution**:
```bash
# Check if clustalo is in PATH
which clustalo

# If not found, check /usr/local/bin
ls -la /usr/local/bin/clustalo

# Add to PATH if needed
export PATH="/usr/local/bin:$PATH"
```

#### 2. "Permission denied" on /var/lib/pavi

**Symptom**: Jobs fail with permission errors

**Solution**:
```bash
# Fix ownership
sudo chown -R ec2-user:ec2-user /var/lib/pavi

# Fix permissions
chmod 755 /var/lib/pavi/{jobs,results,work}
```

#### 3. seq_retrieval module not found

**Symptom**: Pipeline fails to import seq_retrieval

**Solution**:
```bash
# Ensure PYTHONPATH includes seq_retrieval src
export PYTHONPATH="/home/ec2-user/agr_pavi/pipeline_components/seq_retrieval/src:$PYTHONPATH"

# Or install seq_retrieval dependencies
cd /home/ec2-user/agr_pavi/pipeline_components/seq_retrieval
uv pip install -r requirements.txt
```

#### 4. SQLite database locked

**Symptom**: Concurrent requests fail with "database is locked"

**Solution**: The LocalJobStore uses thread-local connections. If issues persist:
```bash
# Check for stale locks
fuser /var/lib/pavi/jobs/jobs.db

# Restart API to clear connections
```

#### 5. Alignment fails with empty output

**Symptom**: clustalo runs but produces no output

**Solution**:
```bash
# Check input FASTA
cat /var/lib/pavi/work/{job_id}/alignment-input.fa

# Test clustalo manually
clustalo -i /var/lib/pavi/work/{job_id}/alignment-input.fa \
  --outfmt=clustal --resno \
  -o /tmp/test-alignment.aln

# Check for errors
cat /tmp/test-alignment.aln
```

### Checking Logs

```bash
# API logs (if running with uvicorn)
# Logs go to stdout by default

# Check job status in SQLite
sqlite3 /var/lib/pavi/jobs/jobs.db "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10;"

# Check work directory for a specific job
ls -la /var/lib/pavi/work/{job_id}/
```

### Performance Tuning

```bash
# Increase parallel workers (based on CPU cores)
export PAVI_LOCAL_MAX_WORKERS=8

# Use SSD storage for better I/O
# Mount an SSD volume at /var/lib/pavi

# Monitor resource usage
htop
iostat -x 1
```

---

## Security Considerations

1. **SQLite Database**: Contains job metadata but no sensitive data. Ensure proper file permissions.

2. **Work/Results Directories**: May contain sequence data. Restrict access as needed.

3. **API Access**: Consider adding authentication if exposing beyond localhost.

4. **Network**: The default configuration binds to all interfaces (0.0.0.0). Use firewall rules or bind to localhost for security.

---

## Maintenance

### Cleaning Up Old Jobs

```bash
# SQLite has TTL-like cleanup built in
# Call cleanup_old_jobs() method, or manually:
sqlite3 /var/lib/pavi/jobs/jobs.db "DELETE FROM jobs WHERE created_at < datetime('now', '-30 days');"

# Clean work directories
find /var/lib/pavi/work -type d -mtime +30 -exec rm -rf {} \;

# Clean results (be careful!)
find /var/lib/pavi/results -type d -mtime +30 -exec rm -rf {} \;
```

### Backing Up Data

```bash
# Backup SQLite database
cp /var/lib/pavi/jobs/jobs.db /backup/jobs-$(date +%Y%m%d).db

# Backup results
tar -czf /backup/pavi-results-$(date +%Y%m%d).tar.gz /var/lib/pavi/results/
```

---

## Reverse Proxy Setup (Caddy)

For production or VPN-accessible deployments, use Caddy as a reverse proxy with automatic HTTPS.

### Install Caddy

```bash
# Download Caddy binary
curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=amd64" -o /tmp/caddy
chmod +x /tmp/caddy
sudo mv /tmp/caddy /usr/local/bin/caddy

# Verify
caddy version
```

### Configure Caddy

Create `/etc/caddy/Caddyfile`:

```
dev-pavi.alliancegenome.org {
    # Use internal TLS for VPN-only access (self-signed)
    tls internal

    # Or for public access, remove "tls internal" to use Let's Encrypt

    handle /api/* {
        reverse_proxy localhost:8000
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

### Create Systemd Service

Create `/etc/systemd/system/caddy.service`:

```ini
[Unit]
Description=Caddy
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/caddy run --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

### Start Caddy

```bash
sudo systemctl daemon-reload
sudo systemctl enable caddy
sudo systemctl start caddy

# Check status
sudo systemctl status caddy
```

### DNS Configuration

Update Route 53 to point your domain to the EC2 instance:

```bash
# For internal/VPN access (private IP)
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "dev-pavi.alliancegenome.org",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "<PRIVATE_IP>"}]
      }
    }]
  }'

# For public access, use an Elastic IP instead
```

### TLS Options

| Mode | Caddyfile Directive | Use Case |
|------|---------------------|----------|
| Internal (self-signed) | `tls internal` | VPN-only access, testing |
| Let's Encrypt (auto) | (no directive) | Public internet access |
| Custom cert | `tls /path/to/cert.pem /path/to/key.pem` | Enterprise CA |

---

## Environment Summary

| Environment | URL | Execution Mode | TLS |
|-------------|-----|----------------|-----|
| Local Dev | http://localhost:8000 | local_pipeline | None |
| VPN Dev | https://dev-pavi.alliancegenome.org | local_pipeline | Internal (self-signed) |
| Production | https://pavi.alliancegenome.org | step_functions | ACM via ALB |

---

## Related Documentation

- [Step Functions Design](step-functions-design.md) - AWS Step Functions architecture
- [CLAUDE.md](../CLAUDE.md) - Project overview and development guidelines
- [WebUI README](../webui/README.md) - Frontend documentation
