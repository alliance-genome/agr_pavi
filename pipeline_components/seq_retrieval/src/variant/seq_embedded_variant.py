from copy import deepcopy
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
    embedded_alt_seq_len: int
    """The length of the variant's alternative sequence portion embedded in the sequence."""
    embedded_ref_seq_len: int
    """The length of the variant's reference sequence portion embedded in the sequence."""

    def __init__(
        self,
        variant: "Variant",
        seq_start_pos: int,
        seq_end_pos: int,
        embedded_ref_seq_len: int,
        embedded_alt_seq_len: int,
    ):
        self.__dict__.update(vars(variant))
        self.seq_start_pos = seq_start_pos
        self.seq_end_pos = seq_end_pos
        self.embedded_ref_seq_len = embedded_ref_seq_len
        self.embedded_alt_seq_len = embedded_alt_seq_len

    @override
    @classmethod
    def from_dict(
        cls, seq_embedded_variant_dict: dict[str, Any]
    ) -> "SeqEmbeddedVariant":
        if "seq_start_pos" not in seq_embedded_variant_dict:
            raise KeyError("seq_start_pos not in seq_embedded_variant_dict")
        elif not isinstance(seq_embedded_variant_dict["seq_start_pos"], int):
            raise TypeError("seq_start_pos must be an integer")

        if "seq_end_pos" not in seq_embedded_variant_dict:
            raise KeyError("seq_end_pos not in seq_embedded_variant_dict")
        elif not isinstance(seq_embedded_variant_dict["seq_end_pos"], int):
            raise TypeError("seq_end_pos must be an integer")

        if "embedded_ref_seq_len" not in seq_embedded_variant_dict:
            raise KeyError("embedded_ref_seq_len not in seq_embedded_variant_dict")
        elif not isinstance(seq_embedded_variant_dict["embedded_ref_seq_len"], int):
            raise TypeError("embedded_ref_seq_len must be an integer")

        if "embedded_alt_seq_len" not in seq_embedded_variant_dict:
            raise KeyError("embedded_alt_seq_len not in seq_embedded_variant_dict")
        elif not isinstance(seq_embedded_variant_dict["embedded_alt_seq_len"], int):
            raise TypeError("embedded_alt_seq_len must be an integer")

        variant_dict = seq_embedded_variant_dict.copy()
        del variant_dict["seq_start_pos"]
        del variant_dict["seq_end_pos"]
        del variant_dict["embedded_ref_seq_len"]
        del variant_dict["embedded_alt_seq_len"]

        return cls(
            Variant.from_dict(variant_dict),
            seq_embedded_variant_dict["seq_start_pos"],
            seq_embedded_variant_dict["seq_end_pos"],
            seq_embedded_variant_dict["embedded_ref_seq_len"],
            seq_embedded_variant_dict["embedded_alt_seq_len"],
        )

    def fuse_to_end(self, other: "SeqEmbeddedVariant") -> "SeqEmbeddedVariant":
        """
        Fuses the `other` SeqEmbeddedVariant to the end of `self`.
        Assumes that the two SeqEmbeddedVariants come from the same Variant,
        are located on the adjacent edges of two disjoined regions of the sequence (with independent seq start and end positions) which are being joined into one sequence.

        Args:
            other: The other SeqEmbeddedVariant to fuse.

        Returns:
            The fused SeqEmbeddedVariant

        Raises:
            ValueError: If the two SeqEmbeddedVariants do not come from the same Variant
        """
        if self.variant_id != other.variant_id:
            raise ValueError(
                "Fusion of SeqEmbeddedVariants from different variants is not supported"
            )

        if not (
            other.seq_start_pos == 1
            or (
                self.seq_substitution_type == SeqSubstitutionType.DELETION
                and other.seq_start_pos == 0
            )
        ):
            raise ValueError(
                f"`other` SeqEmbeddedVariant must start at the start of its sequence to be fusable ({other.seq_start_pos} is not a start position for substitution type {self.seq_substitution_type})."
            )

        fused_seq_embedded_variant: SeqEmbeddedVariant = deepcopy(self)

        fused_seq_embedded_variant.seq_end_pos += other.seq_end_pos
        fused_seq_embedded_variant.embedded_ref_seq_len += other.embedded_ref_seq_len
        fused_seq_embedded_variant.embedded_alt_seq_len += other.embedded_alt_seq_len

        # In case of deletions, seq_end_pos of first seq region would be at flanking base to the region end,
        # so must be adjusted.
        if (
            fused_seq_embedded_variant.seq_substitution_type
            == SeqSubstitutionType.DELETION
        ):
            fused_seq_embedded_variant.seq_end_pos -= 1

        return fused_seq_embedded_variant

    def to_translated(self) -> "SeqEmbeddedVariant":
        """
        Converts the SeqEmbeddedVariant to represent embedment in it's corresponding translated (protein) sequence.

        Assumes the current instance is based on full (untranslated) coding sequence (no frameshift required, start of seq is start codon).
        To allow comparison between sequences with reference and with alternative variant sequences embedded, positions include
        fanking bases or amino acids where the deletion/insertion would otherwise start/end in between bases or amino acids.
        In practice this means:
         * For substitutions:
             - Untranslated seq positions are represented as the affected nucleotide position(s).
             - Translated seq positions should represent the affected amino acid position(s) (= direct positional translation).
         * For insertions:
             - Untranslated seq positions are represented as the inserted nucleotide position(s) (no flanking bases, to be changed when adding reference variant positioning display).
             - Translated seq positions should represent the affected amino acid position(s) (on insertion in middle of codon)
                + flanking AA at start and end where the variant inserts complete codons, in-frame with reference (for insertions of >= 3 bps)
         * For deletions:
             - Untranslated seq positions are represented as the flanking nucleotide positions to the deletion site (both start & end).
             - Translated seq positions should indicate the affected amino acid position(s) (on partial codon deletions)
                + flanking AAs at start and end where the variant deletes complete codons, in-frame with reference (deletions of >= 3 bps)

        Returns:
            SeqEmbeddedVariant with its attributes translated to the corresponding values for the translated (protein) sequence.
        """
        translated_start_pos: int
        translated_end_pos: int
        no_flank_start: int
        no_flank_end: int

        if (
            self.seq_substitution_type == SeqSubstitutionType.SUBSTITUTION
            or self.seq_substitution_type == SeqSubstitutionType.INDEL
        ):
            translated_start_pos = translate_seq_position(self.seq_start_pos)
            translated_end_pos = translate_seq_position(self.seq_end_pos)

        elif self.seq_substitution_type == SeqSubstitutionType.INSERTION:
            no_flank_start = self.seq_start_pos
            no_flank_end = self.seq_end_pos
            translated_start_pos = translate_seq_position(no_flank_start)
            translated_end_pos = translate_seq_position(no_flank_end)

            # TODO: re-enable below block when reference positioning is implemented,
            # then flank-inclusion will be required to enable ref vs alt comparison.
            # On in-frame insertions, no reference AAs would be affected, so only flanking AAs can be used for visualisation.

            # # For complete-codon insertions starting between codons (in-frame with reference),
            # # include start- and end-flanking AA
            # if self.embedded_alt_seq_len >= 3 and self.embedded_alt_seq_len % 3 == 0 and no_flank_start % 3 == 1:
            #     if translated_start_pos > 1:
            #         translated_start_pos -= 1

            #     if translated_end_pos < seq_length:
            #         translated_end_pos += 1

        elif self.seq_substitution_type == SeqSubstitutionType.DELETION:
            no_flank_start = self.seq_start_pos + 1
            no_flank_end = self.seq_end_pos
            translated_start_pos = translate_seq_position(no_flank_start)
            translated_end_pos = translate_seq_position(no_flank_end)

            # For complete-codon deletion starting at codon start (in-frame with reference),
            # include start-flanking AA (end-flanking AA is current translated_end_pos)
            if (
                self.embedded_ref_seq_len >= 3
                and self.embedded_ref_seq_len % 3 == 0
                and no_flank_start % 3 == 1
            ):
                translated_start_pos -= 1

        else:
            raise ValueError(
                f"Unsupported substitution type: {self.seq_substitution_type}"
            )

        translated_seq_embedded_variant: SeqEmbeddedVariant = deepcopy(self)
        translated_seq_embedded_variant.seq_start_pos = translated_start_pos
        translated_seq_embedded_variant.seq_end_pos = translated_end_pos
        translated_seq_embedded_variant.embedded_ref_seq_len = translate_seq_position(
            self.embedded_ref_seq_len
        )
        translated_seq_embedded_variant.embedded_alt_seq_len = translate_seq_position(
            self.embedded_alt_seq_len
        )
        return translated_seq_embedded_variant


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
    def trimmed_on_rel_positions(
        cls, variants_list: "SeqEmbeddedVariantsList", trim_end: int
    ) -> "SeqEmbeddedVariantsList":
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
            elif (
                embedded_variant.seq_start_pos == trim_end
                and embedded_variant.seq_substitution_type
                == SeqSubstitutionType.DELETION
            ):
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
