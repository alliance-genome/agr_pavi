# PAVI Step Functions Deployment Runbook

This runbook describes the process for deploying the Step Functions-based pipeline to different environments.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 20+ installed (for CDK)
- Python 3.12+ installed
- Access to the `alliance-genome` AWS account

## Environments

| Environment | Stack Name | Purpose |
|-------------|------------|---------|
| dev | PaviStepFunctionsStack-dev | Development and testing |
| staging | PaviStepFunctionsStack-staging | Pre-production validation |
| prod | PaviStepFunctionsStack-prod | Production workloads |

## Deployment Process

### 1. Development Deployment

Development deployments can be done freely for testing.

```bash
cd pipeline_components/aws_infra
./scripts/deploy-step-functions.sh dev
```

### 2. Staging Deployment

Staging deployments should be done after successful dev testing.

```bash
# First, show what will change
./scripts/deploy-step-functions.sh staging --diff

# Deploy to staging
./scripts/deploy-step-functions.sh staging
```

**Validation Checklist:**
- [ ] Run E2E tests against staging API
- [ ] Verify CloudWatch dashboard shows metrics
- [ ] Confirm alarms are not firing
- [ ] Test with sample pipeline jobs

### 3. Production Deployment

Production deployments require additional approval and gradual rollout.

```bash
# Review changes first
./scripts/deploy-step-functions.sh prod --diff

# Deploy with confirmation
./scripts/deploy-step-functions.sh prod
```

**Pre-deployment Checklist:**
- [ ] Staging validation complete
- [ ] No active incidents
- [ ] Team notified of deployment
- [ ] Rollback plan reviewed

## Gradual Rollout

The Step Functions pipeline supports gradual rollout using feature flags.

### Enable Rollout (API Configuration)

Set these environment variables on the API:

```bash
# Enable rollout mode
ENABLE_STEP_FUNCTIONS_ROLLOUT=true

# Start with 10% of traffic
STEP_FUNCTIONS_ROLLOUT_PERCENTAGE=10
```

### Rollout Schedule

Recommended rollout schedule:

| Day | Percentage | Action |
|-----|------------|--------|
| 1 | 10% | Initial rollout, monitor closely |
| 2-3 | 25% | Increase if no issues |
| 4-5 | 50% | Half of traffic |
| 6-7 | 75% | Majority of traffic |
| 8+ | 100% | Full rollout |

### Monitoring During Rollout

Check these metrics during rollout:

1. **CloudWatch Dashboard**: `PAVI-StepFunctions-Pipeline-{env}`
   - Execution success rate
   - Execution duration
   - Error rates

2. **Alarms**:
   - `pavi-sfn-executions-failed-{env}`
   - `pavi-sfn-executions-timeout-{env}`

3. **API Logs**:
   - Look for error patterns
   - Compare response times

## Rollback Procedures

### Immediate Rollback (Feature Flag)

Fastest rollback - disable Step Functions for new jobs:

```bash
# Set on API
USE_STEP_FUNCTIONS=false
```

Or reduce rollout percentage:

```bash
STEP_FUNCTIONS_ROLLOUT_PERCENTAGE=0
```

### Infrastructure Rollback

If CDK deployment needs to be reverted:

```bash
# Get previous stack version
aws cloudformation describe-stack-events \
  --stack-name PaviStepFunctionsStack-prod \
  --query "StackEvents[?ResourceStatus=='UPDATE_COMPLETE'].PhysicalResourceId" \
  --output text

# Rollback to previous version (if available)
aws cloudformation rollback-stack --stack-name PaviStepFunctionsStack-prod
```

### Full Rollback to Nextflow

If Step Functions needs to be completely disabled:

1. Set `USE_STEP_FUNCTIONS=false` on all API instances
2. Monitor that Nextflow pipeline is handling traffic
3. Investigate Step Functions issues
4. Document findings before retry

## Troubleshooting

### Common Issues

#### 1. State Machine Execution Fails Immediately

**Symptoms**: Executions fail within seconds of starting
**Causes**:
- Invalid input format
- IAM permission issues
- Batch job definition not found

**Resolution**:
```bash
# Check execution history
aws stepfunctions get-execution-history \
  --execution-arn <arn> \
  --query "events[?type=='ExecutionFailed']"
```

#### 2. Batch Jobs Stuck in RUNNABLE

**Symptoms**: Jobs stay in RUNNABLE state for extended time
**Causes**:
- Compute environment capacity
- Container image not found
- VPC/subnet issues

**Resolution**:
```bash
# Check compute environment
aws batch describe-compute-environments \
  --compute-environments pavi-pipeline-compute-env
```

#### 3. S3 Access Denied

**Symptoms**: Jobs fail with S3 permission errors
**Causes**:
- IAM role missing S3 permissions
- Bucket policy restrictions

**Resolution**:
- Check Batch job role has S3 access
- Verify bucket exists in correct region

### Getting Help

1. Check CloudWatch Logs: `/aws/batch/pavi-*`
2. Check Step Functions execution history
3. Review CloudWatch dashboard
4. Contact DevOps team on Slack #pavi-support

## Post-Deployment Verification

After any deployment, verify:

1. **Health Check**:
   ```bash
   curl https://api.pavi.alliancegenome.org/api/health
   ```

2. **Test Job Submission**:
   ```bash
   # Run E2E test
   cd pipeline_components/aws_infra/local-testing
   API_BASE_URL=https://api.pavi.alliancegenome.org python test_step_functions_e2e.py
   ```

3. **Monitor Dashboard** for 30 minutes after deployment

## Maintenance Windows

Preferred deployment times:
- **Dev**: Anytime
- **Staging**: Business hours (9 AM - 5 PM ET)
- **Prod**: Tuesday-Thursday, 10 AM - 2 PM ET (avoid Mondays, Fridays, weekends)

## Contact Information

Contact the Alliance development team for support.
