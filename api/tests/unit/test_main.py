from fastapi.testclient import TestClient

from main import app
from uuid import UUID

client = TestClient(app)

# NOT_FOUND_UUID = '073a0fde-07f1-11ef-925f-efc29a5ca054'
NOT_FOUND_UUID: UUID = '00000000-0000-0000-0000-000000000000'


def test_root_accessible():
    response = client.get("/")

    assert response.status_code == 200


def test_job_not_found():
    response = client.get(f'/pipeline-job/{NOT_FOUND_UUID}')

    assert response.status_code == 404


def test_result_not_found():
    response = client.get(f'/pipeline-job/{NOT_FOUND_UUID}/alignment-result')

    assert response.status_code == 404
