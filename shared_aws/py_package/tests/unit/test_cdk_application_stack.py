"""
Unit testing for the cdk_image_repo_stack,
to ensure breaking changes are caught and handled
before getting applied to the live AWS resources.
"""

from aws_cdk import (
    App,
    aws_iam as iam,
    aws_elasticbeanstalk as eb,
    Stack,
    Tags as cdk_tags
)
from aws_cdk.aws_config import ResourceType
import aws_cdk.assertions as assertions

from constructs import Construct

from typing import Any

from pavi_shared_aws.shared_cdk_classes.application_stack import EBApplicationCdkStack, defineEbEnvironmentCdkConstructs

from pavi_shared_aws.agr_aws_env import agr_aws_environment


class PyTestEbEnvironment(Stack):
    eb_ec2_role: iam.Role
    extra_option_setting_properties: list[eb.CfnEnvironment.OptionSettingProperty]

    def __init__(self, scope: Construct, construct_id: str, env_suffix: str, eb_app_stack: EBApplicationCdkStack, **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
            eb_app_stack: CdkEBApplicationStack defining the EB application to deploy to
            env_suffix: PAVI component name, which will be used to name the repository.
        """
        super().__init__(scope, construct_id, **kwargs)

        # Define role and instance profile
        self.eb_ec2_role = iam.Role(
            self, 'eb-ec2-role',
            assumed_by=iam.ServicePrincipal('ec2.amazonaws.com'),  # type: ignore
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name('AWSElasticBeanstalkWebTier'),
                iam.ManagedPolicy.from_aws_managed_policy_name('CloudWatchAgentServerPolicy'),
                iam.ManagedPolicy.from_managed_policy_name(self, "iam-ecr-read-policy", "ReadOnlyAccessECR")])

        cdk_tags.of(self.eb_ec2_role).add("Product", "PAVI")  # type: ignore
        cdk_tags.of(self.eb_ec2_role).add("CreatedBy", "PAVI")  # type: ignore

        # Create EB environment to run the application
        # Environment-defined settings are defined here,
        # Settings that are bundeled into the application version are defined in .ebextensions/
        self.extra_option_setting_properties: list[eb.CfnEnvironment.OptionSettingProperty] = [
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:application:environment',
                option_name='AGR_PAVI_RELEASE',
                value='pyTest'
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:application:environment',
                option_name='API_PIPELINE_IMAGE_TAG',
                value='PyTest'
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:application:environment',
                option_name='REGISTRY',
                value='pytest/registry'
            )
        ]

        defineEbEnvironmentCdkConstructs(
            self, env_suffix=env_suffix,
            eb_app_stack=eb_app_stack, eb_ec2_role=self.eb_ec2_role,
            extra_option_setting_properties=self.extra_option_setting_properties)


app = App()
eb_app_stack = EBApplicationCdkStack(
    app, "pytest-test-EB-Application-stack", component_name='testcomponent', env=agr_aws_environment
)

eb_env_stack = PyTestEbEnvironment(
    app, "pytest-testcomponent-env-stack",
    'pytest', eb_app_stack,
    env=agr_aws_environment)

eb_app_template = assertions.Template.from_stack(eb_app_stack)
eb_env_template = assertions.Template.from_stack(eb_env_stack)


# If below application name changes, then ensure this change is intentional.
# Such change may possibility break deploying the same application version to multiple environments
def test_eb_application() -> None:
    eb_app_template.has_resource(type=ResourceType.ELASTIC_BEANSTALK_APPLICATION.compliance_resource_type, props={
        "Properties": {
            "ApplicationName": "PAVI-testcomponent"
        }
    })


# If below environment name changes, then ensure this change is intentional.
# The environment name change could potentially break DNS rules or have unexpected deployment consequences
# (several environment getting mashed together if prefixing did not happen appropriately)
# All EB environments must belong to 'PAVI-testcomponent' EB application.
def test_eb_app_environment() -> None:
    eb_env_template.has_resource(type=ResourceType.ELASTIC_BEANSTALK_ENVIRONMENT.compliance_resource_type, props={
        "Properties": {
            "ApplicationName": "PAVI-testcomponent",
            "EnvironmentName": "PAVI-testcomponent-pytest"
        }
    })


# CfnOutput of API environment is accessed by webUI environment. If below unit test breaks, this change could
# potentially break the passthrough of the API env URL to connect to the webUI.
def test_eb_app_environment_output() -> None:
    eb_env_template.has_output(
        logical_id='endpointUrl',
        props={
            "Export": {
                "Name": "pytest-testcomponent-env-stack:endpointUrl"
            },
            "Value": {
                "Fn::GetAtt": ["ebenvironment", "EndpointURL"]
            }
        }
    )
