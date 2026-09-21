# KANBAN-623: Add Environment Name to PAVI CloudWatch Metrics

## Status
Backlog

## Summary
Add environment identifier (e.g., dev, staging, prod) to CloudWatch metrics dimensions for easier tracing and troubleshooting across environments.

## Problem

Currently, PAVI servers publish metrics to CloudWatch using:
- Instance-ID
- AutoScalingGroupName

Issues with current approach:
1. Instance name only available while EC2 instance is live (not after replacement)
2. AutoScalingGroupName requires manual lookup to trace to environment
3. ASG name becomes useless after ASG replacement (e.g., after config updates)
4. Difficult to correlate metrics with environment-specific events

## Requirements

Add environment information to CloudWatch metrics so they can be:
- Easily traced to specific environments (dev, staging, prod)
- Correlated with environment-specific events
- Useful for troubleshooting even after instance/ASG replacement

## Technical Analysis

### CloudWatch Metrics Dimensions

CloudWatch metrics use dimensions to categorize data. Currently using:
- `InstanceId`
- `AutoScalingGroupName`

Should add:
- `Environment` (e.g., "dev", "staging", "prod")
- Optionally: `Service` (e.g., "pavi-api", "pavi-worker")

### Where Metrics Are Published

Need to identify all locations where CloudWatch metrics are published:
1. API server metrics (memory, CPU, request counts)
2. Pipeline worker metrics
3. Any custom application metrics

### Environment Detection

Options for determining environment at runtime:
1. **Environment variable** - Set `PAVI_ENVIRONMENT` in CDK/CloudFormation
2. **SSM Parameter** - Read from AWS Systems Manager Parameter Store
3. **Instance tags** - Read from EC2 instance metadata + tags
4. **CDK context** - Pass through as environment variable during deployment

Recommended: **Environment variable** set during CDK deployment

## Implementation Plan

### 1. Update CDK Infrastructure

In `aws_infra/cdk_classes/`, add environment variable to ECS task definitions and EC2 launch templates:

```python
# For ECS tasks
environment={
    "PAVI_ENVIRONMENT": env_suffix,  # e.g., "dev", "prod"
    # ... existing env vars
}

# For EC2 instances (user data or launch template)
export PAVI_ENVIRONMENT="${env_suffix}"
```

### 2. Update Metrics Publishing Code

Wherever metrics are published to CloudWatch, add the Environment dimension:

```python
import os

cloudwatch = boto3.client('cloudwatch')

def publish_metric(metric_name, value, unit='Count'):
    environment = os.environ.get('PAVI_ENVIRONMENT', 'unknown')

    cloudwatch.put_metric_data(
        Namespace='PAVI',
        MetricData=[{
            'MetricName': metric_name,
            'Value': value,
            'Unit': unit,
            'Dimensions': [
                {'Name': 'Environment', 'Value': environment},
                {'Name': 'InstanceId', 'Value': get_instance_id()},
                # Keep existing dimensions for backward compatibility
            ]
        }]
    )
```

### 3. Update CloudWatch Dashboards

Update any existing CloudWatch dashboards to:
- Group metrics by Environment dimension
- Add environment filter/selector
- Create per-environment views

### 4. Update CloudWatch Alarms

Review and update alarms to use Environment dimension where appropriate:
- Separate thresholds per environment (prod more sensitive than dev)
- Environment-specific notification targets

## Files to Modify

1. `api/aws_infra/` - Add PAVI_ENVIRONMENT to API deployment
2. `pipeline_components/*/aws_infra/` - Add to pipeline components
3. `shared_aws/py_package/` - If metrics publishing is centralized
4. Any Python code that calls `cloudwatch.put_metric_data()`

## CloudWatch Query Examples

After implementation, metrics can be queried like:

```
# Get memory usage for prod environment
SELECT AVG(MemoryUsage)
FROM PAVI
WHERE Environment = 'prod'
GROUP BY InstanceId

# Compare across environments
SELECT AVG(RequestLatency)
FROM PAVI
GROUP BY Environment
```

## Testing

1. Deploy to dev environment
2. Verify metrics appear with Environment dimension in CloudWatch
3. Create test dashboard filtering by environment
4. Verify backward compatibility (existing dashboards still work)

## Related

- CloudWatch Metrics documentation
- CDK ECS/EC2 configuration
- Existing monitoring setup
