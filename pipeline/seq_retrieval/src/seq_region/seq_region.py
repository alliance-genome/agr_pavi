"""
Module containing the SeqRegion class and all functions to handle SeqRegion entities.
"""
import typing

from Bio import Seq #Bio.Seq biopython submodule
import pysam

from data_mover import data_file_mover

class SeqRegion():
    """
    Defines a DNA sequence region.
    """

    seq_id: str
    """The sequence identifier found in the fasta file on which the sequence region is located"""

    start: int
    """The start position of the sequence region (1-based, inclusive). Asserted to be `start` < `end`."""

    end: int
    """The end position of the sequence region (1-base, inclusive). Asserted to be `start` < `end`."""

    strand: str
    """The (genomic) strand of the sequence region"""

    fasta_file_path: str
    """Absolute path to (faidx indexed) FASTA file containing the sequences"""

    sequence: typing.Optional[str]
    """the DNA sequence of a sequence region"""

    def __init__(self, seq_id: str, start: int, end: int, strand: str, fasta_file_url: str, seq: typing.Optional[str] = None):
        """
        Initializes a SeqRegion instance

        Args:
            seq_id: The sequence identifier found in the fasta file on which the sequence region is located
            start: The start position of the sequence region (1-based, inclusive).\
                   If negative strand, `start` and `end` are swapped if `end` < `start`.
            end: The end position of the sequence region (1-base, inclusive).\
                 If negative strand, `start` and `end` are swapped if `end` < `start`.
            strand: the (genomic) strand of the sequence region
            fasta_file_url: Path to local faidx-indexed FASTA file containing the sequences to retrieve (regions of).\
                            Faidx-index files `fasta_file_url`.fai and `fasta_file_url`.gzi for compressed fasta file must be accessible URLs.
            seq: optional DNA sequence of the sequence region

        Raises:
            ValueError: if value of `end` < `start` and `strand` is '+'
        """
        self.seq_id = seq_id
        self.strand = strand

        #If strand is -, ensure start <= end (swap as required)
        if strand == '-':
            if end < start:
                self.start = end
                self.end = start
            else:
                self.start = start
                self.end = end
        #If strand is +, throw error when end < start (likely user error)
        else:
            if end < start:
                raise ValueError(f"Unexpected position order: end {end} < start {start}.")
            else:
                self.start = start
                self.end = end

        # Fetch the file(s)
        local_fasta_file_path = data_file_mover.fetch_file(fasta_file_url)

        # Fetch additional faidx index files in addition to fasta file itself
        # (to the same location)
        index_files = [fasta_file_url+'.fai']
        if fasta_file_url.endswith('.gz'):
            index_files.append(fasta_file_url+'.gzi')

        for index_file in index_files:
            data_file_mover.fetch_file(index_file)

        self.fasta_file_path = local_fasta_file_path

        if seq != None:
            self.sequence = seq


    def fetch_seq(self) -> None:
        """
        Fetch sequence found at `seq_id`:`start`-`end`:`strand`
        by reading from faidx files at `fasta_file_path`.

        Stores resulting sequence in `sequence` attribute.
        """
        try:
            fasta_file = pysam.FastaFile(self.fasta_file_path)
        except ValueError:
            raise FileNotFoundError(f"Missing index file matching path {self.fasta_file_path}.")
        except IOError:
            raise IOError(f"Error while reading fasta file or index matching path {self.fasta_file_path}.")
        else:
            seq = fasta_file.fetch(reference=self.seq_id, start=self.start-1, end=self.end)
            fasta_file.close()

            if self.strand == '-':
                seq = Seq.reverse_complement(seq)

        self.sequence = seq

    def get_sequence(self) -> str:
        """Return `sequence` attribute as a string (empty string if `None`)."""
        return str(self.sequence)

def chain_seq_region_seqs(seq_regions: typing.List[SeqRegion], seq_strand: str) -> str:
    """
    Chain multiple SeqRegions' sequenes together into one continuous sequence.

    SeqRegions are chained together in an order based on the `start` attribute of each:
     * Ascending order when `seq_strand` is positive strand
     * Descending order when `seq_strand` is negative strand

    Args:
        seq_regions: list of SeqRegion objects to chain together
        seq_strand: sequence strand which defines the chaining order

    Returns:
        String representing the chained sequence of all input SeqRegions
    """

    sort_args: typing.Dict[str, typing.Any] = dict(key=lambda region: region.start, reverse=False)

    if seq_strand == '-':
        sort_args['reverse'] = True

    sorted_regions = seq_regions
    sorted_regions.sort(**sort_args)
    chained_seq = ''.join(map(lambda region : region.get_sequence(), sorted_regions))

    return chained_seq
