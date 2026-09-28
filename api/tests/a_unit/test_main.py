from fastapi.testclient import TestClient

from src.main import app
from uuid import uuid1, UUID

from pytest_mock import MockerFixture

from src.job_service import JobInfo, JobStatus as SFJobStatus

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


def test_docs_load_spec_by_relative_url() -> None:
    # The docs are served at /docs, /api/docs and /pavi/api/docs, so the
    # spec URL must resolve next to each of them, not at the host root.
    response = client.get("/docs")

    assert response.status_code == 200
    assert "url: '../openapi.json'" in response.text
    assert client.get("/openapi.json").status_code == 200


def test_job_not_found() -> None:
    response = client.get(f"/api/pipeline-job/{NOT_FOUND_UUID}")

    assert response.status_code == 404


def test_alignment_result_not_found() -> None:
    response = client.get(f"/api/pipeline-job/{NOT_FOUND_UUID}/result/alignment")

    assert response.status_code == 404


def _mock_completed_job_service(mocker: MockerFixture, alignment: bytes = b"", seqinfo: bytes = b"") -> None:
    """Result endpoints read through the job service (local pipeline / Step Functions mode)."""
    service = mocker.MagicMock()
    service.get_job_with_sync.return_value = JobInfo(job_id=str(mock_uuid), status=SFJobStatus.COMPLETED)
    service.get_job_result_alignment.return_value = alignment
    service.get_job_result_seqinfo.return_value = seqinfo
    mocker.patch("src.main.get_job_service", return_value=service)


def test_result_alignment(mocker: MockerFixture) -> None:
    with open("../tests/resources/submit-workflow-success-output.aln", "rb") as f:
        expected = f.read()
    _mock_completed_job_service(mocker, alignment=expected)
    response = client.get(f"/api/pipeline-job/{mock_uuid}/result/alignment")

    assert response.status_code == 200
    assert response.content == expected


def test_alignment_result_read_error(mocker: MockerFixture) -> None:
    mocker.patch("smart_open.open", side_effect=mock_open_OSError)
    response = client.get(f"/api/pipeline-job/{mock_uuid}/result/alignment")

    assert response.status_code == 404


def test_result_seq_info(mocker: MockerFixture) -> None:
    with open("../tests/resources/submit-workflow-success/aligned_seq_info.json", "rb") as f:
        expected = f.read()
    _mock_completed_job_service(mocker, seqinfo=expected)
    response = client.get(f"/api/pipeline-job/{mock_uuid}/result/seq-info")

    assert response.status_code == 200
    assert response.content == expected


def test_alignment_result_seq_info_not_found() -> None:
    response = client.get(f"/api/pipeline-job/{NOT_FOUND_UUID}/result/seq-info")

    assert response.status_code == 404


def test_alignment_result_seq_info_read_error(mocker: MockerFixture) -> None:
    mocker.patch("smart_open.open", side_effect=mock_open_OSError)
    response = client.get(f"/api/pipeline-job/{mock_uuid}/result/seq-info")

    assert response.status_code == 404
