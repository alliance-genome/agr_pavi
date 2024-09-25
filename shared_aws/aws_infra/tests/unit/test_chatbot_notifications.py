"""
Unit testing for the chatbot_notifications module,
to ensure breaking changes are caught and handled
before getting applied to the live AWS resources.
"""

from aws_cdk import App
from aws_cdk.aws_config import ResourceType
import aws_cdk.assertions as assertions

from cdk_classes.chatbot_notification import SharedInfraStack

from pavi_shared_aws.agr_aws_env import agr_aws_environment

app = App()
stack = SharedInfraStack(
    app, "pytest-stack",
    env=agr_aws_environment
)
template = assertions.Template.from_stack(stack)


def test_health_notifications_sns() -> None:
    # Below SNS topic's ARN is referred to in other components (in shared AWS CDK classes).
    # If the name of this SNS topic changes, then the those references need to be updated.
    sns_topic = template.find_resources(type=ResourceType.SNS_TOPIC.compliance_resource_type, props={
        "Properties": {
            "TopicName": "pavi-health-notifications"
        }
    })

    assert len(sns_topic.keys()) == 1

    # Chatbot must be subscribed to the above SNS to enable notification delivery
    # to the appropriate slack channel.
    template.has_resource(type="AWS::Chatbot::SlackChannelConfiguration", props={
        "Properties": {
            "SnsTopicArns": [{
                "Ref": list(sns_topic.keys()).pop()
            }]
        }
    })
