# PAVI Deployment Guide

This guide documents the deployment process for the new PAVI version using AWS Step Functions.

## Current State

| Component | Production (Old) | New Version |
|-----------|------------------|-------------|
| API | Elastic Beanstalk (`PAVI-api-main`) | `feature/pavi-overhaul` branch |
| WebUI | Elastic Beanstalk (`PAVI-webui-main`) | `feature/pavi-overhaul` branch |
| Pipeline | Nextflow on AWS Batch | Step Functions (`PaviStepFunctionsPoc3Stack`) |
| Job Storage | In-memory | DynamoDB |
| DNS (Old) | `pavi.alliancegenome.org` | Unchanged |
| DNS (New) | N/A | `pavi2.alliancegenome.org` |

## Deployment Strategy

The new version will be deployed to **`pavi2.alliancegenome.org`** as a parallel deployment, allowing:
- Side-by-side testing with the old version
- Easy rollback by switching DNS
- Validation before decommissioning the old version

## Prerequisites

### AWS Resources (Already Deployed)

The Step Functions infrastructure is deployed via `PaviStepFunctionsPoc3Stack`:

| Resource | ARN/Name |
|----------|----------|
| State Machine | `arn:aws:states:us-east-1:100225593120:stateMachine:pavi-pipeline-sfn-poc3` |
| DynamoDB Table | `pavi-jobs-poc3` |
| S3 Work Bucket | `agr-pavi-pipeline-stepfunctions-poc3` |
| Batch Job Queue | `arn:aws:batch:us-east-1:100225593120:job-queue/pavi_pipeline_poc3` |
| Seq Retrieval Job Def | `arn:aws:batch:us-east-1:100225593120:job-definition/pavi-seq-retrieval-sfn-poc3:1` |
| Alignment Job Def | `arn:aws:batch:us-east-1:100225593120:job-definition/pavi-alignment-sfn-poc3:1` |

### Access Requirements

- AWS credentials with access to account `100225593120`
- VPN access for testing `pavi.alliancegenome.org`
- GitHub access to `alliance-genome/agr_pavi` repository

## Deployment Steps for pavi2.alliancegenome.org

### Step 1: Create New Elastic Beanstalk Environments

Deploy new environments specifically for PAVI v2:

```bash
cd api/aws_infra

# Deploy API to pavi2 environment
make deploy-environment \
  EB_ENV_CDK_STACK_NAME=PaviApiEbPavi2Stack \
  PAVI_DEPLOY_VERSION_LABEL=$(git describe --tags) \
  PAVI_IMAGE_TAG=$(git describe --tags)
```

```bash
cd webui/aws_infra

# Deploy WebUI to pavi2 environment
make deploy-environment \
  EB_ENV_CDK_STACK_NAME=PaviWebUiEbPavi2Stack \
  PAVI_API_STACK_NAME=PaviApiEbPavi2Stack \
  PAVI_DEPLOY_VERSION_LABEL=$(git describe --tags) \
  PAVI_IMAGE_TAG=$(git describe --tags)
```

### Step 2: Configure API Environment Variables

Set Step Functions configuration for the new API environment:

```bash
# Update environment variables for pavi2 API
aws elasticbeanstalk update-environment \
  --environment-name PAVI-api-pavi2 \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=PAVI_ENVIRONMENT,Value=prod \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=STEP_FUNCTIONS_STATE_MACHINE_ARN,Value=arn:aws:states:us-east-1:100225593120:stateMachine:pavi-pipeline-sfn-poc3 \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=DYNAMODB_JOBS_TABLE,Value=pavi-jobs-poc3 \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=BATCH_JOB_QUEUE_ARN,Value=arn:aws:batch:us-east-1:100225593120:job-queue/pavi_pipeline_poc3 \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=PAVI_RESULTS_BUCKET,Value=agr-pavi-pipeline-stepfunctions-poc3
```

### Step 3: Request DNS Configuration

Contact the **Alliance DevOps team** to add DNS record in the private Route53 hosted zone:

| Record | Type | Target |
|--------|------|--------|
| `pavi2.alliancegenome.org` | CNAME | WebUI ALB endpoint (from EB environment) |

To get the ALB endpoint:
```bash
aws elasticbeanstalk describe-environments \
  --environment-names PAVI-webui-pavi2 \
  --query "Environments[0].EndpointURL"
```

### Step 4: Verify Deployment

```bash
# Check environment health
aws elasticbeanstalk describe-environments \
  --environment-names PAVI-api-pavi2 PAVI-webui-pavi2 \
  --query "Environments[].{Name:EnvironmentName,Health:Health,Status:Status}"

# Test API health endpoint (requires VPN, use ALB DNS)
curl -s http://<pavi2-api-alb-endpoint>/health

# Test full application (requires VPN)
curl -s https://pavi2.alliancegenome.org/
```

## Alternative: AWS Amplify for WebUI

Amplify provides better Next.js optimization. CDK code exists in `webui/aws_infra/cdk_classes/webui_amplify.py`.

```bash
cd webui/aws_infra

# Deploy using Amplify instead of EB
PAVI_WEBUI_DEPLOYMENT_METHOD=amplify \
PAVI_CUSTOM_DOMAIN=pavi2.alliancegenome.org \
make deploy-stack
```

**Note**: Amplify requires a GitHub token stored in Secrets Manager at `pavi/github-token`.

## CI/CD Integration

After initial deployment, update GitHub Actions workflow to deploy to pavi2 environments:

1. Add pavi2 environment to `.github/workflows/main-build-and-deploy.yml`
2. Or create a separate workflow for pavi2 deployments

## Environment Variables Reference

### API Environment Variables

| Variable | Description | Production Value |
|----------|-------------|------------------|
| `PAVI_ENVIRONMENT` | Environment name | `prod` |
| `STEP_FUNCTIONS_STATE_MACHINE_ARN` | Step Functions ARN | `arn:aws:states:us-east-1:100225593120:stateMachine:pavi-pipeline-sfn-poc3` |
| `DYNAMODB_JOBS_TABLE` | DynamoDB table for jobs | `pavi-jobs-poc3` |
| `BATCH_JOB_QUEUE_ARN` | AWS Batch job queue | `arn:aws:batch:us-east-1:100225593120:job-queue/pavi_pipeline_poc3` |
| `PAVI_RESULTS_BUCKET` | S3 bucket for results | `agr-pavi-pipeline-stepfunctions-poc3` |
| `USE_STEP_FUNCTIONS` | Force Step Functions (optional) | `true` |

### WebUI Environment Variables

| Variable | Description | Value |
|----------|-------------|-------|
| `PAVI_API_BASE_URL` | API endpoint URL | Auto-imported from API stack |
| `AGR_PAVI_RELEASE` | Release version tag | Set by deployment |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |

## Verification Steps

### 1. Check CloudFormation Stacks

```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?contains(StackName, 'Pavi')].{Name:StackName,Status:StackStatus}"
```

### 2. Test Step Functions Pipeline

```bash
# Start a test execution
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:100225593120:stateMachine:pavi-pipeline-sfn-poc3 \
  --name test-$(date +%s) \
  --input '{"job_id":"test-123","seq_regions":[]}'

# Check execution status
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:us-east-1:100225593120:stateMachine:pavi-pipeline-sfn-poc3 \
  --max-results 5
```

### 3. Test API Endpoints

```bash
# Health check
curl -s https://pavi.alliancegenome.org/health

# Submit a test job
curl -X POST https://pavi.alliancegenome.org/api/pipeline-job/ \
  -H "Content-Type: application/json" \
  -d '{"seq_regions": [...]}'

# Check job status
curl -s https://pavi.alliancegenome.org/api/pipeline-job/{uuid}
```

### 4. Check CloudWatch Metrics

The Step Functions stack includes a CloudWatch dashboard: `pavi-sfn-dashboard-poc3`

```bash
aws cloudwatch get-dashboard --dashboard-name pavi-sfn-dashboard-poc3
```

## Rollback Procedure

### Quick Rollback (DNS Switch)

Since pavi2 is a parallel deployment, rollback is simple - users can continue using `pavi.alliancegenome.org` (old version).

To disable pavi2 temporarily:
```bash
# Request Alliance DevOps to remove/update the pavi2 DNS record
```

### Rollback Within pavi2

If pavi2 has issues, roll back to a previous application version:

```bash
# List available versions
aws elasticbeanstalk describe-application-versions \
  --application-name PAVI-api \
  --query "ApplicationVersions[].VersionLabel"

# Deploy previous version to pavi2 API
aws elasticbeanstalk update-environment \
  --environment-name PAVI-api-pavi2 \
  --version-label <previous-version-label>
```

### Disable Step Functions (Fallback to Nextflow)

If Step Functions has issues but EB is working:

```bash
aws elasticbeanstalk update-environment \
  --environment-name PAVI-api-pavi2 \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=USE_STEP_FUNCTIONS,Value=false
```

## Monitoring

### CloudWatch Alarms (Deployed with Step Functions Stack)

| Alarm | Condition |
|-------|-----------|
| `pavi-sfn-executions-failed-poc3` | Failed executions |
| `pavi-sfn-executions-throttled-poc3` | Throttled executions |
| `pavi-sfn-executions-timeout-poc3` | Timed out executions |
| `pavi-sfn-execution-time-poc3` | Execution duration |

### Logs

- **API Logs**: CloudWatch Logs → `/aws/elasticbeanstalk/PAVI-api-main/`
- **Step Functions Logs**: CloudWatch Logs → `pavi-sfn-pipeline-logs`
- **Batch Job Logs**: CloudWatch Logs → `/aws/batch/job`

## Architecture Comparison

### Old Version (Nextflow)

```
WebUI (EB) → API (EB) → Nextflow → AWS Batch → S3
                ↓
            In-memory job tracking
```

### New Version (Step Functions)

```
WebUI (EB/Amplify) → API (EB) → Step Functions → AWS Batch → S3
                         ↓              ↓
                    DynamoDB      CloudWatch Dashboard
```

## DNS Configuration

DNS is managed by the Alliance organization in the private Route53 hosted zone.

| Record | Type | Target | Version |
|--------|------|--------|---------|
| `pavi.alliancegenome.org` | CNAME | EB ALB endpoint | Old (Nextflow) |
| `pavi2.alliancegenome.org` | CNAME | PAVI v2 WebUI ALB | **New (Step Functions)** |
| `main-pavi.alliancegenome.org` | CNAME | Main environment ALB | Old |
| `dev-pavi.alliancegenome.org` | CNAME | Dev environment ALB | Testing |

## Troubleshooting

### API Returns 500 Errors

1. Check API logs in CloudWatch
2. Verify DynamoDB table exists and API has permissions
3. Verify Step Functions state machine ARN is correct

### Jobs Stuck in PENDING

1. Check Step Functions execution history
2. Check AWS Batch job queue for pending jobs
3. Verify Batch compute environment has capacity

### Step Functions Execution Fails

1. Check execution history in Step Functions console
2. Check Batch job logs for container errors
3. Verify S3 bucket permissions

## Contact

- **Infrastructure Issues**: Alliance DevOps team
- **Application Issues**: PAVI development team
