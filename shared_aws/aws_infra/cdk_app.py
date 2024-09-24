#!/usr/bin/env python3
from aws_cdk import App

from cdk_classes.chatbot_notification import SharedInfraStack

from pavi_shared_aws.agr_aws_env import agr_aws_environment


app = App()

SharedInfraStack(
    app, "PaviSharedResourcesMainStack",
    env=agr_aws_environment)

app.synth()
