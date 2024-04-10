from aws_cdk import (
    Duration,
    aws_batch,
    aws_ec2 as ec2,
    RemovalPolicy,
    Stack,
    aws_s3 as s3
)

class PaviExecutionEnvironment:

    compute_environment: aws_batch.FargateComputeEnvironment
    job_queue: aws_batch.JobQueue
    nf_workdir_bucket: s3.Bucket

    def __init__(self, scope: Stack) -> None:

        vpc = ec2.Vpc.from_lookup(scope, "AgrVpc", vpc_id = "vpc-55522232")
        subnets = ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS)

        # Create the compute environment
        self.compute_environment = aws_batch.FargateComputeEnvironment(
            scope=scope, id='pavi-pipeline-compute-environment',
            compute_environment_name='pavi_pipeline',
            vpc=vpc, vpc_subnets=subnets,
            spot=True,
            terminate_on_update=False, update_timeout=Duration.minutes(10),
            update_to_latest_image_version=True)

        self.compute_environment.apply_removal_policy(RemovalPolicy.DESTROY)

        # Create the job queue
        self.job_queue = aws_batch.JobQueue(
            scope=scope, id='pavi-pipeline-job-queue',
            job_queue_name='pavi_pipeline'
        )

        self.job_queue.add_compute_environment(self.compute_environment, order=1) # type: ignore

        # Create an S3 bucket to contain the nextflow work dir
        self.nf_workdir_bucket = s3.Bucket(
            scope=scope, id='pavi-pipeline-nf-workdir-bucket',
            bucket_name='agr-pavi-pipeline-nextflow',
            access_control=s3.BucketAccessControl.PRIVATE,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            auto_delete_objects=False,
            public_read_access=False,
            removal_policy=RemovalPolicy.RETAIN,
            versioned=False
        )
