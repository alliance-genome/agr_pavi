"""
Module containing the Variant class and related functions.
"""

import requests

from typing import List, Optional, override
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

    def __init__(self, variant_id: str, seq_id: str, start: int, end: int, genomic_ref_seq: Optional[str] = None, genomic_alt_seq: Optional[str] = None):
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

    @override
    def __eq__(self, other: object) -> bool:
        if isinstance(other, self.__class__):
            if self.variant_id == other.variant_id and self.genomic_seq_id == other.genomic_seq_id \
               and self.genomic_start_pos == other.genomic_start_pos and self.genomic_end_pos == other.genomic_end_pos \
               and self.genomic_ref_seq == other.genomic_ref_seq and self.genomic_alt_seq == other.genomic_alt_seq:
                return True
        return False

    @override
    def __str__(self) -> str:  # pragma: no cover
        object_str = f'{self.variant_id} {self.genomic_seq_id}:{self.genomic_start_pos}-{self.genomic_end_pos} {self.genomic_ref_seq or '-'}/{self.genomic_alt_seq or '-'}'

        return object_str

    @override
    def __repr__(self) -> str:  # pragma: no cover
        return self.__str__()

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

    def overlaps(self, other: 'Variant') -> bool:
        """
        Checks if this variant overlaps with another variant.

        Args:
            other: Another Variant object.

        Returns:
            True if the variants overlap, False otherwise.
        """
        overlaps = False

        # Both variants must be on the same seq_id (chromosome or contig) to overlap
        # and have at least partially overlapping start and end positions
        if self.genomic_seq_id == other.genomic_seq_id and \
           self.genomic_end_pos >= other.genomic_start_pos and self.genomic_start_pos <= other.genomic_end_pos:

            # For insertions, the complete insertion site must fall within the other variant
            if self.genomic_ref_seq == "":
                if self.genomic_start_pos >= other.genomic_start_pos and self.genomic_end_pos <= other.genomic_end_pos:
                    overlaps = True
            elif other.genomic_ref_seq == "":
                if other.genomic_start_pos >= self.genomic_start_pos and other.genomic_end_pos <= self.genomic_end_pos:
                    overlaps = True
            # For all other variants, partial overlap is sufficient
            else:
                overlaps = True

        return overlaps


def variants_overlap(variants: List[Variant]) -> bool:
    """
    Checks if any two Variants in a list overlap.
    Args:
        variants: List of Variant objects.
    Returns:
        True if any two variants overlap, False otherwise.
    """
    sorted_variants = sorted(variants, key=lambda x: (x.genomic_seq_id, x.genomic_start_pos))
    for i in range((len(sorted_variants) - 1)):
        if sorted_variants[i].overlaps(sorted_variants[i + 1]):
            return True

    return False
