# KANBAN-831: Optimise Processing Job Intermediate Result Storage

## Status
Backlog

## Summary
Configure S3 lifecycle policies to automatically delete Nextflow intermediate files after a retention period (e.g., 30 days) to reduce storage costs.

## Problem

Current behavior:
- Nextflow pipeline stores intermediate files (workdirs) in S3
- Files are stored permanently with no cleanup
- Troubleshooting typically only needed within days of execution

Impact:
- **Growing storage costs**: S3 usage increases indefinitely
- **Unnecessary retention**: Old workdirs have no value after troubleshooting window
- **Manual cleanup burden**: No automated process to manage old files

### Storage Growth Example

| Month | Jobs | Avg Work Dir Size | Cumulative Storage | Monthly Cost |
|-------|------|-------------------|-------------------|--------------|
| 1 | 100 | 500 MB | 50 GB | $1.15 |
| 6 | 600 | 500 MB | 300 GB | $6.90 |
| 12 | 1200 | 500 MB | 600 GB | $13.80 |

With 30-day lifecycle policy:
- Storage caps at ~30 days worth of jobs
- Predictable costs regardless of total job history

## Solution

### S3 Lifecycle Policy

Configure automatic deletion of objects after retention period:

```json
{
  "Rules": [
    {
      "ID": "DeleteOldWorkDirs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "work/"
      },
      "Expiration": {
        "Days": 30
      }
    },
    {
      "ID": "DeleteOldLogs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

### Tiered Approach (Optional)

For cost optimization before deletion:

```json
{
  "Rules": [
    {
      "ID": "TierAndDeleteWorkDirs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "work/"
      },
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 14,
          "StorageClass": "GLACIER_IR"
        }
      ],
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

Cost comparison (per GB/month):
| Storage Class | Cost | Use Case |
|---------------|------|----------|
| Standard | $0.023 | Active access (days 1-7) |
| Standard-IA | $0.0125 | Infrequent access (days 7-14) |
| Glacier IR | $0.004 | Rare access (days 14-30) |

## Implementation Plan

### Option A: CDK Configuration

```python
# In aws_infra CDK code
from aws_cdk import aws_s3 as s3
from aws_cdk import Duration

work_bucket = s3.Bucket(
    self, "PaviWorkBucket",
    bucket_name=f"pavi-work-{env_suffix}",
    lifecycle_rules=[
        s3.LifecycleRule(
            id="DeleteOldWorkDirs",
            prefix="work/",
            expiration=Duration.days(30),
            transitions=[
                s3.Transition(
                    storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                    transition_after=Duration.days(7)
                )
            ]
        ),
        s3.LifecycleRule(
            id="DeleteOldLogs",
            prefix="logs/",
            expiration=Duration.days(30)
        ),
        # Keep final results longer
        s3.LifecycleRule(
            id="ArchiveResults",
            prefix="results/",
            expiration=Duration.days(90),
            transitions=[
                s3.Transition(
                    storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                    transition_after=Duration.days(30)
                )
            ]
        )
    ]
)
```

### Option B: AWS CLI (for existing bucket)

```bash
# Create lifecycle configuration file
cat > lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "ID": "DeleteOldWorkDirs",
      "Status": "Enabled",
      "Filter": { "Prefix": "work/" },
      "Expiration": { "Days": 30 }
    }
  ]
}
EOF

# Apply to bucket
aws s3api put-bucket-lifecycle-configuration \
  --bucket pavi-work-prod \
  --lifecycle-configuration file://lifecycle.json
```

## Retention Considerations

### Files to Delete (30 days)
- `work/` - Nextflow working directories
- `logs/` - Pipeline execution logs
- Temporary/intermediate files

### Files to Keep Longer (90+ days)
- `results/` - Final alignment outputs
- Job metadata for audit trail

### Files to Keep Indefinitely
- Reference data
- Configuration files

## Monitoring

### CloudWatch Metrics to Track

```python
# Monitor storage usage
cloudwatch.put_metric_alarm(
    AlarmName='PaviWorkBucketSize',
    MetricName='BucketSizeBytes',
    Namespace='AWS/S3',
    Dimensions=[
        {'Name': 'BucketName', 'Value': 'pavi-work-prod'},
        {'Name': 'StorageType', 'Value': 'StandardStorage'}
    ],
    Threshold=100 * 1024 * 1024 * 1024,  # 100 GB
    ComparisonOperator='GreaterThanThreshold'
)
```

### S3 Storage Lens

Enable S3 Storage Lens for visibility:
- Storage trends over time
- Cost optimization recommendations
- Lifecycle policy effectiveness

## Files to Modify

1. `api/aws_infra/` - If work bucket defined here
2. `shared_aws/aws_infra/` - If shared bucket resource
3. Nextflow configuration - Verify prefix structure matches policy

## Testing

1. Apply lifecycle policy to dev bucket
2. Upload test files with various prefixes
3. Verify transitions occur on schedule
4. Confirm deletions after expiration
5. Validate troubleshooting workflow still works within window

## Rollback

If issues discovered:
```bash
# Remove lifecycle policy
aws s3api delete-bucket-lifecycle \
  --bucket pavi-work-prod
```

## Cost Savings Estimate

Assuming 100 jobs/month, 500 MB average work dir:

| Scenario | Annual Storage | Annual Cost |
|----------|---------------|-------------|
| No cleanup | 600 GB | ~$165 |
| 30-day retention | ~50 GB (cap) | ~$14 |
| With tiering | ~50 GB | ~$8 |

**Savings: ~$150/year** (scales with usage)

## Related

- KANBAN-830 (genome file optimization)
- Nextflow S3 work directory configuration
- AWS S3 lifecycle documentation
