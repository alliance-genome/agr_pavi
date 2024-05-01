from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel

import json
import subprocess
from uuid import uuid1, UUID

class Pipeline_seq_region(BaseModel):
    name: str
    seq_id: str
    seq_strand: str
    seq_regions: list[str|dict[str,str|int]]
    fasta_file_url: str

class Pipeline_response_post(BaseModel):
    uuid: str

def run_pipeline(pipeline_seq_regions: list[Pipeline_seq_region], uuid: UUID) -> None:
    """
    Run the backend alignment pipeline.

    Args:
        pipeline_seq_regions: sequence regions for pipeline input
        uuid: UUID to uniquely identify the job being run
    """
    model_dumps: list = []
    for seq_region in pipeline_seq_regions:
        model_dumps.append(seq_region.model_dump())
    seq_regions_json: str = json.dumps(model_dumps)

    seqregions_filename = f'seq_regions_{uuid}.json'
    with open(seqregions_filename, mode='w') as seqregions_file:
        seqregions_file.write(seq_regions_json)

    subprocess.run(['./nextflow.sh', 'run', '-profile', 'aws', 'protein-msa.nf',
                    '--input_seq_regions_file', seqregions_filename,
                    '--publish_dir', f'pipeline-results_{uuid}'])

app = FastAPI()

@app.get("/")
async def help_msg():
    return {"help": "Welcome to the PAVI API! For more information on how to use it, see the docs at {host}/docs"}

@app.post('/pipeline-job/', status_code=201)
async def post_pipeline_job(pipeline_seq_regions: list[Pipeline_seq_region], background_tasks: BackgroundTasks) -> Pipeline_response_post:
    job_uuid: UUID = uuid1()
    background_tasks.add_task(func=run_pipeline, pipeline_seq_regions=pipeline_seq_regions, uuid=job_uuid)

    return Pipeline_response_post(uuid=str(job_uuid))
