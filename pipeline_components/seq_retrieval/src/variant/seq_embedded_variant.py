from math import ceil
from typing import Any, Iterable, override

from .variant import SeqSubstitutionType, Variant


class SeqEmbeddedVariant(Variant):
    """
    Variant object representing a variant embedded in an (alternative) sequence.

    Contains additional properties related to the embedding into the sequence.
    """

    seq_start_pos: int
    """The relative start position of the variant in the sequence (1-based)."""
    seq_end_pos: int
    """The relative end position of the variant in the sequence (1-based)."""

    def __init__(self, variant: 'Variant', seq_start_pos: int, seq_end_pos: int):
        self.__dict__.update(vars(variant))
        self.seq_start_pos = seq_start_pos
        self.seq_end_pos = seq_end_pos

    @override
    @classmethod
    def from_dict(cls, seq_embedded_variant_dict: dict[str, Any]) -> 'SeqEmbeddedVariant':
        if 'seq_start_pos' not in seq_embedded_variant_dict:
            raise KeyError('seq_start_pos not in seq_embedded_variant_dict')
        elif not isinstance(seq_embedded_variant_dict['seq_start_pos'], int):
            raise TypeError('seq_start_pos must be an integer')

        if 'seq_end_pos' not in seq_embedded_variant_dict:
            raise KeyError('seq_end_pos not in seq_embedded_variant_dict')
        elif not isinstance(seq_embedded_variant_dict['seq_end_pos'], int):
            raise TypeError('seq_end_pos must be an integer')

        variant_dict = seq_embedded_variant_dict.copy()
        del variant_dict['seq_start_pos']
        del variant_dict['seq_end_pos']

        return cls(Variant.from_dict(variant_dict), seq_embedded_variant_dict['seq_start_pos'], seq_embedded_variant_dict['seq_end_pos'])

    def translated_seq_positions(self) -> tuple[int, int]:
        """
        Converts variant's sequence embedment positions (`self.seq_start_pos` and `self.seq_end_pos`)
        to it's corresponding position in the translated (protein) sequence.

        Assumes positions are based on full (untranslated) coding sequence (no frameshift required, start of seq is start codon).

        Returns:
            Relative start and end positions in the translated sequence as a tuple (`start`, `end`).
        """
        return (ceil(self.seq_start_pos / 3), ceil(self.seq_end_pos / 3))


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
            variant.seq_start_pos += shift
            variant.seq_end_pos += shift

    @classmethod
    def trimmed_on_rel_positions(cls, variants_list: 'SeqEmbeddedVariantsList', trim_end: int) -> 'SeqEmbeddedVariantsList':
        """
        Trims the `variants_list` to only include variants within relative positions 1 to `trim_end`.
        Additionally trims the seq_end_pos positions of all variants in the list that overlap `trim_end`.

        Args:
            trim_end: The relative end position to trim to (1-based).
        """
        list_copy = cls(variants_list.copy())

        # Remove embedded variants that are outside of the trim window
        # and trim seq_end_pos for embedded variants partially outside of trim window
        for index, embedded_variant in reversed(list(enumerate(list_copy))):
            if embedded_variant.seq_start_pos > trim_end:
                # Embedded variant completely outside of in-frame window
                del list_copy[index]
            elif embedded_variant.seq_start_pos == trim_end and embedded_variant.seq_substitution_type == SeqSubstitutionType.DELETION:
                # Embedded variant is deletions just outside of in-frame window
                del list_copy[index]
            elif embedded_variant.seq_end_pos > trim_end:
                # Embedded variant partially outside of in-frame window
                # Trim seq_end_pos to trim_end
                embedded_variant.seq_end_pos = trim_end
            else:
                # Embedded variant is fully within in-frame window
                continue

        return list_copy
