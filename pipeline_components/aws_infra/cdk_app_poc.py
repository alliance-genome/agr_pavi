#!/usr/bin/env python3
"""
CDK App for PAVI Step Functions POC.

This is a standalone CDK app for testing the Step Functions migration.
It creates a parallel infrastructure that can be tested alongside the
existing Nextflow pipeline.

Usage:
    # Synthesize CloudFormation template
    cdk synth -a "python3 cdk_app_poc.py"

    # Deploy to AWS
    cdk deploy -a "python3 cdk_app_poc.py" --profile agr

    # Destroy when done
    cdk destroy -a "python3 cdk_app_poc.py" --profile agr
"""

import os
import aws_cdk as cdk
from cdk_classes.step_functions_stack import StepFunctionsPocStack

app = cdk.App()

# Get AWS account and region from environment or CDK context
aws_account = os.environ.get('CDK_DEFAULT_ACCOUNT') or app.node.try_get_context('account')
aws_region = os.environ.get('CDK_DEFAULT_REGION', 'us-east-1')

# Create the POC stack with sensible defaults
StepFunctionsPocStack(
    app,
    "PaviStepFunctionsPocStack",
    env_suffix="poc",
    # Use existing shared resources from main infrastructure
    shared_logs_group="pavi/pipeline-batch-jobs",
    # Optional: Use the main Nextflow bucket or create a new one
    # shared_work_dir_bucket="agr-pavi-pipeline-nextflow",
    env=cdk.Environment(
        account=aws_account,
        region=aws_region
    ),
    description="PAVI Step Functions POC - Parallel testing infrastructure"
)

app.synth()
