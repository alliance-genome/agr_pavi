from fastapi.testclient import TestClient

from src.main import app
from uuid import uuid1, UUID

from pytest_mock import MockerFixture

client = TestClient(app, follow_redirects=False)

NOT_FOUND_UUID: UUID = UUID("00000000-0000-0000-0000-000000000000")
mock_uuid: UUID = uuid1()


def mock_open_OSError(uri: None = None, **kwargs):  # type: ignore  # noqa: U100
    raise OSError("Test mock OSError")


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
    response = client.get(f"/api/pipeline-job/{NOT_FOUND_UUID}")

    assert response.status_code == 404


def test_alignment_result_not_found() -> None:
    response = client.get(f"/api/pipeline-job/{NOT_FOUND_UUID}/result/alignment")

    assert response.status_code == 404


def test_result_alignment(mocker: MockerFixture) -> None:
    def mock_alignment_open(uri: None = None, **kwargs):  # type: ignore  # noqa: U100
        return open("../tests/resources/submit-workflow-success-output.aln", **kwargs)

    mocker.patch("src.main.open", side_effect=mock_alignment_open)
    response = client.get(f"/api/pipeline-job/{mock_uuid}/result/alignment")

    assert response.status_code == 200
    assert response.text == mock_alignment_open().read()


def test_alignment_result_read_error(mocker: MockerFixture) -> None:
    mocker.patch("src.main.open", side_effect=mock_open_OSError)
    response = client.get(f"/api/pipeline-job/{mock_uuid}/result/alignment")

    assert response.status_code == 404


def test_result_seq_info(mocker: MockerFixture) -> None:
    def mock_seq_info_open(uri: None = None, **kwargs):  # type: ignore  # noqa: U100
        return open(
            "../tests/resources/submit-workflow-success/aligned_seq_info.json", **kwargs
        )

    mocker.patch("src.main.open", side_effect=mock_seq_info_open)
    response = client.get(f"/api/pipeline-job/{mock_uuid}/result/seq-info")

    assert response.status_code == 200
    assert response.text == mock_seq_info_open().read()


def test_alignment_result_seq_info_not_found() -> None:
    response = client.get(f"/api/pipeline-job/{NOT_FOUND_UUID}/result/seq-info")

    assert response.status_code == 404


def test_alignment_result_seq_info_read_error(mocker: MockerFixture) -> None:
    mocker.patch("src.main.open", side_effect=mock_open_OSError)
    response = client.get(f"/api/pipeline-job/{mock_uuid}/result/seq-info")

    assert response.status_code == 404
