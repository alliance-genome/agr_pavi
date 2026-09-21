"""Load and persist captured pipeline payloads."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

PAYLOAD_FIXTURE_ROOT = Path(__file__).resolve().parents[2] / "examples" / "fixtures"


def payload_fixture_path(example_id: str) -> Path:
    return PAYLOAD_FIXTURE_ROOT / example_id / "payload.json"


def load_payload(example_id: str) -> list[dict[str, Any]]:
    path = payload_fixture_path(example_id)
    if not path.exists():
        raise FileNotFoundError(
            f"No captured payload for example {example_id!r}. Run "
            f"`pavi-cli capture-payload --example {example_id} --job-uuid <good-uuid>` "
            "after a successful run."
        )
    return json.loads(path.read_text())


def save_payload(example_id: str, payload: list[dict[str, Any]]) -> Path:
    path = payload_fixture_path(example_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    return path


def extract_from_local_store(jobs_db_path: Path, job_uuid: str) -> list[dict[str, Any]]:
    """Pull `input_data` from the API's local SQLite job store."""
    if not jobs_db_path.exists():
        raise FileNotFoundError(f"Local job store not found at {jobs_db_path}.")
    conn = sqlite3.connect(jobs_db_path)
    try:
        row = conn.execute(
            "SELECT input_data FROM jobs WHERE job_id = ?", (job_uuid,)
        ).fetchone()
        if row is None:
            raise KeyError(
                f"Job {job_uuid!r} not found in {jobs_db_path}. "
                "Submit + complete it via the WebUI first."
            )
        return json.loads(row[0])
    finally:
        conn.close()
