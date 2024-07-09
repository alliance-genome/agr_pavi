"""
Unit testing for the cdk_image_repo_stack,
to ensure breaking changes are caught and handled
before getting applied to the live AWS resources.
"""

from aws_cdk import App
from aws_cdk.aws_config import ResourceType
import aws_cdk.assertions as assertions

from cdk_classes.webui_eb_app import WebUiEbApplicationCdkStack
from cdk_classes.webui_eb_env import WebUiEbEnvironmentCdkStack

from pavi_shared_aws_infra.agr_aws_env import agr_aws_environment

app = App()
eb_app_stack = WebUiEbApplicationCdkStack(
    app, "pytest-webui-EB-Application-stack",
    env=agr_aws_environment)

eb_env_stack = WebUiEbEnvironmentCdkStack(
    app, "pytest-webui-env-stack", env_suffix='pytest',
    eb_app_stack=eb_app_stack,
    env=agr_aws_environment,
    prod_cname=True)

eb_app_template = assertions.Template.from_stack(eb_app_stack)
eb_env_template = assertions.Template.from_stack(eb_env_stack)


# If below application name changes, then ensure this change is intentional.
# Such change may possibility break deploying the same application version to multiple environments
def test_eb_application() -> None:
    eb_app_template.has_resource(type=ResourceType.ELASTIC_BEANSTALK_APPLICATION.compliance_resource_type, props={
        "Properties": {
            "ApplicationName": "PAVI-webui"
        }
    })


# If below environment name changes, then ensure this change is intentional.
# The environment name change could potentially break DNS rules or have unexpected deployment consequences
# (several environment getting mashed together if prefixing did not happen appropriately)
# All EB environments must belong to 'PAVI-webui' EB application.
def test_eb_app_environment() -> None:
    eb_env_template.has_resource(type=ResourceType.ELASTIC_BEANSTALK_ENVIRONMENT.compliance_resource_type, props={
        "Properties": {
            "ApplicationName": "PAVI-webui",
            "EnvironmentName": "PAVI-webui-pytest"
        }
    })


def test_env_cname() -> None:
    eb_env_template.has_resource(type='AWS::Route53::RecordSet', props={
        "Properties": {
            "Name": "pytest-pavi.alliancegenome.org.",
            "ResourceRecords": [{
                "Fn::GetAtt": ["ebenvironment", "EndpointURL"]
            }]
        }
    })


def test_prod_cname() -> None:
    eb_env_template.has_resource(type='AWS::Route53::RecordSet', props={
        "Properties": {
            "Name": "pavi.alliancegenome.org.",
            "ResourceRecords": [{
                "Fn::GetAtt": ["ebenvironment", "EndpointURL"]
            }]
        }
    })
