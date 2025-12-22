#!/usr/bin/env python3
from os import getenv

from aws_cdk import App

from cdk_classes.webui_eb_app import WebUiEbApplicationCdkStack
from cdk_classes.webui_eb_env import WebUiEbEnvironmentCdkStack
from cdk_classes.webui_image_repo import WebUiImageRepoCdkStack
from cdk_classes.webui_amplify import WebUiAmplifyStack

from pavi_shared_aws.agr_aws_env import agr_aws_environment


app = App()

# ECR Image Repository (shared by both deployment methods)
WebUiImageRepoCdkStack(
    app, "PaviWebUiImageRepoCdkStack",
    env=agr_aws_environment)

# Deployment method selection:
# Set PAVI_WEBUI_DEPLOYMENT_METHOD=amplify to use Amplify
# Default is 'eb' (Elastic Beanstalk) for backwards compatibility
deployment_method = getenv('PAVI_WEBUI_DEPLOYMENT_METHOD', 'eb')

if deployment_method == 'amplify':
    # AWS Amplify deployment (recommended for Next.js)
    WebUiAmplifyStack(
        app, "PaviWebUiAmplifyStack",
        env_suffix='main',
        github_owner='alliance-genome',
        github_repo='agr_pavi',
        enable_preview_branches=True,
        custom_domain=getenv('PAVI_CUSTOM_DOMAIN'),  # Optional: pavi.alliancegenome.org
        env=agr_aws_environment)

else:
    # Elastic Beanstalk deployment (legacy)
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
