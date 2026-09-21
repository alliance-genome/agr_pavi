# WebUI Deployment and Debugging Guide

Complete guide for deploying, monitoring, and debugging the PAVI WebUI on AWS Elastic Beanstalk.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Process](#deployment-process)
4. [Environment Configuration](#environment-configuration)
5. [Monitoring](#monitoring)
6. [Debugging](#debugging)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │   Route 53      │    │   CloudWatch    │                     │
│  │  DNS Records    │    │   Logs/Alarms   │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
│           ▼                      ▼                               │
│  ┌─────────────────────────────────────────┐                    │
│  │         Elastic Beanstalk               │                    │
│  │  ┌───────────────────────────────────┐  │                    │
│  │  │    Application Load Balancer      │  │                    │
│  │  └───────────────┬───────────────────┘  │                    │
│  │                  │                       │                    │
│  │  ┌───────────────▼───────────────────┐  │                    │
│  │  │      EC2 Instance(s)              │  │                    │
│  │  │  ┌─────────────────────────────┐  │  │                    │
│  │  │  │    Docker Container         │  │  │                    │
│  │  │  │    (Next.js WebUI)          │  │  │                    │
│  │  │  └─────────────────────────────┘  │  │                    │
│  │  └───────────────────────────────────┘  │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │      ECR        │  Container images stored here              │
│  │  (Image Repo)   │                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production (main) | https://pavi.alliancegenome.org | Live production |
| Development | https://dev-pavi.alliancegenome.org | Testing/staging |

### Key AWS Resources

- **ECR Repository**: `100225593120.dkr.ecr.us-east-1.amazonaws.com/agr_pavi/webui`
- **EB Application**: `PAVI-webui`
- **EB Environments**: `PAVI-webui-main`, `PAVI-webui-dev`
- **CloudWatch Log Groups**: `/aws/elasticbeanstalk/PAVI-webui-*/`

---

## Prerequisites

### Local Setup

1. **AWS CLI configured**
   ```bash
   aws configure
   # Verify access
   aws sts get-caller-identity
   ```

2. **Docker running**
   ```bash
   docker info
   ```

3. **Node.js (via NVM)**
   ```bash
   nvm use  # Uses .nvmrc version
   ```

4. **Python virtual environment**
   ```bash
   cd webui/aws_infra
   make install-deps
   ```

### Required Permissions

- ECR: Push/pull images
- Elastic Beanstalk: Full access
- CloudFormation: Create/update stacks
- IAM: Create roles (for new environments)
- Route53: Manage DNS records

---

## Deployment Process

### Quick Reference

```bash
cd webui/aws_infra

# Full deployment to dev
make container-image                    # Build
make push-container-image TAG_NAME=dev  # Push to ECR
make deploy-application PAVI_DEPLOY_VERSION_LABEL=dev-$(date +%Y%m%d)
make deploy-environment \
  PAVI_DEPLOY_VERSION_LABEL=dev-$(date +%Y%m%d) \
  PAVI_IMAGE_TAG=dev \
  PAVI_API_STACK_NAME=PaviApiEbMainStack \
  EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack \
  ADD_CDK_ARGS="--require-approval never"
```

### Step-by-Step Deployment

#### Step 1: Build Container Image

```bash
cd webui
make container-image
```

This runs `docker build` with the production Dockerfile. Build takes ~2-3 minutes.

**Common build issues:**
- SSR errors with web components: Ensure all browser-only components use `dynamic()` with `ssr: false`
- Node modules issues: Delete `node_modules` and rebuild

#### Step 2: Authenticate with ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  100225593120.dkr.ecr.us-east-1.amazonaws.com
```

#### Step 3: Tag and Push Image

```bash
cd webui/aws_infra

# Push with specific tag
make push-container-image TAG_NAME=dev

# Or for production
make push-container-image TAG_NAME=main
```

#### Step 4: Create Application Version

```bash
# Version label must NOT contain slashes
make deploy-application PAVI_DEPLOY_VERSION_LABEL=dev-20260113
```

This registers the Docker image as an EB Application Version.

#### Step 5: Deploy Environment

```bash
make deploy-environment \
  PAVI_DEPLOY_VERSION_LABEL=dev-20260113 \
  PAVI_IMAGE_TAG=dev \
  PAVI_API_STACK_NAME=PaviApiEbMainStack \
  EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack \
  ADD_CDK_ARGS="--require-approval never"
```

**Environment targets:**
- `PaviWebUiEbDevStack` - Development environment
- `PaviWebUiEbMainStack` - Production environment

The deployment:
1. Synthesizes CDK stack
2. Creates/updates CloudFormation
3. Deploys new version to EB
4. Monitors health until stable

---

## Environment Configuration

### Environment Variables

Set in CDK stack (`cdk_classes/webui_eb_env.py`):

| Variable | Description | Example |
|----------|-------------|---------|
| `PAVI_API_BASE_URL` | Backend API URL | `https://pavi-api.alliancegenome.org` |
| `NODE_ENV` | Node environment | `production` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |

### Updating Environment Variables

1. Modify `webui_eb_env.py`
2. Redeploy:
   ```bash
   make deploy-environment EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack ...
   ```

Or via AWS Console: EB → Environment → Configuration → Software

---

## Monitoring

### Health Check

```bash
# Quick health status
aws elasticbeanstalk describe-environment-health \
  --environment-name PAVI-webui-dev \
  --attribute-names All

# Continuous monitoring
watch -n 5 'aws elasticbeanstalk describe-environment-health \
  --environment-name PAVI-webui-dev \
  --attribute-names Status,HealthStatus'
```

### Health Statuses

| Status | Meaning |
|--------|---------|
| `Green` / `Ok` | Healthy |
| `Yellow` / `Warning` | Minor issues |
| `Red` / `Degraded` | Significant issues |
| `Grey` / `Unknown` | Updating or no data |

### CloudWatch Alarms

An alarm is automatically created for environment health:
- **Alarm Name**: `PAVI-webui-dev-health-alarm`
- **Triggers**: When health becomes `Degraded` or `Severe`

### CloudWatch Logs

```bash
# List log groups
aws logs describe-log-groups \
  --log-group-name-prefix /aws/elasticbeanstalk/PAVI-webui

# Tail application logs
aws logs tail \
  /aws/elasticbeanstalk/PAVI-webui-dev/var/log/eb-docker/containers/eb-current-app/stdouterr.log \
  --follow

# Search for errors in last hour
aws logs filter-log-events \
  --log-group-name /aws/elasticbeanstalk/PAVI-webui-dev/var/log/eb-docker/containers/eb-current-app/stdouterr.log \
  --start-time $(( $(date +%s) - 3600 ))000 \
  --filter-pattern "ERROR"
```

### Key Log Files

| Log | Content |
|-----|---------|
| `stdouterr.log` | Next.js application output |
| `eb-engine.log` | EB deployment events |
| `eb-hooks.log` | Platform hook execution |
| `docker-events.log` | Docker container events |

---

## Debugging

### 1. Browser DevTools

**Console Tab**
- JavaScript errors
- React hydration mismatches
- Network request failures

**Network Tab**
- Failed API calls (check response body)
- CORS errors
- Slow requests

**Application Tab**
- Cookies and session data
- localStorage state

### 2. Elastic Beanstalk Logs

#### Request Logs (Quick)

```bash
# Request last 100 lines from all instances
aws elasticbeanstalk request-environment-info \
  --environment-name PAVI-webui-dev \
  --info-type tail

# Wait a moment, then retrieve
aws elasticbeanstalk retrieve-environment-info \
  --environment-name PAVI-webui-dev \
  --info-type tail | jq -r '.EnvironmentInfo[].Message'
```

#### Full Bundle Logs

```bash
# Request full logs (takes longer)
aws elasticbeanstalk request-environment-info \
  --environment-name PAVI-webui-dev \
  --info-type bundle

# Retrieve (returns S3 URL)
aws elasticbeanstalk retrieve-environment-info \
  --environment-name PAVI-webui-dev \
  --info-type bundle
```

Or via Console: EB → Environment → Logs → Request Logs → Full

### 3. SSH into Instance

#### Using Session Manager (Preferred)

```bash
# Get instance ID
INSTANCE_ID=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name PAVI-webui-dev \
  --query 'EnvironmentResources.Instances[0].Id' \
  --output text)

# Start session
aws ssm start-session --target $INSTANCE_ID
```

#### Inside the Instance

```bash
# View running containers
docker ps

# Get container ID
CONTAINER_ID=$(docker ps -q)

# View container logs
docker logs $CONTAINER_ID
docker logs $CONTAINER_ID --tail 100 -f

# Execute commands in container
docker exec -it $CONTAINER_ID /bin/sh

# Inside container - check Next.js
cat .next/BUILD_ID
ls -la .next/server/

# Check environment variables
docker exec $CONTAINER_ID env | grep PAVI
```

### 4. API Connectivity Testing

```bash
# From your machine
curl -v https://dev-pavi.alliancegenome.org/api/health

# Check if API is reachable from container (SSH first)
docker exec $CONTAINER_ID curl -v $PAVI_API_BASE_URL/api/health
```

### 5. Next.js Specific Debugging

#### Server-Side Errors

Check CloudWatch logs for:
- `Error: ` prefix
- `Unhandled Runtime Error`
- Stack traces with file paths

#### Hydration Errors

Common causes:
- Server/client HTML mismatch
- Date/time rendering differences
- Browser-only APIs used during SSR

Fix: Use `dynamic()` with `ssr: false` for browser-only components.

#### Build Errors

```bash
# Test build locally
cd webui
npm run build

# Check for SSR issues
npm run start  # Run production build locally
```

---

## Rollback Procedures

### Quick Rollback via Console

1. Go to AWS Console → Elastic Beanstalk
2. Select environment (PAVI-webui-dev)
3. Application versions (left sidebar)
4. Select previous version
5. Actions → Deploy

### Rollback via CLI

```bash
# List available versions
aws elasticbeanstalk describe-application-versions \
  --application-name PAVI-webui \
  --query 'ApplicationVersions[*].[VersionLabel,DateCreated]' \
  --output table

# Deploy specific version
aws elasticbeanstalk update-environment \
  --environment-name PAVI-webui-dev \
  --version-label "previous-version-label"

# Monitor rollback
aws elasticbeanstalk describe-environment-health \
  --environment-name PAVI-webui-dev \
  --attribute-names All
```

### Rollback via CDK

```bash
# Set to previous image tag
make deploy-environment \
  PAVI_DEPLOY_VERSION_LABEL=previous-version \
  PAVI_IMAGE_TAG=previous-tag \
  ...
```

---

## Troubleshooting Guide

### Common Issues

#### 1. 502 Bad Gateway

**Symptoms**: Users see 502 errors

**Causes**:
- Container crashed
- Container taking too long to start
- Health check failing

**Debug**:
```bash
# Check container status
aws elasticbeanstalk describe-environment-health \
  --environment-name PAVI-webui-dev \
  --attribute-names Causes

# Check logs
aws logs tail /aws/elasticbeanstalk/PAVI-webui-dev/var/log/eb-docker/containers/eb-current-app/stdouterr.log
```

**Fix**:
- Check for application errors in logs
- Increase health check timeout if startup is slow
- Rollback to previous version

#### 2. 504 Gateway Timeout

**Symptoms**: Requests timeout after 60 seconds

**Causes**:
- API not responding
- Long-running server-side operations

**Debug**:
```bash
# Test API directly
curl -v https://pavi-api.alliancegenome.org/api/health

# Check if it's API or webui
curl -v https://dev-pavi.alliancegenome.org/
```

#### 3. Deployment Fails

**Symptom**: CDK deploy returns error

**Common errors**:

| Error | Cause | Fix |
|-------|-------|-----|
| `Version label contains /` | Branch name in version | Use clean label without slashes |
| `No Application Version found` | Version not created | Run `deploy-application` first |
| `ImportError: aws_amplify_alpha` | Missing optional dep | Made conditional in cdk_app.py |
| `Hash mismatch` | Shared package changed | Rebuild shared package, update hash |

#### 4. Container Won't Start

**Debug**:
```bash
# Check EB events
aws elasticbeanstalk describe-events \
  --environment-name PAVI-webui-dev \
  --max-items 20

# Check Docker events
# (SSH into instance first)
docker events --since 10m
```

**Common causes**:
- Missing environment variables
- Port mismatch (must expose 3000)
- Image pull failures

#### 5. Blank Page / JavaScript Errors

**Debug**:
1. Open browser DevTools Console
2. Look for hydration errors or missing modules

**Common causes**:
- SSR/client mismatch
- Web components without `ssr: false`
- Missing polyfills

#### 6. API Connection Failures

**Symptoms**: Network errors when calling API

**Debug**:
```bash
# Check PAVI_API_BASE_URL is set correctly
# SSH into instance
docker exec $(docker ps -q) env | grep PAVI_API

# Test connectivity
docker exec $(docker ps -q) curl -v $PAVI_API_BASE_URL/api/health
```

**Fix**: Verify API URL in CDK environment config

### Performance Issues

#### Slow Page Loads

1. Check Network tab for slow requests
2. Review CloudWatch metrics for CPU/memory
3. Consider increasing instance size

```bash
# Check instance metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

#### Memory Issues

```bash
# SSH into instance
free -m
docker stats --no-stream
```

---

## Useful Commands Reference

### Makefile Targets

```bash
# Build
make container-image              # Build Docker image
make run-container-dev            # Run locally via docker-compose

# Deploy
make push-container-image TAG_NAME=dev
make deploy-application PAVI_DEPLOY_VERSION_LABEL=...
make deploy-environment EB_ENV_CDK_STACK_NAME=...

# Validate
make validate-dev                 # CDK diff for dev
make validate-main                # CDK diff for main

# Destroy
make destroy-environment EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack
```

### AWS CLI Quick Reference

```bash
# Environment status
aws elasticbeanstalk describe-environments \
  --application-name PAVI-webui

# Recent events
aws elasticbeanstalk describe-events \
  --environment-name PAVI-webui-dev \
  --max-items 10

# List versions
aws elasticbeanstalk describe-application-versions \
  --application-name PAVI-webui

# Restart environment
aws elasticbeanstalk restart-app-server \
  --environment-name PAVI-webui-dev

# Rebuild environment (full redeploy)
aws elasticbeanstalk rebuild-environment \
  --environment-name PAVI-webui-dev
```

### Docker Commands (on EC2)

```bash
docker ps                         # Running containers
docker logs $(docker ps -q) -f    # Follow logs
docker exec -it $(docker ps -q) /bin/sh  # Shell into container
docker stats                      # Resource usage
docker inspect $(docker ps -q)    # Full container details
```

---

## Additional Resources

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [PAVI Architecture Overview](./step-functions-design.md)
