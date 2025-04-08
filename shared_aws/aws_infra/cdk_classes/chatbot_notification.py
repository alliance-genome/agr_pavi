from aws_cdk import (
    aws_chatbot as chatbot,
    aws_iam as iam,
    aws_sns as sns,
    Stack,
    Tags as cdk_tags
)

from constructs import Construct

from typing import Any


class SharedInfraStack(Stack):

    def __init__(self, scope: Construct, construct_id: str,
                 **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
        """
        super().__init__(scope, construct_id, **kwargs)

        # SNS topic to send PAVI messages to and from
        health_notifications_topic: sns.Topic = sns.Topic(
            self, id='pavi-health-notifications-topic',
            topic_name='pavi-health-notifications',
            display_name='PAVI health notifications',
            fifo=False)

        cdk_tags.of(health_notifications_topic).add("Product", "PAVI")
        cdk_tags.of(health_notifications_topic).add("CreatedBy", "PAVI")
        cdk_tags.of(health_notifications_topic).add("DeploymentEnvironment", "shared")
        cdk_tags.of(health_notifications_topic).add("AppComponent", "monitoring")

        # AWS Chatbot Slack communication config
        slack_channel_config = chatbot.SlackChannelConfiguration(
            self, id="PaviSlackNotificationChannelConfig",
            slack_channel_configuration_name="PAVI-health-notifications",
            slack_workspace_id="T0YRHQHD5",
            slack_channel_id="C07NN38AFGB",
            role=iam.Role.from_role_name(self, 'chatbot-role', role_name='AWSChatbot-role'),
            notification_topics=[health_notifications_topic]  # type: ignore
        )

        cdk_tags.of(slack_channel_config).add("Product", "PAVI")
        cdk_tags.of(slack_channel_config).add("CreatedBy", "PAVI")
        cdk_tags.of(slack_channel_config).add("DeploymentEnvironment", "shared")
        cdk_tags.of(slack_channel_config).add("AppComponent", "monitoring")
