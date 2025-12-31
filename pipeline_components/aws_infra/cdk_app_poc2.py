#!/usr/bin/env python3
"""
CDK App for PAVI Step Functions POC (Version 3).

Uses STANDARD workflow type for .sync Batch integration support.

Usage:
    # Deploy to AWS
    cdk deploy -a "python3 cdk_app_poc2.py"

    # Destroy when done
    cdk destroy -a "python3 cdk_app_poc2.py"
"""

import os
import aws_cdk as cdk
from cdk_classes.step_functions_stack import StepFunctionsPocStack

app = cdk.App()

# Get AWS account and region from environment or CDK context
aws_account = os.environ.get('CDK_DEFAULT_ACCOUNT') or app.node.try_get_context('account')
aws_region = os.environ.get('CDK_DEFAULT_REGION', 'us-east-1')

# Create the POC stack with a different suffix to avoid conflicts
StepFunctionsPocStack(
    app,
    "PaviStepFunctionsPoc3Stack",
    env_suffix="poc3",
    # Use existing shared resources from main infrastructure
    shared_logs_group="pavi/pipeline-batch-jobs",
    env=cdk.Environment(
        account=aws_account,
        region=aws_region
    ),
    description="PAVI Step Functions POC v3 - STANDARD workflow type"
)

app.synth()
