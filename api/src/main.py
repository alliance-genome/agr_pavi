from fastapi import APIRouter, BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from io import StringIO
from os import getenv
from pydantic import BaseModel
from smart_open import open  # type: ignore

from typing import Any

import json
import subprocess
from uuid import uuid1, UUID

from constants import JobStatus
from log_mgmt import get_logger

logger = get_logger(name=__name__)

api_results_path_prefix = getenv("API_NEXTFLOW_OUT_DIR", './') + 'results/'
nf_workdir = getenv("API_NEXTFLOW_OUT_DIR", './') + 'work/'
api_execution_env = getenv("API_EXECUTION_ENV", 'local')
api_pipeline_image_tag = getenv("API_PIPELINE_IMAGE_TAG", 'latest')


class Pipeline_seq_region(BaseModel):
    name: str
    seq_id: str
    seq_strand: str
    exon_seq_regions: list[str | dict[str, str | int]]
    cds_seq_regions: list[str | dict[str, str | int]]
    fasta_file_url: str


class Pipeline_job(BaseModel):
    uuid: UUID
    status: str = JobStatus.PENDING.name.lower()
    name: str

    def __init__(self, uuid: UUID):
        super().__init__(uuid=uuid, name=f'pavi-job-{uuid}')


class HTTP_exception_response(BaseModel):
    details: str


def run_pipeline(pipeline_seq_regions: list[Pipeline_seq_region], uuid: UUID) -> None:
    """
    Run the backend alignment pipeline.

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


app = FastAPI()
router = APIRouter(
    prefix="/api"
)

jobs: dict[UUID, Pipeline_job] = {}


def get_pipeline_job(uuid: UUID) -> Pipeline_job | None:
    if uuid not in jobs.keys():
        logger.warning(f'Pipeline job with UUID {uuid} not found.')
        return None
    else:
        return jobs[uuid]


@router.get("/")
async def help_msg() -> dict[str, str]:
    return {"help": "Welcome to the PAVI API! For more information on how to use it, see the docs at {host}/docs"}


@router.get("/health", status_code=200, description='Health endpoint to check API health', tags=['metadata'])
async def health() -> dict[str, str]:
    return {"status": "up"}


@router.post('/pipeline-job/', status_code=201, response_model_exclude_none=True)
async def create_new_pipeline_job(pipeline_seq_regions: list[Pipeline_seq_region], background_tasks: BackgroundTasks) -> Pipeline_job:
    new_task: Pipeline_job = Pipeline_job(uuid=uuid1())
    jobs[new_task.uuid] = new_task
    logger.info(f'Created pipeline job {new_task.uuid}.')
    background_tasks.add_task(func=run_pipeline, pipeline_seq_regions=pipeline_seq_regions, uuid=new_task.uuid)

    return new_task


@router.get("/pipeline-job/{uuid}", response_model_exclude_none=True, responses={404: {'model': HTTP_exception_response}})
async def get_pipeline_job_handler(uuid: UUID) -> Pipeline_job:
    job: Pipeline_job | None = get_pipeline_job(uuid)
    if job is None:
        raise HTTPException(status_code=404, detail='Job not found.')
    else:
        return job


@router.get("/pipeline-job/{uuid}/alignment-result", responses={404: {'model': HTTP_exception_response}})
async def get_pipeline_job_alignment_result(uuid: UUID) -> StreamingResponse:
    try:
        file_like = open(f'{api_results_path_prefix}pipeline-results_{uuid}/alignment-output.aln', mode="rb")
    except FileNotFoundError:
        logger.warning(f'GET alignment-result error: File not found for job "{uuid}".')
        raise HTTPException(status_code=404, detail='File not found.')
    except OSError as error:
        logger.warning(f'GET alignment-result error: OS error caught while opening "{uuid}" result file.')
        raise HTTPException(status_code=404, detail=f'OS error caught: {error}.')
    else:
        def iterfile():  # type: ignore
            with file_like:
                yield from file_like

        return StreamingResponse(iterfile(), media_type="text/plain")


@router.get("/pipeline-job/{uuid}/logs", responses={400: {'model': HTTP_exception_response}, 404: {'model': HTTP_exception_response}})
async def get_pipeline_job_logs(uuid: UUID) -> StreamingResponse:
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
            check=True, capture_output=True, text=True, stderr=subprocess.STDOUT)
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
