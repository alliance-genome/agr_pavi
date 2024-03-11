"""
Module containing the SeqRegion class and all methods to handle them.
SeqRegion class is used to define and retrieve sequence regions.
"""
from Bio import Seq #Bio.Seq biopython submodule
import pysam

from data_mover import data_file_mover

class SeqRegion():
    seq_id = str
    start = int
    end = int
    strand = str
    fasta_file_path = str
    sequence = str

    def __init__(self, seq_id: str, start: int, end: int, strand: str, fasta_file_url: str, seq: str = None):
        """
        Uses 1-based, fully inclusive coordinates
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


    def fetch_seq(self):
        """Fetch sequence found at `seq_id`:`start`-`end`:`strand`
        by reading from faidx files at `fasta_file_path`.
        Uses 1-based, fully inclusive coordinates."""
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

def chain_seq_region_seqs(seq_regions: list, seq_strand: str):
    """
    Chain multiple SeqRegions' sequenes together into one continuous sequence.
    SeqRegions are chained together in an order based on the 'start' position of each:
     * Ascending order when positive strand
     * Descending order when negative strand
    """

    sort_args = dict(key=lambda region: region.start)

    if seq_strand == '-':
        sort_args['reverse'] = True

    sorted_regions = seq_regions
    seq_regions.sort(**sort_args)
    chained_seq = ''.join(map(lambda region : region.sequence, sorted_regions))

    return chained_seq
