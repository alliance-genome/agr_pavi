#!/usr/bin/env python3
from aws_cdk import App

from pathlib import Path
from sys import path as sys_path

from cdk_classes.cdk_infra_stack import CdkInfraStack

repo_root_path = Path(__file__).parent.parent.parent.parent
sys_path.append(str(repo_root_path))

from shared_aws_infra.agr_aws_env import agr_aws_environment  # noqa: E402


app = App()
CdkInfraStack(app, "PaviPipelineCdkStack",
              env=agr_aws_environment)

CdkInfraStack(app, "PaviPipelineCdkStack-dev", env_suffix="dev",
              shared_seq_retrieval_image_repo='agr_pavi/pipeline_seq_retrieval',
              shared_alignment_image_repo='agr_pavi/pipeline_alignment',
              shared_work_dir_bucket='agr-pavi-pipeline-nextflow',
              env=agr_aws_environment)

app.synth()
