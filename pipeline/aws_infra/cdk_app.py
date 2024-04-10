#!/usr/bin/env python3
from aws_cdk import App

from cdk_classes.cdk_infra_stack import CdkInfraStack
from agr_aws_env import agr_aws_environment


app = App()
CdkInfraStack(app, "PaviPipelineCdkStack",
              env=agr_aws_environment)

app.synth()
