from aws_cdk import (
    aws_elasticbeanstalk as eb,
    aws_iam as iam,
    Stack,
    Tags as cdk_tags
)

from constructs import Construct

from os import getenv
from typing import Any

from pavi_shared_aws_infra.shared_cdk_classes.application_stack import EBApplicationCdkStack, defineEbEnvironmentCdkConstructs


class WebUiEbEnvironmentCdkStack(Stack):
    eb_ec2_role: iam.Role
    extra_option_setting_properties: list[eb.CfnEnvironment.OptionSettingProperty]

    def __init__(self, scope: Construct, construct_id: str, env_suffix: str, eb_app_stack: EBApplicationCdkStack, **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
            env_suffix: environment suffix, added to created resource names
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
        cdk_tags.of(self.eb_ec2_role).add("Managed_by", "PAVI")  # type: ignore

        # Create EB environment to run the application
        # Environment-defined settings are defined here,
        # Settings that are bundeled into the application version are defined in .ebextensions/
        self.extra_option_setting_properties = [
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:application:environment',
                option_name='AGR_PAVI_RELEASE',
                value=getenv('PAVI_IMAGE_TAG')
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:application:environment',
                option_name='REGISTRY',
                value=getenv('PAVI_IMAGE_REGISTRY')
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:application:environment',
                option_name='PAVI_API_BASE_URL',
                value=getenv('PAVI_API_BASE_URL')
            )
        ]

        defineEbEnvironmentCdkConstructs(
            self, env_suffix=env_suffix,
            eb_app_stack=eb_app_stack, eb_ec2_role=self.eb_ec2_role,
            extra_option_setting_properties=self.extra_option_setting_properties)
