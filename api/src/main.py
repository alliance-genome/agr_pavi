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

api_results_path_prefix = getenv("API_RESULTS_PATH_PREFIX", './')
api_execution_env = getenv("API_EXECUTION_ENV", 'local')
api_pipeline_image_tag = getenv("API_PIPELINE_IMAGE_TAG", 'latest')


class Pipeline_seq_region(BaseModel):
    name: str
    seq_id: str
    seq_strand: str
    seq_regions: list[str | dict[str, str | int]]
    fasta_file_url: str


class Pipeline_job(BaseModel):
    uuid: UUID
    status: str = 'pending'
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
    job: Pipeline_job = jobs[uuid]

    job.status = 'running'

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
             '-profile', api_execution_env,
             '-name', job.name,
             'protein-msa.nf',
             '--image_tag', api_pipeline_image_tag,
             '--input_seq_regions_file', seqregions_filename,
             '--publish_dir_prefix', api_results_path_prefix,
             '--publish_dir', f'pipeline-results_{uuid}'],
            check=True)
    except subprocess.CalledProcessError:
        job.status = 'failed'
    else:
        job.status = 'completed'


app = FastAPI()
router = APIRouter(
    prefix="/api"
)

jobs: dict[UUID, Pipeline_job] = {}


def get_pipeline_job(uuid: UUID) -> Pipeline_job | None:
    if uuid not in jobs.keys():
        # TODO: log warning
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
        raise HTTPException(status_code=404, detail='File not found.')
    except OSError as error:
        raise HTTPException(status_code=404, detail=f'OS error caught: {error}.')
    else:
        def iterfile():  # type: ignore
            with file_like:
                yield from file_like

        return StreamingResponse(iterfile(), media_type="text/plain")


@router.get("/pipeline-job/{uuid}/logs", responses={404: {'model': HTTP_exception_response}})
async def get_pipeline_job_logs(uuid: UUID) -> StreamingResponse:
    job: Pipeline_job | None = get_pipeline_job(uuid)
    if job is None:
        raise HTTPException(status_code=404, detail='Job not found.')

    try:
        result = subprocess.run(
            ['./nextflow.sh', 'log', job.name, '-f', 'stderr,stdout'],
            check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError:
        # TODO: log error
        raise HTTPException(status_code=500, detail='Error occured while retrieving logs.')
    else:
        def contentStream():  # type: ignore
            with StringIO(result.stdout) as file_like:
                yield from file_like

            with StringIO(result.stderr) as file_like:
                yield from file_like

        return StreamingResponse(contentStream(), media_type="text/plain")

app.include_router(router)
