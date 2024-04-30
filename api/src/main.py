from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel

import json
import subprocess

class Pipeline_seq_region(BaseModel):
    name: str
    seq_id: str
    seq_strand: str
    seq_regions: list[str|dict[str,str|int]]
    fasta_file_url: str

def run_pipeline(pipeline_seq_regions: list[Pipeline_seq_region]) -> None:
    model_dumps: list = []
    for seq_region in pipeline_seq_regions:
        model_dumps.append(seq_region.model_dump())
    seq_regions_json: str = json.dumps(model_dumps)

    seqregions_filename = 'seq_regions.json'
    with open(seqregions_filename, mode='w') as seqregions_file:
        seqregions_file.write(seq_regions_json)

    subprocess.run(['./nextflow.sh', 'run', '-profile', 'aws', 'protein-msa.nf',
                    '--input_seq_regions_file', seqregions_filename])

app = FastAPI()

@app.get("/")
async def help_msg():
    return {"help": "Welcome to the PAVI API! For more information on how to use it, see the docs at {host}/docs"}

@app.post('/pipeline-job/', status_code=202)
async def post_pipeline_job(pipeline_seq_regions: list[Pipeline_seq_region], background_tasks: BackgroundTasks):
    background_tasks.add_task(run_pipeline, pipeline_seq_regions)
