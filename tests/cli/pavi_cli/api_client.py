"""Thin client over the PAVI pipeline API."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import requests


DEFAULT_BASE_URL = "http://localhost:8000"
DEFAULT_POLL_INTERVAL_S = 2.0
DEFAULT_TIMEOUT_S = 5 * 60


class ApiError(RuntimeError):
    pass


@dataclass(frozen=True)
class JobOutcome:
    uuid: str
    status: str
    stage: str | None
    error_message: str | None
    alignment_bytes: bytes
    seq_info: dict[str, Any]


class PaviApiClient:
    def __init__(self, base_url: str = DEFAULT_BASE_URL):
        self.base_url = base_url.rstrip("/")

    def submit(self, seq_regions: list[dict[str, Any]]) -> str:
        url = f"{self.base_url}/api/pipeline-job/"
        response = requests.post(url, json=seq_regions, timeout=30)
        if response.status_code not in (200, 201):
            raise ApiError(
                f"Submit failed with HTTP {response.status_code}: {response.text[:500]}"
            )
        body = response.json()
        if not body.get("uuid"):
            raise ApiError(f"Submit succeeded but response carried no uuid: {body!r}")
        return str(body["uuid"])

    def get_status(self, job_uuid: str) -> dict[str, Any]:
        response = requests.get(
            f"{self.base_url}/api/pipeline-job/{job_uuid}", timeout=15
        )
        if response.status_code == 404:
            raise ApiError(f"Job {job_uuid} not found.")
        response.raise_for_status()
        return response.json()

    def get_alignment(self, job_uuid: str) -> bytes:
        response = requests.get(
            f"{self.base_url}/api/pipeline-job/{job_uuid}/result/alignment",
            timeout=30,
        )
        response.raise_for_status()
        return response.content

    def get_seq_info(self, job_uuid: str) -> dict[str, Any]:
        response = requests.get(
            f"{self.base_url}/api/pipeline-job/{job_uuid}/result/seq-info",
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def wait_for_completion(
        self,
        job_uuid: str,
        *,
        timeout_s: float = DEFAULT_TIMEOUT_S,
        poll_interval_s: float = DEFAULT_POLL_INTERVAL_S,
    ) -> dict[str, Any]:
        deadline = time.monotonic() + timeout_s
        last_status: dict[str, Any] | None = None
        while time.monotonic() < deadline:
            status = self.get_status(job_uuid)
            last_status = status
            phase = (status.get("status") or "").lower()
            if phase in ("completed", "succeeded"):
                return status
            if phase in ("failed", "errored"):
                raise ApiError(
                    f"Job {job_uuid} failed: "
                    f"{status.get('error_message') or status}"
                )
            time.sleep(poll_interval_s)
        raise ApiError(
            f"Job {job_uuid} did not complete within {timeout_s:.0f}s. "
            f"Last status: {last_status!r}"
        )

    def run_to_completion(
        self,
        seq_regions: list[dict[str, Any]],
        *,
        timeout_s: float = DEFAULT_TIMEOUT_S,
        poll_interval_s: float = DEFAULT_POLL_INTERVAL_S,
    ) -> JobOutcome:
        uuid = self.submit(seq_regions)
        status = self.wait_for_completion(
            uuid, timeout_s=timeout_s, poll_interval_s=poll_interval_s
        )
        return JobOutcome(
            uuid=uuid,
            status=status.get("status") or "unknown",
            stage=status.get("stage"),
            error_message=status.get("error_message"),
            alignment_bytes=self.get_alignment(uuid),
            seq_info=self.get_seq_info(uuid),
        )
