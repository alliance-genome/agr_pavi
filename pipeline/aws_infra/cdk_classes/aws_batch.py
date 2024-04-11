from aws_cdk import (
    Duration,
    aws_batch,
    aws_ec2 as ec2,
    RemovalPolicy,
    Stack,
    aws_s3 as s3
)

from typing import Optional


class PaviExecutionEnvironment:

    compute_environment: aws_batch.FargateComputeEnvironment
    job_queue: aws_batch.JobQueue
    nf_workdir_bucket: s3.Bucket | s3.IBucket

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

        # Create the compute environment
        ce_name = 'pavi_pipeline'
        if env_suffix:
            ce_name += f'_{env_suffix}'
        self.compute_environment = aws_batch.FargateComputeEnvironment(
            scope=scope, id='pavi-pipeline-compute-environment',
            compute_environment_name=ce_name,
            vpc=vpc, vpc_subnets=subnets,
            spot=True,
            terminate_on_update=False, update_timeout=Duration.minutes(10),
            update_to_latest_image_version=True)

        self.compute_environment.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create the job queue
        jq_name = 'pavi_pipeline'
        if env_suffix:
            jq_name += f'_{env_suffix}'
        self.job_queue = aws_batch.JobQueue(
            scope=scope, id='pavi-pipeline-job-queue',
            job_queue_name=jq_name
        )

        self.job_queue.add_compute_environment(self.compute_environment, order=1)  # type: ignore

        if not shared_work_dir_bucket:
            # Create an S3 bucket to contain the nextflow work dir
            bucket_name = 'agr-pavi-pipeline-nextflow'
            if env_suffix:
                bucket_name += f'-{env_suffix}'
            self.nf_workdir_bucket = s3.Bucket(
                scope=scope, id='pavi-pipeline-nf-workdir-bucket',
                bucket_name=bucket_name,
                access_control=s3.BucketAccessControl.PRIVATE,
                block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
                auto_delete_objects=False,
                public_read_access=False,
                removal_policy=RemovalPolicy.RETAIN,
                versioned=False
            )
        else:
            self.nf_workdir_bucket = s3.Bucket.from_bucket_name(
                scope=scope, id='pavi-pipeline-nf-workdir-bucket',
                bucket_name=shared_work_dir_bucket)
