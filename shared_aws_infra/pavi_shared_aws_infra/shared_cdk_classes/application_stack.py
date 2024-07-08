from aws_cdk import (
    aws_elasticbeanstalk as eb,
    aws_iam as iam,
    CfnOutput,
    Stack,
    Tags as cdk_tags
)

from constructs import Construct

from os import getenv
from typing import Any


class EBApplicationCdkStack(Stack):

    eb_application: eb.CfnApplication

    def __init__(self, scope: Construct, construct_id: str, component_name: str, eb_app_construct_id: str = 'PAVI-eb-app', **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
            component_name: PAVI component name, which will be used to name the repository.
            eb_app_construct_id: Optional construct-id to assign to the EB application in this stack. Only use this to migrate pre-existing EB application CDK definitions into this class.
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
                max_count=20))

        # Create EB application
        self.eb_application = eb.CfnApplication(
            self, id=eb_app_construct_id, application_name=f'PAVI-{component_name}',
            resource_lifecycle_config=eb.CfnApplication.ApplicationResourceLifecycleConfigProperty(
                service_role=eb_service_role.role_arn,
                version_lifecycle_config=version_removal_policy
            ))

        cdk_tags.of(self.eb_application).add("Product", "PAVI")  # type: ignore
        cdk_tags.of(self.eb_application).add("Managed_by", "PAVI")  # type: ignore


class EbEnvironmentCdkConstructs:
    """
    Container holding result of defineEbEnvironmentCdkConstructs()
    """
    eb_env: eb.CfnEnvironment

    def __init__(self, eb_env: eb.CfnEnvironment):
        self.eb_env = eb_env


def defineEbEnvironmentCdkConstructs(
        stack: Stack,
        eb_app_stack: EBApplicationCdkStack,
        eb_ec2_role: iam.Role | iam.IRole,
        env_suffix: str,
        extra_option_setting_properties: list[eb.CfnEnvironment.OptionSettingProperty] = []) -> EbEnvironmentCdkConstructs:
    """
    Args:
        stack: CDK stack to which the defined constructs will belong
        eb_app_stack: CdkEBApplicationStack defining the EB application to deploy to
        eb_ec2_role: role to assign to EC2 instances launched in EB environment
        env_suffix: environment suffix, added to created resource names
        extra_option_setting_properties: optional list of additional OptionSettingProperties to be added to the environment definition
    """

    eb_service_role = iam.Role.from_role_name(
        stack, id='eb-service-role',
        role_name='aws-elasticbeanstalk-service-role')

    # Define instance profile (using provided role) and assign to stack
    eb_instance_profile: iam.InstanceProfile = iam.InstanceProfile(
        stack, 'eb-instance-profile',
        role=eb_ec2_role)  # type: ignore
    cdk_tags.of(eb_instance_profile).add("Product", "PAVI")  # type: ignore
    cdk_tags.of(eb_instance_profile).add("Managed_by", "PAVI")  # type: ignore

    eb_app_name = str(eb_app_stack.eb_application.application_name)
    app_version_label = getenv('PAVI_DEPLOY_VERSION_LABEL')

    # Create EB environment to run the application
    # Environment-defined settings are defined here,
    # Settings that are bundeled into the application version should defined
    # in .ebextensions/ under the aws_infra folder of the component implementing this class.
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
            value=eb_instance_profile.instance_profile_name
        ),
        eb.CfnEnvironment.OptionSettingProperty(
            namespace='aws:autoscaling:launchconfiguration',
            option_name='EC2KeyName',
            value='AGR-ssl2'
        ),
        eb.CfnEnvironment.OptionSettingProperty(
            namespace='aws:elasticbeanstalk:application:environment',
            option_name='NET',
            value=env_suffix
        )
    ]

    optionSettingProperties.extend(extra_option_setting_properties)

    # Define EB environment and assign to stack
    eb_env: eb.CfnEnvironment = eb.CfnEnvironment(
        stack, 'eb-environment',
        environment_name=f'{eb_app_name}-{env_suffix}',
        application_name=eb_app_name,
        solution_stack_name='64bit Amazon Linux 2023 v4.3.4 running Docker',
        version_label=app_version_label,
        option_settings=optionSettingProperties)
    cdk_tags.of(eb_env).add("Product", "PAVI")  # type: ignore
    cdk_tags.of(eb_env).add("Managed_by", "PAVI")  # type: ignore

    CfnOutput(
        stack, 'cfn-output-endpoint-url',
        key='endpointUrl',
        value=eb_env.attr_endpoint_url,
        export_name=f'{stack.stack_name}:endpointUrl'
    )

    return EbEnvironmentCdkConstructs(eb_env=eb_env)
