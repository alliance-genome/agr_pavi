"""
Module containing all functions used to handle and access sequences and sequence files.
"""
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
        return seq
