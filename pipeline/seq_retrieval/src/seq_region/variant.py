"""
Module containing the Variant class and related functions.
"""

import requests

from typing import Optional
from log_mgmt import get_logger

logger = get_logger(name=__name__)


class Variant():
    """
    Defines a sequence region variant.
    """

    variant_id: str
    """ID of the variant"""

    genomic_seq_id: str
    """ID of the genomic sequence region"""

    genomic_start_pos: int
    """Genomic start position of the variant (1-based, inclusive)"""

    genomic_end_pos: int
    """Genomic end position of the variant (1-based, inclusive)"""

    genomic_ref_seq: str
    """Genomic reference sequence of the variant"""

    genomic_alt_seq: str
    """Genomic alternative sequence of the variant"""

    def __init__(self, variant_id: str, seq_id: str, start: int, end: int, genomic_ref_seq: Optional[str], genomic_alt_seq: Optional[str]):
        """
        Initializes a Variant instance.

        Args:
            variant_id: ID of the variant.
            seq_id: ID of the sequence region.
            start: Start position of the variant.
            end: End position of the variant.
            strand: Strand of the sequence region (e.g., '+' or '-').
        """
        self.variant_id = variant_id
        self.genomic_seq_id = seq_id
        self.genomic_start_pos = start
        self.genomic_end_pos = end
        self.seq_length = end - start + 1
        self.genomic_ref_seq = genomic_ref_seq or ""
        self.genomic_alt_seq = genomic_alt_seq or ""

    @classmethod
    def from_variant_id(cls, variant_id: str) -> 'Variant':
        """
        Fetches variant information from the public web API \
        and returns it as a Variant object.

        Args:
            variant_id: string representing the (AGR) variant ID.

        Returns:
            a Variant object containing the variant information.
        """

        # Fetch variant information from the public web API.
        url = f"https://www.alliancegenome.org/api/variant/{variant_id}"
        response = requests.get(url)
        response.raise_for_status()
        variant_data = response.json()

        return cls(
            variant_id=variant_id,
            seq_id=variant_data["location"]["chromosome"],
            start=variant_data["location"]["start"],
            end=variant_data["location"]["end"],
            genomic_ref_seq=variant_data.get("genomicReferenceSequence"),
            genomic_alt_seq=variant_data.get("genomicVariantSequence"),
        )
