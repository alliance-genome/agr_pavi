"""
Module containing the MultiPartSeqRegion class.
"""

from Bio import Seq  # Bio.Seq biopython submodule
from Bio.Data import CodonTable
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

    protein_sequence: str
    """Protein sequence of a sequence region."""

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

        self.seq_length: int = sum(map(lambda seq_region: seq_region.seq_length, seq_regions))
        self.start: int = min(map(lambda seq_region: seq_region.start, seq_regions))
        self.end: int = max(map(lambda seq_region: seq_region.end, seq_regions))

        strands: Set[str] = set(map(lambda seq_region: seq_region.strand, seq_regions))
        if len(strands) > 1:
            raise ValueError(f"Multiple strands defined accross seq regions ({strands})."
                             + " All seqRegions in multiPartSeqRegion must have equal value for strand attribute.")
        else:
            self.strand = strands.pop()

        seq_ids: Set[str] = set(map(lambda seq_region: seq_region.seq_id, seq_regions))
        if len(seq_ids) > 1:
            raise ValueError(f"Multiple seq_ids defined accross seq regions ({seq_ids})."
                             + " All seqRegions in multiPartSeqRegion must have equal value for seq_id attribute.")
        else:
            self.seq_id = seq_ids.pop()

        fasta_file_paths: Set[str] = set(map(lambda seq_region: seq_region.fasta_file_path, seq_regions))
        if len(fasta_file_paths) > 1:
            raise ValueError(f"Multiple fasta_file_paths defined accross seq regions ({fasta_file_paths})."
                             + " All seqRegions in multiPartSeqRegion must have equal value for fasta_file_path attribute.")
        else:
            self.fasta_file_path = fasta_file_paths.pop()

        sort_args: Dict[str, Any] = dict(key=lambda region: region.start, reverse=False)

        if self.strand == '-':
            sort_args['reverse'] = True

        ordered_seq_regions = seq_regions
        ordered_seq_regions.sort(**sort_args)

        self.ordered_seqRegions = ordered_seq_regions

    @override
    def fetch_seq(self) -> None:
        """
        Fetch genetic (DNA) sequence for MultiPartSeqRegion by chaining \
        consisting SeqRegions' sequenes together into one continuous sequence.

        Chains seqRegions in the order defined in the `ordered_seqRegions` attribute.

        Returns:
            Stores resulting sequence in `sequence` attribute.
        """

        self.set_sequence(''.join(map(lambda region: region.get_sequence(), self.ordered_seqRegions)))

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

    def translate(self) -> str | None:
        """
        Method to translate (c)DNA sequence of sequence region (`sequence` attribute) to protein sequence.

        Stores the resulting protein sequence in the `protein_sequence` attribute and returns it.

        Returns:
            Protein sequence corresponding to the sequence region's `sequence`. Returns `None` if no Open Reading Frame was found in the sequence.
        """
        dna_sequence = self.get_sequence()

        codon_table: CodonTable.CodonTable = CodonTable.unambiguous_dna_by_name["Standard"]

        # Find the best open reading frame
        orfs = find_orfs(dna_sequence, codon_table, return_type='longest')

        if len(orfs) > 0:
            # Translate to protein
            orf = orfs.pop()
            self.protein_sequence = str(Seq.translate(sequence=orf['sequence'], table=codon_table, cds=False, to_stop=True))  # type: ignore

            return self.protein_sequence
        else:
            return None


def find_orfs(dna_sequence: str, codon_table: CodonTable.CodonTable, return_type: str = 'all') -> List[Dict[str, Any]]:
    """
    Find Open Reading Frames (ORFs) in a (spliced) DNA sequence.

    Defines ORFs as reading frame from first start codon to first stop codon.
    Continues to search for more ORFs after previous ORF was closed.
    Only reports complete ORFs (with start and stop codon found in sequence).

    Args:
        dna_sequence: the DNA sequence to search open reading frames in
        codon_table: the codon table to define start and stop codons
        return_type: 'all' to return all ORFs found, 'longest' to return the longest found.

    Returns:
        List of open reading frames found (in accordance to `return_type`).

    Raises:
        ValueError: if `return_type` does not have a valid value.
    """

    # Split the DNA sequence in codons (3-base blocks).
    # Offset the sequence by 1 or 2 (skip first N bases) to obtain all possible codons.
    CODON_SIZE = 3
    codons: Dict[int, List[str]] = dict()
    for offset in range(0, CODON_SIZE):
        codons[offset] = [dna_sequence[i:i + CODON_SIZE] for i in range(offset, len(dna_sequence), CODON_SIZE)]

    # Read through all codons with each offset and determine the ORFs
    orfs: List[Dict[str, Any]] = []
    for offset in range(0, CODON_SIZE):
        reading_frame_opened = False
        index_opened: int = -1

        for i, codon in enumerate(codons[offset]):

            if codon in codon_table.stop_codons:
                if reading_frame_opened:
                    orf: Dict[str, Any] = {}
                    orf['sequence'] = ''.join(codons[offset][index_opened:i + 1])
                    orf['seq_start'] = offset + index_opened * CODON_SIZE + 1  # Relative (DNA) sequence start position (1-based)
                    orf['seq_end'] = offset + (i + 1) * CODON_SIZE  # Relative (DNA) sequence end position (1-based)
                    orf['complete'] = True
                    orf['offset'] = offset

                    orfs.append(orf)

                reading_frame_opened = False
                index_opened = -1

            if codon in codon_table.start_codons:
                if not reading_frame_opened:
                    reading_frame_opened = True
                    index_opened = i

    if len(orfs) == 0:
        logger.warning('No open reading frames found in provided sequence.')
        return orfs

    if return_type == 'all':
        return orfs
    elif return_type == 'longest':
        orfs.sort(key=lambda orf: len(orf['sequence']), reverse=False)
        return [orfs.pop()]
    else:
        raise ValueError(f"return_type {return_type} is not a valid value.")
