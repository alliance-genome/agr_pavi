"""
Module containing classes related to (alternative) sequence information reporting
"""
from typing import TypedDict

from variant import EmbeddedVariantsList


class AltSeqInfo(TypedDict):
    """Alternative sequence information."""

    embedded_variants: EmbeddedVariantsList
    """List of the variants embedded in the sequence"""
    sequence: str
    """The sequence of the alternative sequence region (as a string)."""
