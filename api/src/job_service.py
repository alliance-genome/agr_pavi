"""
Job service module for PAVI API.

This module provides job management functionality using AWS Step Functions
and DynamoDB, replacing the previous in-memory Nextflow-based execution.
"""

import json
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum

import boto3
from botocore.exceptions import ClientError

from log_mgmt.log_manager import get_logger

log = get_logger(__name__)


class JobServiceError(Exception):
    """Base exception for job service errors."""
    pass


class JobNotFoundError(JobServiceError):
    """Exception raised when a job is not found."""
    pass


class JobExecutionError(JobServiceError):
    """Exception raised when job execution fails."""

    def __init__(self, message: str, cause: Optional[str] = None):
        super().__init__(message)
        self.cause = cause


class JobResultNotReadyError(JobServiceError):
    """Exception raised when job results are not yet available."""

    def __init__(self, job_id: str, status: str):
        super().__init__(f"Results not ready for job {job_id}, status: {status}")
        self.job_id = job_id
        self.status = status


class JobStatus(str, Enum):
    """Job status enum matching DynamoDB values."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class JobStage(str, Enum):
    """Job stage enum for detailed progress tracking."""
    INITIALIZING = "INITIALIZING"
    SEQUENCE_RETRIEVAL = "SEQUENCE_RETRIEVAL"
    ALIGNMENT = "ALIGNMENT"
    COLLECTING_RESULTS = "COLLECTING_RESULTS"
    DONE = "DONE"
    ERROR = "ERROR"


class JobInfo:
    """Job information container."""

    def __init__(
        self,
        job_id: str,
        status: JobStatus,
        stage: Optional[JobStage] = None,
        created_at: Optional[str] = None,
        completed_at: Optional[str] = None,
        input_count: int = 0,
        sequences_processed: int = 0,
        result_s3_uri: Optional[str] = None,
        error_message: Optional[str] = None,
        execution_arn: Optional[str] = None
    ):
        self.job_id = job_id
        self.status = status
        self.stage = stage
        self.created_at = created_at
        self.completed_at = completed_at
        self.input_count = input_count
        self.sequences_processed = sequences_processed
        self.result_s3_uri = result_s3_uri
        self.error_message = error_message
        self.execution_arn = execution_arn

    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        return {
            "uuid": self.job_id,
            "status": self.status.value.lower(),
            "stage": self.stage.value if self.stage else None,
            "name": f"pavi-job-{self.job_id}",
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "input_count": self.input_count,
            "sequences_processed": self.sequences_processed,
            "result_s3_uri": self.result_s3_uri,
            "error_message": self.error_message
        }


class JobService:
    """
    Service for managing pipeline jobs using AWS Step Functions and DynamoDB.

    This service replaces the in-memory job management with DynamoDB persistence
    and Step Functions orchestration.
    """

    def __init__(
        self,
        dynamodb_table_name: Optional[str] = None,
        state_machine_arn: Optional[str] = None,
        s3_bucket: Optional[str] = None,
        use_step_functions: bool = True
    ):
        """
        Initialize the job service.

        Args:
            dynamodb_table_name: DynamoDB table name for job tracking
            state_machine_arn: Step Functions state machine ARN
            s3_bucket: S3 bucket for results
            use_step_functions: Whether to use Step Functions (False for local dev)
        """
        self.use_step_functions = use_step_functions

        # Get configuration from environment
        self.table_name = dynamodb_table_name or os.environ.get(
            'DYNAMODB_JOBS_TABLE', 'pavi-jobs'
        )
        self.state_machine_arn = state_machine_arn or os.environ.get(
            'STEP_FUNCTIONS_STATE_MACHINE_ARN'
        )
        self.s3_bucket = s3_bucket or os.environ.get(
            'PAVI_RESULTS_BUCKET', 'agr-pavi-pipeline-prod'
        )
        self.job_queue_arn = os.environ.get(
            'BATCH_JOB_QUEUE_ARN',
            'arn:aws:batch:us-east-1:123456789012:job-queue/pavi-pipeline-queue'
        )

        # AWS clients - lazily initialized
        self._dynamodb = None
        self._sfn = None
        self._s3 = None

        # Local mode fallback (in-memory storage)
        self._local_jobs: dict[str, JobInfo] = {}

    @property
    def dynamodb(self):
        """Lazy initialization of DynamoDB client."""
        if self._dynamodb is None:
            self._dynamodb = boto3.resource('dynamodb')
        return self._dynamodb

    @property
    def sfn(self):
        """Lazy initialization of Step Functions client."""
        if self._sfn is None:
            endpoint_url = os.environ.get('STEP_FUNCTIONS_ENDPOINT')
            if endpoint_url:
                self._sfn = boto3.client('stepfunctions', endpoint_url=endpoint_url)
            else:
                self._sfn = boto3.client('stepfunctions')
        return self._sfn

    @property
    def s3(self):
        """Lazy initialization of S3 client."""
        if self._s3 is None:
            self._s3 = boto3.client('s3')
        return self._s3

    def create_job(self, seq_regions: list[dict]) -> JobInfo:
        """
        Create a new pipeline job.

        Args:
            seq_regions: List of sequence region definitions

        Returns:
            JobInfo object with job details
        """
        job_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + 'Z'

        job = JobInfo(
            job_id=job_id,
            status=JobStatus.PENDING,
            stage=JobStage.INITIALIZING,
            created_at=now,
            input_count=len(seq_regions)
        )

        if self.use_step_functions:
            self._store_job_dynamodb(job)
        else:
            self._local_jobs[job_id] = job

        log.info(f"Created job {job_id} with {len(seq_regions)} sequences")
        return job

    def start_job(self, job_id: str, seq_regions: list[dict]) -> JobInfo:
        """
        Start a pipeline job execution.

        Args:
            job_id: Job ID
            seq_regions: List of sequence region definitions

        Returns:
            Updated JobInfo object
        """
        if self.use_step_functions:
            return self._start_step_functions_execution(job_id, seq_regions)
        else:
            return self._start_local_execution(job_id, seq_regions)

    def get_job(self, job_id: str) -> Optional[JobInfo]:
        """
        Get job information by ID.

        Args:
            job_id: Job ID

        Returns:
            JobInfo object or None if not found
        """
        if self.use_step_functions:
            return self._get_job_dynamodb(job_id)
        else:
            return self._local_jobs.get(job_id)

    def get_job_result_alignment(self, job_id: str) -> Optional[bytes]:
        """
        Get alignment result for a job.

        Args:
            job_id: Job ID

        Returns:
            Alignment file content as bytes, or None if not found
        """
        job = self.get_job(job_id)
        if not job or job.status != JobStatus.COMPLETED:
            return None

        if self.use_step_functions and job.result_s3_uri:
            return self._get_s3_object(job.result_s3_uri)
        else:
            # Local fallback - read from filesystem
            results_dir = os.environ.get('API_RESULTS_PATH_PREFIX', './results/')
            filepath = os.path.join(
                results_dir, f'pipeline-results_{job_id}', 'alignment-output.aln'
            )
            if os.path.exists(filepath):
                with open(filepath, 'rb') as f:
                    return f.read()
        return None

    def get_job_result_seqinfo(self, job_id: str) -> Optional[bytes]:
        """
        Get sequence info result for a job.

        Args:
            job_id: Job ID

        Returns:
            Sequence info JSON as bytes, or None if not found
        """
        job = self.get_job(job_id)
        if not job or job.status != JobStatus.COMPLETED:
            return None

        if self.use_step_functions and job.result_s3_uri:
            # seq-info is in same directory as alignment
            s3_uri = job.result_s3_uri.replace(
                'alignment-output.aln', 'aligned_seq_info.json'
            )
            return self._get_s3_object(s3_uri)
        else:
            # Local fallback
            results_dir = os.environ.get('API_RESULTS_PATH_PREFIX', './results/')
            filepath = os.path.join(
                results_dir, f'pipeline-results_{job_id}', 'aligned_seq_info.json'
            )
            if os.path.exists(filepath):
                with open(filepath, 'rb') as f:
                    return f.read()
        return None

    # Private helper methods

    def _store_job_dynamodb(self, job: JobInfo) -> None:
        """Store job in DynamoDB."""
        try:
            table = self.dynamodb.Table(self.table_name)
            item = {
                'job_id': job.job_id,
                'status': job.status.value,
                'stage': job.stage.value if job.stage else None,
                'created_at': job.created_at,
                'input_count': job.input_count,
                # TTL: 30 days from creation
                'ttl': int((datetime.utcnow() + timedelta(days=30)).timestamp())
            }
            table.put_item(Item=item)
        except ClientError as e:
            log.error(f"Failed to store job in DynamoDB: {e}")
            raise

    def _get_job_dynamodb(self, job_id: str) -> Optional[JobInfo]:
        """Get job from DynamoDB."""
        try:
            table = self.dynamodb.Table(self.table_name)
            response = table.get_item(Key={'job_id': job_id})
            item = response.get('Item')

            if not item:
                return None

            return JobInfo(
                job_id=item['job_id'],
                status=JobStatus(item['status']),
                stage=JobStage(item.get('stage')) if item.get('stage') else None,
                created_at=item.get('created_at'),
                completed_at=item.get('completed_at'),
                input_count=int(item.get('input_count', 0)),
                sequences_processed=int(item.get('sequences_processed', 0)),
                result_s3_uri=item.get('result_s3_uri'),
                error_message=item.get('error_message'),
                execution_arn=item.get('execution_arn')
            )
        except ClientError as e:
            log.error(f"Failed to get job from DynamoDB: {e}")
            return None

    def _update_job_dynamodb(
        self,
        job_id: str,
        status: Optional[JobStatus] = None,
        stage: Optional[JobStage] = None,
        execution_arn: Optional[str] = None,
        **kwargs
    ) -> None:
        """Update job in DynamoDB."""
        try:
            table = self.dynamodb.Table(self.table_name)

            update_expr_parts = []
            expr_attr_values = {}
            expr_attr_names = {}

            if status:
                update_expr_parts.append('#status = :status')
                expr_attr_names['#status'] = 'status'
                expr_attr_values[':status'] = status.value

            if stage:
                update_expr_parts.append('stage = :stage')
                expr_attr_values[':stage'] = stage.value

            if execution_arn:
                update_expr_parts.append('execution_arn = :arn')
                expr_attr_values[':arn'] = execution_arn

            for key, value in kwargs.items():
                update_expr_parts.append(f'{key} = :{key}')
                expr_attr_values[f':{key}'] = value

            if update_expr_parts:
                table.update_item(
                    Key={'job_id': job_id},
                    UpdateExpression='SET ' + ', '.join(update_expr_parts),
                    ExpressionAttributeValues=expr_attr_values,
                    ExpressionAttributeNames=expr_attr_names if expr_attr_names else None
                )
        except ClientError as e:
            log.error(f"Failed to update job in DynamoDB: {e}")
            raise

    def _start_step_functions_execution(
        self, job_id: str, seq_regions: list[dict]
    ) -> JobInfo:
        """Start a Step Functions execution for the job."""
        if not self.state_machine_arn:
            raise ValueError("Step Functions state machine ARN not configured")

        execution_input = {
            'job_id': job_id,
            'seq_regions': seq_regions,
            'job_queue_arn': self.job_queue_arn
        }

        try:
            response = self.sfn.start_execution(
                stateMachineArn=self.state_machine_arn,
                name=f'pavi-job-{job_id}',
                input=json.dumps(execution_input)
            )

            execution_arn = response['executionArn']

            # Update job with execution ARN
            self._update_job_dynamodb(
                job_id,
                status=JobStatus.RUNNING,
                stage=JobStage.INITIALIZING,
                execution_arn=execution_arn
            )

            log.info(f"Started Step Functions execution for job {job_id}: {execution_arn}")

            return self.get_job(job_id)

        except ClientError as e:
            log.error(f"Failed to start Step Functions execution: {e}")
            self._update_job_dynamodb(
                job_id,
                status=JobStatus.FAILED,
                stage=JobStage.ERROR,
                error_message=str(e)
            )
            raise

    def _start_local_execution(self, job_id: str, seq_regions: list[dict]) -> JobInfo:
        """
        Start a local execution (fallback for development).
        This uses the existing Nextflow subprocess approach.
        """
        job = self._local_jobs.get(job_id)
        if job:
            job.status = JobStatus.RUNNING
            job.stage = JobStage.SEQUENCE_RETRIEVAL
        return job

    def _get_s3_object(self, s3_uri: str) -> Optional[bytes]:
        """Get an object from S3 by URI."""
        try:
            # Parse s3://bucket/key URI
            if s3_uri.startswith('s3://'):
                parts = s3_uri[5:].split('/', 1)
                bucket = parts[0]
                key = parts[1] if len(parts) > 1 else ''
            else:
                return None

            response = self.s3.get_object(Bucket=bucket, Key=key)
            return response['Body'].read()

        except ClientError as e:
            log.error(f"Failed to get S3 object {s3_uri}: {e}")
            return None

    def sync_job_status(self, job_id: str) -> Optional[JobInfo]:
        """
        Synchronize job status from Step Functions execution state.

        This method queries the Step Functions execution and updates
        the DynamoDB job record with the current status.

        Args:
            job_id: Job ID to sync

        Returns:
            Updated JobInfo or None if job not found
        """
        job = self._get_job_dynamodb(job_id)
        if not job:
            return None

        # Only sync if job is still running and has an execution ARN
        if job.status not in [JobStatus.RUNNING, JobStatus.PENDING]:
            return job

        if not job.execution_arn:
            return job

        try:
            response = self.sfn.describe_execution(
                executionArn=job.execution_arn
            )

            sf_status = response.get('status', 'RUNNING')
            now = datetime.utcnow().isoformat() + 'Z'

            if sf_status == 'SUCCEEDED':
                # Parse output to get result S3 URI
                output = json.loads(response.get('output', '{}'))
                result_uri = output.get('result_s3_uri')

                self._update_job_dynamodb(
                    job_id,
                    status=JobStatus.COMPLETED,
                    stage=JobStage.DONE,
                    completed_at=now,
                    result_s3_uri=result_uri
                )
                log.info(f"Job {job_id} completed successfully")

            elif sf_status == 'FAILED':
                # Extract error information
                error = response.get('error', 'Unknown error')
                cause = response.get('cause', 'No details available')
                error_msg = f"{error}: {cause}"

                self._update_job_dynamodb(
                    job_id,
                    status=JobStatus.FAILED,
                    stage=JobStage.ERROR,
                    completed_at=now,
                    error_message=error_msg[:1000]  # Truncate to fit DynamoDB
                )
                log.error(f"Job {job_id} failed: {error_msg}")

            elif sf_status == 'TIMED_OUT':
                self._update_job_dynamodb(
                    job_id,
                    status=JobStatus.FAILED,
                    stage=JobStage.ERROR,
                    completed_at=now,
                    error_message='Execution timed out'
                )
                log.error(f"Job {job_id} timed out")

            elif sf_status == 'ABORTED':
                self._update_job_dynamodb(
                    job_id,
                    status=JobStatus.FAILED,
                    stage=JobStage.ERROR,
                    completed_at=now,
                    error_message='Execution was aborted'
                )
                log.warning(f"Job {job_id} was aborted")

            # Return the updated job
            return self._get_job_dynamodb(job_id)

        except ClientError as e:
            log.error(f"Failed to sync job status for {job_id}: {e}")
            return job

    def get_job_with_sync(self, job_id: str) -> Optional[JobInfo]:
        """
        Get job information with automatic status synchronization.

        For running jobs, this will check the Step Functions execution
        and update the job status before returning.

        Args:
            job_id: Job ID

        Returns:
            JobInfo object or None if not found
        """
        if self.use_step_functions:
            job = self._get_job_dynamodb(job_id)
            if job and job.status in [JobStatus.RUNNING, JobStatus.PENDING]:
                # Sync status from Step Functions
                return self.sync_job_status(job_id)
            return job
        else:
            return self._local_jobs.get(job_id)


# Singleton instance for the API
_job_service: Optional[JobService] = None


def get_job_service() -> JobService:
    """Get or create the job service singleton."""
    global _job_service
    if _job_service is None:
        use_sf = os.environ.get('USE_STEP_FUNCTIONS', 'true').lower() == 'true'
        _job_service = JobService(use_step_functions=use_sf)
    return _job_service
