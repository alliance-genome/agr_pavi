from fastapi import APIRouter, BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from io import StringIO, BytesIO
import os
from os import getenv
from pydantic import BaseModel

from typing import Any, Literal, Optional

import json
import re
import subprocess
from uuid import uuid1, UUID

from constants import JobStatus
from log_mgmt import get_logger

import job_db

from job_service import (
    get_job_service,
    JobService,
    JobInfo,
    JobStatus as SFJobStatus,
    JobServiceError,
)

# Import configuration module
from config import get_api_config, should_use_step_functions, should_use_local_pipeline

logger = get_logger(name=__name__)

# Load configuration
_config = get_api_config()

api_results_path_prefix = _config.nextflow_out_dir + "results/"
nf_workdir = _config.nextflow_out_dir + "work/"
api_execution_env = getenv("API_EXECUTION_ENV", "local")
api_pipeline_image_tag = _config.pipeline_image_tag

# Feature flags for execution mode (from config)
USE_STEP_FUNCTIONS = _config.pipeline.use_step_functions
USE_LOCAL_PIPELINE = _config.pipeline.use_local_pipeline


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
    species: Optional[str] = None


class Pipeline_job(BaseModel):
    uuid: UUID
    status: str = JobStatus.PENDING.name.lower()
    name: str
    # Extended fields for Step Functions mode
    stage: Optional[str] = None
    input_count: Optional[int] = None
    sequences_processed: Optional[int] = None
    error_message: Optional[str] = None
    # Task-level progress events
    task_events: Optional[list[str]] = None

    def __init__(self, uuid: UUID, **data: Any):
        super().__init__(uuid=uuid, name=f"pavi-job-{uuid}", **data)

    @classmethod
    def from_job_info(cls, job_info: JobInfo) -> "Pipeline_job":
        """Create Pipeline_job from JobInfo object."""
        return cls(
            uuid=UUID(job_info.job_id),
            status=job_info.status.value.lower(),
            stage=job_info.stage.value if job_info.stage else None,
            input_count=job_info.input_count,
            sequences_processed=job_info.sequences_processed,
            error_message=job_info.error_message,
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
    logger.info(f"Initiating pipeline run for job {uuid}.")

    job: Pipeline_job | None = get_pipeline_job(uuid=uuid)

    if job is None:
        logger.error(
            f"Failed to initiate pipeline run for job {uuid} because job was not found."
        )
        return

    job.status = JobStatus.RUNNING.name.lower()

    model_dumps: list[dict[str, Any]] = []
    for seq_region in pipeline_seq_regions:
        model_dumps.append(seq_region.model_dump())
    seq_regions_json: str = json.dumps(model_dumps)

    seqregions_filename = f"seq_regions_{uuid}.json"
    with open(seqregions_filename, mode="w") as seqregions_file:
        seqregions_file.write(seq_regions_json)

    try:
        subprocess.run(
            [
                "./nextflow.sh",
                "run",
                "-offline",
                "-work-dir",
                nf_workdir,
                "-profile",
                api_execution_env,
                "-name",
                job.name,
                "protein-msa.nf",
                "--image_tag",
                api_pipeline_image_tag,
                "--input_seq_regions_file",
                seqregions_filename,
                "--publish_dir_prefix",
                api_results_path_prefix,
                "--publish_dir",
                f"pipeline-results_{uuid}",
            ],
            check=True,
        )
    except subprocess.CalledProcessError:
        logger.warning(f"Pipeline job '{uuid}' completed with failures.\n")
        job.status = JobStatus.FAILED.name.lower()
    else:
        logger.info(f"Pipeline job {uuid} completed successfully.")
        job.status = JobStatus.COMPLETED.name.lower()


def run_pipeline_step_functions(
    pipeline_seq_regions: list[Pipeline_seq_region],
    job_id: str,
    job_service: JobService,
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
    logger.info(f"Initiating Step Functions pipeline run for job {job_id}.")

    # Convert Pydantic models to dicts
    seq_regions = [sr.model_dump() for sr in pipeline_seq_regions]

    try:
        job_service.start_job(job_id, seq_regions)
        logger.info(f"Step Functions execution started for job {job_id}.")
    except JobServiceError as e:
        # JobService already handles updating the job status to FAILED
        logger.error(f"Failed to start Step Functions execution for job {job_id}: {e}")
    except Exception as e:
        # Unexpected error - try to update job status
        logger.error(
            f"Unexpected error starting Step Functions execution for job {job_id}: {e}"
        )
        try:
            from job_service import JobStatus as SFStatus, JobStage

            job_service._update_job_dynamodb(
                job_id,
                status=SFStatus.FAILED,
                stage=JobStage.ERROR,
                error_message=f"Unexpected error: {str(e)[:500]}",
            )
        except Exception as update_err:
            logger.error(f"Failed to update job status after error: {update_err}")


def run_pipeline_local(
    pipeline_seq_regions: list[Pipeline_seq_region],
    job_id: str,
    job_service: JobService,
) -> None:
    """
    Run the backend alignment pipeline using local execution (EC2 mode).

    Args:
        pipeline_seq_regions: sequence regions for pipeline input
        job_id: Job ID
        job_service: JobService instance

    Note:
        This function runs in the background. Errors are logged and
        the job status is updated to FAILED in the local store.
    """
    logger.info(f"Initiating local pipeline run for job {job_id}.")

    # Convert Pydantic models to dicts
    seq_regions = [sr.model_dump() for sr in pipeline_seq_regions]

    try:
        job_service.start_job(job_id, seq_regions)
        logger.info(f"Local pipeline execution completed for job {job_id}.")
    except JobServiceError as e:
        # JobService already handles updating the job status to FAILED
        logger.error(f"Failed to run local pipeline for job {job_id}: {e}")
    except Exception as e:
        # Unexpected error - try to update job status
        logger.error(
            f"Unexpected error running local pipeline for job {job_id}: {e}"
        )
        try:
            from job_service import JobStatus as SFStatus, JobStage
            from local_job_store import get_local_job_store
            from datetime import datetime

            store = get_local_job_store()
            now = datetime.utcnow().isoformat() + "Z"
            store.update_job(
                job_id,
                status=SFStatus.FAILED.value,
                stage=JobStage.ERROR.value,
                completed_at=now,
                error_message=f"Unexpected error: {str(e)[:500]}",
            )
        except Exception as update_err:
            logger.error(f"Failed to update job status after error: {update_err}")


app = FastAPI()
router = APIRouter(prefix="/api")

# Legacy in-memory job storage (used when USE_STEP_FUNCTIONS=false)
jobs: dict[UUID, Pipeline_job] = {}


def get_pipeline_job(uuid: UUID) -> Pipeline_job | None:
    """Get job from in-memory storage (legacy mode) with stage inference."""
    if uuid not in jobs.keys():
        logger.warning(f"Pipeline job with UUID {uuid} not found.")
        return None

    job = jobs[uuid]

    # Infer stage and task events from Nextflow log for running/completed/failed jobs
    if job.status == JobStatus.RUNNING.name.lower():
        job.stage = _infer_stage_from_nextflow_log(uuid)
        job.task_events = _parse_task_events_from_nextflow_log(uuid)
    elif job.status == JobStatus.COMPLETED.name.lower():
        job.stage = "done"
        job.task_events = _parse_task_events_from_nextflow_log(uuid)
    elif job.status == JobStatus.FAILED.name.lower():
        job.stage = _infer_stage_from_nextflow_log(uuid)
        job.task_events = _parse_task_events_from_nextflow_log(uuid)

    return job


def _infer_stage_from_nextflow_log(job_uuid: UUID) -> str:
    """Parse Nextflow log to determine current pipeline stage."""
    log_file = ".nextflow.log"
    job_name = f"pavi-job-{job_uuid}"

    if not os.path.exists(log_file):
        return "sequence_retrieval"

    try:
        with open(log_file, "r") as f:
            content = f.read()

        # Find where this job starts in the log
        job_start_marker = f"Run name: {job_name}"
        job_start_idx = content.rfind(job_start_marker)

        if job_start_idx == -1:
            return "sequence_retrieval"

        # Only look at log content after this job started
        job_log = content[job_start_idx:]

        # Check which processes have been submitted (in reverse priority order)
        if "Submitted process > collectAndAlignSeqInfo" in job_log:
            return "done"  # Final step submitted
        elif "Submitted process > alignment" in job_log:
            return "alignment"
        else:
            return "sequence_retrieval"
    except Exception as e:
        logger.warning(f"Error parsing Nextflow log for stage: {e}")
        return "sequence_retrieval"


def _parse_task_events_from_nextflow_log(job_uuid: UUID) -> list[str]:
    """Parse Nextflow log to extract task-level events (submitted and completed)."""
    log_file = ".nextflow.log"
    job_name = f"pavi-job-{job_uuid}"
    events: list[str] = []

    if not os.path.exists(log_file):
        return events

    try:
        with open(log_file, "r") as f:
            content = f.read()

        # Find where this job starts in the log
        job_start_marker = f"Run name: {job_name}"
        job_start_idx = content.rfind(job_start_marker)

        if job_start_idx == -1:
            return events

        # Only look at log content after this job started
        job_log = content[job_start_idx:]

        # Parse submitted events (when tasks start)
        # Pattern: "[d7/e8390b] Submitted process > sequence_retrieval (1)"
        submitted_pattern = r"Submitted process > ([^\n]+)"
        submitted_matches = re.findall(submitted_pattern, job_log)

        for task_name in submitted_matches:
            task_name = task_name.strip()
            if task_name.startswith("sequence_retrieval"):
                num_match = re.search(r"\((\d+)\)", task_name)
                if num_match:
                    events.append(f"Retrieving sequence {num_match.group(1)}...")
            elif task_name.startswith("alignment"):
                events.append("Running alignment...")
            elif task_name.startswith("collectAndAlignSeqInfo"):
                events.append("Collecting results...")

        # Parse task completion events
        # Pattern: "Task completed > TaskHandler[...name: sequence_retrieval (1); status: COMPLETED...]"
        completed_pattern = r"Task completed > TaskHandler\[.*?name: ([^;]+); status: COMPLETED"
        completed_matches = re.findall(completed_pattern, job_log)

        for task_name in completed_matches:
            task_name = task_name.strip()
            if task_name.startswith("sequence_retrieval"):
                num_match = re.search(r"\((\d+)\)", task_name)
                if num_match:
                    events.append(f"Sequence {num_match.group(1)} retrieved")
            elif task_name.startswith("alignment"):
                events.append("Alignment complete")
            elif task_name.startswith("collectAndAlignSeqInfo"):
                events.append("Results finalized")

        return events
    except Exception as e:
        logger.warning(f"Error parsing Nextflow log for task events: {e}")
        return events


@router.get("/")
async def help_msg() -> dict[str, str]:
    return {
        "help": "Welcome to the PAVI API! For more information on how to use it, see the docs at {host}/docs"
    }


def _resolve_api_version() -> str:
    """Best-effort API version: env override, then installed package metadata,
    then the pyproject.toml on disk, else 'unknown'."""
    import os

    env_version = os.environ.get("PAVI_API_VERSION")
    if env_version:
        return env_version
    try:
        from importlib.metadata import version

        return version("pavi-api")
    except Exception:
        pass
    try:
        import tomllib
        from pathlib import Path

        pyproject = Path(__file__).resolve().parent.parent / "pyproject.toml"
        with open(pyproject, "rb") as fh:
            return str(tomllib.load(fh)["project"]["version"])
    except Exception:
        return "unknown"


API_VERSION = _resolve_api_version()


@router.get(
    "/health",
    status_code=200,
    description="Health endpoint to check API health",
    tags=["metadata"],
)
async def health() -> dict[str, Any]:
    if USE_LOCAL_PIPELINE:
        mode = "local_pipeline"
    elif USE_STEP_FUNCTIONS:
        mode = "step_functions"
    else:
        mode = "nextflow"

    response: dict[str, Any] = {
        "status": "up",
        "version": API_VERSION,
        "execution_mode": mode,
        "environment": _config.environment.value,
    }

    # Add rollout info if enabled (only for Step Functions)
    if _config.pipeline.enable_step_functions_rollout and USE_STEP_FUNCTIONS:
        response["rollout"] = {
            "enabled": True,
            "percentage": _config.pipeline.step_functions_rollout_percentage,
        }

    # Add local pipeline paths if in local mode
    if USE_LOCAL_PIPELINE:
        response["local_paths"] = {
            "jobs": _config.pipeline.local_jobs_path,
            "results": _config.pipeline.local_results_path,
            "work": _config.pipeline.local_work_path,
        }

    return response


@router.get(
    "/deployment-status",
    status_code=200,
    description="Deployment status for all PAVI components",
    tags=["metadata"],
)
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

    # Determine execution mode
    if USE_LOCAL_PIPELINE:
        exec_mode = "local_pipeline"
    elif USE_STEP_FUNCTIONS:
        exec_mode = "step_functions"
    else:
        exec_mode = "nextflow"

    # API Status
    components["api"] = {
        "name": "API Service",
        "status": "healthy",
        "environment": _config.environment.value,
        "execution_mode": exec_mode,
        "details": {
            "host": _config.api_host,
            "port": _config.api_port,
            "debug": _config.debug,
        },
    }

    # Local Pipeline Status (if enabled)
    if USE_LOCAL_PIPELINE:
        local_status: dict[str, Any] = {
            "name": "Local Pipeline",
            "status": "healthy",
            "details": {
                "jobs_path": _config.pipeline.local_jobs_path,
                "results_path": _config.pipeline.local_results_path,
                "work_path": _config.pipeline.local_work_path,
                "max_workers": _config.pipeline.local_max_workers,
            },
        }

        # Check if directories exist and are writable
        import os
        for path_name, path in [
            ("jobs", _config.pipeline.local_jobs_path),
            ("results", _config.pipeline.local_results_path),
            ("work", _config.pipeline.local_work_path),
        ]:
            if not os.path.exists(path):
                local_status["details"][f"{path_name}_exists"] = False
            elif not os.access(path, os.W_OK):
                local_status["details"][f"{path_name}_writable"] = False
                local_status["status"] = "degraded"
            else:
                local_status["details"][f"{path_name}_exists"] = True
                local_status["details"][f"{path_name}_writable"] = True

        # Check if clustalo is available
        import shutil
        clustalo_path = shutil.which("clustalo")
        if clustalo_path:
            local_status["details"]["clustalo"] = clustalo_path
        else:
            local_status["details"]["clustalo"] = "not found"
            local_status["status"] = "degraded"

        components["local_pipeline"] = local_status

    # Step Functions Status
    sf_status: dict[str, Any] = {
        "name": "Step Functions",
        "status": "unknown",
        "details": {},
    }

    if USE_STEP_FUNCTIONS and _config.pipeline.state_machine_arn:
        try:
            sfn_client = boto3.client("stepfunctions")
            response = sfn_client.describe_state_machine(
                stateMachineArn=_config.pipeline.state_machine_arn
            )
            sf_status["status"] = (
                "healthy" if response.get("status") == "ACTIVE" else "unhealthy"
            )
            sf_status["details"] = {
                "arn": _config.pipeline.state_machine_arn,
                "name": response.get("name", "Unknown"),
                "state": response.get("status", "Unknown"),
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
        "details": {},
    }

    if _config.pipeline.job_queue_arn:
        try:
            batch_client = boto3.client("batch")
            response = batch_client.describe_job_queues(
                jobQueues=[_config.pipeline.job_queue_arn]
            )
            if response.get("jobQueues"):
                queue = response["jobQueues"][0]
                batch_status["status"] = (
                    "healthy" if queue.get("status") == "VALID" else "unhealthy"
                )
                batch_status["details"] = {
                    "arn": _config.pipeline.job_queue_arn,
                    "name": queue.get("jobQueueName", "Unknown"),
                    "state": queue.get("state", "Unknown"),
                    "status": queue.get("status", "Unknown"),
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
        "details": {},
    }

    try:
        dynamodb = boto3.client("dynamodb")
        response = dynamodb.describe_table(TableName=_config.pipeline.jobs_table_name)
        table = response.get("Table", {})
        dynamo_status["status"] = (
            "healthy" if table.get("TableStatus") == "ACTIVE" else "unhealthy"
        )
        dynamo_status["details"] = {
            "table_name": _config.pipeline.jobs_table_name,
            "status": table.get("TableStatus", "Unknown"),
            "item_count": table.get("ItemCount", 0),
        }
    except NoCredentialsError:
        dynamo_status["status"] = "unavailable"
        dynamo_status["details"]["error"] = "AWS credentials not configured"
    except ClientError as e:
        if "ResourceNotFoundException" in str(e):
            dynamo_status["status"] = "not_found"
            dynamo_status["details"]["error"] = (
                f"Table {_config.pipeline.jobs_table_name} not found"
            )
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
        "details": {},
    }

    # Initialize S3 client once for both bucket checks
    s3 = boto3.client("s3")

    try:
        s3.head_bucket(Bucket=_config.pipeline.results_bucket)
        s3_results_status["status"] = "healthy"
        s3_results_status["details"] = {
            "bucket_name": _config.pipeline.results_bucket,
        }
    except NoCredentialsError:
        s3_results_status["status"] = "unavailable"
        s3_results_status["details"]["error"] = "AWS credentials not configured"
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code == "404":
            s3_results_status["status"] = "not_found"
            s3_results_status["details"]["error"] = (
                f"Bucket {_config.pipeline.results_bucket} not found"
            )
        elif error_code == "403":
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
            "details": {},
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
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code == "404":
                s3_work_status["status"] = "not_found"
                s3_work_status["details"]["error"] = (
                    f"Bucket {_config.pipeline.work_bucket} not found"
                )
            elif error_code == "403":
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
    statuses = [c.get("status") for c in components.values()]
    if all(s in ["healthy", "disabled"] for s in statuses):
        overall = "healthy"
    elif any(s in ["error", "unhealthy"] for s in statuses):
        overall = "degraded"
    elif any(s == "unavailable" for s in statuses):
        overall = "unavailable"
    else:
        overall = "unknown"

    return {
        "overall_status": overall,
        "environment": _config.environment.value,
        "components": components,
    }


@router.post("/pipeline-job/", status_code=201, response_model_exclude_none=True)
async def create_new_pipeline_job(
    pipeline_seq_regions: list[Pipeline_seq_region], background_tasks: BackgroundTasks
) -> Pipeline_job:
    """
    Create and start a new pipeline job.

    In local pipeline mode (EC2), job is created in SQLite and executed directly.
    In Step Functions mode, job is created in DynamoDB and execution started.
    In Nextflow mode (legacy), job is stored in-memory and Nextflow is invoked.

    When gradual rollout is enabled, jobs are routed to Step Functions based
    on a percentage configured via STEP_FUNCTIONS_ROLLOUT_PERCENTAGE.
    """
    # Generate job ID first for consistent routing
    new_job_id = str(uuid1())

    # Check local pipeline mode first (takes precedence)
    use_local = should_use_local_pipeline(_config)

    if use_local:
        # Local pipeline mode (EC2 deployment)
        job_service = get_job_service()
        seq_regions = [sr.model_dump() for sr in pipeline_seq_regions]

        # Create job in local SQLite store
        job_info = job_service.create_job(seq_regions)
        logger.info(f"Created local pipeline job {job_info.job_id}.")

        # Start local execution in background
        background_tasks.add_task(
            func=run_pipeline_local,
            pipeline_seq_regions=pipeline_seq_regions,
            job_id=job_info.job_id,
            job_service=job_service,
        )

        return Pipeline_job.from_job_info(job_info)

    # Determine which backend to use (supports gradual rollout)
    use_sf = should_use_step_functions(_config, new_job_id)

    if use_sf:
        # Step Functions mode
        job_service = get_job_service()
        seq_regions = [sr.model_dump() for sr in pipeline_seq_regions]

        # Create job in DynamoDB
        job_info = job_service.create_job(seq_regions)
        logger.info(f"Created Step Functions pipeline job {job_info.job_id}.")

        # Start execution in background
        background_tasks.add_task(
            func=run_pipeline_step_functions,
            pipeline_seq_regions=pipeline_seq_regions,
            job_id=job_info.job_id,
            job_service=job_service,
        )

        return Pipeline_job.from_job_info(job_info)
    else:
        # Legacy Nextflow mode
        new_task: Pipeline_job = Pipeline_job(uuid=UUID(new_job_id))
        jobs[new_task.uuid] = new_task
        logger.info(f"Created Nextflow pipeline job {new_task.uuid}.")
        background_tasks.add_task(
            func=run_pipeline,
            pipeline_seq_regions=pipeline_seq_regions,
            uuid=new_task.uuid,
        )

        return new_task


@router.get(
    "/pipeline-job/{uuid}",
    response_model_exclude_none=True,
    responses={404: {"model": HTTP_exception_response}},
)
async def get_pipeline_job_handler(uuid: UUID) -> Pipeline_job:
    """
    Get job status and details.

    For running jobs in Step Functions mode, this will sync the status
    from the Step Functions execution before returning.
    """
    if USE_LOCAL_PIPELINE or USE_STEP_FUNCTIONS:
        job_service = get_job_service()
        try:
            # Use get_job_with_sync to auto-update status from Step Functions
            # (for local pipeline, this just fetches from SQLite)
            job_info = job_service.get_job_with_sync(str(uuid))
            if job_info is None:
                raise HTTPException(status_code=404, detail="Job not found.")
            return Pipeline_job.from_job_info(job_info)
        except JobServiceError as e:
            logger.error(f"Error getting job {uuid}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error retrieving job: {str(e)}"
            )
    else:
        job: Pipeline_job | None = get_pipeline_job(uuid)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found.")
        else:
            return job


@router.get(
    "/pipeline-job/{uuid}/result/alignment",
    responses={
        404: {"model": HTTP_exception_response},
        400: {"model": HTTP_exception_response},
        500: {"model": HTTP_exception_response},
    },
)
async def get_pipeline_job_alignment_result(uuid: UUID) -> StreamingResponse:
    """
    Get alignment result file.

    Returns 400 if the job has failed or is not yet complete.
    Returns 404 if the job or result file is not found.
    """
    if USE_LOCAL_PIPELINE or USE_STEP_FUNCTIONS:
        job_service = get_job_service()

        # First sync and check job status
        try:
            job_info = job_service.get_job_with_sync(str(uuid))
        except JobServiceError as e:
            logger.error(f"Error getting job {uuid}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error retrieving job: {str(e)}"
            )

        if job_info is None:
            raise HTTPException(status_code=404, detail="Job not found.")

        # Check job status before returning results
        if job_info.status == SFJobStatus.FAILED:
            error_msg = job_info.error_message or "Job execution failed"
            raise HTTPException(status_code=400, detail=f"Job failed: {error_msg}")

        if job_info.status != SFJobStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail=f"Results not ready. Job status: {job_info.status.value.lower()}",
            )

        content = job_service.get_job_result_alignment(str(uuid))
        if content is None:
            logger.warning(
                f'GET result/alignment error: File not found for job "{uuid}".'
            )
            raise HTTPException(status_code=404, detail="Result file not found.")

        def iterfile():  # type: ignore
            with BytesIO(content) as f:
                yield from f

        return StreamingResponse(iterfile(), media_type="text/plain")
    else:
        # Legacy filesystem-based retrieval
        try:
            from smart_open import open as smart_open

            file_like = smart_open(
                f"{api_results_path_prefix}pipeline-results_{uuid}/alignment-output.aln",
                mode="rb",
            )
        except FileNotFoundError:
            logger.warning(
                f'GET result/alignment error: File not found for job "{uuid}".'
            )
            raise HTTPException(status_code=404, detail="File not found.")
        except OSError as error:
            logger.warning(
                f'GET result/alignment error: OS error caught while opening "{uuid}" result file.'
            )
            raise HTTPException(status_code=404, detail=f"OS error caught: {error}.")
        else:

            def iterfile():  # type: ignore
                with file_like:
                    yield from file_like

            return StreamingResponse(iterfile(), media_type="text/plain")


@router.get(
    "/pipeline-job/{uuid}/result/seq-info",
    responses={
        404: {"model": HTTP_exception_response},
        400: {"model": HTTP_exception_response},
        500: {"model": HTTP_exception_response},
    },
)
async def get_pipeline_job_seq_info_result(uuid: UUID) -> StreamingResponse:
    """
    Get sequence info result file.

    Returns 400 if the job has failed or is not yet complete.
    Returns 404 if the job or result file is not found.
    """
    if USE_LOCAL_PIPELINE or USE_STEP_FUNCTIONS:
        job_service = get_job_service()

        # First sync and check job status
        try:
            job_info = job_service.get_job_with_sync(str(uuid))
        except JobServiceError as e:
            logger.error(f"Error getting job {uuid}: {e}")
            raise HTTPException(
                status_code=500, detail=f"Error retrieving job: {str(e)}"
            )

        if job_info is None:
            raise HTTPException(status_code=404, detail="Job not found.")

        # Check job status before returning results
        if job_info.status == SFJobStatus.FAILED:
            error_msg = job_info.error_message or "Job execution failed"
            raise HTTPException(status_code=400, detail=f"Job failed: {error_msg}")

        if job_info.status != SFJobStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail=f"Results not ready. Job status: {job_info.status.value.lower()}",
            )

        content = job_service.get_job_result_seqinfo(str(uuid))
        if content is None:
            logger.warning(
                f'GET result/seq-info error: File not found for job "{uuid}".'
            )
            raise HTTPException(status_code=404, detail="Result file not found.")

        def iterfile():  # type: ignore
            with BytesIO(content) as f:
                yield from f

        return StreamingResponse(iterfile(), media_type="application/json")
    else:
        # Legacy filesystem-based retrieval
        try:
            from smart_open import open as smart_open

            file_like = smart_open(
                f"{api_results_path_prefix}pipeline-results_{uuid}/aligned_seq_info.json",
                mode="rb",
            )
        except FileNotFoundError:
            logger.warning(
                f'GET result/seq-info error: File not found for job "{uuid}".'
            )
            raise HTTPException(status_code=404, detail="File not found.")
        except OSError as error:
            logger.warning(
                f'GET result/seq-info error: OS error caught while opening "{uuid}" result file.'
            )
            raise HTTPException(status_code=404, detail=f"OS error caught: {error}.")
        else:

            def iterfile():  # type: ignore
                with file_like:
                    yield from file_like

            return StreamingResponse(iterfile(), media_type="application/json")


@router.get(
    "/pipeline-job/{uuid}/export",
    responses={
        404: {"model": HTTP_exception_response},
        501: {"model": HTTP_exception_response},
    },
)
async def get_pipeline_job_export(
    uuid: UUID,
    fmt: Literal["db", "json", "fasta", "csv"] = Query("db", alias="format"),
) -> Response:
    """
    Download a finished job in one of several formats.

    - ``db`` (default): the self-contained per-job SQLite (`job.db`) holding
      the original input payload, the alignment output, and the seq-info.
    - ``json``: the same contents as a single self-contained JSON bundle.
    - ``fasta``: the aligned protein sequences (with gaps).
    - ``csv``: a flat table of the embedded variants across all sequences.

    Currently produced only by the local pipeline mode. Step Functions
    mode does not yet emit a per-job DB.
    """
    if not USE_LOCAL_PIPELINE:
        raise HTTPException(
            status_code=501,
            detail="Per-job export is currently only available in local pipeline mode.",
        )

    job_service = get_job_service()
    db_path = job_db.db_path_for_job(job_service.local_results_path, str(uuid))
    if not db_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Per-job DB not found. The job may not be complete yet, or it predates the per-job DB feature.",
        )

    base_name = f"pavi-job-{uuid}"

    if fmt == "db":
        def iterfile():  # type: ignore
            with open(db_path, "rb") as f:
                yield from f

        return StreamingResponse(
            iterfile(),
            media_type="application/x-sqlite3",
            headers={
                "Content-Disposition": f'attachment; filename="{base_name}.db"'
            },
        )

    if fmt == "json":
        body = job_db.export_bundle_json(db_path)
        media_type, extension = "application/json", "json"
    elif fmt == "fasta":
        body = job_db.export_fasta(db_path)
        media_type, extension = "text/x-fasta", "fasta"
    else:  # csv
        body = job_db.export_variants_csv(db_path)
        media_type, extension = "text/csv", "csv"

    return Response(
        content=body,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{base_name}.{extension}"'
        },
    )


@router.get(
    "/pipeline-job/{uuid}/logs",
    responses={
        400: {"model": HTTP_exception_response},
        404: {"model": HTTP_exception_response},
    },
)
async def get_pipeline_job_logs(uuid: UUID) -> StreamingResponse:
    """
    Get job logs.

    Note: In local pipeline mode, logs are from the local pipeline execution.
    In Step Functions mode, logs are retrieved from CloudWatch.
    In Nextflow mode, logs are retrieved from Nextflow log command.
    """
    if USE_LOCAL_PIPELINE:
        # TODO: Implement local log retrieval (from work directory)
        raise HTTPException(
            status_code=501,
            detail="Log retrieval not yet implemented for local pipeline mode.",
        )

    if USE_STEP_FUNCTIONS:
        # TODO: Implement CloudWatch log retrieval for Step Functions mode
        raise HTTPException(
            status_code=501,
            detail="Log retrieval not yet implemented for Step Functions mode.",
        )

    # Legacy Nextflow log retrieval
    job: Pipeline_job | None = get_pipeline_job(uuid)
    if job is None:
        logger.warning(f'GET job logs error: job "{uuid}" not found.')
        raise HTTPException(status_code=404, detail="Job not found.")

    # Check if job has completed before running nextflow log
    # (nextflow log cannot be executed on non-complete jobs, will fail)
    if JobStatus[job.status.upper()].value < JobStatus.FAILED.value:
        msg = f"Logs can only be retrieved for failed or completed jobs ({job.uuid} is not yet)"
        logger.warning(msg)
        raise HTTPException(status_code=400, detail=msg)

    try:
        result = subprocess.run(
            ["./nextflow.sh", "log", job.name, "-f", "stderr,stdout"],
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
    except subprocess.CalledProcessError as e:
        logger.error(
            f"Error while fetching nextflow logs for job named {job.name}: {e}"
        )
        logger.error(f"Failing command output: {e.output}")
        raise HTTPException(
            status_code=500, detail="Error occured while retrieving logs."
        )
    else:
        if not result.stdout:
            logger.warning(f"GET job logs error: No logs found for uuid {job.uuid}.")
            raise HTTPException(status_code=404, detail="Job found but no logs found.")

        def contentStream():  # type: ignore
            with StringIO(result.stdout) as file_like:
                yield from file_like

        return StreamingResponse(contentStream(), media_type="text/plain")


app.include_router(router)
