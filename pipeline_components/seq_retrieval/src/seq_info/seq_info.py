"""
Module containing classes related to sequence information reporting
"""
from enum import Enum
import jsonpickle.handlers  # type: ignore
from typing import Any, override, Optional

from variant import AlignmentEmbeddedVariant, AlignmentEmbeddedVariantsList, SeqEmbeddedVariant, SeqEmbeddedVariantsList


class SeqInfo():
    """Sequence information."""

    embedded_variants: Optional[SeqEmbeddedVariantsList | AlignmentEmbeddedVariantsList]
    """List of the variants embedded in the sequence or aligned sequence."""
    sequence: Optional[str]
    """The sequence as a string."""

    def __init__(self, sequence: Optional[str] = None, embedded_variants: Optional[SeqEmbeddedVariantsList | AlignmentEmbeddedVariantsList] = None):
        if sequence is not None:
            self.sequence = sequence

        if embedded_variants is not None:
            self.embedded_variants = embedded_variants

    @classmethod
    def from_dict(cls, seq_info_dict: dict[str, Any]) -> 'SeqInfo':
        """Loads a SeqInfo object from a dictionary."""
        sequence: Optional[str] = None
        embedded_variants: Optional[SeqEmbeddedVariantsList | AlignmentEmbeddedVariantsList] = None
        if 'sequence' in seq_info_dict:
            if not isinstance(seq_info_dict['sequence'], str):
                raise TypeError('sequence must be a string')
            sequence = seq_info_dict['sequence']
        if 'embedded_variants' in seq_info_dict:
            if not isinstance(seq_info_dict['embedded_variants'], list):
                raise TypeError('embedded_variants must be a list')

            if any('alignment_start_pos' in variant for variant in seq_info_dict['embedded_variants']):
                embedded_variants = AlignmentEmbeddedVariantsList()
            else:
                embedded_variants = SeqEmbeddedVariantsList()

            for dct in seq_info_dict['embedded_variants']:
                if not isinstance(dct, dict):
                    raise TypeError('embedded_variants must be a list of dicts')

                if isinstance(embedded_variants, AlignmentEmbeddedVariantsList):
                    embedded_variants.append(AlignmentEmbeddedVariant.from_dict(dct))
                else:
                    embedded_variants.append(SeqEmbeddedVariant.from_dict(dct))

        return cls(sequence=sequence, embedded_variants=embedded_variants)

    @override
    def __repr__(self) -> str:
        return f'SeqInfo(sequence={self.sequence}, embedded_variants={self.embedded_variants})'

    @override
    def __str__(self) -> str:  # pragma: no cover
        return f'SeqInfo(sequence={self.sequence}, embedded_variants={self.embedded_variants})'


class EnumValueHandler(jsonpickle.handlers.BaseHandler):
    def flatten(self, obj: Enum, data: Any) -> Any:  # noqa: U100
        # Only store the value
        return obj.value

    def restore(self, data: Any):  # type: ignore
        # Restore using the Enum class this handler is registered for
        return self.cls(data)
