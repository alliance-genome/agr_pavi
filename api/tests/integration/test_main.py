from fastapi.testclient import TestClient

from main import app
from os import environ, getcwd
from time import sleep
from uuid import UUID

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

    # Poll pipeline progress untill completed (or timeout)
    walltime = 0
    TIMEOUT = 10 * 60  # Timeout after 10 Minutes
    INTERVAL = 30  # Poll every 30 seconds
    while walltime < TIMEOUT:
        response = client.get(f'/pipeline-job/{job_uuid}')
        assert response.status_code == 200

        response_dict: dict = response.json()
        assert all(key in response_dict.keys() for key in ['uuid', 'status'])
        assert response_dict['uuid'] == job_uuid

        if response_dict['status'] == 'completed':
            break
        else:
            sleep(INTERVAL)
            walltime += INTERVAL

    assert walltime < TIMEOUT, 'API failed to report job completion before timeout.'

    # Collect and compare pipeline result
    response = client.get(f'/pipeline-job/{job_uuid}/alignment-result')

    assert response.status_code == 200

    input_data: str
    with open('../pipeline/workflow/tests/resources/integration-test-results.aln', mode='r') as expected_result_file:
        assert response.text == expected_result_file.read()
