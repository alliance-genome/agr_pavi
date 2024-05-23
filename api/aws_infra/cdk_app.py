#!/usr/bin/env python3
from aws_cdk import App

from pathlib import Path
from sys import path as sys_path

from cdk_classes.image_repo_stack import CdkImageRepoStack
from cdk_classes.application_stack import EBApplicationCdkStack, EbEnvironmentCdkStack

repo_root_path = Path(__file__).parent.parent.parent.parent
sys_path.append(str(repo_root_path))

from shared_aws_infra.agr_aws_env import agr_aws_environment  # noqa: E402


app = App()
CdkImageRepoStack(
    app, "PaviApiImageRepoCdkStack",
    env=agr_aws_environment)

eb_app_stack = EBApplicationCdkStack(
    app, "PaviApiEbApplicationCdkStack",
    env=agr_aws_environment)

EbEnvironmentCdkStack(
    app, "PaviApiEbMainStack",
    eb_app_stack=eb_app_stack,
    env_suffix='main',
    env=agr_aws_environment)

EbEnvironmentCdkStack(
    app, "PaviApiEbDevStack",
    eb_app_stack=eb_app_stack,
    env_suffix='dev',
    env=agr_aws_environment)

app.synth()
