# PAVI Step Functions POC

This directory contains the Proof of Concept (POC) CDK infrastructure for migrating PAVI's protein MSA pipeline from Nextflow to AWS Step Functions.

## Overview

The POC creates a parallel infrastructure that can be tested alongside the existing Nextflow pipeline without disrupting production workloads.

### Key Components

1. **Step Functions State Machine** (`pavi-pipeline-sfn-poc`)
   - Express Workflow for synchronous execution
   - Orchestrates sequence retrieval, alignment, and metadata collection
   - 30-minute timeout

2. **S3 Work Bucket** (`agr-pavi-pipeline-stepfunctions-poc`)
   - Stores intermediate work files and final results
   - Lifecycle rules: 30-day expiration for work/, indefinite retention for results/

3. **Batch Job Definitions**
   - `pavi-seq-retrieval-sfn-poc`: Sequence retrieval container
   - `pavi-alignment-sfn-poc`: Multiple sequence alignment container

4. **Reused Resources**
   - Batch compute environment and job queue from existing infrastructure
   - CloudWatch log groups
   - VPC and networking

## Architecture

```
API Request
    ↓
Step Functions State Machine
    ↓
┌─────────────────────────────────────┐
│ 1. Validate Input                   │
│    - Parse seq_regions              │
│    - Generate execution ID          │
│    - Set S3 paths                   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. Parallel Sequence Retrieval      │
│    - Map over input regions         │
│    - Submit Batch jobs (concurrent) │
│    - Wait for all completions       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. Prepare Alignment Input          │
│    - Collect S3 paths               │
│    - Build consolidated input       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 4. Alignment                        │
│    - Download sequences from S3     │
│    - Run Clustal Omega              │
│    - Upload results to S3           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 5. Collect & Align Seq Info         │
│    - Merge sequence metadata        │
│    - Add alignment coordinates      │
│    - Output final JSON              │
└─────────────────────────────────────┘
    ↓
Success (outputs in S3)
```

## Prerequisites

1. **AWS CLI** configured with AGR credentials
2. **CDK CLI** installed (`npm install -g aws-cdk`)
3. **Python 3.9+** with virtual environment
4. **Docker** (for local CDK asset building)

## Setup

### 1. Install Dependencies

```bash
cd /Users/nuin/Projects/alliance/agr_pavi/pipeline_components/aws_infra

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install CDK dependencies
pip install -r requirements.txt

# Install Node.js dependencies (CDK CLI)
npm install
```

### 2. Bootstrap CDK (One-time)

If you haven't bootstrapped CDK in your AWS account/region:

```bash
cdk bootstrap aws://100225593120/us-east-1 --profile agr
```

## Testing Locally

### 1. Synthesize CloudFormation Template

```bash
# Activate virtual environment
source .venv/bin/activate

# Synthesize the stack
cdk synth -a "python3 cdk_app_poc.py"

# Output will be in cdk.out/PaviStepFunctionsPocStack.template.json
```

### 2. Validate Template

```bash
# Check for errors
cdk synth -a "python3 cdk_app_poc.py" --validate

# View resources that will be created
cdk diff -a "python3 cdk_app_poc.py" --profile agr
```

### 3. Review Generated Resources

```bash
# List all stacks
cdk list -a "python3 cdk_app_poc.py"

# View metadata
cdk metadata -a "python3 cdk_app_poc.py" PaviStepFunctionsPocStack
```

## Deployment (When Ready)

```bash
# Deploy to AWS
cdk deploy -a "python3 cdk_app_poc.py" --profile agr

# Watch deployment progress
# Outputs will include:
# - StateMachineArn
# - WorkBucketName
# - JobQueueArn
# - SeqRetrievalJobDefArn
# - AlignmentJobDefArn
```

## Testing the Pipeline

Once deployed, test the Step Functions state machine:

### 1. Via AWS Console

1. Navigate to Step Functions in AWS Console
2. Select `pavi-pipeline-sfn-poc` state machine
3. Click "Start execution"
4. Provide test input:

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
  "job_queue_arn": "arn:aws:batch:us-east-1:100225593120:job-queue/pavi_pipeline_poc"
}
```

### 2. Via AWS CLI

```bash
aws stepfunctions start-sync-execution \
  --state-machine-arn "arn:aws:states:us-east-1:100225593120:stateMachine:pavi-pipeline-sfn-poc" \
  --input file://test-input.json \
  --profile agr
```

### 3. Check Results

```bash
# List executions
aws stepfunctions list-executions \
  --state-machine-arn "arn:aws:states:us-east-1:100225593120:stateMachine:pavi-pipeline-sfn-poc" \
  --profile agr

# Get execution details
aws stepfunctions describe-execution \
  --execution-arn "<execution-arn>" \
  --profile agr

# Check S3 results
aws s3 ls s3://agr-pavi-pipeline-stepfunctions-poc/executions/ \
  --recursive \
  --profile agr
```

## Monitoring

### CloudWatch Logs

```bash
# View state machine logs
aws logs tail /aws/vendedlogs/states/pavi-pipeline-sfn-poc \
  --follow \
  --profile agr

# View Batch job logs
aws logs tail pavi/pipeline-batch-jobs \
  --follow \
  --profile agr
```

### Metrics

Key metrics to monitor:
- **ExecutionTime**: State machine duration
- **ExecutionsFailed**: Failed executions
- **ExecutionsSucceeded**: Successful executions

Create a CloudWatch dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name PAVI-StepFunctions-POC \
  --dashboard-body file://dashboard-config.json \
  --profile agr
```

## Troubleshooting

### Common Issues

1. **Job Definition Not Found**
   - Ensure ECR images exist and are tagged correctly
   - Check job definition ARNs in CloudFormation outputs

2. **S3 Access Denied**
   - Verify IAM roles have S3 permissions
   - Check bucket policies

3. **Batch Job Failures**
   - Check CloudWatch logs for container errors
   - Verify container scripts expect S3 I/O

4. **State Machine Timeout**
   - Default 30-minute timeout
   - Check Batch job wait times in queue

### Debug Commands

```bash
# Describe Batch job
aws batch describe-jobs \
  --jobs "<job-id>" \
  --profile agr

# Get job logs
aws logs get-log-events \
  --log-group-name pavi/pipeline-batch-jobs \
  --log-stream-name "<stream-name>" \
  --profile agr

# Check state machine execution history
aws stepfunctions get-execution-history \
  --execution-arn "<execution-arn>" \
  --profile agr
```

## Cleanup

When testing is complete:

```bash
# Destroy the stack
cdk destroy -a "python3 cdk_app_poc.py" --profile agr

# Manually delete S3 bucket if needed (contains data)
aws s3 rm s3://agr-pavi-pipeline-stepfunctions-poc/ \
  --recursive \
  --profile agr

aws s3 rb s3://agr-pavi-pipeline-stepfunctions-poc/ \
  --profile agr
```

## Next Steps

1. **Container Updates** (Week 1-2)
   - Modify `seq_retrieval.py` to use S3 I/O with boto3
   - Create `alignment_wrapper.sh` for S3 download/upload
   - Update `seq_info_align.py` for S3 I/O

2. **Integration Testing** (Week 2-3)
   - Run parallel tests: Nextflow vs Step Functions
   - Compare outputs for correctness
   - Performance benchmarking

3. **API Integration** (Week 4-5)
   - Update FastAPI to invoke Step Functions
   - Implement execution polling/callbacks
   - Error handling and retries

4. **Production Deployment** (Week 6-7)
   - Deploy to staging environment
   - User acceptance testing
   - Production cutover

## Cost Estimates

### POC Testing (per execution)
- Step Functions: ~$0.025 (10 state transitions)
- Batch: $0.10-0.50 (compute time)
- S3: <$0.01 (storage + requests)
- **Total per run**: ~$0.15

### Monthly (100 executions)
- Step Functions: $2.50
- Batch: $10-50 (depends on job duration)
- S3: <$1
- **Total**: ~$15-55/month

Compare to current Nextflow overhead (~$100/month for coordinator).

## Support

For questions or issues:
- Check CloudWatch logs first
- Review Step Functions execution history
- Consult `/Users/nuin/Projects/alliance/agr_pavi/docs/step-functions-design.md`
