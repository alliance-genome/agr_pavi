"""
Unit tests for job_service module.

Tests the JobService class with mocked AWS dependencies.
"""

import pytest
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError

from src.job_service import (
    JobService, JobInfo, JobStatus, JobStage,
    JobServiceError, JobNotFoundError, JobExecutionError, JobResultNotReadyError
)


class TestJobServiceExceptions:
    """Test custom exception classes."""

    def test_job_service_error(self) -> None:
        """Test base JobServiceError."""
        error = JobServiceError("test error")
        assert str(error) == "test error"

    def test_job_not_found_error(self) -> None:
        """Test JobNotFoundError."""
        error = JobNotFoundError("job 123 not found")
        assert "123" in str(error)

    def test_job_execution_error(self) -> None:
        """Test JobExecutionError with cause."""
        error = JobExecutionError("execution failed", cause="batch error")
        assert str(error) == "execution failed"
        assert error.cause == "batch error"

    def test_job_result_not_ready_error(self) -> None:
        """Test JobResultNotReadyError."""
        error = JobResultNotReadyError("job-123", "running")
        assert "job-123" in str(error)
        assert error.job_id == "job-123"
        assert error.status == "running"


class TestJobInfo:
    """Test JobInfo data class."""

    def test_job_info_creation(self) -> None:
        """Test creating a JobInfo object."""
        job = JobInfo(
            job_id="test-id",
            status=JobStatus.PENDING,
            stage=JobStage.INITIALIZING,
            created_at="2024-01-01T00:00:00Z",
            input_count=5
        )
        assert job.job_id == "test-id"
        assert job.status == JobStatus.PENDING
        assert job.stage == JobStage.INITIALIZING
        assert job.input_count == 5

    def test_job_info_to_dict(self) -> None:
        """Test JobInfo.to_dict method."""
        job = JobInfo(
            job_id="test-id",
            status=JobStatus.COMPLETED,
            stage=JobStage.DONE,
            input_count=3,
            error_message=None
        )
        d = job.to_dict()
        assert d["uuid"] == "test-id"
        assert d["status"] == "completed"
        assert d["stage"] == "DONE"
        assert d["name"] == "pavi-job-test-id"


class TestJobServiceLocal:
    """Test JobService in local mode (use_step_functions=False)."""

    def test_create_job_local(self) -> None:
        """Test creating a job in local mode."""
        service = JobService(use_step_functions=False)
        job = service.create_job([{"test": "data"}])

        assert job.job_id is not None
        assert job.status == JobStatus.PENDING
        assert job.stage == JobStage.INITIALIZING
        assert job.input_count == 1

    def test_get_job_local(self) -> None:
        """Test getting a job in local mode."""
        service = JobService(use_step_functions=False)
        created = service.create_job([{"test": "data"}])

        retrieved = service.get_job(created.job_id)
        assert retrieved is not None
        assert retrieved.job_id == created.job_id

    def test_get_job_not_found_local(self) -> None:
        """Test getting a non-existent job in local mode."""
        service = JobService(use_step_functions=False)
        result = service.get_job("non-existent-id")
        assert result is None

    def test_start_job_local(self) -> None:
        """Test starting a job in local mode."""
        service = JobService(use_step_functions=False)
        job = service.create_job([{"test": "data"}])

        started = service._start_local_execution(job.job_id, [{"test": "data"}])
        assert started.status == JobStatus.RUNNING
        assert started.stage == JobStage.SEQUENCE_RETRIEVAL


class TestJobServiceStepFunctions:
    """Test JobService with Step Functions (mocked AWS services)."""

    @patch('src.job_service.boto3')
    def test_create_job_step_functions(self, mock_boto3: MagicMock) -> None:
        """Test creating a job with Step Functions mode."""
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_dynamodb = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3.resource.return_value = mock_dynamodb

        service = JobService(
            dynamodb_table_name='test-table',
            state_machine_arn='arn:aws:states:us-east-1:123456789:stateMachine:test',
            use_step_functions=True
        )
        job = service.create_job([{"test": "data"}])

        assert job.job_id is not None
        assert job.status == JobStatus.PENDING
        mock_table.put_item.assert_called_once()

    @patch('src.job_service.boto3')
    def test_get_job_dynamodb(self, mock_boto3: MagicMock) -> None:
        """Test getting a job from DynamoDB."""
        # Mock DynamoDB response
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            'Item': {
                'job_id': 'test-id',
                'status': 'COMPLETED',
                'stage': 'DONE',
                'input_count': 5,
                'created_at': '2024-01-01T00:00:00Z'
            }
        }
        mock_dynamodb = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3.resource.return_value = mock_dynamodb

        service = JobService(
            dynamodb_table_name='test-table',
            use_step_functions=True
        )
        job = service.get_job('test-id')

        assert job is not None
        assert job.job_id == 'test-id'
        assert job.status == JobStatus.COMPLETED
        assert job.stage == JobStage.DONE

    @patch('src.job_service.boto3')
    def test_get_job_not_found_dynamodb(self, mock_boto3: MagicMock) -> None:
        """Test getting a non-existent job from DynamoDB."""
        mock_table = MagicMock()
        mock_table.get_item.return_value = {}  # No Item
        mock_dynamodb = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3.resource.return_value = mock_dynamodb

        service = JobService(
            dynamodb_table_name='test-table',
            use_step_functions=True
        )
        job = service.get_job('non-existent')

        assert job is None

    @patch('src.job_service.boto3')
    def test_start_step_functions_execution(self, mock_boto3: MagicMock) -> None:
        """Test starting a Step Functions execution."""
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            'Item': {
                'job_id': 'test-id',
                'status': 'RUNNING',
                'stage': 'INITIALIZING',
                'input_count': 1
            }
        }
        mock_dynamodb = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3.resource.return_value = mock_dynamodb

        # Mock Step Functions
        mock_sfn = MagicMock()
        mock_sfn.start_execution.return_value = {
            'executionArn': 'arn:aws:states:us-east-1:123456789:execution:test:run-1'
        }
        mock_boto3.client.return_value = mock_sfn

        service = JobService(
            dynamodb_table_name='test-table',
            state_machine_arn='arn:aws:states:us-east-1:123456789:stateMachine:test',
            use_step_functions=True
        )

        job = service._start_step_functions_execution('test-id', [{"test": "data"}])

        mock_sfn.start_execution.assert_called_once()
        mock_table.update_item.assert_called()

    @patch('src.job_service.boto3')
    def test_sync_job_status_succeeded(self, mock_boto3: MagicMock) -> None:
        """Test syncing job status when Step Functions execution succeeded."""
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            'Item': {
                'job_id': 'test-id',
                'status': 'RUNNING',
                'stage': 'ALIGNMENT',
                'input_count': 1,
                'execution_arn': 'arn:aws:states:us-east-1:123456789:execution:test:run-1'
            }
        }
        mock_dynamodb = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3.resource.return_value = mock_dynamodb

        # Mock Step Functions
        mock_sfn = MagicMock()
        mock_sfn.describe_execution.return_value = {
            'status': 'SUCCEEDED',
            'output': '{"result_s3_uri": "s3://bucket/results/alignment.aln"}'
        }
        mock_boto3.client.return_value = mock_sfn

        service = JobService(
            dynamodb_table_name='test-table',
            state_machine_arn='arn:aws:states:us-east-1:123456789:stateMachine:test',
            use_step_functions=True
        )

        service.sync_job_status('test-id')

        # Should update job to COMPLETED
        mock_table.update_item.assert_called()

    @patch('src.job_service.boto3')
    def test_sync_job_status_failed(self, mock_boto3: MagicMock) -> None:
        """Test syncing job status when Step Functions execution failed."""
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            'Item': {
                'job_id': 'test-id',
                'status': 'RUNNING',
                'stage': 'ALIGNMENT',
                'input_count': 1,
                'execution_arn': 'arn:aws:states:us-east-1:123456789:execution:test:run-1'
            }
        }
        mock_dynamodb = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3.resource.return_value = mock_dynamodb

        # Mock Step Functions
        mock_sfn = MagicMock()
        mock_sfn.describe_execution.return_value = {
            'status': 'FAILED',
            'error': 'Batch.JobFailed',
            'cause': 'Container exited with non-zero status'
        }
        mock_boto3.client.return_value = mock_sfn

        service = JobService(
            dynamodb_table_name='test-table',
            state_machine_arn='arn:aws:states:us-east-1:123456789:stateMachine:test',
            use_step_functions=True
        )

        service.sync_job_status('test-id')

        # Should update job to FAILED with error message
        mock_table.update_item.assert_called()


class TestJobResultRetrieval:
    """Test result retrieval methods."""

    @patch('src.job_service.boto3')
    def test_get_alignment_result_not_completed(self, mock_boto3: MagicMock) -> None:
        """Test getting alignment result for non-completed job."""
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            'Item': {
                'job_id': 'test-id',
                'status': 'RUNNING',
                'input_count': 1
            }
        }
        mock_dynamodb = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3.resource.return_value = mock_dynamodb

        service = JobService(
            dynamodb_table_name='test-table',
            use_step_functions=True
        )

        result = service.get_job_result_alignment('test-id')
        assert result is None

    @patch('src.job_service.boto3')
    def test_get_seqinfo_result_not_completed(self, mock_boto3: MagicMock) -> None:
        """Test getting seq info result for non-completed job."""
        mock_table = MagicMock()
        mock_table.get_item.return_value = {
            'Item': {
                'job_id': 'test-id',
                'status': 'FAILED',
                'input_count': 1,
                'error_message': 'Batch job failed'
            }
        }
        mock_dynamodb = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_boto3.resource.return_value = mock_dynamodb

        service = JobService(
            dynamodb_table_name='test-table',
            use_step_functions=True
        )

        result = service.get_job_result_seqinfo('test-id')
        assert result is None
