#!/usr/bin/env python3
from aws_cdk import App

from pathlib import Path
from sys import path as sys_path

from cdk_classes.cdk_image_repo_stack import CdkImageRepoStack
from cdk_classes.cdk_application_stack import CdkEBApplicationStack, CdkApplicationStack

repo_root_path = Path(__file__).parent.parent.parent.parent
sys_path.append(str(repo_root_path))

from shared_aws_infra.agr_aws_env import agr_aws_environment  # noqa: E402


app = App()
CdkImageRepoStack(app, "PaviApiImageRepoCdkStack",
                  env=agr_aws_environment)

eb_app_stack = CdkEBApplicationStack(app, "PaviApiEbApplicationCdkStack",
                                     env=agr_aws_environment)

CdkApplicationStack(app, "PaviApiEbMainStack",
                    eb_app_stack=eb_app_stack,
                    env=agr_aws_environment,
                    env_suffix='main')

CdkApplicationStack(app, "PaviApiEbDevStack",
                    eb_app_stack=eb_app_stack,
                    env=agr_aws_environment,
                    env_suffix='dev')

app.synth()
