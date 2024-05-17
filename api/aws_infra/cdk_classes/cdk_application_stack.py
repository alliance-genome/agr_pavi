from aws_cdk import (
    aws_elasticbeanstalk as eb,
    aws_iam as iam,
    Stack,
    aws_s3_assets as s3_assets,
    RemovalPolicy
)

from constructs import Construct

from typing import Any

from os import getenv, listdir, path
from zipfile import ZipFile


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
        # eb_application_name = self.eb_application.ref


class CdkApplicationStack(Stack):

    eb_instance_profile: iam.InstanceProfile
    s3_asset: s3_assets.Asset
    eb_app_version: eb.CfnApplicationVersion
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

        self.eb_instance_profile = iam.InstanceProfile(
            self, 'eb-instance-profile',
            #    instance_profile_name=f'{eb_application_name}-InstanceProfile',
            role=eb_ec2_role)  # type: ignore

        # Create app zip
        dir_path = path.dirname(path.realpath(__file__))
        app_zip_path = 'eb_app.zip'
        with ZipFile(app_zip_path, 'w') as zipObj:
            # Add docker-compose file
            docker_compose_file = f'{dir_path}/../../docker-compose.yml'
            zipObj.write(docker_compose_file, path.basename(path.normpath(docker_compose_file)))

            # Add all files in .ebextensions/
            ebextensions_path = f'{dir_path}/../.ebextensions/'
            for filename in listdir(ebextensions_path):
                full_file_path = path.join(ebextensions_path, filename)
                if path.isfile(full_file_path):
                    zipObj.write(full_file_path, path.join('.ebextensions/', filename))

        # Upload app zip as s3 asset
        self.s3_asset = s3_assets.Asset(self, 'AppZip', path=app_zip_path)

        eb_app_name = eb_app_stack.eb_application.ref

        # Create EB application version using S3 asset
        self.eb_app_version = eb.CfnApplicationVersion(
            self, 'eb-app-version',
            application_name=eb_app_name,
            source_bundle={
                's3Bucket': self.s3_asset.s3_bucket_name,
                's3Key': self.s3_asset.s3_object_key
            }
        )
        self.eb_app_version.add_dependency(eb_app_stack.eb_application)
        self.eb_app_version.apply_removal_policy(RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE)

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
                                        version_label=self.eb_app_version.ref,
                                        option_settings=optionSettingProperties)
