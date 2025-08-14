from fastapi.testclient import TestClient

from src.main import app
from uuid import UUID

client = TestClient(app, follow_redirects=False)

NOT_FOUND_UUID: UUID = UUID('00000000-0000-0000-0000-000000000000')


# Health endpoint is used by ELB health checks.
# If path or response status-code changes then .ebextensions/loadbalancer.yml.config
# needs to be updated (HealthCheckPath)
def test_health_reporting() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200


def test_api_root_accessible() -> None:
    response = client.get("/api/")

    assert response.status_code == 200


def test_job_not_found() -> None:
    response = client.get(f'/api/pipeline-job/{NOT_FOUND_UUID}')

    assert response.status_code == 404


def test_result_not_found() -> None:
    response = client.get(f'/api/pipeline-job/{NOT_FOUND_UUID}/result/alignment')

    assert response.status_code == 404
