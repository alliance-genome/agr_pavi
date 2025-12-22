#!/usr/bin/env python3
from aws_cdk import App

from cdk_classes.cdk_infra_stack import CdkInfraStack
from cdk_classes.step_functions_stack import StepFunctionsPocStack

from pavi_shared_aws.agr_aws_env import agr_aws_environment


app = App()

# Legacy Nextflow-based stacks
CdkInfraStack(app, "PaviPipelineCdkStack",
              env=agr_aws_environment)

CdkInfraStack(app, "PaviPipelineCdkStack-dev", env_suffix="dev",
              shared_seq_retrieval_image_repo='agr_pavi/pipeline_seq_retrieval',
              shared_alignment_image_repo='agr_pavi/pipeline_alignment',
              shared_logs_group='pavi/pipeline-batch-jobs',
              shared_work_dir_bucket='agr-pavi-pipeline-nextflow',
              env=agr_aws_environment)

# Step Functions-based stacks for multiple environments
# Development environment (POC)
StepFunctionsPocStack(
    app, "PaviStepFunctionsStack-dev",
    env_suffix="dev",
    shared_logs_group='pavi/pipeline-batch-jobs',
    shared_work_dir_bucket='agr-pavi-pipeline-nextflow',
    env=agr_aws_environment
)

# Staging environment (pre-production testing)
StepFunctionsPocStack(
    app, "PaviStepFunctionsStack-staging",
    env_suffix="staging",
    shared_logs_group='pavi/pipeline-batch-jobs',
    shared_work_dir_bucket='agr-pavi-pipeline-nextflow',
    env=agr_aws_environment
)

# Production environment
StepFunctionsPocStack(
    app, "PaviStepFunctionsStack-prod",
    env_suffix="prod",
    shared_logs_group='pavi/pipeline-batch-jobs',
    shared_work_dir_bucket='agr-pavi-pipeline-nextflow',
    env=agr_aws_environment
)

app.synth()
