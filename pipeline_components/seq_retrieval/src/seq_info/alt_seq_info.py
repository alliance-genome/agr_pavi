"""
Module containing classes related to (alternative) sequence information reporting
"""
from typing import override

from variant import SeqEmbeddedVariantsList

from .seq_info import SeqInfo


class AltSeqInfo(SeqInfo):
    """Alternative sequence information."""

    embedded_variants: SeqEmbeddedVariantsList
    """List of the variants embedded in the sequence."""
    sequence: str
    """The sequence of the alternative sequence region (as a string)."""

    def __init__(self, sequence: str, embedded_variants: SeqEmbeddedVariantsList):
        self.sequence = sequence
        self.embedded_variants = embedded_variants

    @override
    def __repr__(self) -> str:
        return f'AltSeqInfo(sequence={self.sequence}, embedded_variants={self.embedded_variants})'

    @override
    def __str__(self) -> str:
        return f'AltSeqInfo(sequence={self.sequence}, embedded_variants={self.embedded_variants})'
