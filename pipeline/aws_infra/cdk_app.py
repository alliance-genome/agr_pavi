#!/usr/bin/env python3
from aws_cdk import (
    App, Environment
)

from cdk_classes.cdk_infra_stack import CdkInfraStack


app = App()
CdkInfraStack(app, "PaviPipelineCdkStack",
	env=Environment(account='100225593120', region='us-east-1'))

app.synth()
