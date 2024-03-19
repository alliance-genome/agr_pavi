"""
Module containing the MultiPartSeqRegion class.
"""

from typing import Any, Dict, List, override

from seq_region import SeqRegion


class MultiPartSeqRegion(SeqRegion):
    """
    Defines a (non-continuous) genetic sequence region consisting of multiple (consecutive) sequence regions.
    """

    seqRegion_list: List[SeqRegion]
    """List of SeqRegions which contitute a single multi-part sequence region"""

    def __init__(self, seq_regions: List[SeqRegion]):
        """
        Initializes a MultiPartSeqRegion instance from multiple `SeqRegion`s

        Args:
            seq_regions: list of SeqRegion objects that constitute this multi-part sequence region.\
                         All SeqRegions must have identical seq_id, strand and fasta_file_path properties to form a valid MultipartSeqRegion.

        Raises:
            ValueError: if `seq_regions` have distinct `seq_id`, `strand` or `fasta_file_path` properties.
        """
        self.seqRegion_list = seq_regions

        for seqRegion in seq_regions:
            if not hasattr(self, 'strand'):
                self.strand = seqRegion.strand
            elif self.strand != seqRegion.strand:
                raise ValueError(f"Strand {seqRegion.strand} does not match strand of first seqRegion ({self.strand})."
                                 + " All seqRegions in multiPartSeqRegion must have equal value for strand property.")

            if not hasattr(self, 'seq_id'):
                self.seq_id = seqRegion.seq_id
            elif self.seq_id != seqRegion.seq_id:
                raise ValueError(f"seq_id {seqRegion.seq_id} does not match seq_id of first seqRegion ({self.seq_id})."
                                 + " All seqRegions in multiPartSeqRegion must have equal value for seq_id property.")

            if not hasattr(self, 'fasta_file_path'):
                self.fasta_file_path = seqRegion.fasta_file_path
            elif self.fasta_file_path != seqRegion.fasta_file_path:
                raise ValueError(f"fasta_file_path {seqRegion.fasta_file_path} does not match fasta_file_path of first seqRegion ({self.fasta_file_path})."
                                 + " All seqRegions in multiPartSeqRegion must have equal value for fasta_file_path property.")

    @override
    def fetch_seq(self) -> None:
        """
        Fetch genetic (DNA) sequence for MultiPartSeqRegion by chaining \
        consisting SeqRegions' sequenes together into one continuous sequence.

        SeqRegions are chained together in an order based on the `start` attribute of each:
        * Ascending order when MultiPartSeqRegion.strand is positive strand
        * Descending order when MultiPartSeqRegion.strand is negative strand

        Returns:
            Stores resulting sequence in `sequence` attribute.
        """

        sort_args: Dict[str, Any] = dict(key=lambda region: region.start, reverse=False)

        if self.strand == '-':
            sort_args['reverse'] = True

        sorted_regions = self.seqRegion_list
        sorted_regions.sort(**sort_args)
        self.sequence = ''.join(map(lambda region: region.get_sequence(), sorted_regions))

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

        seq_len = len(sequence)

        expected_len = 0
        for region in self.seqRegion_list:
            expected_len += region.end - region.start + 1

        if seq_len != expected_len:
            raise ValueError(f"Sequence length {seq_len} does not equal length expected based on region positions {expected_len}.")
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
