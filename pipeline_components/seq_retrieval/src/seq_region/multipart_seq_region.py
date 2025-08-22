"""
Module containing the MultiPartSeqRegion class.
"""

from typing import Any, Callable, Dict, List, override, Optional, Set, TypedDict

from .seq_region import SeqRegion, AltSeqInfo
from .variant import EmbeddedVariant, SeqSubstitutionType, Variant, variants_overlap

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
    def fetch_seq(self, recursive_fetch: bool = True) -> str:
        """
        Fetch genetic (DNA) sequence for MultiPartSeqRegion by chaining \
        consisting SeqRegions' sequenes together into one continuous sequence.

        Chains seqRegions in the order defined in the `ordered_seqRegions` attribute.
        Stores resulting sequence in `sequence` attribute.

        Args:
            recursive_fetch: if True, fetch sequence for each SeqRegion part of the MultiPartSeqRegion first, before chaining the results.

        Returns:
            The fetched sequence as a string.
        """

        fetch_result = self.fetch_alt_seq(recursive_fetch=recursive_fetch, variants=[])

        self.set_sequence(sequence=fetch_result['sequence'])

        return fetch_result['sequence']

    def fetch_alt_seq(self, inframe_only: bool = False, recursive_fetch: bool = True, variants: List[Variant] = []) -> AltSeqInfo:
        """
        Fetch alternative genetic (DNA) sequence for MultiPartSeqRegion, \
        by applying the relevant variants to each of the consisting SeqRegions, \
        and chaining the resulting sequences together into one continuous sequence.

        Chains seqRegions in the order defined in the `ordered_seqRegions` attribute.

        Args:
            inframe_only:    Flag to return only complete in-frame codons (start==frame, len(seq) % 3 == 0).\
                             Default `False`.
            recursive_fetch: if True, fetch sequence for each SeqRegion part of the MultiPartSeqRegion first, before chaining the results.
            variants:        Optional list of variants to apply to the sequence before returning.

        Returns:
            The fetched sequence as a string.

        Raises:
            ValueError:
             * When any variant in variants list is outside the MultipartSeqRegion boundaries.
             * when any two variants in variants list overlap.
        """

        if len(variants) > 1 and variants_overlap(variants):
            raise ValueError('fetch_alt_seq method does not support overlapping variants.')

        # If inframe_only, start from the inframe MultipartSeqRegion
        region: 'MultiPartSeqRegion'
        if inframe_only:
            region = self.inframe_seq_region()
        else:
            region = self

        # Map variants to all region parts (SeqRegion's)
        variants_overlap_map = region.map_vars_to_region_parts(variants=variants)

        # Loop through region.ordered_seqRegions and apply overlapping variants for each seqRegion as required
        complete_multipart_sequence = ''
        embedded_variants: List[EmbeddedVariant] = []

        for region_part in region.ordered_seqRegions:
            region_part_str = str(region_part)
            if region_part_str in variants_overlap_map and len(variants_overlap_map[region_part_str]) > 0:
                region_alt_seq = region_part.get_alt_sequence(autofetch=recursive_fetch, variants=variants_overlap_map[region_part_str])

                if len(region_alt_seq['embedded_variants']) > 0:
                    # Check if last embedded variant is overlapping with this region as well
                    # if so, merge them
                    if len(embedded_variants) > 0 and embedded_variants[-1].variant_id == region_alt_seq['embedded_variants'][0].variant_id:
                        # Extend the rel_end of the last embedded variant to include the end on this region
                        embedded_variants[-1].rel_end += region_alt_seq['embedded_variants'][0].rel_end

                        # In case of deletions, rel_end on previous region would be at flanking base to the region end,
                        # so must be adjusted.
                        if embedded_variants[-1].seq_substitution_type == SeqSubstitutionType.DELETION:
                            embedded_variants[-1].rel_end -= 1

                        region_alt_seq['embedded_variants'].pop(0)

                    # Bump rel_start and rel_end positions to include prior region parts
                    for embedded_variant in region_alt_seq['embedded_variants']:
                        embedded_variant.rel_start += len(complete_multipart_sequence)
                        embedded_variant.rel_end += len(complete_multipart_sequence)

                    embedded_variants.extend(region_alt_seq['embedded_variants'])

                complete_multipart_sequence += region_alt_seq['sequence']
            else:
                complete_multipart_sequence += region_part.get_sequence(autofetch=recursive_fetch)

        if inframe_only and len(embedded_variants) > 0:
            # Trim sequence to complete in-frame codons (possibly extended/shortened by embedded variants)
            inframe_length = len(complete_multipart_sequence) // 3 * 3  # Floor the length to full codons
            complete_multipart_sequence = complete_multipart_sequence[0:inframe_length]

            # Remove embedded variants that are outside of in-frame window
            # and trim rel_end for embedded variants partially outside of in-frame window
            for index, embedded_variant in reversed(list(enumerate(embedded_variants))):
                if embedded_variant.rel_start > inframe_length:
                    # Embedded variant completely outside of in-frame window
                    del embedded_variants[index]
                elif embedded_variant.rel_start == inframe_length and embedded_variant.seq_substitution_type == SeqSubstitutionType.DELETION:
                    # Embedded variant is deletions just outside of in-frame window
                    del embedded_variants[index]
                elif embedded_variant.rel_end > inframe_length:
                    # Embedded variant partially outside of in-frame window
                    # Set rel_end to length of in-frame window
                    embedded_variant.rel_end = inframe_length
                else:
                    # Embedded variant is fully within in-frame window
                    break

        return {
            'sequence': complete_multipart_sequence,
            'embedded_variants': embedded_variants
        }

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
    def get_alt_sequence(self, unmasked: bool = False, variants: List[Variant] = [], autofetch: bool = True, inframe_only: bool = False) -> AltSeqInfo:
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
            `AltSeqInfo` object representing the MultiPartSeqRegion's alternative sequence.

        Raises:
            ValueError:
             * when position of any of the variants falls outside the MultipartSeqRegion boundaries.
             * when variants list contains no elements.
             * when any two variants overlap.
        """

        if len(variants) < 1:
            raise ValueError('get_alt_sequence method requires at least one variant to be provided.')
        elif len(variants) > 1 and variants_overlap(variants):
            raise ValueError('get_alt_sequence method does not support overlapping variants.')

        if self.sequence is None and autofetch:
            self.fetch_seq(recursive_fetch=True)

        alt_seq_info = self.fetch_alt_seq(variants=variants, inframe_only=inframe_only)
        alt_sequence = alt_seq_info['sequence']

        if unmasked:
            alt_sequence = alt_sequence.upper()

        return {
            'sequence': alt_sequence,
            'embedded_variants': alt_seq_info['embedded_variants']
        }

    @override
    def inframe_seq_region(self) -> 'MultiPartSeqRegion':
        """
        Return the subregion of the MultiPartSeqRegion within complete reading frames.

        Skips the first n bases of the region where n is `self.frame` if `frame` is set.
        Trims the end of the resulting region to a sequencelength that matches complete codons (a multiple of 3).

        Returns:
            The in-frame subregion of a seq region.
        """

        rel_start: int = self.frame or 0  # 0-based relative start of inframe region
        length = (self.seq_length - rel_start) // 3 * 3  # Floor the length to full codons
        rel_end: int = rel_start + length - 1  # 0-based relative end of inframe region
        logger.debug(f'seq_length {self.seq_length}, frame "{self.frame}"')
        logger.debug(f'Inframe region: start {rel_start}, end {rel_end}, length {length}')

        return self.sub_region(rel_start + 1, rel_end + 1)

    def map_vars_to_region_parts(self, variants: List[Variant]) -> Dict[str, List[Variant]]:
        """
        Map a list of variants to the SeqRegion parts of a MultipartSeqRegion.

        Args:
            variants: List of variants to map to the MultipartSeqRegion.

        Returns:
            Dict of lists of variants (values) overlapping each of the parts of the MultipartSeqRegion (keys).
        """
        # Sort variants to relative position in `self` (MultiPartSeqRegion) (ascending)
        class SortArgs(TypedDict):
            key: Callable[[Variant], int]
            reverse: bool

        sort_kwargs: SortArgs
        if self.strand == '-':
            sort_kwargs = dict(key=lambda variant: variant.genomic_end_pos, reverse=True)
        else:
            sort_kwargs = dict(key=lambda variant: variant.genomic_start_pos, reverse=False)

        variant_overlap_map: Dict[str, List[Variant]] = {}  # Key: str of SeqRegion part in `ordered_seqRegions`, Value: list of overlapping variants

        last_seq_region_overlap_idx: int | None = None  # `ordered_seqRegions` index of last SeqRegion part with overlapping variants

        for variant in sorted(variants, **sort_kwargs):
            last_variant_overlap_idx: int | None = None  # `ordered_seqRegions` index of last SeqRegion part overlapping this variant
            # If variant is not in the MultipartSeqRegion boundaries, warn and skip
            if variant.genomic_seq_id != self.seq_id or self.end < variant.genomic_start_pos or variant.genomic_end_pos < self.start:
                logger.warning(f'Variant ({variant}) out of boundaries of MultipartSeqRegion ({self}).')
                continue

            # Determine the overlapping SeqRegion parts
            for region_idx in range(last_seq_region_overlap_idx or 0, len(self.ordered_seqRegions)):
                region_part = self.ordered_seqRegions[region_idx]
                region_part_str = str(region_part)

                # Initiate empty list for each SeqRegion part
                if region_part_str not in variant_overlap_map:
                    variant_overlap_map[region_part_str] = []

                # Store the respective overlaps
                if variant.overlaps(region_part):
                    variant_overlap_map[region_part_str].append(variant)
                    last_seq_region_overlap_idx = region_idx
                    last_variant_overlap_idx = region_idx
                # Stop search for this variant if no more overlaps expected to be found
                elif last_variant_overlap_idx is not None:
                    break

        return variant_overlap_map

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
