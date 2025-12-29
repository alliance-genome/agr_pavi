from fastapi import APIRouter, BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from io import StringIO, BytesIO
from os import getenv
from pydantic import BaseModel

from typing import Any, Optional

import json
import subprocess
from uuid import uuid1, UUID

from constants import JobStatus
from log_mgmt import get_logger

# Import the new job service
from job_service import (
    get_job_service, JobService, JobInfo, JobStatus as SFJobStatus,
    JobServiceError, JobNotFoundError, JobExecutionError, JobResultNotReadyError
)

# Import configuration module
from config import get_api_config, should_use_step_functions, Environment

logger = get_logger(name=__name__)

# Load configuration
_config = get_api_config()

api_results_path_prefix = _config.nextflow_out_dir + 'results/'
nf_workdir = _config.nextflow_out_dir + 'work/'
api_execution_env = getenv("API_EXECUTION_ENV", 'local')
api_pipeline_image_tag = _config.pipeline_image_tag

# Feature flag for Step Functions mode (from config)
USE_STEP_FUNCTIONS = _config.pipeline.use_step_functions


class Pipeline_seq_region(BaseModel):
    base_seq_name: str
    unique_entry_id: str
    seq_id: str
    seq_strand: str
    exon_seq_regions: list[str | dict[str, str | int]]
    cds_seq_regions: list[str | dict[str, str | int]]
    fasta_file_url: str
    variant_ids: list[str]
    alt_seq_name_suffix: Optional[str] = None


class Pipeline_job(BaseModel):
    uuid: UUID
    status: str = JobStatus.PENDING.name.lower()
    name: str
    # Extended fields for Step Functions mode
    stage: Optional[str] = None
    input_count: Optional[int] = None
    sequences_processed: Optional[int] = None
    error_message: Optional[str] = None

    def __init__(self, uuid: UUID, **data: Any):
        super().__init__(uuid=uuid, name=f'pavi-job-{uuid}', **data)

    @classmethod
    def from_job_info(cls, job_info: JobInfo) -> 'Pipeline_job':
        """Create Pipeline_job from JobInfo object."""
        return cls(
            uuid=UUID(job_info.job_id),
            status=job_info.status.value.lower(),
            stage=job_info.stage.value if job_info.stage else None,
            input_count=job_info.input_count,
            sequences_processed=job_info.sequences_processed,
            error_message=job_info.error_message
        )


class HTTP_exception_response(BaseModel):
    details: str


def run_pipeline(pipeline_seq_regions: list[Pipeline_seq_region], uuid: UUID) -> None:
    """
    Run the backend alignment pipeline using Nextflow (legacy mode).

    Args:
        pipeline_seq_regions: sequence regions for pipeline input
        uuid: UUID to uniquely identify the job being run
    """
    logger.info(f'Initiating pipeline run for job {uuid}.')

    job: Pipeline_job | None = get_pipeline_job(uuid=uuid)

    if job is None:
        logger.error(f'Failed to initiate pipeline run for job {uuid} because job was not found.')
        return

    job.status = JobStatus.RUNNING.name.lower()

    model_dumps: list[dict[str, Any]] = []
    for seq_region in pipeline_seq_regions:
        model_dumps.append(seq_region.model_dump())
    seq_regions_json: str = json.dumps(model_dumps)

    seqregions_filename = f'seq_regions_{uuid}.json'
    with open(seqregions_filename, mode='w') as seqregions_file:
        seqregions_file.write(seq_regions_json)

    try:
        subprocess.run(
            ['./nextflow.sh', 'run',
             '-offline',
             '-work-dir', nf_workdir,
             '-profile', api_execution_env,
             '-name', job.name,
             'protein-msa.nf',
             '--image_tag', api_pipeline_image_tag,
             '--input_seq_regions_file', seqregions_filename,
             '--publish_dir_prefix', api_results_path_prefix,
             '--publish_dir', f'pipeline-results_{uuid}'],
            check=True)
    except subprocess.CalledProcessError:
        logger.warning(f"Pipeline job '{uuid}' completed with failures.\n")
        job.status = JobStatus.FAILED.name.lower()
    else:
        logger.info(f'Pipeline job {uuid} completed successfully.')
        job.status = JobStatus.COMPLETED.name.lower()


def run_pipeline_step_functions(
    pipeline_seq_regions: list[Pipeline_seq_region],
    job_id: str,
    job_service: JobService
) -> None:
    """
    Run the backend alignment pipeline using Step Functions.

    Args:
        pipeline_seq_regions: sequence regions for pipeline input
        job_id: Job ID
        job_service: JobService instance

    Note:
        This function runs in the background. Errors are logged and
        the job status is updated to FAILED in DynamoDB.
    """
    logger.info(f'Initiating Step Functions pipeline run for job {job_id}.')

    # Convert Pydantic models to dicts
    seq_regions = [sr.model_dump() for sr in pipeline_seq_regions]

    try:
        job_service.start_job(job_id, seq_regions)
        logger.info(f'Step Functions execution started for job {job_id}.')
    except JobServiceError as e:
        # JobService already handles updating the job status to FAILED
        logger.error(f'Failed to start Step Functions execution for job {job_id}: {e}')
    except Exception as e:
        # Unexpected error - try to update job status
        logger.error(f'Unexpected error starting Step Functions execution for job {job_id}: {e}')
        try:
            from job_service import JobStatus as SFStatus, JobStage
            job_service._update_job_dynamodb(
                job_id,
                status=SFStatus.FAILED,
                stage=JobStage.ERROR,
                error_message=f'Unexpected error: {str(e)[:500]}'
            )
        except Exception as update_err:
            logger.error(f'Failed to update job status after error: {update_err}')


app = FastAPI()
router = APIRouter(
    prefix="/api"
)

# Legacy in-memory job storage (used when USE_STEP_FUNCTIONS=false)
jobs: dict[UUID, Pipeline_job] = {}


def get_pipeline_job(uuid: UUID) -> Pipeline_job | None:
    """Get job from in-memory storage (legacy mode)."""
    if uuid not in jobs.keys():
        logger.warning(f'Pipeline job with UUID {uuid} not found.')
        return None
    else:
        return jobs[uuid]


@router.get("/")
async def help_msg() -> dict[str, str]:
    return {"help": "Welcome to the PAVI API! For more information on how to use it, see the docs at {host}/docs"}


@router.get("/health", status_code=200, description='Health endpoint to check API health', tags=['metadata'])
async def health() -> dict[str, Any]:
    mode = "step_functions" if USE_STEP_FUNCTIONS else "nextflow"
    response: dict[str, Any] = {
        "status": "up",
        "execution_mode": mode,
        "environment": _config.environment.value,
    }

    # Add rollout info if enabled
    if _config.pipeline.enable_step_functions_rollout:
        response["rollout"] = {
            "enabled": True,
            "percentage": _config.pipeline.step_functions_rollout_percentage
        }

    return response


@router.get("/deployment-status", status_code=200, description='Deployment status for all PAVI components', tags=['metadata'])
async def deployment_status() -> dict[str, Any]:
    """
    Get deployment status for all PAVI components.

    Returns status information for:
    - API service
    - Step Functions state machine
    - AWS Batch compute
    - DynamoDB jobs table
    - S3 buckets (results and work)
    """
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError

    components: dict[str, Any] = {}

    # API Status
    components["api"] = {
        "name": "API Service",
        "status": "healthy",
        "environment": _config.environment.value,
        "execution_mode": "step_functions" if USE_STEP_FUNCTIONS else "nextflow",
        "details": {
            "host": _config.api_host,
            "port": _config.api_port,
            "debug": _config.debug,
        }
    }

    # Step Functions Status
    sf_status: dict[str, Any] = {
        "name": "Step Functions",
        "status": "unknown",
        "details": {}
    }

    if USE_STEP_FUNCTIONS and _config.pipeline.state_machine_arn:
        try:
            sfn_client = boto3.client('stepfunctions')
            response = sfn_client.describe_state_machine(
                stateMachineArn=_config.pipeline.state_machine_arn
            )
            sf_status["status"] = "healthy" if response.get('status') == 'ACTIVE' else "unhealthy"
            sf_status["details"] = {
                "arn": _config.pipeline.state_machine_arn,
                "name": response.get('name', 'Unknown'),
                "state": response.get('status', 'Unknown'),
            }
        except NoCredentialsError:
            sf_status["status"] = "unavailable"
            sf_status["details"]["error"] = "AWS credentials not configured"
        except ClientError as e:
            sf_status["status"] = "error"
            sf_status["details"]["error"] = str(e)
        except Exception as e:
            sf_status["status"] = "error"
            sf_status["details"]["error"] = str(e)
    else:
        sf_status["status"] = "disabled"
        sf_status["details"]["message"] = "Step Functions not enabled"

    components["step_functions"] = sf_status

    # AWS Batch Status
    batch_status: dict[str, Any] = {
        "name": "AWS Batch",
        "status": "unknown",
        "details": {}
    }

    if _config.pipeline.job_queue_arn:
        try:
            batch_client = boto3.client('batch')
            response = batch_client.describe_job_queues(
                jobQueues=[_config.pipeline.job_queue_arn]
            )
            if response.get('jobQueues'):
                queue = response['jobQueues'][0]
                batch_status["status"] = "healthy" if queue.get('status') == 'VALID' else "unhealthy"
                batch_status["details"] = {
                    "arn": _config.pipeline.job_queue_arn,
                    "name": queue.get('jobQueueName', 'Unknown'),
                    "state": queue.get('state', 'Unknown'),
                    "status": queue.get('status', 'Unknown'),
                }
            else:
                batch_status["status"] = "error"
                batch_status["details"]["error"] = "Job queue not found"
        except NoCredentialsError:
            batch_status["status"] = "unavailable"
            batch_status["details"]["error"] = "AWS credentials not configured"
        except ClientError as e:
            batch_status["status"] = "error"
            batch_status["details"]["error"] = str(e)
        except Exception as e:
            batch_status["status"] = "error"
            batch_status["details"]["error"] = str(e)
    else:
        batch_status["status"] = "disabled"
        batch_status["details"]["message"] = "AWS Batch not configured"

    components["batch"] = batch_status

    # DynamoDB Status
    dynamo_status: dict[str, Any] = {
        "name": "DynamoDB Jobs Table",
        "status": "unknown",
        "details": {}
    }

    try:
        dynamodb = boto3.client('dynamodb')
        response = dynamodb.describe_table(
            TableName=_config.pipeline.jobs_table_name
        )
        table = response.get('Table', {})
        dynamo_status["status"] = "healthy" if table.get('TableStatus') == 'ACTIVE' else "unhealthy"
        dynamo_status["details"] = {
            "table_name": _config.pipeline.jobs_table_name,
            "status": table.get('TableStatus', 'Unknown'),
            "item_count": table.get('ItemCount', 0),
        }
    except NoCredentialsError:
        dynamo_status["status"] = "unavailable"
        dynamo_status["details"]["error"] = "AWS credentials not configured"
    except ClientError as e:
        if 'ResourceNotFoundException' in str(e):
            dynamo_status["status"] = "not_found"
            dynamo_status["details"]["error"] = f"Table {_config.pipeline.jobs_table_name} not found"
        else:
            dynamo_status["status"] = "error"
            dynamo_status["details"]["error"] = str(e)
    except Exception as e:
        dynamo_status["status"] = "error"
        dynamo_status["details"]["error"] = str(e)

    components["dynamodb"] = dynamo_status

    # S3 Results Bucket Status
    s3_results_status: dict[str, Any] = {
        "name": "S3 Results Bucket",
        "status": "unknown",
        "details": {}
    }

    try:
        s3 = boto3.client('s3')
        s3.head_bucket(Bucket=_config.pipeline.results_bucket)
        s3_results_status["status"] = "healthy"
        s3_results_status["details"] = {
            "bucket_name": _config.pipeline.results_bucket,
        }
    except NoCredentialsError:
        s3_results_status["status"] = "unavailable"
        s3_results_status["details"]["error"] = "AWS credentials not configured"
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == '404':
            s3_results_status["status"] = "not_found"
            s3_results_status["details"]["error"] = f"Bucket {_config.pipeline.results_bucket} not found"
        elif error_code == '403':
            s3_results_status["status"] = "no_access"
            s3_results_status["details"]["error"] = "Access denied to bucket"
        else:
            s3_results_status["status"] = "error"
            s3_results_status["details"]["error"] = str(e)
    except Exception as e:
        s3_results_status["status"] = "error"
        s3_results_status["details"]["error"] = str(e)

    components["s3_results"] = s3_results_status

    # S3 Work Bucket Status (if different from results)
    if _config.pipeline.work_bucket != _config.pipeline.results_bucket:
        s3_work_status: dict[str, Any] = {
            "name": "S3 Work Bucket",
            "status": "unknown",
            "details": {}
        }

        try:
            s3.head_bucket(Bucket=_config.pipeline.work_bucket)
            s3_work_status["status"] = "healthy"
            s3_work_status["details"] = {
                "bucket_name": _config.pipeline.work_bucket,
            }
        except NoCredentialsError:
            s3_work_status["status"] = "unavailable"
            s3_work_status["details"]["error"] = "AWS credentials not configured"
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == '404':
                s3_work_status["status"] = "not_found"
                s3_work_status["details"]["error"] = f"Bucket {_config.pipeline.work_bucket} not found"
            elif error_code == '403':
                s3_work_status["status"] = "no_access"
                s3_work_status["details"]["error"] = "Access denied to bucket"
            else:
                s3_work_status["status"] = "error"
                s3_work_status["details"]["error"] = str(e)
        except Exception as e:
            s3_work_status["status"] = "error"
            s3_work_status["details"]["error"] = str(e)

        components["s3_work"] = s3_work_status

    # Calculate overall status
    statuses = [c.get('status') for c in components.values()]
    if all(s in ['healthy', 'disabled'] for s in statuses):
        overall = "healthy"
    elif any(s in ['error', 'unhealthy'] for s in statuses):
        overall = "degraded"
    elif any(s == 'unavailable' for s in statuses):
        overall = "unavailable"
    else:
        overall = "unknown"

    return {
        "overall_status": overall,
        "environment": _config.environment.value,
        "components": components,
    }


@router.post('/pipeline-job/', status_code=201, response_model_exclude_none=True)
async def create_new_pipeline_job(
    pipeline_seq_regions: list[Pipeline_seq_region],
    background_tasks: BackgroundTasks
) -> Pipeline_job:
    """
    Create and start a new pipeline job.

    In Step Functions mode, job is created in DynamoDB and execution started.
    In Nextflow mode (legacy), job is stored in-memory and Nextflow is invoked.

    When gradual rollout is enabled, jobs are routed to Step Functions based
    on a percentage configured via STEP_FUNCTIONS_ROLLOUT_PERCENTAGE.
    """
    # Generate job ID first for consistent routing
    new_job_id = str(uuid1())

    # Determine which backend to use (supports gradual rollout)
    use_sf = should_use_step_functions(_config, new_job_id)

    if use_sf:
        # Step Functions mode
        job_service = get_job_service()
        seq_regions = [sr.model_dump() for sr in pipeline_seq_regions]

        # Create job in DynamoDB
        job_info = job_service.create_job(seq_regions)
        logger.info(f'Created Step Functions pipeline job {job_info.job_id}.')

        # Start execution in background
        background_tasks.add_task(
            func=run_pipeline_step_functions,
            pipeline_seq_regions=pipeline_seq_regions,
            job_id=job_info.job_id,
            job_service=job_service
        )

        return Pipeline_job.from_job_info(job_info)
    else:
        # Legacy Nextflow mode
        new_task: Pipeline_job = Pipeline_job(uuid=UUID(new_job_id))
        jobs[new_task.uuid] = new_task
        logger.info(f'Created Nextflow pipeline job {new_task.uuid}.')
        background_tasks.add_task(
            func=run_pipeline,
            pipeline_seq_regions=pipeline_seq_regions,
            uuid=new_task.uuid
        )

        return new_task


@router.get("/pipeline-job/{uuid}", response_model_exclude_none=True, responses={404: {'model': HTTP_exception_response}})
async def get_pipeline_job_handler(uuid: UUID) -> Pipeline_job:
    """
    Get job status and details.

    For running jobs in Step Functions mode, this will sync the status
    from the Step Functions execution before returning.
    """
    if USE_STEP_FUNCTIONS:
        job_service = get_job_service()
        try:
            # Use get_job_with_sync to auto-update status from Step Functions
            job_info = job_service.get_job_with_sync(str(uuid))
            if job_info is None:
                raise HTTPException(status_code=404, detail='Job not found.')
            return Pipeline_job.from_job_info(job_info)
        except JobServiceError as e:
            logger.error(f"Error getting job {uuid}: {e}")
            raise HTTPException(status_code=500, detail=f'Error retrieving job: {str(e)}')
    else:
        job: Pipeline_job | None = get_pipeline_job(uuid)
        if job is None:
            raise HTTPException(status_code=404, detail='Job not found.')
        else:
            return job


@router.get("/pipeline-job/{uuid}/result/alignment", responses={
    404: {'model': HTTP_exception_response},
    400: {'model': HTTP_exception_response},
    500: {'model': HTTP_exception_response}
})
async def get_pipeline_job_alignment_result(uuid: UUID) -> StreamingResponse:
    """
    Get alignment result file.

    Returns 400 if the job has failed or is not yet complete.
    Returns 404 if the job or result file is not found.
    """
    if USE_STEP_FUNCTIONS:
        job_service = get_job_service()

        # First sync and check job status
        try:
            job_info = job_service.get_job_with_sync(str(uuid))
        except JobServiceError as e:
            logger.error(f"Error getting job {uuid}: {e}")
            raise HTTPException(status_code=500, detail=f'Error retrieving job: {str(e)}')

        if job_info is None:
            raise HTTPException(status_code=404, detail='Job not found.')

        # Check job status before returning results
        if job_info.status == SFJobStatus.FAILED:
            error_msg = job_info.error_message or 'Job execution failed'
            raise HTTPException(status_code=400, detail=f'Job failed: {error_msg}')

        if job_info.status != SFJobStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail=f'Results not ready. Job status: {job_info.status.value.lower()}'
            )

        content = job_service.get_job_result_alignment(str(uuid))
        if content is None:
            logger.warning(f'GET result/alignment error: File not found for job "{uuid}".')
            raise HTTPException(status_code=404, detail='Result file not found.')

        def iterfile():  # type: ignore
            with BytesIO(content) as f:
                yield from f

        return StreamingResponse(iterfile(), media_type="text/plain")
    else:
        # Legacy filesystem-based retrieval
        try:
            from smart_open import open as smart_open
            file_like = smart_open(f'{api_results_path_prefix}pipeline-results_{uuid}/alignment-output.aln', mode="rb")
        except FileNotFoundError:
            logger.warning(f'GET result/alignment error: File not found for job "{uuid}".')
            raise HTTPException(status_code=404, detail='File not found.')
        except OSError as error:
            logger.warning(f'GET result/alignment error: OS error caught while opening "{uuid}" result file.')
            raise HTTPException(status_code=404, detail=f'OS error caught: {error}.')
        else:
            def iterfile():  # type: ignore
                with file_like:
                    yield from file_like

            return StreamingResponse(iterfile(), media_type="text/plain")


@router.get("/pipeline-job/{uuid}/result/seq-info", responses={
    404: {'model': HTTP_exception_response},
    400: {'model': HTTP_exception_response},
    500: {'model': HTTP_exception_response}
})
async def get_pipeline_job_seq_info_result(uuid: UUID) -> StreamingResponse:
    """
    Get sequence info result file.

    Returns 400 if the job has failed or is not yet complete.
    Returns 404 if the job or result file is not found.
    """
    if USE_STEP_FUNCTIONS:
        job_service = get_job_service()

        # First sync and check job status
        try:
            job_info = job_service.get_job_with_sync(str(uuid))
        except JobServiceError as e:
            logger.error(f"Error getting job {uuid}: {e}")
            raise HTTPException(status_code=500, detail=f'Error retrieving job: {str(e)}')

        if job_info is None:
            raise HTTPException(status_code=404, detail='Job not found.')

        # Check job status before returning results
        if job_info.status == SFJobStatus.FAILED:
            error_msg = job_info.error_message or 'Job execution failed'
            raise HTTPException(status_code=400, detail=f'Job failed: {error_msg}')

        if job_info.status != SFJobStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail=f'Results not ready. Job status: {job_info.status.value.lower()}'
            )

        content = job_service.get_job_result_seqinfo(str(uuid))
        if content is None:
            logger.warning(f'GET result/seq-info error: File not found for job "{uuid}".')
            raise HTTPException(status_code=404, detail='Result file not found.')

        def iterfile():  # type: ignore
            with BytesIO(content) as f:
                yield from f

        return StreamingResponse(iterfile(), media_type="application/json")
    else:
        # Legacy filesystem-based retrieval
        try:
            from smart_open import open as smart_open
            file_like = smart_open(f'{api_results_path_prefix}pipeline-results_{uuid}/aligned_seq_info.json', mode="rb")
        except FileNotFoundError:
            logger.warning(f'GET result/seq-info error: File not found for job "{uuid}".')
            raise HTTPException(status_code=404, detail='File not found.')
        except OSError as error:
            logger.warning(f'GET result/seq-info error: OS error caught while opening "{uuid}" result file.')
            raise HTTPException(status_code=404, detail=f'OS error caught: {error}.')
        else:
            def iterfile():  # type: ignore
                with file_like:
                    yield from file_like

            return StreamingResponse(iterfile(), media_type="application/json")


@router.get("/pipeline-job/{uuid}/logs", responses={400: {'model': HTTP_exception_response}, 404: {'model': HTTP_exception_response}})
async def get_pipeline_job_logs(uuid: UUID) -> StreamingResponse:
    """
    Get job logs.

    Note: In Step Functions mode, logs are retrieved from CloudWatch.
    In Nextflow mode, logs are retrieved from Nextflow log command.
    """
    if USE_STEP_FUNCTIONS:
        # TODO: Implement CloudWatch log retrieval for Step Functions mode
        raise HTTPException(
            status_code=501,
            detail='Log retrieval not yet implemented for Step Functions mode.'
        )

    # Legacy Nextflow log retrieval
    job: Pipeline_job | None = get_pipeline_job(uuid)
    if job is None:
        logger.warning(f'GET job logs error: job "{uuid}" not found.')
        raise HTTPException(status_code=404, detail='Job not found.')

    # Check if job has completed before running nextflow log
    # (nextflow log cannot be executed on non-complete jobs, will fail)
    if JobStatus[job.status.upper()].value < JobStatus.FAILED.value:
        msg = f'Logs can only be retrieved for failed or completed jobs ({job.uuid} is not yet)'
        logger.warning(msg)
        raise HTTPException(status_code=400, detail=msg)

    try:
        result = subprocess.run(
            ['./nextflow.sh', 'log', job.name, '-f', 'stderr,stdout'],
            check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as e:
        logger.error(f'Error while fetching nextflow logs for job named {job.name}: {e}')
        logger.error(f'Failing command output: {e.output}')
        raise HTTPException(status_code=500, detail='Error occured while retrieving logs.')
    else:
        if not result.stdout:
            logger.warning(f'GET job logs error: No logs found for uuid {job.uuid}.')
            raise HTTPException(status_code=404, detail='Job found but no logs found.')

        def contentStream():  # type: ignore
            with StringIO(result.stdout) as file_like:
                yield from file_like

        return StreamingResponse(contentStream(), media_type="text/plain")


app.include_router(router)
