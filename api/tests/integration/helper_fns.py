'''
Module with functions used for testing PAVI API functionality
'''

from fastapi.testclient import TestClient
from httpx import Client
from time import sleep
from uuid import UUID

from typing import Any


def poll_job_progress(client: TestClient | Client, job_uuid: UUID, timeout: int = 600, interval: int = 30) -> dict[str, str]:
    '''
    Poll for job progress until completed or timeout occured.

    Agrs:
        client: fastAPI.TestClient or httpx.Client instance to poll
        job_uuid: UUID of job to poll for
        timeout: time to keep polling before timeout error occurs (seconds)
        interval: time to sleep between polling attempts (seconds)

    Returns:
        Response dict on job completion.
    '''

    walltime = 0
    final_response: dict[str, str]
    while walltime < timeout:
        response = client.get(f'/pipeline-job/{job_uuid}')
        assert response.status_code == 200, f'Polling status for {job_uuid} did not return success.'

        response_dict: dict[str, Any] = response.json()
        assert all(key in response_dict.keys() for key in ['uuid', 'status'])
        assert response_dict['uuid'] == job_uuid

        if response_dict['status'] in ['completed', 'failed']:
            final_response = response_dict
            break
        else:
            sleep(interval)
            walltime += interval

    assert walltime < timeout, f'API failed to report job completion for {job_uuid} before timeout.'

    return final_response
