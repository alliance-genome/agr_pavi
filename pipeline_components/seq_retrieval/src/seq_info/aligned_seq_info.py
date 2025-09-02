"""
Module containing classes related to sequence information reporting for aligned sequences
"""
from typing import override

from variant import AlignmentEmbeddedVariantsList


class AlignedSeqInfo():
    """Aligned sequence information."""

    embedded_variants: AlignmentEmbeddedVariantsList
    """List of the variants embedded in the alignment sequence"""

    def __init__(self, embedded_variants: AlignmentEmbeddedVariantsList):
        self.embedded_variants = embedded_variants

    @override
    def __repr__(self) -> str:
        return f'AlignedSeqInfo(embedded_variants={self.embedded_variants})'

    @override
    def __str__(self) -> str:
        return f'AlignedSeqInfo(embedded_variants={self.embedded_variants})'
