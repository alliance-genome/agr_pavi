#!/usr/bin/env python3
from aws_cdk import App

from cdk_classes.webui_eb_app import WebUiEbApplicationCdkStack
from cdk_classes.webui_eb_env import WebUiEbEnvironmentCdkStack
from cdk_classes.webui_image_repo import WebUiImageRepoCdkStack

from pavi_shared_aws.agr_aws_env import agr_aws_environment


app = App()

WebUiImageRepoCdkStack(
    app, "PaviWebUiImageRepoCdkStack",
    env=agr_aws_environment)

eb_app_stack = WebUiEbApplicationCdkStack(
    app, "PaviWebUiEbApplicationCdkStack",
    env=agr_aws_environment)

WebUiEbEnvironmentCdkStack(
    app, "PaviWebUiEbMainStack",
    eb_app_stack=eb_app_stack,
    env_suffix='main', prod_cname=True,
    env=agr_aws_environment)

WebUiEbEnvironmentCdkStack(
    app, "PaviWebUiEbDevStack",
    eb_app_stack=eb_app_stack,
    env_suffix='dev',
    env=agr_aws_environment)

app.synth()
