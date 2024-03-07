"""
Module containing all functions used to handle and access sequences and sequence files.
"""
from Bio import Seq #Bio.Seq biopython submodule
import pysam

def get_seq(fasta_file_path, seq_id, seq_start, seq_end, seq_strand):
    """Return sequence found at `seq_id`:`seq_start`-`seq_end`:`seq_strand`
    by reading from faidx files at `file_path`. Use 1-based, fully inclusive coordinates."""
    try:
        fasta_file = pysam.FastaFile(fasta_file_path)
    except ValueError:
        raise FileNotFoundError(f"Missing index file matching path {fasta_file_path}.")
    except IOError:
        raise IOError(f"Error while reading fasta file or index matching path {fasta_file_path}.")
    else:
        seq = fasta_file.fetch(reference=seq_id, start=seq_start-1, end=seq_end)
        fasta_file.close()

        if seq_strand == '-':
            seq = Seq.reverse_complement(seq)

    return seq

def chain_seq_region_seqs(seq_regions: list, seq_strand: str):
    """
    Chain multiple sequence region seq's together into one continuous sequence.
    Regions are chained together in an order based on the 'start' position of each:
     * Ascending order when positive strand
     * Descending order when negative strand
    """

    sort_args = dict(key=lambda region: region['start'])

    if seq_strand == '-':
        sort_args['reverse'] = True

    sorted_regions = seq_regions
    seq_regions.sort(**sort_args)
    chained_seq = ''.join(map(lambda region: region['seq'], sorted_regions))

    return chained_seq
