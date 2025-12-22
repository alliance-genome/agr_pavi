"""
CDK Stack for PAVI Step Functions POC.

This stack creates the Step Functions-based pipeline infrastructure
alongside the existing Batch infrastructure for parallel testing.
"""

from aws_cdk import (
    Duration,
    Stack,
    aws_ecr as ecr,
    aws_cloudwatch as cloudwatch,
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

        CfnOutput(
            self,
            'JobsTableName',
            value=self.step_functions_pipeline.jobs_table.table_name,
            description='DynamoDB jobs table name'
        )

        CfnOutput(
            self,
            'JobsTableArn',
            value=self.step_functions_pipeline.jobs_table.table_arn,
            description='DynamoDB jobs table ARN'
        )

        # Create CloudWatch monitoring
        self._create_cloudwatch_alarms(env_suffix)
        self._create_cloudwatch_dashboard(env_suffix)

    def _create_cloudwatch_alarms(self, env_suffix: str) -> None:
        """Create CloudWatch alarms for pipeline monitoring."""

        state_machine = self.step_functions_pipeline.state_machine

        # Alarm for failed executions
        self.execution_failed_alarm = cloudwatch.Alarm(
            self,
            f'pavi-sfn-executions-failed-{env_suffix}',
            metric=state_machine.metric_failed(
                period=Duration.minutes(5),
                statistic='Sum'
            ),
            threshold=1,
            evaluation_periods=1,
            alarm_description='PAVI Step Functions pipeline has failed executions',
            alarm_name=f'pavi-sfn-executions-failed-{env_suffix}',
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING
        )

        # Alarm for timed out executions
        self.execution_timeout_alarm = cloudwatch.Alarm(
            self,
            f'pavi-sfn-executions-timeout-{env_suffix}',
            metric=state_machine.metric_timed_out(
                period=Duration.minutes(5),
                statistic='Sum'
            ),
            threshold=1,
            evaluation_periods=1,
            alarm_description='PAVI Step Functions pipeline has timed out executions',
            alarm_name=f'pavi-sfn-executions-timeout-{env_suffix}',
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING
        )

        # Alarm for high execution time (over 30 minutes)
        self.execution_time_alarm = cloudwatch.Alarm(
            self,
            f'pavi-sfn-execution-time-{env_suffix}',
            metric=state_machine.metric_time(
                period=Duration.minutes(5),
                statistic='Average'
            ),
            threshold=1800000,  # 30 minutes in milliseconds
            evaluation_periods=1,
            alarm_description='PAVI Step Functions pipeline execution time is high',
            alarm_name=f'pavi-sfn-execution-time-high-{env_suffix}',
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING
        )

        # Alarm for throttled executions
        self.execution_throttled_alarm = cloudwatch.Alarm(
            self,
            f'pavi-sfn-executions-throttled-{env_suffix}',
            metric=state_machine.metric_throttled(
                period=Duration.minutes(5),
                statistic='Sum'
            ),
            threshold=1,
            evaluation_periods=1,
            alarm_description='PAVI Step Functions pipeline is being throttled',
            alarm_name=f'pavi-sfn-executions-throttled-{env_suffix}',
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING
        )

    def _create_cloudwatch_dashboard(self, env_suffix: str) -> None:
        """Create CloudWatch dashboard for pipeline monitoring."""

        state_machine = self.step_functions_pipeline.state_machine

        self.dashboard = cloudwatch.Dashboard(
            self,
            f'pavi-sfn-dashboard-{env_suffix}',
            dashboard_name=f'PAVI-StepFunctions-Pipeline-{env_suffix}',
            default_interval=Duration.hours(3)
        )

        # Row 1: Execution metrics
        self.dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title='Executions Started vs Completed',
                left=[
                    state_machine.metric_started(
                        period=Duration.minutes(5),
                        statistic='Sum',
                        label='Started'
                    ),
                    state_machine.metric_succeeded(
                        period=Duration.minutes(5),
                        statistic='Sum',
                        label='Succeeded'
                    )
                ],
                width=12
            ),
            cloudwatch.GraphWidget(
                title='Execution Failures',
                left=[
                    state_machine.metric_failed(
                        period=Duration.minutes(5),
                        statistic='Sum',
                        label='Failed'
                    ),
                    state_machine.metric_timed_out(
                        period=Duration.minutes(5),
                        statistic='Sum',
                        label='Timed Out'
                    ),
                    state_machine.metric_aborted(
                        period=Duration.minutes(5),
                        statistic='Sum',
                        label='Aborted'
                    )
                ],
                width=12
            )
        )

        # Row 2: Execution time and throttling
        self.dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title='Execution Time (Average)',
                left=[
                    state_machine.metric_time(
                        period=Duration.minutes(5),
                        statistic='Average',
                        label='Avg Time (ms)'
                    ),
                    state_machine.metric_time(
                        period=Duration.minutes(5),
                        statistic='Maximum',
                        label='Max Time (ms)'
                    )
                ],
                width=12
            ),
            cloudwatch.GraphWidget(
                title='Throttling',
                left=[
                    state_machine.metric_throttled(
                        period=Duration.minutes(5),
                        statistic='Sum',
                        label='Throttled'
                    )
                ],
                width=12
            )
        )

        # Row 3: Alarm status
        self.dashboard.add_widgets(
            cloudwatch.AlarmStatusWidget(
                title='Pipeline Alarms',
                alarms=[
                    self.execution_failed_alarm,
                    self.execution_timeout_alarm,
                    self.execution_time_alarm,
                    self.execution_throttled_alarm
                ],
                width=24
            )
        )

        # Row 4: DynamoDB table metrics
        self.dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title='DynamoDB Read/Write Capacity',
                left=[
                    cloudwatch.Metric(
                        namespace='AWS/DynamoDB',
                        metric_name='ConsumedReadCapacityUnits',
                        dimensions_map={
                            'TableName': self.step_functions_pipeline.jobs_table.table_name
                        },
                        period=Duration.minutes(5),
                        statistic='Sum',
                        label='Read Units'
                    ),
                    cloudwatch.Metric(
                        namespace='AWS/DynamoDB',
                        metric_name='ConsumedWriteCapacityUnits',
                        dimensions_map={
                            'TableName': self.step_functions_pipeline.jobs_table.table_name
                        },
                        period=Duration.minutes(5),
                        statistic='Sum',
                        label='Write Units'
                    )
                ],
                width=12
            ),
            cloudwatch.SingleValueWidget(
                title='Current Executions Running',
                metrics=[
                    state_machine.metric(
                        metric_name='ExecutionsRunning',
                        period=Duration.minutes(1),
                        statistic='Average'
                    )
                ],
                width=12
            )
        )
