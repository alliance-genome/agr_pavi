# Week 2 Quick Start Guide

**Goal**: Update container scripts for S3 I/O and deploy POC to AWS

## Prerequisites Checklist

- [ ] Python 3.12 environment set up
- [ ] AWS CLI configured with AGR credentials
- [ ] Docker installed (for local testing)
- [ ] CDK CLI installed (`npm install -g aws-cdk`)

## Step 1: Environment Setup (30 min)

```bash
# Navigate to project
cd /Users/nuin/Projects/alliance/agr_pavi

# Checkout feature branch
git checkout feature/pavi-overhaul

# Build shared package
cd shared_aws/py_package
make build
make install

# Install CDK dependencies
cd ../../pipeline_components/aws_infra
make install-deps
make install-cdk-cli
```

## Step 2: Container Script Updates (2-3 hours)

### Update seq_retrieval.py

**File**: `/pipeline_components/seq_retrieval/seq_retrieval.py`

**Changes needed**:
1. Add boto3 S3 client initialization
2. Modify output to write to S3 instead of local filesystem
3. Add `--s3_output_prefix` parameter
4. Upload both `.fa` and `.json` files to S3

**Pattern**:
```python
import boto3

s3_client = boto3.client('s3')

# After generating files
if s3_output_prefix:
    s3_path = f"{s3_output_prefix}/{unique_entry_id}-protein.fa"
    s3_client.upload_file(local_file, bucket, key)
```

### Create alignment_wrapper.sh

**File**: `/pipeline_components/alignment/alignment_wrapper.sh` (new)

**Purpose**: Download inputs from S3, run Clustal Omega, upload results

**Pseudocode**:
```bash
#!/bin/bash
# Download all protein.fa files from S3
# Concatenate into alignment-input.fa
# Run clustalo
# Upload alignment-output.aln to S3
```

### Update seq_info_align.py

**File**: `/pipeline_components/seq_retrieval/seq_info_align.py`

**Changes needed**:
1. Download seqinfo JSON files from S3
2. Download alignment output from S3
3. Process and merge
4. Upload aligned_seq_info.json to S3

## Step 3: Local Container Testing (1 hour)

```bash
# Build containers locally
cd /Users/nuin/Projects/alliance/agr_pavi

# Build seq_retrieval
cd pipeline_components/seq_retrieval
make build

# Build alignment
cd ../alignment
make build

# Test with mock S3 (LocalStack or MinIO)
# OR test with actual S3 bucket
```

## Step 4: Deploy POC to AWS (1 hour)

```bash
cd /Users/nuin/Projects/alliance/agr_pavi/pipeline_components/aws_infra

# Validate CDK synthesis
cdk synth -a "python3 cdk_app_poc.py"

# Review changes
cdk diff -a "python3 cdk_app_poc.py" --profile agr

# Deploy
cdk deploy -a "python3 cdk_app_poc.py" --profile agr

# Save outputs
# Note the StateMachineArn and WorkBucketName
```

## Step 5: Integration Testing (2-3 hours)

### Test 1: Single Sequence

```json
{
  "seq_regions": [
    {
      "unique_entry_id": "test-001",
      "base_seq_name": "C54H2.5.1",
      "seq_id": "X",
      "seq_strand": "-",
      "exon_seq_regions": ["5780644..5780722", "5780278..5780585"],
      "cds_seq_regions": ["5780644..5780722", "5780278..5780585"],
      "fasta_file_url": "https://s3.amazonaws.com/agrjbrowse/fasta/GCF_000002985.6_WBcel235_genomic.fna.gz",
      "variant_ids": []
    }
  ],
  "job_queue_arn": "arn:aws:batch:us-east-1:ACCOUNT:job-queue/pavi_pipeline_poc"
}
```

### Test 2: Multiple Sequences (Parallel)

Use existing test file:
```bash
cat tests/resources/test_seq_regions.json
```

### Test 3: Compare with Nextflow

Run same input through both systems:
```bash
# Nextflow
./nextflow.sh run protein-msa.nf --input_seq_regions_file test_input.json

# Step Functions
aws stepfunctions start-sync-execution \
  --state-machine-arn "arn:aws:states:REGION:ACCOUNT:stateMachine:pavi-pipeline-sfn-poc" \
  --input file://test_input.json \
  --profile agr

# Compare outputs
diff nextflow-output/alignment-output.aln s3-output/alignment-output.aln
diff nextflow-output/aligned_seq_info.json s3-output/aligned_seq_info.json
```

## Step 6: Monitoring Setup (1 hour)

### Create CloudWatch Dashboard

```bash
aws cloudwatch put-dashboard \
  --dashboard-name PAVI-StepFunctions-POC \
  --dashboard-body file://dashboard-config.json \
  --profile agr
```

**Dashboard Widgets**:
- Execution count (success/failure)
- Execution duration
- Batch job queue depth
- S3 bucket size

### Set Up Alarms

```bash
# Failure rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name PAVI-POC-High-Failure-Rate \
  --metric-name ExecutionsFailed \
  --namespace AWS/States \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --profile agr
```

## Common Issues & Solutions

### Issue: S3 Access Denied
**Solution**: Check IAM role permissions on job definitions

```bash
aws iam get-role-policy --role-name pavi-sfn-job-execution-role-poc --policy-name S3Access --profile agr
```

### Issue: Container Can't Find boto3
**Solution**: Add boto3 to container requirements.txt and rebuild

```dockerfile
# In Dockerfile
RUN pip install boto3
```

### Issue: Batch Job Hangs in RUNNABLE
**Solution**: Check compute environment capacity

```bash
aws batch describe-compute-environments \
  --compute-environments pavi_pipeline_ecs_poc \
  --profile agr
```

### Issue: State Machine Timeout
**Solution**: Check Batch job logs for slow steps

```bash
aws logs tail pavi/pipeline-batch-jobs --follow --profile agr
```

## File Locations

### Documentation
- Design: `/docs/step-functions-design.md`
- POC README: `/pipeline_components/aws_infra/POC_README.md`
- Week 1 Summary: `/docs/week1-completion-summary.md`

### Code
- CDK Stack: `/pipeline_components/aws_infra/cdk_classes/step_functions_stack.py`
- CDK Pipeline: `/pipeline_components/aws_infra/cdk_classes/step_functions_pipeline.py`
- CDK App: `/pipeline_components/aws_infra/cdk_app_poc.py`

### Containers to Update
- Seq Retrieval: `/pipeline_components/seq_retrieval/`
- Alignment: `/pipeline_components/alignment/`

## Success Criteria for Week 2

- [ ] All container scripts updated for S3 I/O
- [ ] POC deployed to AWS without errors
- [ ] Single sequence test passes
- [ ] Multi-sequence test passes
- [ ] Outputs match Nextflow (byte-for-byte or semantically)
- [ ] CloudWatch dashboard shows metrics
- [ ] Alarms configured and tested

## Time Estimates

| Task | Estimated Time | Priority |
|------|----------------|----------|
| Environment setup | 30 min | P1 |
| seq_retrieval.py update | 1 hour | P1 |
| alignment_wrapper.sh creation | 1 hour | P1 |
| seq_info_align.py update | 1 hour | P1 |
| Local container testing | 1 hour | P1 |
| CDK deployment | 1 hour | P1 |
| Integration testing | 2-3 hours | P1 |
| Monitoring setup | 1 hour | P2 |
| **Total** | **8-9 hours** | |

## Week 2 Deliverables

1. Updated container scripts with S3 I/O
2. Deployed POC infrastructure in AWS
3. Test results comparing Step Functions vs. Nextflow
4. CloudWatch dashboard and alarms
5. Week 2 completion summary document

## Commands Quick Reference

```bash
# CDK
cdk synth -a "python3 cdk_app_poc.py"
cdk deploy -a "python3 cdk_app_poc.py" --profile agr
cdk destroy -a "python3 cdk_app_poc.py" --profile agr

# Step Functions
aws stepfunctions list-executions --state-machine-arn <arn> --profile agr
aws stepfunctions describe-execution --execution-arn <arn> --profile agr
aws stepfunctions start-sync-execution --state-machine-arn <arn> --input file://input.json --profile agr

# Batch
aws batch describe-jobs --jobs <job-id> --profile agr
aws batch list-jobs --job-queue pavi_pipeline_poc --profile agr

# S3
aws s3 ls s3://agr-pavi-pipeline-stepfunctions-poc/ --recursive --profile agr
aws s3 cp s3://bucket/key local-file --profile agr

# Logs
aws logs tail /aws/vendedlogs/states/pavi-pipeline-sfn-poc --follow --profile agr
aws logs tail pavi/pipeline-batch-jobs --follow --profile agr
```

## Next Steps After Week 2

If Week 2 successful:
- Week 3: API integration (FastAPI updates)
- Week 4: Error handling and retries
- Week 5: Performance optimization
- Week 6-7: Production deployment

If issues found:
- Debug and iterate on POC
- Update design document with lessons learned
- Extend Week 2 timeline as needed

## Questions to Answer by End of Week 2

1. Do Step Functions outputs match Nextflow byte-for-byte?
2. What is the performance difference (execution time)?
3. Are there any S3 I/O bottlenecks?
4. How does error handling work in practice?
5. What is the actual cost per execution?

## Notes

- Keep Nextflow running throughout Week 2-3 for comparison
- Document any deviations from design in real-time
- Take CloudWatch screenshots for Week 2 summary
- Update design doc if major changes needed

---

**Start Week 2**: When ready, begin with environment setup and container updates.
