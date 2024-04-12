#!/usr/bin/env python3
from aws_cdk import App

from cdk_classes.cdk_infra_stack import CdkInfraStack
from agr_aws_env import agr_aws_environment


app = App()
CdkInfraStack(app, "PaviPipelineCdkStack",
              env=agr_aws_environment)

CdkInfraStack(app, "PaviPipelineCdkStack-dev", env_suffix="dev",
              shared_seq_retrieval_image_repo='agr_pavi/pipeline_seq_retrieval',
              shared_alignment_image_repo='agr_pavi/pipeline_alignment',
              shared_work_dir_bucket='agr-pavi-pipeline-nextflow',
              env=agr_aws_environment)

app.synth()
