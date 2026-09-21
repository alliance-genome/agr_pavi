"""Fetch canonical protein sequences from UniProt.

Used by `pavi-cli verify-sequences` as an *external* truth source: the
rest of the harness only checks that the pipeline's output is internally
coherent (sequence count, pairwise identity computed from the alignment
itself). UniProt lets us catch a whole class of bugs those checks can't —
a silently-wrong transcript, the wrong canonical isoform, or a
species/gene mix-up — by comparing each produced protein against the
curated canonical sequence for that gene.
"""

from __future__ import annotations

from dataclasses import dataclass

import requests

DEFAULT_UNIPROT_BASE = "https://rest.uniprot.org"
DEFAULT_TIMEOUT_S = 20.0


class UniProtError(RuntimeError):
    pass


@dataclass(frozen=True)
class ProteinRecord:
    accession: str
    header: str
    sequence: str

    @property
    def length(self) -> int:
        return len(self.sequence)


def parse_fasta(text: str) -> tuple[str, str]:
    """Return (header, sequence) for a single-record FASTA string."""
    header = ""
    seq_parts: list[str] = []
    for line in text.splitlines():
        line = line.rstrip()
        if not line:
            continue
        if line.startswith(">"):
            if header:
                # Second record encountered — canonical fetch should be one.
                break
            header = line[1:]
        else:
            seq_parts.append(line)
    return header, "".join(seq_parts)


class UniProtClient:
    def __init__(
        self,
        base_url: str = DEFAULT_UNIPROT_BASE,
        timeout_s: float = DEFAULT_TIMEOUT_S,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s

    def fetch_canonical(self, accession: str) -> ProteinRecord:
        """Fetch the canonical isoform FASTA for a UniProt accession."""
        url = f"{self.base_url}/uniprotkb/{accession}.fasta"
        response = requests.get(url, timeout=self.timeout_s)
        if response.status_code == 404:
            raise UniProtError(f"UniProt accession {accession!r} not found.")
        response.raise_for_status()
        header, sequence = parse_fasta(response.text)
        if not sequence:
            raise UniProtError(
                f"UniProt response for {accession!r} contained no sequence."
            )
        return ProteinRecord(accession=accession, header=header, sequence=sequence)
