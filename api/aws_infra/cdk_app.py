#!/usr/bin/env python3
from aws_cdk import App

from cdk_classes.api_eb_app import ApiEbApplicationCdkStack
from cdk_classes.api_eb_env import ApiEbEnvironmentCdkStack
from cdk_classes.api_image_repo import ApiImageRepoCdkStack

from pavi_shared_aws.agr_aws_env import agr_aws_environment


app = App()

ApiImageRepoCdkStack(
    app, "PaviApiImageRepoCdkStack",
    env=agr_aws_environment)

eb_app_stack = ApiEbApplicationCdkStack(
    app, "PaviApiEbApplicationCdkStack",
    env=agr_aws_environment)

ApiEbEnvironmentCdkStack(
    app, "PaviApiEbMainStack",
    eb_app_stack=eb_app_stack,
    env_suffix='main',
    env=agr_aws_environment)

ApiEbEnvironmentCdkStack(
    app, "PaviApiEbDevStack",
    eb_app_stack=eb_app_stack,
    env_suffix='dev',
    env=agr_aws_environment)

app.synth()
