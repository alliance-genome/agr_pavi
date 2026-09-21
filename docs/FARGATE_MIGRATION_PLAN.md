# PAVI API Migration Plan: Elastic Beanstalk → ECS Fargate

## Executive Summary

**Good news:** ECS Fargate infrastructure is already implemented in `api/aws_infra/cdk_classes/api_fargate.py`. The migration is primarily a configuration and deployment change, not new development.

**Current State:** PAVI API on Elastic Beanstalk is down due to IMDSv2/ECR authentication issues after a failed managed platform update.

**Target State:** PAVI API running on ECS Fargate with Step Functions backend.

---

## Key Discovery

The codebase already supports dual deployment via environment variable:
```python
# api/aws_infra/cdk_app.py
PAVI_API_DEPLOYMENT_METHOD = os.getenv('PAVI_API_DEPLOYMENT_METHOD', 'eb')
```

- `eb` (current default) → Deploys to Elastic Beanstalk
- `fargate` → Deploys to ECS Fargate (ready to use)

---

## Migration Steps

### Phase 1: Validate Fargate Stack (Day 1)

1. **Review Fargate configuration**
   - File: `api/aws_infra/cdk_classes/api_fargate.py`
   - Verify VPC/subnet configuration
   - Verify IAM permissions for Step Functions + DynamoDB + S3
   - Confirm health check path matches API (`/api/health`)

2. **CDK Synth/Diff for Fargate**
   ```bash
   cd api/aws_infra
   PAVI_API_DEPLOYMENT_METHOD=fargate npx cdk synth
   PAVI_API_DEPLOYMENT_METHOD=fargate npx cdk diff
   ```

3. **Verify ECR image exists**
   - Repository: `agr_pavi/pavi_api`
   - Tag: Current release tag (check `AGR_PAVI_RELEASE`)

### Phase 2: Deploy Fargate to Dev (Day 1-2)

1. **Deploy dev environment first**
   ```bash
   cd api/aws_infra
   PAVI_API_DEPLOYMENT_METHOD=fargate \
   ENV_SUFFIX=dev \
   npx cdk deploy ApiFargateDevStack
   ```

2. **Test dev deployment**
   - Health check: `GET /api/health`
   - Submit test job
   - Verify Step Functions execution (if enabled)

### Phase 3: Deploy Fargate to Main (Day 2)

1. **Deploy main environment**
   ```bash
   cd api/aws_infra
   PAVI_API_DEPLOYMENT_METHOD=fargate \
   ENV_SUFFIX=main \
   npx cdk deploy ApiFargateMainStack
   ```

2. **Get new endpoint URL from CloudFormation outputs**

3. **Update DNS/routing**
   - Update `pavi.alliancegenome.org/api` to point to new ALB
   - Or update CloudFront origin if applicable

### Phase 4: Cleanup EB (Day 3+)

1. **After validation period, remove EB resources**
   ```bash
   # Delete EB environments
   aws elasticbeanstalk terminate-environment --environment-name PAVI-api-main
   aws elasticbeanstalk terminate-environment --environment-name PAVI-api-dev

   # Delete EB application
   aws elasticbeanstalk delete-application --application-name PAVI-api
   ```

2. **Update CI/CD pipeline**
   - Modify GitHub Actions to use `PAVI_API_DEPLOYMENT_METHOD=fargate`
   - Remove EB deployment scripts

3. **Remove EB-specific code (optional)**
   - `.ebextensions/` directory
   - EB CDK classes (keep for reference initially)

---

## Critical Files

| File | Purpose | Action |
|------|---------|--------|
| `api/aws_infra/cdk_app.py` | Deployment router | Set `PAVI_API_DEPLOYMENT_METHOD=fargate` |
| `api/aws_infra/cdk_classes/api_fargate.py` | Fargate stack (293 lines) | Review, possibly minor adjustments |
| `api/aws_infra/cdk_classes/api_eb_env.py` | EB stack (legacy) | Retain for rollback, then remove |
| `api/src/config.py` | App config | Already supports `USE_STEP_FUNCTIONS` |
| `.github/workflows/` | CI/CD | Update deployment method |

---

## Configuration Comparison

| Setting | Elastic Beanstalk | ECS Fargate |
|---------|-------------------|-------------|
| Instance Type | t2.micro | 512 CPU / 1024 MB |
| Auto-scaling | None (min=1, max=1) | CPU 70% / 1000 req target |
| Health Check | `/api/health` | `/api/health` |
| Port | 8080 | 8080 |
| Load Balancer | Internal ALB | Public ALB (configurable) |
| Logging | CloudWatch Agent | Container Insights V2 |
| ECR Auth | Via EC2 IMDS (broken) | Native ECS (just works) |

---

## Environment Variables (Fargate)

Already configured in `api_fargate.py`:
```python
AGR_PAVI_RELEASE=<image_tag>
API_PIPELINE_IMAGE_TAG=<image_tag>
REGISTRY=<registry>
USE_STEP_FUNCTIONS=true
API_EXECUTION_ENV=aws
DYNAMODB_JOBS_TABLE=pavi-jobs-{env_suffix}
PAVI_RESULTS_BUCKET=agr-pavi-pipeline-{env_suffix}
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| DNS propagation delay | Use low TTL before cutover |
| Step Functions not ready | Set `USE_STEP_FUNCTIONS=false` initially |
| IAM permission gaps | Fargate task role already has SF+DynamoDB+S3 |
| Network/VPC issues | Fargate uses same VPC, public ALB by default |

---

## Rollback Plan

If Fargate deployment fails:
1. Revert DNS to EB endpoint (if EB ever recovers)
2. Or: Add STS VPC endpoint to fix EB ECR auth issue
3. Set `PAVI_API_DEPLOYMENT_METHOD=eb` in CI/CD

---

## Immediate Action for Current Outage

**Option A (Recommended):** Proceed with Fargate deployment
- Faster than fixing EB
- Already implemented
- Better long-term solution

**Option B:** Quick-fix EB with STS VPC endpoint
- Only if Fargate deployment blocked
- Command:
  ```bash
  aws ec2 create-vpc-endpoint \
    --vpc-id vpc-55522232 \
    --service-name com.amazonaws.us-east-1.sts \
    --vpc-endpoint-type Interface \
    --subnet-ids subnet-04019d42d5c9e6fb9 \
    --security-group-ids sg-04e9f1faedcedda50 \
    --region us-east-1
  ```

---

## Success Criteria

- [ ] Fargate dev stack deploys successfully
- [ ] Health check passes (`/api/health` returns 200)
- [ ] Test job submission works
- [ ] Fargate main stack deploys successfully
- [ ] DNS updated to new endpoint
- [ ] Monitoring/alerting configured
- [ ] EB resources cleaned up
