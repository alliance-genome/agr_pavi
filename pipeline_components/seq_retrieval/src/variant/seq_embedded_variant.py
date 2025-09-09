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

    def translated_seq_positions(self, seq_length: int) -> tuple[int, int]:
        """
        Converts variant's sequence embedment positions (`self.seq_start_pos` and `self.seq_end_pos`)
        to it's corresponding position in the translated (protein) sequence.

        Assumes positions are based on full (untranslated) coding sequence (no frameshift required, start of seq is start codon).
        To allow comparison between sequences with reference and with alternative variant sequences embedded, positions include
        fanking bases or amino acids where the deletion/insertion would otherwise start/end in between bases or amino acids.
        In practice this means:
         * For substitutions:
             - Untranslated seq positions are represented as the affected nucleotide position(s).
             - Translated seq positions should represent the affected amino acid position(s) (= direct positional translation).
         * For insertions:
             - Untranslated seq positions are represented as the inserted nucleotide position(s) + flanking bases at both start & end.
             - Translated seq positions should represent the affected amino acid position(s) (on insertion in middle of codon)
                + flanking AA at start and end where the variant inserts complete codons, in-frame with reference (for insertions of >= 3 bps)
         * For deletions:
             - Untranslated seq positions are represented as the flanking nucleotide positions to the deletion site (both start & end).
             - Translated seq positions should indicate the affected amino acid position(s) (on partial codon deletions)
                + flanking AAs at start and end where the variant deletes complete codons, in-frame with reference (deletions of >= 3 bps)

        Args:
            seq_length: Length of the sequence (in nucleotides/amino acids)

        Returns:
            Relative start and end positions in the translated sequence as a tuple (`start`, `end`).
        """
        translated_start_pos: int
        translated_end_pos: int
        no_flank_start: int
        no_flank_end: int

        if self.seq_substitution_type == SeqSubstitutionType.SUBSTITUTION:
            translated_start_pos = translate_seq_position(self.seq_start_pos)
            translated_end_pos = translate_seq_position(self.seq_end_pos)

        elif self.seq_substitution_type == SeqSubstitutionType.INSERTION:
            no_flank_start = self.seq_start_pos + 1
            no_flank_end = self.seq_end_pos - 1
            translated_start_pos = translate_seq_position(no_flank_start)
            translated_end_pos = translate_seq_position(no_flank_end)

            # For complete-codon insertions starting between codons (in-frame with reference),
            # include start- and end-flanking AA
            if len(self.genomic_alt_seq) >= 3 and len(self.genomic_alt_seq) % 3 == 0 and no_flank_start % 3 == 1:
                if translated_start_pos > 1:
                    translated_start_pos -= 1

                if translated_end_pos < seq_length:
                    translated_end_pos += 1

        elif self.seq_substitution_type == SeqSubstitutionType.DELETION:
            no_flank_start = self.seq_start_pos + 1
            no_flank_end = self.seq_end_pos
            translated_start_pos = translate_seq_position(no_flank_start)
            translated_end_pos = translate_seq_position(no_flank_end)

            # For complete-codon deletion starting at codon start (in-frame with reference),
            # include start-flanking AA (end-flanking AA is current translated_end_pos)
            if len(self.genomic_ref_seq) >= 3 and len(self.genomic_ref_seq) % 3 == 0 and no_flank_start % 3 == 1:
                translated_start_pos -= 1

        else:
            raise ValueError(f"Unsupported substitution type: {self.seq_substitution_type}")

        return (translated_start_pos, translated_end_pos)


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


def translate_seq_position(pos: int) -> int:
    """
    Converts a sequence position to it's corresponding position in the translated (protein) sequence.
    Assumes position is based on full (untranslated) coding sequence (no frameshift required, start of seq is start codon).

    Args:
        pos: The sequence position to convert.

    Returns:
        The corresponding position in the translated sequence.
    """
    return ceil(pos / 3)
