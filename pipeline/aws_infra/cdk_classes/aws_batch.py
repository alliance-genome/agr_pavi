from aws_cdk import (
    Duration,
    aws_batch,
    aws_ec2 as ec2,
    aws_iam as iam,
    RemovalPolicy,
    Stack,
    aws_s3 as s3,
    Tags as cdk_tags
)

from typing import Optional


class PaviExecutionEnvironment:

    compute_environment: aws_batch.ManagedEc2EcsComputeEnvironment
    job_queue: aws_batch.JobQueue
    nf_output_bucket: s3.Bucket | s3.IBucket
    nf_aws_execution_policy: iam.ManagedPolicy

    def __init__(self, scope: Stack, env_suffix: str, shared_work_dir_bucket: Optional[str]) -> None:
        """
        Defines the PAVI execution environment.

        Args:
            scope: CDK Stack to which the construct belongs
            env_suffix: environment suffix, added to created resource names
            shared_work_dir_bucket: when defined, use S3 bucket with defined the value as bucketName as Nextflow workdir bucket
        """

        vpc = ec2.Vpc.from_lookup(scope, "AgrVpc", vpc_id="vpc-55522232")
        subnets = ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS)

        if not shared_work_dir_bucket:
            # Create an S3 bucket to contain the nextflow work dir
            bucket_name = 'agr-pavi-pipeline-nextflow'
            if env_suffix:
                bucket_name += f'-{env_suffix}'
            self.nf_output_bucket = s3.Bucket(
                scope=scope, id='pavi-pipeline-nf-workdir-bucket',
                bucket_name=bucket_name,
                access_control=s3.BucketAccessControl.PRIVATE,
                block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
                auto_delete_objects=False,
                public_read_access=False,
                removal_policy=RemovalPolicy.RETAIN,
                versioned=False
            )
            cdk_tags.of(self.nf_output_bucket).add("Product", "PAVI")  # type: ignore
            cdk_tags.of(self.nf_output_bucket).add("Managed_by", "PAVI")  # type: ignore
        else:
            self.nf_output_bucket = s3.Bucket.from_bucket_name(
                scope=scope, id='pavi-pipeline-nf-workdir-bucket',
                bucket_name=shared_work_dir_bucket)

        # Create the IAM policy to grant access to the nextflow output bucket
        s3_bucket_access_statements=[
            iam.PolicyStatement(
                sid="S3BucketWriteAll",
                effect=iam.Effect.ALLOW,
                actions=['s3:Put*'],
                resources=[self.nf_output_bucket.bucket_arn + '/*']
            ),
            iam.PolicyStatement(
                sid="S3BucketReadAll",
                effect=iam.Effect.ALLOW,
                actions=['s3:ListBucket*', 's3:Get*'],
                resources=[self.nf_output_bucket.bucket_arn, self.nf_output_bucket.bucket_arn + '/*']
            )
        ]
        s3_workdir_bucket_policy_doc = iam.PolicyDocument(statements=s3_bucket_access_statements)

        # Create the compute environment
        instance_role = iam.Role(scope, 'pavi-pipeline-compute-environment-instance-role',
                                 description='Role granting permissions for Nextflow ECS execution',
                                 assumed_by=iam.ServicePrincipal('ec2.amazonaws.com'),  # type: ignore
                                 managed_policies=[
                                     iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AmazonEC2ContainerServiceforEC2Role"),
                                     iam.ManagedPolicy.from_managed_policy_name(scope, "iam-ecr-read-policy", "ReadOnlyAccessECR")
                                 ],
                                 inline_policies={
                                     'nf-s3-bucket-access-policy': s3_workdir_bucket_policy_doc
                                 })
        cdk_tags.of(instance_role).add("Product", "PAVI")  # type: ignore
        cdk_tags.of(instance_role).add("Managed_by", "PAVI")  # type: ignore

        ce_name = 'pavi_pipeline_ecs'
        if env_suffix:
            ce_name += f'_{env_suffix}'
        self.compute_environment = aws_batch.ManagedEc2EcsComputeEnvironment(
            scope=scope, id='pavi-pipeline-compute-environment-ecs',
            compute_environment_name=ce_name,
            vpc=vpc, vpc_subnets=subnets,
            instance_role=instance_role,  # type: ignore
            spot=False,
            terminate_on_update=False, update_timeout=Duration.minutes(10),
            update_to_latest_image_version=True)

        self.compute_environment.apply_removal_policy(RemovalPolicy.DESTROY)

        cdk_tags.of(self.compute_environment).add("Product", "PAVI")  # type: ignore
        cdk_tags.of(self.compute_environment).add("Managed_by", "PAVI")  # type: ignore

        self.compute_environment.tags.set_tag('Name', 'PAVI pipeline execution worker', priority=None, apply_to_launched_instances=True)

        # Create the job queue
        jq_name = 'pavi_pipeline'
        if env_suffix:
            jq_name += f'_{env_suffix}'
        self.job_queue = aws_batch.JobQueue(
            scope=scope, id='pavi-pipeline-job-queue',
            job_queue_name=jq_name
        )

        self.job_queue.add_compute_environment(self.compute_environment, order=1)  # type: ignore

        cdk_tags.of(self.job_queue).add("Product", "PAVI")  # type: ignore
        cdk_tags.of(self.job_queue).add("Managed_by", "PAVI")  # type: ignore

        # Create the IAM policy to grant access to execute the nextflow pipeline using above AWS execution environment
        nf_aws_execution_statements = s3_bucket_access_statements.copy()
        nf_aws_execution_statements.append(
            iam.PolicyStatement(
                sid="AllowBatchJobMgmt",
                effect=iam.Effect.ALLOW,
                actions=['batch:CancelJob', 'batch:SubmitJob', 'batch:TerminateJob',
                         'batch:ListJobs', 'batch:DescribeJobs',
                         'batch:RegisterJobDefinition', 'batch:DescribeJobDefinitions'],
                resources=['*']
            )
        )
        nf_aws_execution_statements.append(
            iam.PolicyStatement(
                sid="AllowQueueAndComputeEnvDescribe",
                effect=iam.Effect.ALLOW,
                actions=['batch:DescribeJobQueues', 'batch:DescribeComputeEnvironments'],
                resources=['*']
            )
        )

        nf_aws_execution_policy = iam.ManagedPolicy(scope, 'pavi-nextflow-aws-execution-policy',
                                                    managed_policy_name='agr-pavi-pipeline-nf-aws-execution-policy',
                                                    description='Grant required access to PAVI execution environment to run nextflow pipelines using it.',
                                                    statements=nf_aws_execution_statements)
        cdk_tags.of(nf_aws_execution_policy).add("Product", "PAVI")  # type: ignore
        cdk_tags.of(nf_aws_execution_policy).add("Managed_by", "PAVI")  # type: ignore

        self.nf_aws_execution_policy = nf_aws_execution_policy
