from typing import Any, Iterable, override

from .variant import SeqSubstitutionType, Variant


class SeqEmbeddedVariant(Variant):
    """
    Variant object representing a variant embedded in an (alternative) sequence.

    Contains additional properties related to the embedding into the sequence.
    """

    rel_start: int
    """The relative start position of the variant in the sequence (1-based)."""
    rel_end: int
    """The relative end position of the variant in the sequence (1-based)."""

    def __init__(self, variant: 'Variant', rel_start: int, rel_end: int):
        self.__dict__.update(vars(variant))
        self.rel_start = rel_start
        self.rel_end = rel_end


class SeqEmbeddedVariantsList(list[SeqEmbeddedVariant]):
    """
    Representation of a list of EmbeddedVariant objects, with methods for manipulation.
    """

    def __init__(self, iterable: Iterable[SeqEmbeddedVariant] = []):
        for item in iterable:
            if not isinstance(item, SeqEmbeddedVariant):
                raise TypeError(f"Expected EmbeddedVariant, got {type(item)}")
        super().__init__(iterable)

    def shift_rel_positions(self, shift: int) -> None:
        """
        Shifts the relative positions of all variants in the list by the specified number of bases.

        Args:
            shift: The amount to shift the relative positions by.
        """
        for variant in self:
            variant.rel_start += shift
            variant.rel_end += shift

    @classmethod
    def trimmed_on_rel_positions(cls, variants_list: 'SeqEmbeddedVariantsList', trim_end: int) -> 'SeqEmbeddedVariantsList':
        """
        Trims the `variants_list` to only include variants within relative positions 1 to `trim_end`.
        Additionally trims the rel_end positions of all variants in the list that overlap `trim_end`.

        Args:
            trim_end: The relative end position to trim to (1-based).
        """
        list_copy = cls(variants_list.copy())

        # Remove embedded variants that are outside of the trim window
        # and trim rel_end for embedded variants partially outside of trim window
        for index, embedded_variant in reversed(list(enumerate(list_copy))):
            if embedded_variant.rel_start > trim_end:
                # Embedded variant completely outside of in-frame window
                del list_copy[index]
            elif embedded_variant.rel_start == trim_end and embedded_variant.seq_substitution_type == SeqSubstitutionType.DELETION:
                # Embedded variant is deletions just outside of in-frame window
                del list_copy[index]
            elif embedded_variant.rel_end > trim_end:
                # Embedded variant partially outside of in-frame window
                # Trim rel_end to trim_end
                embedded_variant.rel_end = trim_end
            else:
                # Embedded variant is fully within in-frame window
                continue

        return list_copy
