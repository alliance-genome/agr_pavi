#!/usr/bin/env python3
from aws_cdk import App

from pathlib import Path
from sys import path as sys_path

from cdk_classes.cdk_infra_stack import CdkInfraStack

repo_root_path = Path(__file__).parent.parent.parent.parent
sys_path.append(str(repo_root_path))

from shared_aws_infra.agr_aws_env import agr_aws_environment  # noqa: E402


app = App()
CdkInfraStack(app, "PaviApiCdkStack",
              env=agr_aws_environment)

CdkInfraStack(app, "PaviApiCdkStack-dev", env_suffix="dev",
              shared_api_image_repo='agr_pavi/api',
              env=agr_aws_environment)

app.synth()