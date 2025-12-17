"""
CDK Stack for PAVI Step Functions POC.

This stack creates the Step Functions-based pipeline infrastructure
alongside the existing Batch infrastructure for parallel testing.
"""

from aws_cdk import (
    Stack,
    aws_ecr as ecr,
    Tags as cdk_tags
)
from constructs import Construct
from typing import Any, Optional

from cdk_classes.aws_batch import PaviExecutionEnvironment
from cdk_classes.step_functions_pipeline import PaviStepFunctionsPipeline


class StepFunctionsPocStack(Stack):
    """
    CDK Stack for PAVI Step Functions POC.

    This stack creates:
    1. Reuses existing Batch execution environment
    2. Creates Step Functions state machine
    3. Creates new job definitions for Step Functions integration
    4. Creates S3 bucket for Step Functions work/results
    """

    execution_environment: PaviExecutionEnvironment
    step_functions_pipeline: PaviStepFunctionsPipeline

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_suffix: str = "poc",
        seq_retrieval_image_uri: Optional[str] = None,
        alignment_image_uri: Optional[str] = None,
        shared_logs_group: Optional[str] = None,
        shared_work_dir_bucket: Optional[str] = None,
        **kwargs: Any
    ) -> None:
        """
        Initialize the Step Functions POC stack.

        Args:
            scope: CDK scope
            construct_id: Unique identifier for this stack
            env_suffix: Environment suffix (default: "poc")
            seq_retrieval_image_uri: Full ECR image URI for seq_retrieval
            alignment_image_uri: Full ECR image URI for alignment
            shared_logs_group: Optional shared CloudWatch log group
            shared_work_dir_bucket: Optional shared S3 bucket for Nextflow
        """
        super().__init__(scope, construct_id, **kwargs)

        # Tag the entire stack
        cdk_tags.of(self).add("Product", "PAVI")
        cdk_tags.of(self).add("CreatedBy", "PAVI")
        cdk_tags.of(self).add("AppComponent", "pipeline")
        cdk_tags.of(self).add("Environment", env_suffix)

        # Create or reuse the execution environment (Batch compute + queue)
        self.execution_environment = PaviExecutionEnvironment(
            scope=self,
            env_suffix=env_suffix,
            shared_logs_group=shared_logs_group,
            shared_work_dir_bucket=shared_work_dir_bucket
        )

        # Default image URIs if not provided
        # These should point to your ECR repositories
        # Account ID will be resolved from CDK environment at deployment time
        if not seq_retrieval_image_uri:
            seq_retrieval_image_uri = (
                f"{self.account}.dkr.ecr.{self.region}.amazonaws.com/"
                "agr_pavi/pipeline_seq_retrieval:main"
            )

        if not alignment_image_uri:
            alignment_image_uri = (
                f"{self.account}.dkr.ecr.{self.region}.amazonaws.com/"
                "agr_pavi/pipeline_alignment:main"
            )

        # Create the Step Functions pipeline
        self.step_functions_pipeline = PaviStepFunctionsPipeline(
            scope=self,
            construct_id='pavi-sfn-pipeline',
            job_queue=self.execution_environment.job_queue,
            seq_retrieval_image=seq_retrieval_image_uri,
            alignment_image=alignment_image_uri,
            env_suffix=env_suffix
        )

        # Output important resource identifiers
        from aws_cdk import CfnOutput

        CfnOutput(
            self,
            'StateMachineArn',
            value=self.step_functions_pipeline.state_machine.state_machine_arn,
            description='Step Functions state machine ARN'
        )

        CfnOutput(
            self,
            'WorkBucketName',
            value=self.step_functions_pipeline.work_bucket.bucket_name,
            description='S3 bucket for Step Functions work and results'
        )

        CfnOutput(
            self,
            'JobQueueArn',
            value=self.execution_environment.job_queue.job_queue_arn,
            description='Batch job queue ARN'
        )

        CfnOutput(
            self,
            'SeqRetrievalJobDefArn',
            value=self.step_functions_pipeline.seq_retrieval_job_def.job_definition_arn,
            description='Sequence retrieval job definition ARN'
        )

        CfnOutput(
            self,
            'AlignmentJobDefArn',
            value=self.step_functions_pipeline.alignment_job_def.job_definition_arn,
            description='Alignment job definition ARN'
        )
