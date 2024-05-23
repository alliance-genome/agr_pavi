from aws_cdk import (
    aws_elasticbeanstalk as eb,
    aws_iam as iam,
    Stack,
    Tags as cdk_tags
)

from constructs import Construct

from os import getenv
from typing import Any


class CdkEBApplicationStack(Stack):

    eb_application: eb.CfnApplication

    def __init__(self, scope: Construct, construct_id: str, **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
        """
        super().__init__(scope, construct_id, **kwargs)

        eb_service_role = iam.Role.from_role_name(
            self, id='eb-service-role',
            role_name='aws-elasticbeanstalk-service-role')

        # Define application version removal policy, to prevent failing deployments caused by
        # accumulating application versions over the account-level limit (1000 on 2023/05/16)
        version_removal_policy = eb.CfnApplication.ApplicationVersionLifecycleConfigProperty(
            max_count_rule=eb.CfnApplication.MaxCountRuleProperty(
                delete_source_from_s3=True,
                enabled=True,
                # max_count = number of application versions to retain, BEFORE new env creation.
                # Total will be max_count+1 after update completed.
                max_count=2))

        # Create EB application
        self.eb_application = eb.CfnApplication(
            self, id='PAVI-api-eb-app', application_name='PAVI-api',
            resource_lifecycle_config=eb.CfnApplication.ApplicationResourceLifecycleConfigProperty(
                service_role=eb_service_role.role_arn,
                version_lifecycle_config=version_removal_policy
            ))

        cdk_tags.of(self.eb_application).add("Product", "PAVI")  # type: ignore
        cdk_tags.of(self.eb_application).add("Managed_by", "PAVI")  # type: ignore


class CdkEbEnvironmentStack(Stack):

    eb_instance_profile: iam.InstanceProfile
    eb_env: eb.CfnEnvironment

    def __init__(self, scope: Construct, construct_id: str,
                 eb_app_stack: CdkEBApplicationStack,
                 env_suffix: str,
                 **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
            eb_app_stack: CdkEBApplicationStack defining the EB application to deploy to
            env_suffix: environment suffix, added to created resource names
        """
        super().__init__(scope, construct_id, **kwargs)

        eb_service_role = iam.Role.from_role_name(
            self, id='eb-service-role',
            role_name='aws-elasticbeanstalk-service-role')

        # Define role and instance profile
        eb_ec2_role = iam.Role(
            self, 'eb-ec2-role',
            #    role_name=f'{eb_application_name}-aws-elasticbeanstalk-ec2-role',
            assumed_by=iam.ServicePrincipal('ec2.amazonaws.com'),  # type: ignore
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name('AWSElasticBeanstalkWebTier'),
                iam.ManagedPolicy.from_aws_managed_policy_name('CloudWatchAgentServerPolicy'),
                iam.ManagedPolicy.from_managed_policy_name(self, "iam-ecr-read-policy", "ReadOnlyAccessECR")])
        cdk_tags.of(eb_ec2_role).add("Product", "PAVI")  # type: ignore
        cdk_tags.of(eb_ec2_role).add("Managed_by", "PAVI")  # type: ignore

        self.eb_instance_profile = iam.InstanceProfile(
            self, 'eb-instance-profile',
            #    instance_profile_name=f'{eb_application_name}-InstanceProfile',
            role=eb_ec2_role)  # type: ignore
        cdk_tags.of(self.eb_instance_profile).add("Product", "PAVI")  # type: ignore
        cdk_tags.of(self.eb_instance_profile).add("Managed_by", "PAVI")  # type: ignore

        eb_app_name = str(eb_app_stack.eb_application.application_name)
        app_version_label = getenv('PAVI_DEPLOY_VERSION_LABEL')

        # Create EB environment to run the application
        # Environment-defined settings are defined here,
        # Settings that are bundeled into the application version are defined in .ebextensions/
        optionSettingProperties: list[eb.CfnEnvironment.OptionSettingProperty] = [
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:environment',
                option_name='LoadBalancerType',
                value='application'
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:environment',
                option_name='ServiceRole',
                value=eb_service_role.role_arn
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:autoscaling:launchconfiguration',
                option_name='IamInstanceProfile',
                value=self.eb_instance_profile.instance_profile_name
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:autoscaling:launchconfiguration',
                option_name='EC2KeyName',
                value='AGR-ssl2'
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:application:environment',
                option_name='AGR_PAVI_RELEASE',
                value=getenv('PAVI_IMAGE_TAG')
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:application:environment',
                option_name='API_PIPELINE_IMAGE_TAG',
                value=getenv('PAVI_IMAGE_TAG')
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:application:environment',
                option_name='REGISTRY',
                value=getenv('PAVI_IMAGE_REGISTRY')
            ),
            eb.CfnEnvironment.OptionSettingProperty(
                namespace='aws:elasticbeanstalk:application:environment',
                option_name='NET',
                value=env_suffix
            )
        ]

        self.eb_env = eb.CfnEnvironment(self, 'eb-environment',
                                        environment_name=f'{eb_app_name}-{env_suffix}',
                                        application_name=eb_app_name,
                                        solution_stack_name='64bit Amazon Linux 2023 v4.3.1 running Docker',
                                        version_label=app_version_label,
                                        option_settings=optionSettingProperties)
        cdk_tags.of(self.eb_env).add("Product", "PAVI")  # type: ignore
        cdk_tags.of(self.eb_env).add("Managed_by", "PAVI")  # type: ignore
