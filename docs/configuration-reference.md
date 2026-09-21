# Configuration Reference

This document provides a comprehensive reference for all environment variables and configuration options used across PAVI components.

## Overview

PAVI uses environment variables for configuration across three main deployment modes:

| Mode | Description | Primary Storage | Job Orchestration |
|------|-------------|-----------------|-------------------|
| **Local Pipeline (EC2)** | Single-server deployment | SQLite + Local FS | Direct Python execution |
| **Step Functions (AWS)** | Cloud-native deployment | DynamoDB + S3 | AWS Step Functions |
| **Nextflow (Legacy)** | Original pipeline | In-memory + S3 | Nextflow on AWS Batch |

## API Configuration

### Core Settings

| Variable | Default | Valid Values | Description |
|----------|---------|--------------|-------------|
| `PAVI_ENVIRONMENT` | `"local"` | `local`, `dev`, `staging`, `prod` | Deployment environment name |
| `DEBUG` | `"false"` | `true`, `false` | Enable debug logging |
| `API_HOST` | `"0.0.0.0"` | IP address | API server bind address |
| `API_PORT` | `"8080"` | Port number | API server port (Docker uses 8080, dev uses 8000) |

### Pipeline Execution Mode

The execution mode is determined by these variables, evaluated in priority order:

```
1. USE_LOCAL_PIPELINE=true  → Local Pipeline mode
2. USE_STEP_FUNCTIONS=true  → Step Functions mode
3. Default (dev/staging/prod) → Step Functions mode
4. Default (local)            → Nextflow mode
```

| Variable | Default | Valid Values | Description |
|----------|---------|--------------|-------------|
| `USE_LOCAL_PIPELINE` | `false` | `true`, `false` | Enable local pipeline execution (EC2 mode) |
| `USE_STEP_FUNCTIONS` | Auto-detect | `true`, `false` | Override Step Functions usage |
| `ENABLE_STEP_FUNCTIONS_ROLLOUT` | `"false"` | `true`, `false` | Enable gradual rollout to Step Functions |
| `STEP_FUNCTIONS_ROLLOUT_PERCENTAGE` | `"0"` | `0-100` | Percentage of jobs routed to Step Functions |

### AWS Resource ARNs

| Variable | Default | Description |
|----------|---------|-------------|
| `STEP_FUNCTIONS_STATE_MACHINE_ARN` | None | ARN of Step Functions state machine |
| `BATCH_JOB_QUEUE_ARN` | Environment-specific | ARN of AWS Batch job queue |
| `STEP_FUNCTIONS_ENDPOINT` | None | Custom endpoint for local testing |

### Storage Configuration

#### AWS Mode (Step Functions)

| Variable | Default | Description |
|----------|---------|-------------|
| `DYNAMODB_JOBS_TABLE` | `pavi-jobs-{env}` | DynamoDB table for job tracking |
| `PAVI_RESULTS_BUCKET` | `agr-pavi-pipeline-{env}` | S3 bucket for pipeline results |
| `PAVI_WORK_BUCKET` | `agr-pavi-pipeline-nextflow` | S3 bucket for Nextflow work files |

#### Local Mode (EC2)

| Variable | Default | Description |
|----------|---------|-------------|
| `PAVI_LOCAL_JOBS_PATH` | `/var/lib/pavi/jobs` | Directory for SQLite database |
| `PAVI_LOCAL_RESULTS_PATH` | `/var/lib/pavi/results` | Directory for alignment results |
| `PAVI_LOCAL_WORK_PATH` | `/var/lib/pavi/work` | Directory for work files |
| `PAVI_LOCAL_MAX_WORKERS` | `"4"` | Max parallel sequence retrieval workers |

### Legacy Nextflow Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `API_NEXTFLOW_OUT_DIR` | `"./"` | Nextflow output directory |
| `API_PIPELINE_IMAGE_TAG` | `"latest"` | Docker image tag for pipeline containers |
| `API_RESULTS_PATH_PREFIX` | `"./results/"` | Prefix for Nextflow results directory |
| `NXF_OFFLINE` | `"true"` | Run Nextflow in offline mode |
| `NXF_SYNTAX_PARSER` | `"v2"` | Nextflow DSL syntax version |

## WebUI Configuration

### API Communication

| Variable | Default | Description |
|----------|---------|-------------|
| `PAVI_API_BASE_URL` | `"http://localhost:8000"` | Backend API base URL |
| `MOCK_API` | `"false"` | Serve mock API responses instead of proxying to the backend. Used for Vercel/Percy visual testing. **Must stay `false` in real deployments** — `next start` auto-loads `webui/.env.production`, so a stray `MOCK_API=true` there makes a self-hosted box boot on fake data. |

**Usage examples:**
```bash
# Development with local API
PAVI_API_BASE_URL=http://localhost:8000 npm run dev

# Development with mock data (no backend)
npm run dev:mock

# Production build with API
PAVI_API_BASE_URL=https://api.pavi.alliancegenome.org npm run build
```

### Build Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `"development"` | Node.js environment |
| `ANALYZE` | `"false"` | Enable webpack bundle analyzer |
| `NEXT_PUBLIC_BASE_PATH` | `""` (root) | Serve the app under a URL prefix, e.g. `/pavi`. **Baked in at build time.** Unset = served at root (unchanged). See [Deploying under a base path](base-path-deployment.md). |

### Deployment Status (Admin)

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `"us-east-1"` | AWS region for SDK clients |
| `PAVI_STATE_MACHINE_ARN` | `""` | Step Functions ARN (for status display) |
| `PAVI_JOB_QUEUE_ARN` | `""` | AWS Batch queue ARN (for status display) |
| `PAVI_JOBS_TABLE_NAME` | `"pavi-jobs"` | DynamoDB table name (for status display) |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | `"pavi-admin-2025"` | Admin dashboard password |

### Percy Visual Testing

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `"http://localhost:3000"` | Base URL for Percy snapshots |
| `PERCY_TOKEN` | Required | Percy API token |

## AWS Credentials

PAVI supports multiple AWS credential mechanisms (in priority order):

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | Direct credentials |
| `AWS_PROFILE` | Named profile from ~/.aws/credentials |
| `AWS_ROLE_ARN` + `AWS_SESSION_TOKEN` | Assumed role |
| `AWS_WEB_IDENTITY_TOKEN_FILE` | Web identity federation |
| `AWS_ROLE_SESSION_NAME` | Session name for assumed roles |

## Seq Retrieval Configuration

The sequence retrieval component accepts configuration via CLI arguments rather than environment variables. See [seq-retrieval-architecture.md](seq-retrieval-architecture.md) for CLI reference.

## Alignment Configuration

The alignment component runs Clustal Omega with default parameters. Custom parameters are passed via the Step Functions state machine input.

## CDK Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CDK_DEFAULT_ACCOUNT` | From context | AWS account ID |
| `CDK_DEFAULT_REGION` | `"us-east-1"` | AWS region for deployment |

## Docker Configuration

### API Container (Dockerfile)

| Variable | Value | Description |
|----------|-------|-------------|
| `DEBIAN_FRONTEND` | `"noninteractive"` | Non-interactive apt |
| `PYTHON_VERSION` | `"3.12"` | Python version |
| `API_EXECUTION_ENV` | `"aws"` | Execution environment |

### WebUI Container (Dockerfile)

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `"production"` | Production mode |
| `PORT` | `"3000"` | Application port |
| `HOSTNAME` | `"0.0.0.0"` | Bind address |

## Environment-Specific Defaults

### Local Development

```bash
PAVI_ENVIRONMENT=local
USE_LOCAL_PIPELINE=false
USE_STEP_FUNCTIONS=false
PAVI_API_BASE_URL=http://localhost:8000
```

### Local EC2 Deployment

```bash
PAVI_ENVIRONMENT=local
USE_LOCAL_PIPELINE=true
PAVI_LOCAL_JOBS_PATH=/var/lib/pavi/jobs
PAVI_LOCAL_RESULTS_PATH=/var/lib/pavi/results
PAVI_LOCAL_WORK_PATH=/var/lib/pavi/work
PAVI_LOCAL_MAX_WORKERS=4
```

### Development (AWS)

```bash
PAVI_ENVIRONMENT=dev
USE_STEP_FUNCTIONS=true
DYNAMODB_JOBS_TABLE=pavi-jobs-dev
PAVI_RESULTS_BUCKET=agr-pavi-pipeline-stepfunctions-dev
STEP_FUNCTIONS_STATE_MACHINE_ARN=arn:aws:states:us-east-1:...
```

### Production (AWS)

```bash
PAVI_ENVIRONMENT=prod
USE_STEP_FUNCTIONS=true
DYNAMODB_JOBS_TABLE=pavi-jobs-prod
PAVI_RESULTS_BUCKET=agr-pavi-pipeline-stepfunctions-prod
ENABLE_STEP_FUNCTIONS_ROLLOUT=false
```

## Configuration Files

### .env Files

| File | Purpose |
|------|---------|
| `webui/.env.production` | Loaded by `next start` on **both** Vercel and the self-hosted box. Keeps `MOCK_API=false` so the box never boots on mock data; Vercel previews still mock because `vercel.json` sets `MOCK_API=true` (platform env overrides this file). |
| `webui/.env.local` | Local overrides (not committed) |

### Docker Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Production deployment |
| `docker-compose-dev.yml` | Development with AWS credentials |
| `docker-compose-local-test.yml` | Local Step Functions testing |

## Quick Reference

### Minimal Local Development

```bash
# Terminal 1: API
cd api
make run-server-dev

# Terminal 2: WebUI
cd webui
PAVI_API_BASE_URL=http://localhost:8000 make run-server-dev
```

### Local EC2 Production

```bash
cd api/src
USE_LOCAL_PIPELINE=true \
PAVI_LOCAL_JOBS_PATH=/var/lib/pavi/jobs \
PAVI_LOCAL_RESULTS_PATH=/var/lib/pavi/results \
PAVI_LOCAL_WORK_PATH=/var/lib/pavi/work \
../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

### AWS Deployment Testing

```bash
cd api/src
PAVI_ENVIRONMENT=dev \
USE_STEP_FUNCTIONS=true \
STEP_FUNCTIONS_STATE_MACHINE_ARN=arn:aws:states:... \
DYNAMODB_JOBS_TABLE=pavi-jobs-dev \
PAVI_RESULTS_BUCKET=agr-pavi-pipeline-stepfunctions-dev \
../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

## Related Documentation

- [Local EC2 Deployment](local-ec2-deployment.md) - Deploying on a single EC2 instance
- [Step Functions Design](step-functions-design.md) - AWS Step Functions architecture
- [Troubleshooting](troubleshooting.md) - Common configuration issues
