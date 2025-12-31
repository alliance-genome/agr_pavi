"""
CDK construct for PAVI Step Functions pipeline.

This module defines the Step Functions state machine that replaces
the Nextflow workflow for PAVI protein MSA pipeline.
"""

from aws_cdk import (
    Duration,
    Size,
    Stack,
    RemovalPolicy,
    aws_stepfunctions as sfn,
    aws_stepfunctions_tasks as sfn_tasks,
    aws_batch as batch,
    aws_ecs as ecs,
    aws_s3 as s3,
    aws_iam as iam,
    aws_logs as cwl,
    aws_dynamodb as dynamodb,
    Tags as cdk_tags
)
from constructs import Construct
from typing import Any


class PaviStepFunctionsPipeline:
    """
    Defines the PAVI Step Functions pipeline for protein MSA.

    This construct creates:
    1. S3 bucket for work directory and results
    2. Batch job definitions for pipeline components
    3. Step Functions state machine
    4. IAM roles and policies
    """

    state_machine: sfn.StateMachine
    work_bucket: s3.Bucket
    jobs_table: dynamodb.Table
    seq_retrieval_job_def: batch.EcsJobDefinition
    alignment_job_def: batch.EcsJobDefinition
    log_group: cwl.LogGroup

    def __init__(
        self,
        scope: Stack,
        construct_id: str,
        job_queue: batch.IJobQueue,
        seq_retrieval_image: str,
        alignment_image: str,
        env_suffix: str = ""
    ) -> None:
        """
        Initialize the Step Functions pipeline construct.

        Args:
            scope: CDK Stack to which the construct belongs
            construct_id: Unique identifier for this construct
            job_queue: AWS Batch job queue to submit jobs to
            seq_retrieval_image: ECR image URI for sequence retrieval
            alignment_image: ECR image URI for alignment
            env_suffix: Environment suffix for resource naming
        """
        self.scope = scope
        self.construct_id = construct_id
        self.env_suffix = env_suffix

        # Create S3 bucket for Step Functions work and results
        self._create_work_bucket()

        # Create DynamoDB table for job tracking
        self._create_jobs_table()

        # Create Batch job definitions
        self._create_job_definitions(
            job_queue=job_queue,
            seq_retrieval_image=seq_retrieval_image,
            alignment_image=alignment_image
        )

        # Create Step Functions state machine
        self._create_state_machine()

    def _create_work_bucket(self) -> None:
        """Create S3 bucket for Step Functions work directory and results."""
        bucket_name = 'agr-pavi-pipeline-stepfunctions'
        if self.env_suffix:
            bucket_name += f'-{self.env_suffix}'

        self.work_bucket = s3.Bucket(
            scope=self.scope,
            id=f'{self.construct_id}-work-bucket',
            bucket_name=bucket_name,
            access_control=s3.BucketAccessControl.PRIVATE,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            public_read_access=False,
            removal_policy=RemovalPolicy.RETAIN,
            versioned=False,
            lifecycle_rules=[
                # Clean up work directory after 30 days
                s3.LifecycleRule(
                    id='cleanup-work-dir',
                    prefix='executions/*/work/',
                    expiration=Duration.days(30),
                    enabled=True
                )
                # Results are retained indefinitely by default (no lifecycle rule needed)
            ]
        )

        cdk_tags.of(self.work_bucket).add("Product", "PAVI")
        cdk_tags.of(self.work_bucket).add("CreatedBy", "PAVI")
        cdk_tags.of(self.work_bucket).add("AppComponent", "pipeline")

    def _create_jobs_table(self) -> None:
        """Create DynamoDB table for job tracking."""
        table_name = 'pavi-jobs'
        if self.env_suffix:
            table_name += f'-{self.env_suffix}'

        self.jobs_table = dynamodb.Table(
            scope=self.scope,
            id=f'{self.construct_id}-jobs-table',
            table_name=table_name,
            partition_key=dynamodb.Attribute(
                name='job_id',
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
            point_in_time_recovery=True,
            time_to_live_attribute='ttl'
        )

        # Global Secondary Index for status queries
        self.jobs_table.add_global_secondary_index(
            index_name='status-created_at-index',
            partition_key=dynamodb.Attribute(
                name='status',
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name='created_at',
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        cdk_tags.of(self.jobs_table).add("Product", "PAVI")
        cdk_tags.of(self.jobs_table).add("CreatedBy", "PAVI")
        cdk_tags.of(self.jobs_table).add("AppComponent", "pipeline")

    def _create_job_definitions(
        self,
        job_queue: batch.IJobQueue,
        seq_retrieval_image: str,
        alignment_image: str
    ) -> None:
        """
        Create Batch job definitions for pipeline components.

        Args:
            job_queue: Batch job queue for job submissions
            seq_retrieval_image: ECR image URI for sequence retrieval
            alignment_image: ECR image URI for alignment
        """
        # IAM role for Batch job execution
        job_role = iam.Role(
            self.scope,
            f'{self.construct_id}-job-execution-role',
            description='Execution role for PAVI Step Functions Batch jobs',
            assumed_by=iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AmazonECSTaskExecutionRolePolicy"
                )
            ]
        )

        # Grant S3 bucket access to job role
        self.work_bucket.grant_read_write(job_role)

        cdk_tags.of(job_role).add("Product", "PAVI")
        cdk_tags.of(job_role).add("CreatedBy", "PAVI")
        cdk_tags.of(job_role).add("AppComponent", "pipeline")

        # Sequence retrieval job definition
        self.seq_retrieval_job_def = batch.EcsJobDefinition(
            self.scope,
            f'{self.construct_id}-seq-retrieval-job-def',
            job_definition_name=f'pavi-seq-retrieval-sfn{"-" + self.env_suffix if self.env_suffix else ""}',
            container=batch.EcsEc2ContainerDefinition(
                self.scope,
                f'{self.construct_id}-seq-retrieval-container',
                image=ecs.ContainerImage.from_registry(seq_retrieval_image),
                memory=Size.mebibytes(500),
                cpu=1,
                job_role=job_role,
                # Command will be overridden by Step Functions
                command=['echo', 'placeholder']
            )
        )

        cdk_tags.of(self.seq_retrieval_job_def).add("Product", "PAVI")
        cdk_tags.of(self.seq_retrieval_job_def).add("CreatedBy", "PAVI")
        cdk_tags.of(self.seq_retrieval_job_def).add("AppComponent", "pipeline")

        # Alignment job definition
        self.alignment_job_def = batch.EcsJobDefinition(
            self.scope,
            f'{self.construct_id}-alignment-job-def',
            job_definition_name=f'pavi-alignment-sfn{"-" + self.env_suffix if self.env_suffix else ""}',
            container=batch.EcsEc2ContainerDefinition(
                self.scope,
                f'{self.construct_id}-alignment-container',
                image=ecs.ContainerImage.from_registry(alignment_image),
                memory=Size.mebibytes(2048),
                cpu=2,
                job_role=job_role,
                command=['echo', 'placeholder']
            )
        )

        cdk_tags.of(self.alignment_job_def).add("Product", "PAVI")
        cdk_tags.of(self.alignment_job_def).add("CreatedBy", "PAVI")
        cdk_tags.of(self.alignment_job_def).add("AppComponent", "pipeline")

    def _create_state_machine(self) -> None:
        """Create the Step Functions state machine for the pipeline."""

        # Define the state machine
        # We'll build it step by step for clarity

        # 1. Validate and prepare input
        validate_input = sfn.Pass(
            self.scope,
            f'{self.construct_id}-validate-input',
            comment='Validate and prepare input parameters',
            parameters={
                "execution_id.$": "$$.Execution.Name",
                "input_regions.$": "$.seq_regions",
                "s3_work_prefix.$": sfn.JsonPath.format(
                    f's3://{self.work_bucket.bucket_name}/executions/{{}}/work/',
                    sfn.JsonPath.string_at('$$.Execution.Name')
                ),
                "s3_results_prefix.$": sfn.JsonPath.format(
                    f's3://{self.work_bucket.bucket_name}/executions/{{}}/results/',
                    sfn.JsonPath.string_at('$$.Execution.Name')
                )
            },
            result_path=sfn.JsonPath.DISCARD
        )

        # 2. Parallel sequence retrieval (Map state)
        # Note: We'll use a simplified version for POC
        # The actual Batch job task would go here
        seq_retrieval_task = sfn_tasks.BatchSubmitJob(
            self.scope,
            f'{self.construct_id}-seq-retrieval-task',
            job_definition_arn=self.seq_retrieval_job_def.job_definition_arn,
            job_name=sfn.JsonPath.format(
                'seq-retrieval-{}',
                sfn.JsonPath.string_at('$.unique_entry_id')
            ),
            job_queue_arn=sfn.JsonPath.string_at('$.job_queue_arn'),
            container_overrides=sfn_tasks.BatchContainerOverrides(
                memory=Size.mebibytes(500),
                vcpus=1,
                # Use environment variables for dynamic values
                environment={
                    'UNIQUE_ENTRY_ID': sfn.JsonPath.string_at('$.unique_entry_id'),
                    'BASE_SEQ_NAME': sfn.JsonPath.string_at('$.base_seq_name'),
                    'SEQ_ID': sfn.JsonPath.string_at('$.seq_id'),
                    'SEQ_STRAND': sfn.JsonPath.string_at('$.seq_strand'),
                    'FASTA_FILE_URL': sfn.JsonPath.string_at('$.fasta_file_url'),
                    'S3_OUTPUT_PREFIX': sfn.JsonPath.string_at('$.s3_work_prefix'),
                    'OUTPUT_TYPE': 'protein'
                }
            ),
            result_path='$.batch_result'
        )

        # Add retry logic for transient failures
        seq_retrieval_task.add_retry(
            errors=['Batch.JobFailed', 'States.TaskFailed'],
            interval=Duration.seconds(2),
            max_attempts=2,
            backoff_rate=2.0
        )

        # Map state for parallel retrieval
        parallel_retrieval = sfn.Map(
            self.scope,
            f'{self.construct_id}-parallel-retrieval',
            comment='Retrieve sequences in parallel for each input region',
            items_path=sfn.JsonPath.string_at('$.input_regions'),
            max_concurrency=40,
            result_path='$.retrieval_results'
        )
        parallel_retrieval.iterator(seq_retrieval_task)

        # Note: Map state catch will be added after failure_state is defined

        # 3. Prepare alignment input
        prepare_alignment = sfn.Pass(
            self.scope,
            f'{self.construct_id}-prepare-alignment',
            comment='Prepare consolidated input for alignment job',
            parameters={
                "execution_id.$": "$.execution_id",
                "s3_work_prefix.$": "$.s3_work_prefix",
                "s3_results_prefix.$": "$.s3_results_prefix",
                "job_queue_arn.$": "$.job_queue_arn"
            }
        )

        # 4. Alignment job
        alignment_task = sfn_tasks.BatchSubmitJob(
            self.scope,
            f'{self.construct_id}-alignment-task',
            job_definition_arn=self.alignment_job_def.job_definition_arn,
            job_name=sfn.JsonPath.format(
                'alignment-{}',
                sfn.JsonPath.string_at('$.execution_id')
            ),
            job_queue_arn=sfn.JsonPath.string_at('$.job_queue_arn'),
            container_overrides=sfn_tasks.BatchContainerOverrides(
                memory=Size.mebibytes(2048),
                vcpus=2,
                environment={
                    'S3_WORK_PREFIX': sfn.JsonPath.string_at('$.s3_work_prefix'),
                    'S3_RESULTS_PREFIX': sfn.JsonPath.string_at('$.s3_results_prefix')
                }
            ),
            result_path='$.alignment_result'
        )

        # Add retry logic for alignment task
        alignment_task.add_retry(
            errors=['Batch.JobFailed', 'States.TaskFailed'],
            interval=Duration.seconds(5),
            max_attempts=2,
            backoff_rate=2.0
        )

        # 5. Collect and align seq info
        collect_task = sfn_tasks.BatchSubmitJob(
            self.scope,
            f'{self.construct_id}-collect-task',
            job_definition_arn=self.seq_retrieval_job_def.job_definition_arn,
            job_name=sfn.JsonPath.format(
                'collect-seqinfo-{}',
                sfn.JsonPath.string_at('$.execution_id')
            ),
            job_queue_arn=sfn.JsonPath.string_at('$.job_queue_arn'),
            container_overrides=sfn_tasks.BatchContainerOverrides(
                memory=Size.mebibytes(500),
                vcpus=1,
                environment={
                    'S3_WORK_PREFIX': sfn.JsonPath.string_at('$.s3_work_prefix'),
                    'S3_RESULTS_PREFIX': sfn.JsonPath.string_at('$.s3_results_prefix'),
                    'TASK_TYPE': 'collect_seq_info'
                }
            ),
            result_path='$.collect_result'
        )

        # Add retry logic for collect task
        collect_task.add_retry(
            errors=['Batch.JobFailed', 'States.TaskFailed'],
            interval=Duration.seconds(2),
            max_attempts=2,
            backoff_rate=2.0
        )

        # 6. Failure state for unrecoverable errors
        failure_state = sfn.Fail(
            self.scope,
            f'{self.construct_id}-failure',
            cause='Pipeline execution failed after retries',
            error='PipelineError'
        )

        # 7. Success state
        success_state = sfn.Succeed(
            self.scope,
            f'{self.construct_id}-success',
            comment='Pipeline completed successfully'
        )

        # Add catch for unrecoverable errors on parallel retrieval
        parallel_retrieval.add_catch(
            failure_state,
            errors=['States.ALL'],
            result_path='$.error'
        )

        # Add catch for unrecoverable errors on alignment task
        alignment_task.add_catch(
            failure_state,
            errors=['States.ALL'],
            result_path='$.error'
        )

        # Add catch for unrecoverable errors on collect task
        collect_task.add_catch(
            failure_state,
            errors=['States.ALL'],
            result_path='$.error'
        )

        # Chain the states together
        definition = (
            validate_input
            .next(parallel_retrieval)
            .next(prepare_alignment)
            .next(alignment_task)
            .next(collect_task)
            .next(success_state)
        )

        # Create CloudWatch log group for state machine
        self.log_group = cwl.LogGroup(
            self.scope,
            f'{self.construct_id}-log-group',
            log_group_name=f'/aws/vendedlogs/states/pavi-pipeline-sfn{"-" + self.env_suffix if self.env_suffix else ""}',
            retention=cwl.RetentionDays.ONE_MONTH,
            removal_policy=RemovalPolicy.DESTROY
        )

        cdk_tags.of(self.log_group).add("Product", "PAVI")
        cdk_tags.of(self.log_group).add("CreatedBy", "PAVI")
        cdk_tags.of(self.log_group).add("AppComponent", "pipeline")

        # Create the state machine
        state_machine_name = f'pavi-pipeline-sfn{"-" + self.env_suffix if self.env_suffix else ""}'

        self.state_machine = sfn.StateMachine(
            self.scope,
            f'{self.construct_id}-state-machine',
            state_machine_name=state_machine_name,
            definition=definition,
            state_machine_type=sfn.StateMachineType.STANDARD,  # STANDARD required for .sync Batch integration
            timeout=Duration.minutes(30),
            logs=sfn.LogOptions(
                destination=self.log_group,
                level=sfn.LogLevel.ALL,
                include_execution_data=True
            )
        )

        cdk_tags.of(self.state_machine).add("Product", "PAVI")
        cdk_tags.of(self.state_machine).add("CreatedBy", "PAVI")
        cdk_tags.of(self.state_machine).add("AppComponent", "pipeline")

        # Grant state machine permission to submit Batch jobs
        self.state_machine.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    'batch:SubmitJob',
                    'batch:DescribeJobs',
                    'batch:TerminateJob'
                ],
                resources=['*']
            )
        )

        # Grant state machine permission to access S3 bucket
        self.work_bucket.grant_read_write(self.state_machine.role)

        # Grant permission to pass job role to Batch
        self.state_machine.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=['iam:PassRole'],
                resources=[
                    self.seq_retrieval_job_def.job_definition_arn,
                    self.alignment_job_def.job_definition_arn
                ]
            )
        )

        # Grant state machine permission to access DynamoDB jobs table
        self.jobs_table.grant_read_write_data(self.state_machine.role)
