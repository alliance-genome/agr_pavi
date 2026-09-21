# PAVI Step Functions Design

## Overview
This document outlines the design for migrating the PAVI protein MSA pipeline from Nextflow to AWS Step Functions. The goal is to maintain the same functional behavior while gaining better AWS integration, cost optimization, and operational simplicity.

## Current Nextflow Workflow Analysis

### Workflow Structure
The current `protein-msa.nf` workflow consists of three main processes:

1. **sequence_retrieval** (Parallel)
   - Memory: 500 MB
   - Container: `agr_pavi/pipeline_seq_retrieval:${tag}`
   - Input: JSON request map with sequence regions
   - Output:
     - `{unique_entry_id}-protein.fa` (protein sequences)
     - `{unique_entry_id}-seqinfo.json` (sequence metadata)
   - Operation: Retrieves protein sequences from genomic regions with variants

2. **alignment** (Single)
   - Memory: 2 GB
   - Container: `agr_pavi/pipeline_alignment:${tag}`
   - Input: Collected FASTA files from all sequence_retrieval outputs
   - Output: `alignment-output.aln` (Clustal Omega alignment)
   - Operation: Multiple sequence alignment using Clustal Omega

3. **collectAndAlignSeqInfo** (Single)
   - Memory: 500 MB
   - Container: `agr_pavi/pipeline_seq_retrieval:${tag}` (reused)
   - Input: All seqinfo JSON files + alignment output
   - Output: `aligned_seq_info.json` (merged metadata with alignment positions)
   - Operation: Merges sequence info and adds alignment coordinates

### Data Flow
```
Input: Array of sequence region specifications
  ↓
[Parallel Map] sequence_retrieval (one per input)
  ↓ (collect all outputs)
alignment (merge FASTA files)
  ↓
collectAndAlignSeqInfo (merge metadata with alignment)
  ↓
Output: alignment-output.aln + aligned_seq_info.json
```

### Current AWS Resources
- **Compute**: AWS Batch with ECS compute environment
- **Storage**: S3 bucket for Nextflow work directory and results
- **Containers**: ECR repositories for pipeline images
- **Logs**: CloudWatch log group
- **Orchestration**: Nextflow running on external executor

## Step Functions State Machine Design

### Architecture Decision
We will use AWS Step Functions Express Workflows for synchronous execution with:
- AWS Batch for containerized computation (reusing existing infrastructure)
- S3 for intermediate data storage (replacing Nextflow work directory)
- Step Functions Map state for parallel sequence retrieval
- Direct Batch job integration without Lambda wrappers

### State Machine Structure

```json
{
  "Comment": "PAVI Protein MSA Pipeline",
  "StartAt": "ValidateInput",
  "States": {
    "ValidateInput": {
      "Type": "Pass",
      "Comment": "Validate and prepare input parameters",
      "Parameters": {
        "execution_id.$": "$$.Execution.Name",
        "input_regions.$": "$.seq_regions",
        "s3_work_prefix.$": "States.Format('s3://agr-pavi-pipeline-stepfunctions/executions/{}/work/', $$.Execution.Name)",
        "s3_results_prefix.$": "States.Format('s3://agr-pavi-pipeline-stepfunctions/executions/{}/results/', $$.Execution.Name)"
      },
      "Next": "ParallelSequenceRetrieval"
    },

    "ParallelSequenceRetrieval": {
      "Type": "Map",
      "Comment": "Retrieve sequences in parallel for each input region",
      "ItemsPath": "$.input_regions",
      "MaxConcurrency": 40,
      "ItemProcessor": {
        "ProcessorConfig": {
          "Mode": "INLINE"
        },
        "StartAt": "SequenceRetrievalBatchJob",
        "States": {
          "SequenceRetrievalBatchJob": {
            "Type": "Task",
            "Resource": "arn:aws:states:::batch:submitJob.sync",
            "Parameters": {
              "JobName.$": "States.Format('seq-retrieval-{}', $.unique_entry_id)",
              "JobQueue": "pavi_pipeline",
              "JobDefinition": "arn:aws:batch:REGION:ACCOUNT:job-definition/pavi-seq-retrieval:1",
              "ContainerOverrides": {
                "Memory": 500,
                "Vcpus": 1,
                "Command": [
                  "seq_retrieval.py",
                  "--output_type", "protein",
                  "--unique_entry_id.$", "$.unique_entry_id",
                  "--base_seq_name.$", "$.base_seq_name",
                  "--seq_id.$", "$.seq_id",
                  "--seq_strand.$", "$.seq_strand",
                  "--fasta_file_url.$", "$.fasta_file_url",
                  "--exon_seq_regions.$", "States.JsonToString($.exon_seq_regions)",
                  "--cds_seq_regions.$", "States.JsonToString($.cds_seq_regions)",
                  "--variant_ids.$", "States.JsonToString($.variant_ids)",
                  "--s3_output_prefix.$", "$.s3_work_prefix"
                ]
              }
            },
            "ResultPath": "$.batch_result",
            "End": true
          }
        }
      },
      "ResultPath": "$.retrieval_results",
      "Next": "PrepareAlignmentInput"
    },

    "PrepareAlignmentInput": {
      "Type": "Pass",
      "Comment": "Prepare consolidated input for alignment job",
      "Parameters": {
        "execution_id.$": "$.execution_id",
        "s3_work_prefix.$": "$.s3_work_prefix",
        "s3_results_prefix.$": "$.s3_results_prefix",
        "retrieval_outputs.$": "$.retrieval_results[*].batch_result.Container.Environment"
      },
      "Next": "AlignmentBatchJob"
    },

    "AlignmentBatchJob": {
      "Type": "Task",
      "Resource": "arn:aws:states:::batch:submitJob.sync",
      "Parameters": {
        "JobName.$": "States.Format('alignment-{}', $.execution_id)",
        "JobQueue": "pavi_pipeline",
        "JobDefinition": "arn:aws:batch:REGION:ACCOUNT:job-definition/pavi-alignment:1",
        "ContainerOverrides": {
          "Memory": 2048,
          "Vcpus": 2,
          "Command": [
            "clustalo",
            "-i", "input.fa",
            "--outfmt=clustal",
            "--resno",
            "-o", "alignment-output.aln",
            "--s3-work-prefix.$", "$.s3_work_prefix",
            "--s3-results-prefix.$", "$.s3_results_prefix"
          ]
        }
      },
      "ResultPath": "$.alignment_result",
      "Next": "CollectAndAlignSeqInfo"
    },

    "CollectAndAlignSeqInfo": {
      "Type": "Task",
      "Resource": "arn:aws:states:::batch:submitJob.sync",
      "Parameters": {
        "JobName.$": "States.Format('collect-seqinfo-{}', $.execution_id)",
        "JobQueue": "pavi_pipeline",
        "JobDefinition": "arn:aws:batch:REGION:ACCOUNT:job-definition/pavi-seq-retrieval:1",
        "ContainerOverrides": {
          "Memory": 500,
          "Vcpus": 1,
          "Command": [
            "seq_info_align.py",
            "--s3-work-prefix.$", "$.s3_work_prefix",
            "--s3-results-prefix.$", "$.s3_results_prefix",
            "--alignment-result-file", "alignment-output.aln"
          ]
        }
      },
      "ResultPath": "$.collect_result",
      "Next": "Success"
    },

    "Success": {
      "Type": "Succeed",
      "Comment": "Pipeline completed successfully"
    }
  }
}
```

### Key Design Decisions

#### 1. Express vs Standard Workflows
- **Choice**: Express Workflows (Synchronous)
- **Rationale**:
  - Sub-5 minute execution time for most pipelines
  - Synchronous response needed by API
  - Lower cost for short-duration workflows
  - Can switch to Standard if execution times grow

#### 2. S3 Data Passing vs Parameters
- **Choice**: S3 for intermediate data, parameters for metadata
- **Rationale**:
  - FASTA and JSON files can be large (>256KB)
  - Step Functions has 256KB payload limit
  - S3 provides durability and debugging capability
  - Batch jobs already use S3 for I/O

#### 3. Direct Batch Integration vs Lambda
- **Choice**: Direct Batch job submission via `.sync` integration
- **Rationale**:
  - Eliminates Lambda overhead and complexity
  - Native Step Functions → Batch integration is robust
  - Simpler error handling and retries
  - No Lambda packaging/deployment overhead

#### 4. Map State for Parallelization
- **Choice**: Inline Map state with MaxConcurrency=40
- **Rationale**:
  - Typical pipelines have 2-10 sequences
  - Inline mode sufficient (no need for distributed map)
  - 40 concurrent jobs matches Nextflow behavior
  - Can scale to distributed map if needed

#### 5. Container Strategy
- **Choice**: Reuse existing Docker containers with minor S3 I/O modifications
- **Rationale**:
  - Minimize code changes during migration
  - Leverage existing, tested logic
  - Add S3 client library to Python containers
  - Use boto3 for S3 operations (already in AWS SDK)

## Infrastructure Changes

### New Resources
1. **Step Functions State Machine**
   - Express Workflow (synchronous)
   - IAM role with Batch and S3 permissions

2. **S3 Bucket**
   - Bucket: `agr-pavi-pipeline-stepfunctions`
   - Purpose: Work directory and results
   - Lifecycle: 30-day expiration for work/, retain results/

3. **Batch Job Definitions**
   - `pavi-seq-retrieval`: Reuses existing image with S3 I/O
   - `pavi-alignment`: Reuses existing image with S3 I/O
   - No changes to compute environment or job queue

### Existing Resources (Retained)
- AWS Batch compute environment
- AWS Batch job queue
- ECR repositories
- CloudWatch log groups
- VPC and subnets

### Resources to Remove (Post-migration)
- Nextflow-specific IAM policies
- Nextflow work directory bucket (or repurpose)

## Migration Path

### Phase 1: POC (Week 1)
1. Create CDK stack for Step Functions state machine
2. Define Batch job definitions in CDK
3. Update container scripts to use S3 I/O (boto3)
4. Test with synthetic data locally

### Phase 2: Parallel Testing (Weeks 2-3)
1. Deploy to development environment
2. Run Step Functions and Nextflow in parallel
3. Compare outputs for correctness
4. Performance benchmarking

### Phase 3: API Integration (Weeks 4-5)
1. Update FastAPI to invoke Step Functions
2. Implement polling/callback mechanism
3. Error handling and retry logic
4. Update status tracking

### Phase 4: Production Cutover (Weeks 6-7)
1. Deploy to staging environment
2. User acceptance testing
3. Production deployment
4. Monitor for 2 weeks before Nextflow deprecation

## Cost Comparison

### Current (Nextflow)
- Nextflow coordinator: EC2 or ECS task (always running)
- Batch jobs: Pay per job
- S3 storage: Work directory + results
- Data transfer: Minimal (same region)

### Proposed (Step Functions)
- Step Functions: $0.0025 per state transition
  - ~10 transitions per pipeline = $0.025 per run
- Batch jobs: Same (no change)
- S3 storage: Same structure, different bucket
- Data transfer: Same

**Estimated savings**: $50-100/month (eliminating Nextflow coordinator overhead)

## Error Handling

### Retry Strategy
```json
{
  "Retry": [
    {
      "ErrorEquals": ["Batch.JobFailed"],
      "IntervalSeconds": 2,
      "MaxAttempts": 2,
      "BackoffRate": 2.0
    },
    {
      "ErrorEquals": ["States.TaskFailed"],
      "IntervalSeconds": 1,
      "MaxAttempts": 1
    }
  ]
}
```

### Failure Notifications
- CloudWatch alarm on failed executions
- SNS topic for ops team notifications
- Execution history retained for debugging

## Monitoring & Observability

### Metrics
- Step Functions execution duration
- Batch job wait time
- Batch job run time
- S3 I/O latency
- Success/failure rates

### Dashboards
- CloudWatch dashboard with:
  - Execution throughput
  - Job queue depth
  - Compute environment utilization
  - Cost per execution

### Alarms
- Execution failure rate > 5%
- Average duration > 10 minutes
- Batch job queue depth > 20

## Testing Strategy

### Unit Tests
- State machine definition validation
- CDK synthesis tests
- Container script S3 I/O tests

### Integration Tests
- End-to-end pipeline execution
- Error injection testing
- Parallel execution testing
- Large input dataset testing

### Performance Tests
- Baseline: Current Nextflow performance
- Target: Match or improve by 10%
- Scale: Test with 50+ concurrent pipelines

## Rollback Plan

### Triggers
- Success rate < 95%
- Performance degradation > 20%
- Critical bugs blocking production

### Process
1. Route API traffic back to Nextflow
2. Disable Step Functions state machine
3. Preserve execution logs for debugging
4. Root cause analysis before retry

## Success Criteria

1. **Functionality**: 100% output parity with Nextflow
2. **Performance**: Within 10% of Nextflow execution time
3. **Reliability**: >99% success rate
4. **Cost**: Reduce operational costs by >$50/month
5. **Maintainability**: Simpler codebase, fewer moving parts

## Next Steps

1. Create POC CDK stack (this week)
2. Update container scripts for S3 I/O
3. Deploy to development environment
4. Parallel testing with Nextflow
