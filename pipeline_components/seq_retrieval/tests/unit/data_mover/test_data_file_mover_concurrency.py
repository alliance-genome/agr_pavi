"""
Concurrency tests for data_mover downloads (no network: requests.get is mocked).

The local pipeline runs one seq_retrieval process per sequence in parallel, so
entries from the same genome download the same FASTA into the same cache path
at the same time.
"""

import threading
import time
from pathlib import Path
from typing import Any, Iterator
from unittest.mock import patch

import pytest

import data_mover.data_file_mover as dfm

URL = "https://example.org/fasta/genome.fna.gz"
PAYLOAD = b"ACGT" * 50_000


class _SlowResponse:
    """requests.get(stream=True) stand-in that streams PAYLOAD in slow chunks."""

    def iter_content(self, chunk_size: int) -> Iterator[bytes]:
        for i in range(0, len(PAYLOAD), chunk_size):
            time.sleep(0.001)
            yield PAYLOAD[i:i + chunk_size]


@pytest.fixture(autouse=True)
def _no_network() -> Iterator[None]:
    with patch.object(dfm, "is_accessible_url", return_value=True):
        yield


def _run_threads(target: Any, n: int) -> list[BaseException]:
    errors: list[BaseException] = []

    def wrapped() -> None:
        try:
            target()
        except BaseException as e:  # noqa: B902 - collect every failure from worker threads
            errors.append(e)

    threads = [threading.Thread(target=wrapped) for _ in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return errors


def test_concurrent_downloads_to_same_path_do_not_collide(tmp_path: Path) -> None:
    # Reproduces the CI failure: parallel downloads shared one "<file>.part" temp
    # file, so the first rename moved it away and the others failed.
    dest = str(tmp_path / "genome.fna.gz")

    def slow_get(*_args: Any, **_kwargs: Any) -> _SlowResponse:  # noqa: U101
        return _SlowResponse()

    with patch.object(dfm.requests, "get", side_effect=slow_get):
        errors = _run_threads(lambda: dfm.download_from_url(URL, dest, chunk_size=4096), 6)

    assert errors == []
    assert Path(dest).read_bytes() == PAYLOAD
    assert list(tmp_path.glob("*.part")) == []


def test_cache_miss_downloads_once_for_concurrent_fetches(tmp_path: Path) -> None:
    calls: list[int] = []

    def counting_get(*_args: Any, **_kwargs: Any) -> _SlowResponse:  # noqa: U101
        calls.append(1)
        return _SlowResponse()

    results: list[str] = []
    dfm._stored_files.clear()
    with patch.object(dfm.requests, "get", side_effect=counting_get):
        errors = _run_threads(
            lambda: results.append(dfm.fetch_file(URL, dest_dir=str(tmp_path), reuse_local_cache=True)),
            6,
        )
    dfm._stored_files.clear()

    assert errors == []
    assert len(calls) == 1
    assert len(set(results)) == 1
    assert Path(results[0]).read_bytes() == PAYLOAD
