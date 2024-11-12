from fastapi.testclient import TestClient

from src.main import app
from os import environ, getcwd, getenv
from typing import Any
from uuid import UUID

from .helper_fns import poll_job_progress

from httpx import Client
from httpx import codes


external_api_base_url = getenv('EXTERNAL_API_BASE_URL')

client: TestClient | Client
if external_api_base_url:
    client = Client(base_url=external_api_base_url, follow_redirects=False)
else:
    client = TestClient(app, follow_redirects=False)
    environ["API_RESULTS_PATH_PREFIX"] = f'{getcwd()}/'
    environ["API_EXECUTION_ENV"] = 'local'


def test_success_pipeline_workflow() -> None:

    # Initiate pipeline
    input_data: str
    with open('../tests/resources/submit-workflow-success-API-payload.json', mode='r') as input_file:
        input_data = input_file.read()

    response = client.post(url='/api/pipeline-job/', content=input_data)
    assert response.status_code == 201

    response_dict: dict[str, Any] = response.json()
    assert all(key in response_dict.keys() for key in ['uuid', 'status'])

    job_uuid: UUID = response_dict['uuid']

    # Poll pipeline progress until completed (or timeout)
    final_response = poll_job_progress(client, job_uuid)

    assert final_response['status'] == 'completed'

    # Collect and compare pipeline result
    response = client.get(f'/api/pipeline-job/{job_uuid}/alignment-result')

    assert response.status_code == 200, f'Result retrieval for {job_uuid} did not return success.'

    with open('../tests/resources/submit-workflow-success-output.aln', mode='r') as expected_result_file:
        assert response.text == expected_result_file.read()

    # Collect pipeline logs and ensure non-empty result
    response = client.get(f'/api/pipeline-job/{job_uuid}/logs')

    assert response.status_code == 200, f'Log retrieval for {job_uuid} did not return success.'
    assert response.text != ""


def test_invalid_pipeline_submission() -> None:

    # Test invalid input pipeline initiation
    invalid_input_data: str
    with open('../tests/resources/invalid_seq_regions.json', mode='r') as input_file:
        invalid_input_data = input_file.read()

    response = client.post(url='/api/pipeline-job/', content=invalid_input_data)
    assert codes.is_client_error(response.status_code)


def test_fail_pipeline_workflow() -> None:

    # Initiate pipeline
    input_data: str
    with open('../tests/resources/pipeline_failure_seq_regions.json', mode='r') as input_file:
        input_data = input_file.read()

    response = client.post(url='/api/pipeline-job/', content=input_data)
    assert response.status_code == 201

    response_dict: dict[str, Any] = response.json()
    assert all(key in response_dict.keys() for key in ['uuid', 'status'])

    job_uuid: UUID = response_dict['uuid']

    # Poll pipeline progress until completed (or timeout)
    final_response = poll_job_progress(client, job_uuid)

    assert final_response['status'] == 'failed'

    # Pipeline results should not be found
    response = client.get(f'/api/pipeline-job/{job_uuid}/alignment-result')

    assert response.status_code == 404, f'Result retrieval for {job_uuid} did not return not-found.'

    # Collect pipeline logs and ensure non-empty result
    response = client.get(f'/api/pipeline-job/{job_uuid}/logs')

    assert response.status_code == 200, f'Log retrieval for {job_uuid} did not return success.'
    assert response.text != ""
