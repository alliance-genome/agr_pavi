#!/usr/bin/env python3
from os import getenv

from aws_cdk import App

from cdk_classes.api_eb_app import ApiEbApplicationCdkStack
from cdk_classes.api_eb_env import ApiEbEnvironmentCdkStack
from cdk_classes.api_image_repo import ApiImageRepoCdkStack
from cdk_classes.api_fargate import ApiFargateStack

from pavi_shared_aws.agr_aws_env import agr_aws_environment


app = App()

# ECR Image Repository (shared by both deployment methods)
ApiImageRepoCdkStack(
    app, "PaviApiImageRepoCdkStack",
    env=agr_aws_environment)

# Deployment method selection:
# Set PAVI_API_DEPLOYMENT_METHOD=fargate to use ECS Fargate
# Default is 'eb' (Elastic Beanstalk) for backwards compatibility
deployment_method = getenv('PAVI_API_DEPLOYMENT_METHOD', 'eb')

if deployment_method == 'fargate':
    # ECS Fargate deployment (recommended for Step Functions integration)
    ApiFargateStack(
        app, "PaviApiFargateMainStack",
        env_suffix='main',
        desired_count=2,
        min_capacity=1,
        max_capacity=10,
        env=agr_aws_environment)

    ApiFargateStack(
        app, "PaviApiFargateDevStack",
        env_suffix='dev',
        desired_count=1,
        min_capacity=1,
        max_capacity=4,
        env=agr_aws_environment)

else:
    # Elastic Beanstalk deployment (legacy)
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
