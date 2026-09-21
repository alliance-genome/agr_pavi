# PAVI Complete Deployment Guide

This is the single source of truth for deploying PAVI across all environments: local development, EC2 single-server, and AWS cloud (production). It consolidates information from the individual deployment docs into one reference.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Local Development Setup](#local-development-setup)
3. [EC2 Deployment (Single Server)](#ec2-deployment-single-server)
4. [AWS Cloud Deployment (Production)](#aws-cloud-deployment-production)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Configuration Reference](#configuration-reference)
7. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)

---

## Architecture Overview

PAVI supports three deployment modes, each suited to different use cases.

### Deployment Modes at a Glance

| Mode | Storage | Job Orchestration | Use Case |
|------|---------|-------------------|----------|
| **Local Dev** | In-memory / SQLite | Nextflow or Local Pipeline | Developer workstations |
| **EC2 (Single Server)** | SQLite + Local FS | Direct Python execution | Dev/test on EC2 |
| **AWS Cloud (Production)** | DynamoDB + S3 | AWS Step Functions + Batch | Production workloads |

### Mode 1: Local Development

```
Developer Machine
+-------------------------------------------------------+
|                                                       |
|  Terminal 1              Terminal 2                    |
|  +------------------+   +------------------+          |
|  | API (FastAPI)    |   | WebUI (Next.js)  |          |
|  | localhost:8000   |<--| localhost:3000    |          |
|  +--------+---------+   +------------------+          |
|           |                                           |
|           v                                           |
|  +------------------+                                 |
|  | Nextflow or      |                                 |
|  | Local Pipeline   |                                 |
|  +------------------+                                 |
+-------------------------------------------------------+
```

### Mode 2: EC2 Single Server

```
EC2 Instance (t3.large recommended)
+-------------------------------------------------------+
|                                                       |
|  Caddy / Nginx (reverse proxy, HTTPS)                 |
|  +---------------------------------------------------+|
|  | / --> localhost:3000  | /api/* --> localhost:8000  ||
|  +---------------------------------------------------+|
|                                                       |
|  +------------------+   +------------------+          |
|  | WebUI (Next.js)  |   | API (FastAPI)    |          |
|  | port 3000        |   | port 8000        |          |
|  +------------------+   +--------+---------+          |
|                                  |                    |
|                         +--------v---------+          |
|                         | LocalPipeline    |          |
|                         | Runner           |          |
|                         | (ThreadPoolExec) |          |
|                         +--------+---------+          |
|                                  |                    |
|                    +-------------+-------------+      |
|                    |             |             |       |
|              +-----v-----+ +----v----+ +------v----+ |
|              | Python     | | clustalo| | Python    | |
|              | seq_retr.  | | (binary)| | collect   | |
|              +-----+------+ +----+----+ +------+----+ |
|                    |             |             |       |
|                    +-------------+-------------+      |
|                                  |                    |
|                         +--------v---------+          |
|                         | Local Filesystem |          |
|                         | /var/lib/pavi/   |          |
|                         |  jobs/ (SQLite)  |          |
|                         |  work/           |          |
|                         |  results/        |          |
|                         +------------------+          |
+-------------------------------------------------------+
```

### Mode 3: AWS Cloud (Production)

```
+---------------------------------------------------------------+
|                  AWS Account: 100225593120                      |
|                    VPC: vpc-55522232                            |
+---------------------------------------------------------------+
|                                                                |
|  Private Route53 Hosted Zone                                   |
|    pavi.alliancegenome.org --> WebUI ALB (internal)             |
|                                                                |
|  +-------------------+       +-------------------+             |
|  | Elastic Beanstalk |       | Elastic Beanstalk |             |
|  | PAVI-webui-main   |------>| PAVI-api-main     |             |
|  | (Next.js Docker)  |       | (FastAPI Docker)  |             |
|  +-------------------+       +---------+---------+             |
|                                        |                       |
|                               +--------v---------+            |
|                               | Step Functions   |            |
|                               | State Machine    |            |
|                               +--------+---------+            |
|                                        |                       |
|                          +-------------+-------------+         |
|                          |                           |         |
|                   +------v------+             +------v------+  |
|                   | AWS Batch   |             | AWS Batch   |  |
|                   | seq_retr.   |             | alignment   |  |
|                   +------+------+             +------+------+  |
|                          |                           |         |
|                          +-------------+-------------+         |
|                                        |                       |
|  +------------------+         +--------v---------+             |
|  | DynamoDB         |         | S3 Bucket        |             |
|  | (Job tracking)   |         | (Results/Work)   |             |
|  +------------------+         +------------------+             |
|                                                                |
|  +------------------+         +------------------+             |
|  | CloudWatch       |         | ECR              |             |
|  | Dashboard/Alarms |         | (Container imgs) |             |
|  +------------------+         +------------------+             |
+---------------------------------------------------------------+
```

---

## Local Development Setup

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.12 | Required exact version for mypy/type checking |
| Node.js | v24 | Managed via NVM; see `webui/.nvmrc` |
| Java | 17 | Required for Nextflow (legacy pipeline mode) |
| Docker | Latest | For container builds and integration tests |
| Clustal Omega | 1.2.4 | Only needed for local pipeline mode |

### Starting the API Dev Server

```bash
cd api

# Install dependencies (creates .venv automatically)
make install-deps

# Start the FastAPI dev server (port 8000)
# Requires Java 17 for Nextflow dependency
make run-server-dev
```

The `run-server-dev` target sets `API_EXECUTION_ENV=local`, configures `JAVA_HOME` for Java 17, and starts `fastapi dev` on port 8000 with auto-reload.

**Note**: The API Docker container runs on port 8080, but `fastapi dev` defaults to 8000.

### Starting the WebUI Dev Server

#### With a Real API Backend

```bash
cd webui

# Install dependencies
npm install --strict-peer-deps

# Start dev server pointing to local API
PAVI_API_BASE_URL=http://localhost:8000 make run-server-dev
```

The WebUI runs on `http://localhost:3000`. The middleware in `src/middleware.ts` proxies all `/api/*` requests to `PAVI_API_BASE_URL`.

#### With Mock API (No Backend Required)

```bash
cd webui

# Start with mock data (no API server needed)
npm run dev:mock
```

When `MOCK_API=true`, the middleware rewrites API requests to a Next.js catch-all route that serves data from `src/utils/mockData.ts`. This is useful for frontend-only development.

### Docker Compose (API + WebUI)

For running the full stack locally via Docker:

```bash
# Build container images
cd api && make container-image && cd ..
cd webui && make container-image && cd ..

# Run via docker-compose (from api/)
cd api
make run-container-dev
```

The `docker-compose-dev.yml` file in the API directory launches the API container with AWS credentials forwarded for Nextflow/S3 access.

### Running Validation Before PRs

From each component directory:

```bash
make run-style-checks    # flake8 (Python) or eslint (TypeScript)
make run-type-checks     # mypy (Python) or tsc --noEmit --strict (TypeScript)
make run-unit-tests      # pytest (Python) or jest (TypeScript)
```

---

## EC2 Deployment (Single Server)

The EC2 deployment mode runs the complete PAVI stack on a single instance without AWS Step Functions, Batch, DynamoDB, or S3. It replaces cloud services with local equivalents.

### EC2 Instance Requirements

| Resource | Recommended |
|----------|-------------|
| AMI | Amazon Linux 2023 |
| Instance type | t3.large (2 vCPU, 7.6 GB RAM) |
| Storage | 50 GB gp3 |
| VPC | vpc-55522232 (Alliance VPC) |
| Security groups | 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| IAM role | ECR pull access (for Docker-based deployment) |

### Option A: Native Deployment (Local Pipeline)

This option runs the pipeline natively on the EC2 instance using Python and Clustal Omega directly.

#### 1. Install System Dependencies

```bash
# Build tools
sudo yum update -y
sudo yum install -y gcc gcc-c++ make cmake autoconf automake libtool

# Python 3.12
# (install via your preferred method -- yum, pyenv, etc.)

# uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### 2. Build and Install Clustal Omega

Clustal Omega requires argtable2. See [clustal-omega-build.md](clustal-omega-build.md) for detailed build instructions if available.

```bash
# Build argtable2
cd /tmp
git clone https://github.com/jonathanmarvens/argtable2.git
cd argtable2-master
mkdir -p build && cd build
cmake ..
make -j4
sudo make install
sudo cp /tmp/argtable2-master/src/argtable2.h /usr/local/include/

# Build Clustal Omega
cd /tmp
git clone https://github.com/GSLBiotech/clustal-omega.git
cd clustal-omega
autoreconf -fi
./configure CFLAGS="-I/usr/local/include" LDFLAGS="-L/usr/local/lib"
make -j4
sudo make install

# Verify
clustalo --version
# Expected: 1.2.4
```

#### 3. Set Up Python Environments

```bash
# API
cd /home/ec2-user/agr_pavi/api
uv venv --python 3.12 .venv
uv pip install -r requirements.txt

# Seq retrieval pipeline component
cd /home/ec2-user/agr_pavi/pipeline_components/seq_retrieval
uv venv --python 3.12 .venv
uv pip install -r requirements.txt
```

#### 4. Create Data Directories

```bash
sudo mkdir -p /var/lib/pavi/{jobs,results,work}
sudo chown -R ec2-user:ec2-user /var/lib/pavi
```

#### 5. Configure Environment

```bash
cat > /home/ec2-user/agr_pavi/api/.env.local << 'EOF'
USE_LOCAL_PIPELINE=true
PAVI_ENVIRONMENT=local
PAVI_LOCAL_JOBS_PATH=/var/lib/pavi/jobs
PAVI_LOCAL_RESULTS_PATH=/var/lib/pavi/results
PAVI_LOCAL_WORK_PATH=/var/lib/pavi/work
PAVI_LOCAL_MAX_WORKERS=4
EOF
```

#### 6. Start Services

```bash
# API (production mode)
cd /home/ec2-user/agr_pavi/api/src
USE_LOCAL_PIPELINE=true ../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

# WebUI (production mode -- build once, then start)
cd /home/ec2-user/agr_pavi/webui
PAVI_API_BASE_URL=http://localhost:8000 npm run build
PAVI_API_BASE_URL=http://localhost:8000 npm run start
```

**Important**: Do NOT use `npm run dev` for production. It is slow and shows development warnings.

### Option B: Docker-Based EC2 Deployment

This option pulls pre-built container images from ECR and runs them with Docker Compose.

#### 1. Initial Setup

Use the setup script from `deploy/ec2/`:

```bash
# Upload deployment files to EC2
scp -i your-key.pem deploy/ec2/* ec2-user@<ec2-ip>:~/

# SSH in and run setup
ssh -i your-key.pem ec2-user@<ec2-ip>
chmod +x setup.sh deploy.sh
./setup.sh
```

The setup script installs Docker, Docker Compose, and Nginx, then configures the reverse proxy.

#### 2. Deploy Containers

```bash
# Log out and back in (for docker group membership)
cd /opt/pavi

# Deploy with default tag
./deploy.sh

# Deploy a specific version
PAVI_IMAGE_TAG=v1.0.0 ./deploy.sh
```

The `deploy.sh` script authenticates to ECR, pulls images, stops existing containers, starts new ones, and runs health checks.

#### Docker Compose Configuration

The `deploy/ec2/docker-compose.yml` defines two services:

```yaml
services:
  webui:
    image: 100225593120.dkr.ecr.us-east-1.amazonaws.com/agr_pavi/webui:${PAVI_IMAGE_TAG:-dev}
    ports:
      - "3000:3000"
    environment:
      - PAVI_API_BASE_URL=http://api:8080
      - NODE_ENV=production
    depends_on:
      - api

  api:
    image: 100225593120.dkr.ecr.us-east-1.amazonaws.com/agr_pavi/api:${PAVI_IMAGE_TAG:-main}
    ports:
      - "8080:8080"
    environment:
      - API_HOST=0.0.0.0
      - API_PORT=8080
      - API_EXECUTION_ENV=aws
      - PAVI_ENVIRONMENT=${PAVI_ENVIRONMENT:-dev}
```

### Reverse Proxy Configuration

There are two options for the reverse proxy: Caddy (recommended for auto-HTTPS) and Nginx.

#### Option 1: Caddy (Recommended)

```bash
# Install Caddy
curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=amd64" -o /tmp/caddy
chmod +x /tmp/caddy
sudo mv /tmp/caddy /usr/local/bin/caddy
```

Create `/etc/caddy/Caddyfile`:

```
dev-pavi.alliancegenome.org {
    # Use internal TLS for VPN-only access (self-signed)
    tls internal

    handle /api/* {
        reverse_proxy localhost:8000
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

Create systemd service at `/etc/systemd/system/caddy.service`:

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

```bash
sudo systemctl daemon-reload
sudo systemctl enable caddy
sudo systemctl start caddy
```

TLS options:

| Mode | Caddyfile Directive | Use Case |
|------|---------------------|----------|
| Internal (self-signed) | `tls internal` | VPN-only access, testing |
| Let's Encrypt (auto) | (no directive) | Public internet access |
| Custom cert | `tls /path/to/cert.pem /path/to/key.pem` | Enterprise CA |

#### Option 2: Nginx

The `deploy/ec2/nginx.conf` provides an Nginx configuration:

```nginx
server {
    listen 80;
    server_name dev-pavi.alliancegenome.org pavi-dev.alliancegenome.org;

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

**Note**: The Nginx config proxies API on port 8080 (Docker container port), while Caddy uses port 8000 (direct uvicorn). Adjust based on your deployment option.

### Directory Structure (Local Pipeline Mode)

Application:

```
/home/ec2-user/agr_pavi/
  api/
    src/
      config.py              # Configuration with local pipeline options
      main.py                # FastAPI application
      job_service.py         # Job management (DynamoDB/SQLite/memory)
      local_job_store.py     # SQLite storage backend
      local_pipeline.py      # Local pipeline runner
    .venv/                   # Python virtual environment
  pipeline_components/
    seq_retrieval/
      src/                   # Sequence retrieval code
      .venv/                 # Component venv
    alignment/               # Alignment container (not used in local mode)
  webui/                     # Next.js frontend
```

Runtime data:

```
/var/lib/pavi/
  jobs/
    jobs.db                  # SQLite database
  work/
    {job_id}/                # Per-job work directory
      seq_regions.json       # Input data
      {entry_id}-protein.fa  # Retrieved sequences
      {entry_id}-seqinfo.json
      alignment-input.fa     # Merged FASTA
      alignment-output.aln   # Clustal alignment
      aligned_seq_info.json  # Merged seq info
  results/
    {job_id}/                # Per-job results
      alignment-output.aln
      aligned_seq_info.json
```

### SQLite Schema

```sql
CREATE TABLE jobs (
    job_id TEXT PRIMARY KEY,
    status TEXT NOT NULL,            -- PENDING, RUNNING, COMPLETED, FAILED
    stage TEXT,                      -- INITIALIZING, SEQUENCE_RETRIEVAL, etc.
    created_at TEXT NOT NULL,        -- ISO 8601 timestamp
    completed_at TEXT,
    input_count INTEGER DEFAULT 0,
    sequences_processed INTEGER DEFAULT 0,
    error_message TEXT,
    input_data TEXT,                 -- JSON blob of seq_regions
    result_path TEXT                 -- Path to results directory
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

---

## AWS Cloud Deployment (Production)

### AWS Resources Overview

The production deployment uses these AWS resources, all in account `100225593120`, region `us-east-1`:

| Resource | Name / ARN |
|----------|------------|
| VPC | vpc-55522232 |
| Private Route53 Zone | Z007692222A6W93AZVSPD |
| State Machine | `arn:aws:states:us-east-1:100225593120:stateMachine:pavi-pipeline-sfn-poc3` |
| DynamoDB Table | `pavi-jobs-poc3` |
| S3 Work Bucket | `agr-pavi-pipeline-stepfunctions-poc3` |
| Batch Job Queue | `arn:aws:batch:us-east-1:100225593120:job-queue/pavi_pipeline_poc3` |
| CloudWatch Dashboard | `PAVI-StepFunctions-Pipeline-poc3` |
| ECR Repos | `agr_pavi/api`, `agr_pavi/webui`, `agr_pavi/pipeline_seq_retrieval`, `agr_pavi/pipeline_alignment` |
| EB Environments | `PAVI-api-main`, `PAVI-webui-main` |

### CDK Infrastructure Stacks

Infrastructure is defined as AWS CDK (Python) in each component's `aws_infra/` directory:

| Directory | Stacks | Purpose |
|-----------|--------|---------|
| `shared_aws/aws_infra/` | Shared resources | Common AWS resources |
| `pipeline_components/aws_infra/` | Pipeline infra | Step Functions, Batch, S3 |
| `api/aws_infra/` | API stacks | ECR repo, EB app, EB environments |
| `webui/aws_infra/` | WebUI stacks | ECR repo, EB app, EB environments |

CDK stack names for Elastic Beanstalk environments:

| Stack Name | Environment |
|------------|-------------|
| `PaviApiEbMainStack` | API production |
| `PaviApiEbDevStack` | API development |
| `PaviWebUiEbMainStack` | WebUI production |
| `PaviWebUiEbDevStack` | WebUI development |

### Deploying with CDK

#### Prerequisites

```bash
# AWS credentials configured
aws sts get-caller-identity

# Build shared_aws package first
make -C shared_aws/py_package/ clean build install
```

#### Full Stack Deployment (Dev)

From the repository root:

```bash
make deploy-dev
```

This target executes the following steps in order:

1. Validates and deploys pipeline infrastructure (CDK)
2. Builds and pushes container images for seq_retrieval, alignment, API, and WebUI
3. Deploys API application version and environment (`PaviApiEbDevStack`)
4. Deploys WebUI application version and environment (`PaviWebUiEbDevStack`)

#### Validation Only (CDK Diff)

```bash
make validate-dev
```

This runs `cdk diff` for all stacks without making changes.

#### Individual Component Deployment

```bash
# Deploy API only
cd api/aws_infra
make deploy-application PAVI_DEPLOY_VERSION_LABEL="my-version"
make deploy-environment \
  PAVI_DEPLOY_VERSION_LABEL="my-version" \
  PAVI_IMAGE_TAG="my-version" \
  EB_ENV_CDK_STACK_NAME=PaviApiEbDevStack \
  ADD_CDK_ARGS="--require-approval never"

# Deploy WebUI only
cd webui/aws_infra
make deploy-application PAVI_DEPLOY_VERSION_LABEL="my-version"
make deploy-environment \
  PAVI_API_STACK_NAME="PaviApiEbDevStack" \
  PAVI_DEPLOY_VERSION_LABEL="my-version" \
  PAVI_IMAGE_TAG="my-version" \
  EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack \
  ADD_CDK_ARGS="--require-approval never"
```

### Container Image Build and Push

Each component has `container-image` and `push-container-image` Makefile targets:

```bash
# Build images
cd api && make container-image && cd ..
cd webui && make container-image && cd ..
cd pipeline_components/seq_retrieval && make container-image && cd ..
cd pipeline_components/alignment && make container-image && cd ..

# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  100225593120.dkr.ecr.us-east-1.amazonaws.com

# Push images
cd api && make push-container-image TAG_NAME=dev && cd ..
cd webui && make push-container-image TAG_NAME=dev && cd ..
```

**Note**: The API container build requires AWS credentials (passed as Docker build secrets) because it downloads Nextflow artifacts during the build.

### Environment Variables (AWS Production)

Set on the API Elastic Beanstalk environment:

```bash
aws elasticbeanstalk update-environment \
  --environment-name PAVI-api-main \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=PAVI_ENVIRONMENT,Value=prod \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=USE_STEP_FUNCTIONS,Value=true \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=STEP_FUNCTIONS_STATE_MACHINE_ARN,Value=arn:aws:states:us-east-1:100225593120:stateMachine:pavi-pipeline-sfn-poc3 \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=DYNAMODB_JOBS_TABLE,Value=pavi-jobs-poc3 \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=PAVI_RESULTS_BUCKET,Value=agr-pavi-pipeline-stepfunctions-poc3
```

### DNS and Networking

DNS is managed by the Alliance organization in a **private** Route53 hosted zone. PAVI is only accessible via VPN.

| Record | Type | Target | Environment |
|--------|------|--------|-------------|
| `pavi.alliancegenome.org` | CNAME | WebUI ALB | Production |
| `dev-pavi.alliancegenome.org` | CNAME | Dev ALB or EC2 | Development |
| `main-pavi.alliancegenome.org` | CNAME | Main env ALB | Main |

Both ALBs are **internal** (not internet-facing). Contact the Alliance DevOps team for DNS changes.

### Alternative: AWS Amplify for WebUI

CDK code for Amplify deployment exists in `webui/aws_infra/cdk_classes/webui_amplify.py`:

```bash
cd webui/aws_infra

PAVI_WEBUI_DEPLOYMENT_METHOD=amplify \
PAVI_CUSTOM_DOMAIN=pavi2.alliancegenome.org \
make deploy-stack
```

Amplify requires a GitHub token stored in Secrets Manager at `pavi/github-token`.

---

## CI/CD Pipeline

### PR Validation Workflow

**File**: `.github/workflows/PR-validation.yml`

Triggered on: pull requests to `main` (synchronize, opened, reopened, edited, labeled, unlabeled).

The workflow runs these jobs in parallel where possible:

| Category | Jobs |
|----------|------|
| **Dependency Lock Updates** | Update and upload lock files for seq_retrieval, API, WebUI, shared_aws |
| **Code Checks (per component)** | Style checks (flake8/eslint), type checks (mypy/tsc), unit tests |
| **Container Builds** | Build and push Docker images tagged `PR-{number}-validation` |
| **CDK Validation** | CDK diff for shared_aws, pipeline, API, and WebUI infrastructure |
| **Integration Tests** | API pipeline workflow integration tests (local + AWS) |
| **E2E Tests** | Cypress end-to-end tests with visual regression |
| **Bundle Lock Files** | Aggregate updated lock files for merge-time commit |

Key behaviors:

- Concurrency group per PR number (cancels in-progress runs on new pushes)
- Lock file updates skipped if PR has `no-deps-lock-updates` label
- Container images are pushed to ECR for CDK validation
- E2E tests run API and WebUI containers locally, then execute Cypress tests

### Main Branch Deploy Workflow

**File**: `.github/workflows/main-build-and-deploy.yml`

Triggered on: pull request closed (merged) to `main`.

The workflow has these key stages:

```
PR Merged
    |
    +-- [Gate: skip if 'no-deploy' label]
    |
    +-- Commit dependency lock updates (from PR validation artifacts)
    |
    +-- Build pavi_shared_aws package
    |
    +-- (parallel)
    |   +-- Deploy shared AWS infra (CDK)
    |   +-- Deploy API ECR repo (CDK)
    |   +-- Deploy WebUI ECR repo (CDK)
    |
    +-- Deploy pipeline AWS infra (CDK)
    |
    +-- (parallel)
    |   +-- Build & push seq_retrieval image
    |   +-- Build & push alignment image
    |   +-- Build & push API image
    |   +-- Build & push WebUI image
    |
    +-- Deploy application versions (API + WebUI to EB main environments)
```

Container images are tagged with `git describe --tags` output and also with the base branch name (`main`).

### Label Controls

| PR Label | Effect |
|----------|--------|
| `no-deploy` | Merge does not trigger deployment |
| `no-deps-lock-updates` | Skip dependency lock file updates during PR validation and merge |

### CODEOWNERS

These paths require approval from `@alliance-genome/role-pavi-admins`:

- `.github/`
- `**/Makefile`
- `/common_make`

---

## Configuration Reference

### Execution Mode Priority

The API determines execution mode using this priority:

```
1. USE_LOCAL_PIPELINE=true     --> Local Pipeline mode (SQLite + local FS)
2. USE_STEP_FUNCTIONS=true     --> Step Functions mode (DynamoDB + S3)
3. Default (dev/staging/prod)  --> Step Functions mode
4. Default (local)             --> Nextflow mode (legacy)
```

### API Core Settings

| Variable | Default | Valid Values | Description |
|----------|---------|--------------|-------------|
| `PAVI_ENVIRONMENT` | `"local"` | `local`, `dev`, `staging`, `prod` | Deployment environment |
| `DEBUG` | `"false"` | `true`, `false` | Enable debug logging |
| `API_HOST` | `"0.0.0.0"` | IP address | API bind address |
| `API_PORT` | `"8080"` | Port number | API port (Docker: 8080, dev: 8000) |

### Pipeline Execution Mode

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_LOCAL_PIPELINE` | `false` | Enable local pipeline (highest priority) |
| `USE_STEP_FUNCTIONS` | Auto-detect | Override Step Functions usage |
| `ENABLE_STEP_FUNCTIONS_ROLLOUT` | `"false"` | Enable gradual rollout |
| `STEP_FUNCTIONS_ROLLOUT_PERCENTAGE` | `"0"` | Percentage of jobs routed to Step Functions (0-100) |

### AWS Resources (Step Functions Mode)

| Variable | Default | Description |
|----------|---------|-------------|
| `STEP_FUNCTIONS_STATE_MACHINE_ARN` | None | ARN of Step Functions state machine |
| `BATCH_JOB_QUEUE_ARN` | Environment-specific | ARN of AWS Batch job queue |
| `DYNAMODB_JOBS_TABLE` | `pavi-jobs-{env}` | DynamoDB table for job tracking |
| `PAVI_RESULTS_BUCKET` | `agr-pavi-pipeline-{env}` | S3 bucket for results |
| `PAVI_WORK_BUCKET` | `agr-pavi-pipeline-nextflow` | S3 bucket for work files |

### Local Pipeline (EC2 Mode)

| Variable | Default | Description |
|----------|---------|-------------|
| `PAVI_LOCAL_JOBS_PATH` | `/var/lib/pavi/jobs` | SQLite database directory |
| `PAVI_LOCAL_RESULTS_PATH` | `/var/lib/pavi/results` | Final results directory |
| `PAVI_LOCAL_WORK_PATH` | `/var/lib/pavi/work` | Intermediate work files |
| `PAVI_LOCAL_MAX_WORKERS` | `"4"` | Max parallel sequence retrievals |
| `PAVI_PIPELINE_COMPONENTS_PATH` | `/home/ec2-user/agr_pavi/pipeline_components` | Path to pipeline component code |

### Legacy Nextflow

| Variable | Default | Description |
|----------|---------|-------------|
| `API_NEXTFLOW_OUT_DIR` | `"./"` | Nextflow output directory |
| `API_PIPELINE_IMAGE_TAG` | `"latest"` | Docker image tag for pipeline containers |
| `API_RESULTS_PATH_PREFIX` | `"./results/"` | Prefix for results directory |
| `NXF_OFFLINE` | `"true"` | Run Nextflow offline |

### WebUI

| Variable | Default | Description |
|----------|---------|-------------|
| `PAVI_API_BASE_URL` | `"http://localhost:8000"` | Backend API URL |
| `MOCK_API` | `"false"` | Enable mock API (always `true` on Vercel) |
| `NODE_ENV` | `"development"` | Node.js environment |
| `ANALYZE` | `"false"` | Enable webpack bundle analyzer |
| `NEXT_TELEMETRY_DISABLED` | Not set | Set to `1` to disable Next.js telemetry |

### Admin Dashboard

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ADMIN_PASSWORD` | `"pavi-admin-2025"` | Admin dashboard password |
| `AWS_REGION` | `"us-east-1"` | AWS region for SDK clients |
| `PAVI_STATE_MACHINE_ARN` | `""` | Step Functions ARN (status display) |
| `PAVI_JOB_QUEUE_ARN` | `""` | Batch queue ARN (status display) |
| `PAVI_JOBS_TABLE_NAME` | `"pavi-jobs"` | DynamoDB table name (status display) |

### CDK

| Variable | Default | Description |
|----------|---------|-------------|
| `CDK_DEFAULT_ACCOUNT` | From context | AWS account ID |
| `CDK_DEFAULT_REGION` | `"us-east-1"` | AWS region |

### Environment-Specific Defaults

**Local Development**:
```bash
PAVI_ENVIRONMENT=local
USE_LOCAL_PIPELINE=false
USE_STEP_FUNCTIONS=false
PAVI_API_BASE_URL=http://localhost:8000
```

**Local EC2**:
```bash
PAVI_ENVIRONMENT=local
USE_LOCAL_PIPELINE=true
PAVI_LOCAL_JOBS_PATH=/var/lib/pavi/jobs
PAVI_LOCAL_RESULTS_PATH=/var/lib/pavi/results
PAVI_LOCAL_WORK_PATH=/var/lib/pavi/work
PAVI_LOCAL_MAX_WORKERS=4
```

**AWS Development**:
```bash
PAVI_ENVIRONMENT=dev
USE_STEP_FUNCTIONS=true
DYNAMODB_JOBS_TABLE=pavi-jobs-dev
PAVI_RESULTS_BUCKET=agr-pavi-pipeline-stepfunctions-dev
STEP_FUNCTIONS_STATE_MACHINE_ARN=arn:aws:states:us-east-1:...
```

**AWS Production**:
```bash
PAVI_ENVIRONMENT=prod
USE_STEP_FUNCTIONS=true
DYNAMODB_JOBS_TABLE=pavi-jobs-prod
PAVI_RESULTS_BUCKET=agr-pavi-pipeline-stepfunctions-prod
```

---

## Monitoring and Troubleshooting

### Health Check Endpoints

| Endpoint | Mode | Description |
|----------|------|-------------|
| `GET /api/health` | All | API health status |
| `GET /api/deployment-status` | Local pipeline | Includes clustalo availability check |
| `GET /health` | WebUI | Next.js server health (force-dynamic) |
| `GET /nginx-health` | EC2 (Nginx) | Nginx reverse proxy health |

**Local pipeline health response**:
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

### CloudWatch Monitoring (AWS)

#### Dashboard

The Step Functions stack includes a CloudWatch dashboard: `PAVI-StepFunctions-Pipeline-poc3`

```bash
aws cloudwatch get-dashboard --dashboard-name PAVI-StepFunctions-Pipeline-poc3
```

#### Alarms

| Alarm | Condition |
|-------|-----------|
| `pavi-sfn-executions-failed-poc3` | Failed executions |
| `pavi-sfn-executions-throttled-poc3` | Throttled executions |
| `pavi-sfn-executions-timeout-poc3` | Timed out executions |
| `pavi-sfn-execution-time-poc3` | Execution duration exceeded |

#### Log Groups

| Log Group | Content |
|-----------|---------|
| `/aws/elasticbeanstalk/PAVI-api-main/` | API application logs |
| `/aws/elasticbeanstalk/PAVI-webui-main/` | WebUI application logs |
| `pavi-sfn-pipeline-logs` | Step Functions execution logs |
| `/aws/batch/job` | Batch job container logs |

```bash
# Tail API logs
aws logs tail \
  /aws/elasticbeanstalk/PAVI-api-main/var/log/eb-docker/containers/eb-current-app/stdouterr.log \
  --follow

# Search for errors in the last hour
aws logs filter-log-events \
  --log-group-name /aws/elasticbeanstalk/PAVI-api-main/var/log/eb-docker/containers/eb-current-app/stdouterr.log \
  --start-time $(( $(date +%s) - 3600 ))000 \
  --filter-pattern "ERROR"
```

### Elastic Beanstalk Monitoring

```bash
# Environment health
aws elasticbeanstalk describe-environment-health \
  --environment-name PAVI-api-main \
  --attribute-names All

# Recent events
aws elasticbeanstalk describe-events \
  --environment-name PAVI-api-main \
  --max-items 10

# Request and retrieve full logs
aws elasticbeanstalk request-environment-info \
  --environment-name PAVI-api-main \
  --info-type bundle
```

### Common Deployment Issues

#### API Returns 500 Errors

1. Check API logs in CloudWatch
2. Verify DynamoDB table exists and API has permissions
3. Verify Step Functions state machine ARN is correct

```bash
aws elasticbeanstalk describe-environment-health \
  --environment-name PAVI-api-main \
  --attribute-names Causes
```

#### Jobs Stuck in PENDING

1. Check Step Functions execution history
2. Check AWS Batch job queue for pending jobs
3. Verify Batch compute environment has capacity

```bash
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:us-east-1:100225593120:stateMachine:pavi-pipeline-sfn-poc3 \
  --max-results 5
```

#### 502 Bad Gateway (WebUI)

Causes: container crashed, slow startup, health check failing.

```bash
# Check container status
aws elasticbeanstalk describe-environment-health \
  --environment-name PAVI-webui-main \
  --attribute-names Causes

# Check logs
aws logs tail /aws/elasticbeanstalk/PAVI-webui-main/var/log/eb-docker/containers/eb-current-app/stdouterr.log
```

#### CDK Deployment Fails

| Error | Cause | Fix |
|-------|-------|-----|
| `Version label contains /` | Branch name in version label | Use clean label without slashes |
| `No Application Version found` | Version not created | Run `deploy-application` first |
| `Hash mismatch` | Shared package changed | Rebuild: `make -C shared_aws/py_package/ clean build install` |

#### "clustalo not found" (EC2)

```bash
which clustalo
ls -la /usr/local/bin/clustalo
export PATH="/usr/local/bin:$PATH"
```

#### SQLite Database Locked (EC2)

```bash
fuser /var/lib/pavi/jobs/jobs.db
# Restart API to clear connections
```

#### Permission Denied on /var/lib/pavi (EC2)

```bash
sudo chown -R ec2-user:ec2-user /var/lib/pavi
chmod 755 /var/lib/pavi/{jobs,results,work}
```

### Rollback Procedures

#### Quick Rollback: EB Version (AWS)

```bash
# List available versions
aws elasticbeanstalk describe-application-versions \
  --application-name PAVI-api \
  --query "ApplicationVersions[].VersionLabel"

# Deploy previous version
aws elasticbeanstalk update-environment \
  --environment-name PAVI-api-main \
  --version-label "previous-version-label"
```

#### Feature Flag Rollback: Disable Step Functions

```bash
aws elasticbeanstalk update-environment \
  --environment-name PAVI-api-main \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=USE_STEP_FUNCTIONS,Value=false
```

#### EC2 (Docker-Based): Roll Back Image

```bash
cd /opt/pavi
PAVI_IMAGE_TAG=previous-tag ./deploy.sh
```

### Maintenance (EC2)

#### Cleaning Up Old Jobs

```bash
# Clean jobs older than 30 days
sqlite3 /var/lib/pavi/jobs/jobs.db \
  "DELETE FROM jobs WHERE created_at < datetime('now', '-30 days');"

# Clean work directories
find /var/lib/pavi/work -type d -mtime +30 -exec rm -rf {} \;

# Clean old results
find /var/lib/pavi/results -type d -mtime +30 -exec rm -rf {} \;
```

#### Backing Up Data

```bash
cp /var/lib/pavi/jobs/jobs.db /backup/jobs-$(date +%Y%m%d).db
tar -czf /backup/pavi-results-$(date +%Y%m%d).tar.gz /var/lib/pavi/results/
```

---

## Related Documentation

- [Local EC2 Deployment](local-ec2-deployment.md) -- Detailed EC2 local pipeline guide
- [AWS Deployment Infrastructure](aws-deployment-infrastructure.md) -- AWS resource details
- [Step Functions Deployment Runbook](step-functions-deployment-runbook.md) -- Step Functions deployment procedures
- [WebUI Deployment and Debugging](webui-deployment-debugging-guide.md) -- WebUI-specific debugging
- [Configuration Reference](configuration-reference.md) -- Standalone environment variable reference
- [Troubleshooting](troubleshooting.md) -- General troubleshooting guide
