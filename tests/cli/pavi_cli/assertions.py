"""Tolerant fingerprint-based assertions on alignment output."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .catalog import CatalogExample


@dataclass
class AssertionResult:
    ok: bool
    sequenceCount: int
    maxPairwiseIdentityPct: float | None
    embeddedVariantsTotal: int
    consequenceCategoriesPresent: tuple[str, ...]
    failures: list[str]


def _parse_clustal(alignment_bytes: bytes) -> list[tuple[str, str]]:
    """Minimal Clustal Omega parser — returns [(seq_id, seq), ...].

    We don't pull biopython into the fast path because Clustal Omega's
    format is line-based and trivial: skip header + lines without two
    whitespace-separated tokens. Conservation marker lines (no id) are
    discarded.
    """
    sequences: dict[str, list[str]] = {}
    order: list[str] = []
    for raw_line in alignment_bytes.decode("utf-8", errors="ignore").splitlines():
        line = raw_line.rstrip()
        if not line or line.startswith("CLUSTAL"):
            continue
        # Conservation marker lines start with spaces and don't have an id.
        if line.startswith(" "):
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        seq_id, segment = parts[0], parts[1]
        if seq_id not in sequences:
            sequences[seq_id] = []
            order.append(seq_id)
        sequences[seq_id].append(segment)
    return [(sid, "".join(sequences[sid])) for sid in order]


def _pairwise_identity_pct(a: str, b: str) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    matches = compared = 0
    for ca, cb in zip(a, b):
        if ca == "-" or cb == "-":
            continue
        compared += 1
        if ca.upper() == cb.upper():
            matches += 1
    return (matches / compared * 100.0) if compared else 0.0


def _max_pairwise_identity(sequences: list[tuple[str, str]]) -> float | None:
    """Across all non-identical pairs, return the highest pairwise identity %."""
    if len(sequences) < 2:
        return None
    best = 0.0
    for i in range(len(sequences)):
        for j in range(i + 1, len(sequences)):
            best = max(best, _pairwise_identity_pct(sequences[i][1], sequences[j][1]))
    return best


def assert_example(
    example: CatalogExample,
    alignment_bytes: bytes,
    seq_info: dict[str, Any],
) -> AssertionResult:
    failures: list[str] = []

    sequences = _parse_clustal(alignment_bytes)
    sequence_count = len(sequences)
    if sequence_count < example.expectations.minSequenceCount:
        failures.append(
            f"sequenceCount={sequence_count} < minSequenceCount="
            f"{example.expectations.minSequenceCount}"
        )

    max_id = _max_pairwise_identity(sequences)
    if max_id is None and example.expectations.minMaxPairwiseIdentityPct > 0:
        failures.append("no pairs to compute pairwise identity")
    elif max_id is not None and max_id < example.expectations.minMaxPairwiseIdentityPct:
        failures.append(
            f"maxPairwiseIdentity={max_id:.2f}% < minMaxPairwiseIdentityPct="
            f"{example.expectations.minMaxPairwiseIdentityPct}%"
        )

    embedded_total = 0
    consequences_seen: set[str] = set()
    seq_info_dict = (
        seq_info.get("sequences")
        if isinstance(seq_info, dict) and isinstance(seq_info.get("sequences"), dict)
        else seq_info if isinstance(seq_info, dict) else {}
    )
    iter_values = (
        seq_info_dict.values() if isinstance(seq_info_dict, dict) else []
    )
    for entry in iter_values:
        if not isinstance(entry, dict):
            continue
        for variant in entry.get("embedded_variants") or []:
            embedded_total += 1
            for mc in variant.get("molecular_consequences") or []:
                consequences_seen.add(mc)

    if embedded_total < example.expectations.minEmbeddedVariantsTotal:
        failures.append(
            f"embeddedVariantsTotal={embedded_total} < "
            f"minEmbeddedVariantsTotal={example.expectations.minEmbeddedVariantsTotal}"
        )

    missing_categories = [
        c for c in example.expectations.expectedConsequenceCategories
        if c not in consequences_seen
    ]
    if missing_categories:
        failures.append(
            "missing expected molecular_consequences: " + ", ".join(missing_categories)
        )

    return AssertionResult(
        ok=not failures,
        sequenceCount=sequence_count,
        maxPairwiseIdentityPct=max_id,
        embeddedVariantsTotal=embedded_total,
        consequenceCategoriesPresent=tuple(sorted(consequences_seen)),
        failures=failures,
    )
