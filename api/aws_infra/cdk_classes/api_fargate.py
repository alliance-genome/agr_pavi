"""
CDK Stack for PAVI API deployment using ECS Fargate.

ECS Fargate provides serverless container deployment with:
- No EC2 instance management
- Pay-per-use pricing
- Better integration with Step Functions
- Auto-scaling based on demand
- VPC integration for security
"""

from aws_cdk import (
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_iam as iam,
    aws_logs as logs,
    aws_ecr as ecr,
    aws_elasticloadbalancingv2 as elbv2,
    aws_route53 as route53,
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    Tags as cdk_tags
)

from constructs import Construct

from os import getenv
from typing import Any, Optional


class ApiFargateStack(Stack):
    """
    CDK Stack for deploying PAVI API using ECS Fargate.

    This provides an alternative to Elastic Beanstalk with better
    serverless characteristics and Step Functions integration.
    """

    cluster: ecs.Cluster
    service: ecs_patterns.ApplicationLoadBalancedFargateService
    task_role: iam.Role

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_suffix: str = "main",
        vpc_id: Optional[str] = None,
        cpu: int = 512,
        memory_limit_mib: int = 1024,
        desired_count: int = 2,
        min_capacity: int = 1,
        max_capacity: int = 10,
        custom_domain: Optional[str] = None,
        **kwargs: Any
    ) -> None:
        """
        Initialize the Fargate stack for API.

        Args:
            scope: CDK scope
            construct_id: Stack identifier
            env_suffix: Environment suffix (main, dev, etc.)
            vpc_id: VPC ID to deploy into (uses default if None)
            cpu: CPU units for the task (256, 512, 1024, 2048, 4096)
            memory_limit_mib: Memory in MiB (512, 1024, 2048, ...)
            desired_count: Initial number of tasks
            min_capacity: Minimum tasks for auto-scaling
            max_capacity: Maximum tasks for auto-scaling
            custom_domain: Optional custom domain
        """
        super().__init__(scope, construct_id, **kwargs)

        # Tag resources
        cdk_tags.of(self).add("Product", "PAVI")
        cdk_tags.of(self).add("CreatedBy", "PAVI")
        cdk_tags.of(self).add("AppComponent", "API")
        cdk_tags.of(self).add("Environment", env_suffix)

        # Get or create VPC
        if vpc_id:
            vpc = ec2.Vpc.from_lookup(self, 'vpc', vpc_id=vpc_id)
        else:
            vpc = ec2.Vpc.from_lookup(self, 'vpc', is_default=True)

        # Create ECS Cluster
        self.cluster = ecs.Cluster(
            self,
            f'pavi-api-cluster-{env_suffix}',
            cluster_name=f'pavi-api-{env_suffix}',
            vpc=vpc,
            container_insights_v2=ecs.ContainerInsightsV2.ENABLED
        )

        # Create task execution role
        execution_role = iam.Role(
            self,
            'task-execution-role',
            assumed_by=iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    'service-role/AmazonECSTaskExecutionRolePolicy'
                )
            ]
        )

        # Create task role with permissions for Step Functions, DynamoDB, S3
        self.task_role = iam.Role(
            self,
            'task-role',
            assumed_by=iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managed_policies=[
                iam.ManagedPolicy.from_managed_policy_name(
                    self, 'ecr-read-policy', 'ReadOnlyAccessECR'
                )
            ]
        )

        # Add Step Functions permissions
        self.task_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    'states:StartExecution',
                    'states:DescribeExecution',
                    'states:GetExecutionHistory'
                ],
                resources=['*']  # Will be scoped to specific state machine
            )
        )

        # Add DynamoDB permissions
        self.task_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    'dynamodb:GetItem',
                    'dynamodb:PutItem',
                    'dynamodb:UpdateItem',
                    'dynamodb:Query'
                ],
                resources=['*']  # Will be scoped to specific table
            )
        )

        # Add S3 permissions for results
        self.task_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    's3:GetObject',
                    's3:PutObject',
                    's3:ListBucket'
                ],
                resources=[
                    'arn:aws:s3:::agr-pavi-pipeline-*',
                    'arn:aws:s3:::agr-pavi-pipeline-*/*'
                ]
            )
        )

        cdk_tags.of(self.task_role).add("Product", "PAVI")
        cdk_tags.of(self.task_role).add("CreatedBy", "PAVI")
        cdk_tags.of(self.task_role).add("AppComponent", "API")

        # Get ECR repository
        ecr_repo_name = f'agr_pavi/pavi_api'
        ecr_repo = ecr.Repository.from_repository_name(
            self, 'api-ecr-repo', ecr_repo_name
        )

        # CloudWatch log group
        log_group = logs.LogGroup(
            self,
            f'pavi-api-logs-{env_suffix}',
            log_group_name=f'/ecs/pavi-api-{env_suffix}',
            retention=logs.RetentionDays.TWO_WEEKS,
            removal_policy=RemovalPolicy.DESTROY
        )

        # Environment variables
        image_tag = getenv('PAVI_IMAGE_TAG', 'latest')
        registry = getenv('PAVI_IMAGE_REGISTRY', '')

        environment = {
            'AGR_PAVI_RELEASE': image_tag,
            'API_PIPELINE_IMAGE_TAG': image_tag,
            'REGISTRY': registry,
            'USE_STEP_FUNCTIONS': 'true',
            'API_EXECUTION_ENV': 'aws',
            # These will be set via CDK outputs from Step Functions stack
            'DYNAMODB_JOBS_TABLE': f'pavi-jobs-{env_suffix}',
            'PAVI_RESULTS_BUCKET': f'agr-pavi-pipeline-{env_suffix}'
        }

        # Create Fargate Service with ALB
        self.service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self,
            f'pavi-api-service-{env_suffix}',
            cluster=self.cluster,
            cpu=cpu,
            memory_limit_mib=memory_limit_mib,
            desired_count=desired_count,
            task_image_options=ecs_patterns.ApplicationLoadBalancedTaskImageOptions(
                image=ecs.ContainerImage.from_ecr_repository(
                    ecr_repo,
                    tag=image_tag
                ),
                container_port=8080,
                execution_role=execution_role,
                task_role=self.task_role,
                environment=environment,
                log_driver=ecs.LogDrivers.aws_logs(
                    stream_prefix='pavi-api',
                    log_group=log_group
                )
            ),
            public_load_balancer=True,
            listener_port=80,
            # Health check configuration
            health_check_grace_period=Duration.seconds(60)
        )

        # Configure health check
        self.service.target_group.configure_health_check(
            path='/api/health',
            healthy_http_codes='200',
            interval=Duration.seconds(30),
            timeout=Duration.seconds(10),
            healthy_threshold_count=2,
            unhealthy_threshold_count=3
        )

        # Configure auto-scaling
        scaling = self.service.service.auto_scale_task_count(
            min_capacity=min_capacity,
            max_capacity=max_capacity
        )

        # Scale based on CPU utilization
        scaling.scale_on_cpu_utilization(
            'cpu-scaling',
            target_utilization_percent=70,
            scale_in_cooldown=Duration.seconds(60),
            scale_out_cooldown=Duration.seconds(60)
        )

        # Scale based on request count
        scaling.scale_on_request_count(
            'request-scaling',
            requests_per_target=1000,
            target_group=self.service.target_group,
            scale_in_cooldown=Duration.seconds(60),
            scale_out_cooldown=Duration.seconds(60)
        )

        # Custom domain configuration
        if custom_domain:
            # Look up hosted zone
            hosted_zone = route53.HostedZone.from_lookup(
                self, 'hosted-zone',
                domain_name='alliancegenome.org',
                private_zone=True
            )

            # Create CNAME record
            route53.CnameRecord(
                self, f'pavi-api-cname-{env_suffix}',
                zone=hosted_zone,
                record_name=f'{env_suffix}-pavi-api',
                domain_name=self.service.load_balancer.load_balancer_dns_name,
                comment=f'PAVI API CDK-managed CNAME ({env_suffix})'
            )

        # Outputs
        CfnOutput(
            self,
            'endpointUrl',
            value=self.service.load_balancer.load_balancer_dns_name,
            description='API Load Balancer DNS',
            export_name=f'{construct_id}:endpointUrl'
        )

        CfnOutput(
            self,
            'ClusterArn',
            value=self.cluster.cluster_arn,
            description='ECS Cluster ARN'
        )

        CfnOutput(
            self,
            'ServiceArn',
            value=self.service.service.service_arn,
            description='ECS Service ARN'
        )

        CfnOutput(
            self,
            'TaskRoleArn',
            value=self.task_role.role_arn,
            description='Task Role ARN (for Step Functions permissions)'
        )
