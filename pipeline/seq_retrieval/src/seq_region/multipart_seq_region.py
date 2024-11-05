"""
Module containing the MultiPartSeqRegion class.
"""

from typing import Any, Dict, List, override, Set

from seq_region import SeqRegion
from log_mgmt import get_logger

logger = get_logger(name=__name__)


class MultiPartSeqRegion(SeqRegion):
    """
    Defines a (non-continuous) genetic sequence region consisting of multiple (consecutive) sequence regions.
    """

    ordered_seqRegions: List[SeqRegion]
    """Ordered list of SeqRegions which constitute a single multi-part sequence region"""

    sequence: str
    """Sequence of the complete multi-part sequence region"""

    def __init__(self, seq_regions: List[SeqRegion]):
        """
        Initializes a MultiPartSeqRegion instance from multiple `SeqRegion`s.

        Sequence regions will be ordered based on their `start` attribute:
         * Ascending order when MultiPartSeqRegion.strand is positive strand
         * Descending order when MultiPartSeqRegion.strand is negative strand

        Args:
            seq_regions: list of SeqRegion objects that constitute this multi-part sequence region.\
                         All SeqRegions must have identical seq_id, strand and fasta_file_path properties \
                         to form a valid MultipartSeqRegion.

        Raises:
            ValueError: if `seq_regions` have distinct `seq_id`, `strand` or `fasta_file_path` properties.
        """

        self.start: int = min(map(lambda seq_region: seq_region.start, seq_regions))
        self.end: int = max(map(lambda seq_region: seq_region.end, seq_regions))
        self.seq_length: int = sum(map(lambda seq_region: seq_region.seq_length, seq_regions))

        # Ensure one strand
        strands: Set[str] = set(map(lambda seq_region: seq_region.strand, seq_regions))
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

        self.ordered_seqRegions = ordered_seq_regions

    @override
    def __str__(self) -> str:  # pragma: no cover
        return self.ordered_seqRegions.__str__()

    @override
    def fetch_seq(self, recursive_fetch: bool = False) -> None:
        """
        Fetch genetic (DNA) sequence for MultiPartSeqRegion by chaining \
        consisting SeqRegions' sequenes together into one continuous sequence.

        Chains seqRegions in the order defined in the `ordered_seqRegions` attribute.

        Args:
            recursive_fetch: if True, fetch sequence for each SeqRegion part of the MultiPartSeqRegion first, before chaining the results.

        Returns:
            Stores resulting sequence in `sequence` attribute.
        """

        def get_fetch_sequence(region: SeqRegion) -> str:
            if recursive_fetch:
                region.fetch_seq()
            return region.get_sequence()

        complete_multipart_sequence = ''.join(map(lambda region: get_fetch_sequence(region), self.ordered_seqRegions))
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
            raise ValueError(f"Sequence length {sequence_len} does not equal length expected based on region positions {self.seq_length}.")
        else:
            self.sequence = sequence

    @override
    def get_sequence(self, unmasked: bool = False) -> str:
        """
        Method to return `sequence` attribute as a string (optionally with modifications).

        Args:
            unmasked: Flag to remove soft masking (lowercase letters) \
                      and return unmasked sequence instead (uppercase). Default `False`.
        Returns:
            The sequence of a seq region as a string (empty string if `None`).
        """

        seq = str(self.sequence)

        if unmasked:
            seq = seq.upper()

        return seq

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

                if self.strand == '+':
                    rel_position += seq_position - region.start + 1
                else:
                    rel_position += region.end - seq_position + 1

                break

        if rel_position is None:
            raise ValueError(f'Seq position {seq_position} located between SeqRegion parts defining the MultipartSeqRegion {self}.')

        return rel_position
