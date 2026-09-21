"""`pavi-cli` entry point."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import click

from .alliance_client import AllianceClient
from .alliance_client import DEFAULT_BASE_URL as ALLIANCE_DEFAULT_BASE_URL
from .api_client import DEFAULT_BASE_URL, DEFAULT_TIMEOUT_S, PaviApiClient
from .catalog import find_example, load_catalog
from .payloads import extract_from_local_store, payload_fixture_path, save_payload
from .runner import format_report, run_example, write_json_report
from .uniprot_client import DEFAULT_UNIPROT_BASE, UniProtClient
from .verify import format_verification_report, verify_catalog, verify_example
from .verify_sequences import format_sequence_report, verify_example_sequences


@click.group()
def main() -> None:
    """End-to-end validation harness for PAVI example datasets."""


@main.command("list")
def list_examples() -> None:
    """Print the example catalog."""
    examples = load_catalog()
    width = max(len(e.id) for e in examples)
    for ex in examples:
        click.echo(f"  {ex.id:{width}}  {ex.category:14s}  {ex.name}")
    click.echo(f"\n{len(examples)} examples total.")


@main.command("run")
@click.option("--example", "example_id", required=True, help="Catalog example id.")
@click.option("--api", "base_url", default=DEFAULT_BASE_URL, show_default=True)
@click.option(
    "--timeout", "timeout_s", default=DEFAULT_TIMEOUT_S, show_default=True,
    type=float, help="Max seconds to wait for the pipeline to complete.",
)
def run_one(example_id: str, base_url: str, timeout_s: float) -> None:
    examples = load_catalog()
    example = find_example(examples, example_id)
    if example is None:
        click.echo(f"Unknown example {example_id!r}", err=True)
        sys.exit(2)
    client = PaviApiClient(base_url=base_url)
    result = run_example(client, example, timeout_s=timeout_s)
    click.echo(format_report([result]))
    sys.exit(0 if result.ok else 1)


@main.command("run-all")
@click.option("--api", "base_url", default=DEFAULT_BASE_URL, show_default=True)
@click.option(
    "--timeout", "timeout_s", default=DEFAULT_TIMEOUT_S, show_default=True,
    type=float,
)
@click.option("--json-report", "json_report", type=click.Path(dir_okay=False))
def run_all(base_url: str, timeout_s: float, json_report: str | None) -> None:
    examples = load_catalog()
    client = PaviApiClient(base_url=base_url)
    results = [run_example(client, ex, timeout_s=timeout_s) for ex in examples]
    click.echo(format_report(results))
    if json_report:
        write_json_report(results, json_report)
        click.echo(f"\nJSON report written to {json_report}")
    sys.exit(0 if all(r.ok for r in results) else 1)


@main.command("capture-payload")
@click.option("--example", "example_id", required=True)
@click.option("--job-uuid", "job_uuid", required=True)
@click.option(
    "--jobs-db", "jobs_db",
    default=lambda: os.environ.get("PAVI_LOCAL_JOBS_PATH", "/tmp/pavi/jobs") + "/jobs.db",
    show_default="$PAVI_LOCAL_JOBS_PATH/jobs.db or /tmp/pavi/jobs/jobs.db",
)
def capture_payload(example_id: str, job_uuid: str, jobs_db: str) -> None:
    """Extract a known-good payload from the API's local job store and save it as the example's fixture."""
    examples = load_catalog()
    if find_example(examples, example_id) is None:
        click.echo(f"Unknown example {example_id!r}", err=True)
        sys.exit(2)
    payload = extract_from_local_store(Path(jobs_db), job_uuid)
    path = save_payload(example_id, payload)
    click.echo(f"Captured {len(payload)} seq_regions for {example_id!r} -> {path}")


@main.command("payload-path")
@click.option("--example", "example_id", required=True)
def payload_path(example_id: str) -> None:
    """Print where the payload fixture for an example would be read from."""
    click.echo(payload_fixture_path(example_id))


@main.command("verify-alliance")
@click.option(
    "--alliance-base-url",
    "alliance_base_url",
    default=ALLIANCE_DEFAULT_BASE_URL,
    show_default=True,
    help="Base URL of the Alliance API.",
)
@click.option(
    "--example",
    "example_id",
    default=None,
    help="Verify only this catalog example. Omit to verify all.",
)
@click.option(
    "--no-alleles",
    is_flag=True,
    default=False,
    help="Skip the allele-variant-detail lookup (gene checks only).",
)
@click.option(
    "--json-report",
    "json_report",
    type=click.Path(dir_okay=False),
    default=None,
    help="Write a machine-readable JSON report to this path.",
)
def verify_alliance(
    alliance_base_url: str,
    example_id: str | None,
    no_alleles: bool,
    json_report: str | None,
) -> None:
    """Check that every catalog gene (and pinned allele) still resolves under the live Alliance API."""
    catalog = load_catalog()
    client = AllianceClient(base_url=alliance_base_url)
    if example_id:
        example = find_example(catalog, example_id)
        if example is None:
            click.echo(f"Unknown example {example_id!r}", err=True)
            sys.exit(2)
        results = [verify_example(client, example, check_alleles=not no_alleles)]
    else:
        results = verify_catalog(client, catalog, check_alleles=not no_alleles)

    click.echo(format_verification_report(results))
    if json_report:
        with open(json_report, "w") as fh:
            json.dump([r.to_dict() for r in results], fh, indent=2)
        click.echo(f"\nJSON report written to {json_report}")
    sys.exit(0 if all(r.ok for r in results) else 1)


@main.command("verify-sequences")
@click.option("--example", "example_id", required=True, help="Catalog example id.")
@click.option(
    "--job-uuid", "job_uuid", default=None,
    help="Completed job UUID to fetch the alignment from (needs --api).",
)
@click.option(
    "--alignment-file", "alignment_file", default=None,
    type=click.Path(exists=True, dir_okay=False),
    help="Local alignment-output.aln to verify instead of a live job.",
)
@click.option("--api", "base_url", default=DEFAULT_BASE_URL, show_default=True)
@click.option(
    "--uniprot-base-url", "uniprot_base_url",
    default=DEFAULT_UNIPROT_BASE, show_default=True,
)
@click.option(
    "--min-identity", "min_identity", default=95.0, show_default=True, type=float,
    help="Fail a gene if its best UniProt overlap-identity falls below this %.",
)
@click.option(
    "--min-coverage", "min_coverage", default=0.0, show_default=True, type=float,
    help="Optionally also fail if the produced protein covers less than this %% "
         "of the canonical (0 = report coverage but don't fail on it).",
)
@click.option("--json-report", "json_report", type=click.Path(dir_okay=False))
def verify_sequences(
    example_id: str,
    job_uuid: str | None,
    alignment_file: str | None,
    base_url: str,
    uniprot_base_url: str,
    min_identity: float,
    min_coverage: float,
    json_report: str | None,
) -> None:
    """Compare a produced alignment's proteins against UniProt canonical sequences."""
    examples = load_catalog()
    example = find_example(examples, example_id)
    if example is None:
        click.echo(f"Unknown example {example_id!r}", err=True)
        sys.exit(2)

    if not job_uuid and not alignment_file:
        click.echo("Provide either --job-uuid or --alignment-file.", err=True)
        sys.exit(2)

    if alignment_file:
        alignment_bytes = Path(alignment_file).read_bytes()
    else:
        client = PaviApiClient(base_url=base_url)
        alignment_bytes = client.get_alignment(job_uuid)  # type: ignore[arg-type]

    result = verify_example_sequences(
        example,
        alignment_bytes,
        client=UniProtClient(base_url=uniprot_base_url),
        min_identity_pct=min_identity,
        min_coverage_pct=min_coverage,
    )
    click.echo(format_sequence_report(result))
    if json_report:
        with open(json_report, "w") as fh:
            json.dump(result.to_dict(), fh, indent=2)
        click.echo(f"\nJSON report written to {json_report}")
    sys.exit(0 if result.ok else 1)


if __name__ == "__main__":
    main()
