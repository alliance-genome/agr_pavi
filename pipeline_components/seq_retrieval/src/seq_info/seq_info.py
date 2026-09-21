"""
Module containing classes related to sequence information reporting
"""

from enum import Enum
import jsonpickle.handlers  # type: ignore
from typing import Any, override, Optional

from variant import (
    AlignmentEmbeddedVariant,
    AlignmentEmbeddedVariantsList,
    SeqEmbeddedVariant,
    SeqEmbeddedVariantsList,
)


class SeqInfo:
    """Sequence information."""

    embedded_variants: Optional[SeqEmbeddedVariantsList | AlignmentEmbeddedVariantsList]
    """List of the variants embedded in the sequence or aligned sequence."""
    requested_variant_ids: Optional[list[str]]
    """List of variant IDs that were requested for embedding (may differ from embedded_variants when variants fall outside CDS)."""
    sequence: Optional[str]
    """The sequence as a string."""
    error: Optional[str]
    """An error message, if any occured during sequence retrieval."""
    species: Optional[str]
    """The species name for this sequence."""
    non_coding_variants: Optional[list]
    """Variants that were requested but filtered out because they don't affect the protein sequence (e.g., UTR, intronic)."""

    def __init__(
        self,
        sequence: Optional[str] = None,
        embedded_variants: Optional[
            SeqEmbeddedVariantsList | AlignmentEmbeddedVariantsList
        ] = None,
        requested_variant_ids: Optional[list[str]] = None,
        error: Optional[str] = None,
        species: Optional[str] = None,
        non_coding_variants: Optional[list] = None,
    ):
        if sequence is not None:
            self.sequence = sequence

        if embedded_variants is not None:
            self.embedded_variants = embedded_variants

        if requested_variant_ids is not None:
            self.requested_variant_ids = requested_variant_ids

        if error is not None:
            self.error = error

        if species is not None:
            self.species = species

        if non_coding_variants is not None:
            self.non_coding_variants = non_coding_variants

    @classmethod
    def from_dict(cls, seq_info_dict: dict[str, Any]) -> "SeqInfo":
        """Loads a SeqInfo object from a dictionary."""
        sequence: Optional[str] = None
        embedded_variants: Optional[
            SeqEmbeddedVariantsList | AlignmentEmbeddedVariantsList
        ] = None
        requested_variant_ids: Optional[list[str]] = None
        error: Optional[str] = None
        species: Optional[str] = None

        if "sequence" in seq_info_dict:
            if not isinstance(seq_info_dict["sequence"], str):
                raise TypeError("sequence must be a string")
            sequence = seq_info_dict["sequence"]
        if "embedded_variants" in seq_info_dict:
            if not isinstance(seq_info_dict["embedded_variants"], list):
                raise TypeError("embedded_variants must be a list")

            if any(
                "alignment_start_pos" in variant
                for variant in seq_info_dict["embedded_variants"]
            ):
                embedded_variants = AlignmentEmbeddedVariantsList()
            else:
                embedded_variants = SeqEmbeddedVariantsList()

            for dct in seq_info_dict["embedded_variants"]:
                if not isinstance(dct, dict):
                    raise TypeError("embedded_variants must be a list of dicts")

                if isinstance(embedded_variants, AlignmentEmbeddedVariantsList):
                    embedded_variants.append(AlignmentEmbeddedVariant.from_dict(dct))
                else:
                    embedded_variants.append(SeqEmbeddedVariant.from_dict(dct))
        if "requested_variant_ids" in seq_info_dict:
            if not isinstance(seq_info_dict["requested_variant_ids"], list):
                raise TypeError("requested_variant_ids must be a list")
            requested_variant_ids = seq_info_dict["requested_variant_ids"]
        if "error" in seq_info_dict:
            if not isinstance(seq_info_dict["error"], str):
                raise TypeError("error must be a string")
            error = seq_info_dict["error"]
        if "species" in seq_info_dict:
            if not isinstance(seq_info_dict["species"], str):
                raise TypeError("species must be a string")
            species = seq_info_dict["species"]

        return cls(sequence=sequence, embedded_variants=embedded_variants,
                   requested_variant_ids=requested_variant_ids, error=error, species=species)

    @override
    def __repr__(self) -> str:
        return f"SeqInfo(sequence={self.sequence}, embedded_variants={self.embedded_variants})"

    @override
    def __str__(self) -> str:  # pragma: no cover
        return f"SeqInfo(sequence={self.sequence}, embedded_variants={self.embedded_variants})"


class EnumValueHandler(jsonpickle.handlers.BaseHandler):
    def flatten(self, obj: Enum, data: Any) -> Any:  # noqa: U100
        # Only store the value
        return obj.value

    def restore(self, data: Any):  # type: ignore
        # Restore using the Enum class this handler is registered for
        return self.cls(data)
