"""End-to-end runner for one example dataset."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

from .api_client import ApiError, PaviApiClient
from .assertions import AssertionResult, assert_example
from .catalog import CatalogExample
from .payloads import load_payload


@dataclass
class ExampleRunResult:
    example_id: str
    ok: bool
    durationSeconds: float
    jobUuid: str | None
    error: str | None
    assertion: AssertionResult | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "example_id": self.example_id,
            "ok": self.ok,
            "durationSeconds": round(self.durationSeconds, 2),
            "jobUuid": self.jobUuid,
            "error": self.error,
            "assertion": (
                {
                    "ok": self.assertion.ok,
                    "sequenceCount": self.assertion.sequenceCount,
                    "maxPairwiseIdentityPct": (
                        round(self.assertion.maxPairwiseIdentityPct, 2)
                        if self.assertion.maxPairwiseIdentityPct is not None
                        else None
                    ),
                    "embeddedVariantsTotal": self.assertion.embeddedVariantsTotal,
                    "consequenceCategoriesPresent": list(
                        self.assertion.consequenceCategoriesPresent
                    ),
                    "failures": self.assertion.failures,
                }
                if self.assertion
                else None
            ),
        }


def run_example(
    client: PaviApiClient,
    example: CatalogExample,
    *,
    timeout_s: float = 5 * 60,
) -> ExampleRunResult:
    started = time.monotonic()
    try:
        payload = load_payload(example.id)
    except FileNotFoundError as e:
        return ExampleRunResult(
            example_id=example.id,
            ok=False,
            durationSeconds=time.monotonic() - started,
            jobUuid=None,
            error=str(e),
            assertion=None,
        )

    try:
        outcome = client.run_to_completion(payload, timeout_s=timeout_s)
    except ApiError as e:
        return ExampleRunResult(
            example_id=example.id,
            ok=False,
            durationSeconds=time.monotonic() - started,
            jobUuid=None,
            error=str(e),
            assertion=None,
        )

    assertion = assert_example(example, outcome.alignment_bytes, outcome.seq_info)
    return ExampleRunResult(
        example_id=example.id,
        ok=assertion.ok,
        durationSeconds=time.monotonic() - started,
        jobUuid=outcome.uuid,
        error=None if assertion.ok else "; ".join(assertion.failures),
        assertion=assertion,
    )


def format_report(results: list[ExampleRunResult]) -> str:
    lines = []
    passed = sum(1 for r in results if r.ok)
    failed = len(results) - passed
    for r in results:
        icon = "✓" if r.ok else "✗"
        line = f"  {icon} {r.example_id:30s} {r.durationSeconds:6.1f}s"
        if r.assertion:
            line += (
                f"  seqs={r.assertion.sequenceCount}"
                f"  maxId={('--' if r.assertion.maxPairwiseIdentityPct is None else f'{r.assertion.maxPairwiseIdentityPct:.1f}%')}"
                f"  variants={r.assertion.embeddedVariantsTotal}"
            )
        if not r.ok and r.error:
            line += f"\n      {r.error}"
        lines.append(line)
    summary = f"\n{passed}/{len(results)} examples passed, {failed} failed."
    return "\n".join(lines) + summary


def write_json_report(results: list[ExampleRunResult], path: str) -> None:
    with open(path, "w") as fh:
        json.dump([r.to_dict() for r in results], fh, indent=2)
