from aws_cdk import (
    aws_elasticbeanstalk as eb,
    aws_iam as iam,
    aws_route53 as route53,
    Fn as CfnFn,
    Stack,
    Tags as cdk_tags
)

from constructs import Construct

from os import getenv
from typing import Any

from pavi_shared_aws.shared_cdk_classes.application_stack import EBApplicationCdkStack, defineEbEnvironmentCdkConstructs


class WebUiEbEnvironmentCdkStack(Stack):
    eb_ec2_role: iam.Role
    extra_option_setting_properties: list[eb.CfnEnvironment.OptionSettingProperty]

    def __init__(self, scope: Construct, construct_id: str,
                 env_suffix: str, eb_app_stack: EBApplicationCdkStack,
                 prod_cname: bool = False,
                 **kwargs: Any) -> None:
        """
        Args:
            scope: CDK scope
            construct_id: ID used to uniquely identify construct withing the given scope
            env_suffix: environment suffix, added to created resource names
            eb_app_stack: CDK stack of the EB application this environment belongs to
            prod_cname: Flag to set for production environment, to assign pavi.alliancegenome.org CNAME.
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
        pavi_api_endpoint_domain = CfnFn.import_value(f'{getenv('PAVI_API_STACK_NAME')}:endpointUrl')
        pavi_api_base_url = f'http://{pavi_api_endpoint_domain}'
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
                value=pavi_api_base_url
            )
        ]

        env_constructs = defineEbEnvironmentCdkConstructs(
            self, env_suffix=env_suffix,
            eb_app_stack=eb_app_stack, eb_ec2_role=self.eb_ec2_role,
            extra_option_setting_properties=self.extra_option_setting_properties)

        # Add domain name configurations
        private_hosted_zone = route53.HostedZone.from_lookup(
            self, 'privated-hosted-zone',
            domain_name='alliancegenome.org', private_zone=True)

        ## Env-specific CNAME
        route53.CnameRecord(
            self, 'pavi-environment-cname',
            zone=private_hosted_zone, record_name=f'{env_suffix}-pavi',
            domain_name=env_constructs.eb_env.attr_endpoint_url,
            comment='PAVI CDK-managed env-specific CNAME')

        ## Live-production CNAME
        if prod_cname:
            route53.CnameRecord(
                self, 'pavi-production-cname',
                zone=private_hosted_zone, record_name='pavi',
                domain_name=env_constructs.eb_env.attr_endpoint_url,
                comment='PAVI CDK-managed production CNAME')
