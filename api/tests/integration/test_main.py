from fastapi.testclient import TestClient

from main import app
from os import environ, getcwd, getenv
from uuid import UUID

from .helper_fns import poll_job_progress

from httpx import Client


external_api_base_url = getenv('EXTERNAL_API_BASE_URL')

client: TestClient | Client
if external_api_base_url:
    client = Client(base_url=external_api_base_url)
else:
    client = TestClient(app)
    environ["API_RESULTS_PATH_PREFIX"] = f'{getcwd()}/'
    environ["API_EXECUTION_ENV"] = 'local'


def test_pipeline_workflow():

    # Initiate pipeline
    input_data: str
    with open('../pipeline/workflow/tests/integration/test_seq_regions.json', mode='r') as input_file:
        input_data = input_file.read()

    response = client.post(url='/pipeline-job/', content=input_data)
    assert response.status_code == 201

    response_dict: dict = response.json()
    assert all(key in response_dict.keys() for key in ['uuid', 'status'])

    job_uuid: UUID = response_dict['uuid']

    # Poll pipeline progress until completed (or timeout)
    poll_job_progress(client, job_uuid)

    # Collect and compare pipeline result
    response = client.get(f'/pipeline-job/{job_uuid}/alignment-result')

    assert response.status_code == 200

    input_data: str
    with open('../pipeline/workflow/tests/resources/integration-test-results.aln', mode='r') as expected_result_file:
        assert response.text == expected_result_file.read()
