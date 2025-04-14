"""
Module containing the MultiPartSeqRegion class.
"""

from Bio import Seq

from typing import Any, Dict, List, override, Optional, Set

from .seq_region import SeqRegion
from .variant import Variant, variants_overlap

from log_mgmt import get_logger

logger = get_logger(name=__name__)


class MultiPartSeqRegion(SeqRegion):
    """
    Defines a (non-continuous) genetic sequence region consisting of multiple (consecutive) sequence regions.
    """

    ordered_seqRegions: List[SeqRegion]
    """Ordered list of SeqRegions which constitute a single multi-part sequence region"""

    sequence: Optional[str]
    """Sequence of the complete multi-part sequence region"""

    def __init__(self, seq_regions: List[SeqRegion]):
        """
        Initializes a MultiPartSeqRegion instance from multiple `SeqRegion`s.

        Sequence regions will be ordered based on their `start` attribute:
         * Ascending order when MultiPartSeqRegion.strand is positive strand
         * Descending order when MultiPartSeqRegion.strand is negative strand

        Args:
            seq_regions:      List of SeqRegion objects that constitute this multi-part sequence region.\
                              All SeqRegions must have identical seq_id, strand and fasta_file_path properties \
                              to form a valid MultipartSeqRegion.

        Raises:
            ValueError: if `seq_regions` have distinct `seq_id`, `strand` or `fasta_file_path` properties.
        """

        self.start = min(map(lambda seq_region: seq_region.start, seq_regions))
        self.end = max(map(lambda seq_region: seq_region.end, seq_regions))
        self.seq_length = sum(map(lambda seq_region: seq_region.seq_length, seq_regions))

        # Ensure one strand
        strands: Set[SeqRegion.STRAND_TYPE] = set(map(lambda seq_region: seq_region.strand, seq_regions))
        if len(strands) > 1:
            raise ValueError(f"Multiple strands defined accross seq regions ({strands})."
                             + " All seqRegions in multiPartSeqRegion must have equal value for strand attribute.")
        else:
            self.strand = strands.pop()

        # Ensure one seq_id
        seq_ids: Set[str] = set(map(lambda seq_region: seq_region.seq_id, seq_regions))
        if len(seq_ids) > 1:
            raise ValueError(f"Multiple seq_ids defined accross seq regions ({seq_ids})."
                             + " All seqRegions in multiPartSeqRegion must have equal value for seq_id attribute.")
        else:
            self.seq_id = seq_ids.pop()

        # Ensure one fasta_file_path
        fasta_file_paths: Set[str] = set(map(lambda seq_region: seq_region.fasta_file_path, seq_regions))
        if len(fasta_file_paths) > 1:
            raise ValueError(f"Multiple fasta_file_paths defined accross seq regions ({fasta_file_paths})."
                             + " All seqRegions in multiPartSeqRegion must have equal value for fasta_file_path attribute.")
        else:
            self.fasta_file_path = fasta_file_paths.pop()

        # Sort seq_regions before storing
        sort_args: Dict[str, Any] = dict(key=lambda region: region.start, reverse=False)

        if self.strand == '-':
            sort_args['reverse'] = True

        ordered_seq_regions = seq_regions
        ordered_seq_regions.sort(**sort_args)

        # Ensure all or no frame properties are defined on seq regions
        frames = set(map(lambda seq_region: seq_region.frame, ordered_seq_regions))
        if None in frames and len(frames) > 1:
            raise ValueError("Mixed frame definitions for MultipartSeqRegion subparts found. "
                             + "Frame property must be defined for all subparts or for none.")

        # Ensure frame definitions form sequence triplets (codons)
        if None not in frames:
            reading_frame_size = 0
            for seq_region in ordered_seq_regions:
                assert seq_region.frame is not None, 'MultiPartSeqRegion codon triple validation code is not supposed to run when frame property is undefined.'
                # Accept the first frame definition verbatum
                if reading_frame_size > 0:
                    # Ensure all following ones match to codon triplets from first frame definition
                    if (reading_frame_size + seq_region.frame) % 3 != 0:
                        raise ValueError("Non-triplet frame definition found. "
                                         + f"Seq region {seq_region} breaks MultiPartSequence reading frame with its frame property.")

                    reading_frame_size += seq_region.seq_length
                else:
                    # Extract the first frame definition from it's seq_region length
                    reading_frame_size += seq_region.seq_length - seq_region.frame

        self.ordered_seqRegions = ordered_seq_regions
        self.frame = ordered_seq_regions[0].frame
        self.sequence = None

    @override
    def __str__(self) -> str:  # pragma: no cover
        return self.ordered_seqRegions.__str__()

    @override
    def fetch_seq(self, recursive_fetch: bool = True) -> None:
        """
        Fetch genetic (DNA) sequence for MultiPartSeqRegion by chaining \
        consisting SeqRegions' sequenes together into one continuous sequence.

        Chains seqRegions in the order defined in the `ordered_seqRegions` attribute.

        Args:
            recursive_fetch: if True, fetch sequence for each SeqRegion part of the MultiPartSeqRegion first, before chaining the results.

        Returns:
            Stores resulting sequence in `sequence` attribute.
        """

        complete_multipart_sequence = ''.join(map(lambda region: region.get_sequence(autofetch=recursive_fetch), self.ordered_seqRegions))
        self.set_sequence(sequence=complete_multipart_sequence)

    @override
    def set_sequence(self, sequence: str) -> None:
        """
        Set the `sequence` attribute.

        Asserts the length of `sequence` matches the expected sequence length for this region.

        Args:
            sequence: DNA sequence (string)

        Raises:
            valueError: If the length of `sequence` provided does not match the region length (sum of SeqRegion lengths)
        """

        sequence_len = len(sequence)

        if sequence_len != self.seq_length:
            raise ValueError(f"Sequence length ({sequence_len}) does not equal length expected based on region positions ({self.seq_length}).")

        self.sequence = sequence

    @override
    def get_alt_sequence(self, unmasked: bool = False, variants: List[Variant] = [], autofetch: bool = True, inframe_only: bool = False) -> str:
        """
        Get an alternative sequence of the MultipartSeqRegion by applying a list of variants to it.

        Replaces the ref sequence of the variants found in the sequence region with its alt sequence.

        Args:
            unmasked:     Flag to remove soft masking (lowercase letters) \
                          and return unmasked sequence instead (uppercase).\
                          Default `False`.
            variants:     List of variants to apply to the sequence before returning.
            autofetch:    Flag to enable/disable automatic fetching of sequence \
                          when not already available. Default `True` (enabled).
            inframe_only: Flag to return only complete in-frame codons (start==frame, len(seq) % 3 == 0).\
                          Default `False`.

        Returns:
            The MultiPartSeqRegion's sequence as a string (empty string if `None`) with provided variants embedded.

        Raises:
            ValueError:
             * when position of any of the variants falls outside the MultipartSeqRegion boundaries.
             * when variants list contains no elements.
             * when any two variants overlap.
        """

        if len(variants) < 1:
            raise ValueError('variants_alt_sequence method requires at least one variant to be provided.')
        elif len(variants) > 1 and variants_overlap(variants):
            raise ValueError('variants_alt_sequence method does not support overlapping variants.')

        if self.sequence is None and autofetch:
            self.fetch_seq(recursive_fetch=True)

        ref_sequence = self.get_sequence(unmasked=unmasked, autofetch=autofetch, inframe_only=False)

        positioned_variants: Dict[int, Variant] = {}  # Variants indexed by relative position in MultipartSeqRegion

        for variant in variants:
            # If variant is not in the MultipartSeqRegion boundaries, raise error
            if variant.genomic_seq_id != self.seq_id or variant.genomic_start_pos < self.start or self.end < variant.genomic_end_pos:
                raise ValueError(f'Variant {variant.variant_id} ({variant.genomic_seq_id}:{variant.genomic_start_pos}-{variant.genomic_end_pos}) '
                                 + f'out of boundaries of MultipartSeqRegion {self}.')

            # Determine the variant start position relative to the MultipartSeqRegion
            # by calculating relative start position from the absolute genomic start position
            rel_variant_start_pos: int
            try:
                rel_variant_start_pos = self.to_rel_position(variant.genomic_start_pos)
            except ValueError:
                logger.debug(f'Variant {variant.variant_id} ignored because no overlap found with seqRegion parts.')
                continue
            else:
                positioned_variants[rel_variant_start_pos] = variant

        # Replace the reference sequence with the alternative sequence for each variant
        alt_sequence: str = ref_sequence
        # Loop through variants in reverse order to avoid changes in indices due to indels
        for rel_start, variant in sorted(positioned_variants.items(), reverse=True):
            rel_end = rel_start + len(variant.genomic_ref_seq) - 1

            variant_ref_seq = variant.genomic_ref_seq
            variant_alt_seq = variant.genomic_alt_seq
            # Reverse complement the variant sequences for negative strand seq regions
            if self.strand == '-':
                variant_ref_seq = Seq.reverse_complement(variant_ref_seq)
                variant_alt_seq = Seq.reverse_complement(variant_alt_seq)

            seq_region_variant_seq = alt_sequence[(rel_start - 1):(rel_end)]

            if seq_region_variant_seq != variant_ref_seq:
                logger.error(f'Variant {variant.variant_id} ({variant.genomic_seq_id}:{variant.genomic_start_pos}-{variant.genomic_end_pos}) '
                             + f'does not match the reference sequence of MultipartSeqRegion {self} at positions {rel_start}-{rel_end}. '
                             + f'Expected: "{variant_ref_seq}", Found: "{seq_region_variant_seq}"')
                raise ValueError('Unexpected variant reference sequence mismatch.')
            alt_sequence = alt_sequence[:(rel_start - 1)] + variant_alt_seq + alt_sequence[rel_end:]

        if inframe_only:
            alt_sequence = self.inframe_sequence(alt_sequence)

        return alt_sequence

    def overlaps_seq_region(self, seq_region: SeqRegion) -> bool:
        """
        Check for overlap of input seq_region with MultiPartSeqRegion.

        Args:
            seq_region: SeqRegion instance to check for overlap with self

        Returns:
            True if SeqRegion overlaps with this MultiPartSeqRegion instance, False otherwise.
        """

        for seq_region in self.ordered_seqRegions:
            if seq_region.overlaps(seq_region):
                return True

        return False

    @override
    def sub_region(self, rel_start: int, rel_end: int) -> 'MultiPartSeqRegion':
        """
        Return a subregion of the MultipartSeqRegion

        Args:
            rel_start: Relative start position (1-based) of the subregion
            rel_end: Relative end position (1-based) of the subregion

        Returns:
            MultipartSeqRegion object representing the subregion
        """

        if rel_end < rel_start:
            raise ValueError(f'Relative start position {rel_start} should be smaller than relative end position {rel_end}.')
        if rel_start < 1:
            raise ValueError(f'Relative start position {rel_start} falls outside the boundaries of the MultipartSeqRegion {self} (len {self.seq_length}).')
        if self.seq_length < rel_end:
            raise ValueError(f'Relative end position {rel_end} fall outside the boundaries of the MultipartSeqRegion {self} (len {self.seq_length}).')

        seq_regions: List[SeqRegion] = []

        covered_length: int = 0
        for seq_region in self.ordered_seqRegions:
            if (covered_length + seq_region.seq_length) < rel_start:
                covered_length += seq_region.seq_length
                continue

            seq_regions.append(seq_region.sub_region(rel_start=max(1, rel_start - covered_length), rel_end=min(rel_end - covered_length, seq_region.seq_length)))
            covered_length += seq_region.seq_length

            if rel_end <= covered_length:
                break

        return MultiPartSeqRegion(seq_regions=seq_regions)

    @override
    def to_rel_position(self, seq_position: int) -> int:
        """
        Convert absolute sequence position to relative position within the MultipartSeqRegion

        Args:
            seq_position: absolute sequence position to be converted

        Returns:
            Relative position on the complete MultipartSeqRegion sequence (1-based)

        Raises:
            ValueError: when abs_position falls between SeqRegion parts
        """
        if seq_position < self.start or self.end < seq_position:
            raise ValueError(f'Seq position {seq_position} out of boundaries of MultipartSeqRegion {self}.')

        rel_position: int | None = None
        for i in range(0, len(self.ordered_seqRegions)):
            region = self.ordered_seqRegions[i]

            if region.start <= seq_position and seq_position <= region.end:
                rel_position = sum(map(lambda seq_region: seq_region.seq_length, self.ordered_seqRegions[0:i]))

                rel_position += region.to_rel_position(seq_position)

                break

        if rel_position is None:
            raise ValueError(f'Seq position {seq_position} located between SeqRegion parts defining the MultipartSeqRegion {self}.')

        return rel_position
