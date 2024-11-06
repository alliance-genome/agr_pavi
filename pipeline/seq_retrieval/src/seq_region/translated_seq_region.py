"""
Module containing the translated MultiPartSeqRegion class.
"""

from Bio import Seq  # Bio.Seq biopython submodule
from Bio.Data import CodonTable
from typing import Any, Dict, List, Literal, override, Set

from seq_region import SeqRegion
from seq_region import MultiPartSeqRegion
from log_mgmt import get_logger

logger = get_logger(name=__name__)


class TranslatedSeqRegion():
    """
    Defines a genetically translated sequence region, consisting of multiple (non-continuous) sequence regions.
    """

    exon_seq_region: MultiPartSeqRegion
    """Multipart sequence region representing the exons of a translated sequence region"""

    cds_seq_region: MultiPartSeqRegion | None
    """Multipart sequence region representing the exons of a translated sequence region"""

    codon_table: CodonTable.CodonTable = CodonTable.unambiguous_dna_by_name["Standard"]
    """Codon table to be used for translating cDNA to protein sequences."""

    coding_dna_sequence: str
    """DNA sequence of the coding sequence (sub)regions"""

    protein_sequence: str
    """Protein sequence of the coding sequence (sub)regions (after translation)."""

    def __init__(self, exon_seq_regions: List[SeqRegion], cds_seq_regions: List[SeqRegion] = []):
        """
        Initializes a MultiPartSeqRegion instance from multiple `SeqRegion`s.

        Sequence regions will be ordered based on their `start` attribute:
         * Ascending order when MultiPartSeqRegion.strand is positive strand
         * Descending order when MultiPartSeqRegion.strand is negative strand

        Args:
            exon_seq_regions: list of SeqRegion objects that define the exons of this multi-part sequence region.\
                              All SeqRegions must have identical seq_id, strand and fasta_file_path properties \
                              to form a valid MultipartSeqRegion.
            cds_seq_regions:  list of SeqRegion objects that define the CDS regions of this multi-part sequence region.\
                              All SeqRegions must have identical seq_id, strand and fasta_file_path properties \
                              to form a valid MultipartSeqRegion.

        Raises:
            ValueError: if `seq_regions` have distinct `seq_id`, `strand` or `fasta_file_path` properties.
        """

        self.start: int = min(map(lambda seq_region: seq_region.start, exon_seq_regions))
        self.end: int = max(map(lambda seq_region: seq_region.end, exon_seq_regions))
        self.seq_length: int = sum(map(lambda seq_region: seq_region.seq_length, exon_seq_regions))  # TODO: re-evaluate (coding vs complete)

        # Ensure one strand
        strands: Set[str] = set(map(lambda seq_region: seq_region.strand, exon_seq_regions + cds_seq_regions))
        if len(strands) > 1:
            raise ValueError(f"Multiple strands defined accross seq regions ({strands})."
                             + " All seqRegions in multiPartSeqRegion must have equal value for strand attribute.")
        else:
            self.strand = strands.pop()

        # Ensure one seq_id
        seq_ids: Set[str] = set(map(lambda seq_region: seq_region.seq_id, exon_seq_regions + cds_seq_regions))
        if len(seq_ids) > 1:
            raise ValueError(f"Multiple seq_ids defined accross seq regions ({seq_ids})."
                             + " All seqRegions in multiPartSeqRegion must have equal value for seq_id attribute.")
        else:
            self.seq_id = seq_ids.pop()

        # Ensure one fasta_file_path
        fasta_file_paths: Set[str] = set(map(lambda seq_region: seq_region.fasta_file_path, exon_seq_regions + cds_seq_regions))
        if len(fasta_file_paths) > 1:
            raise ValueError(f"Multiple fasta_file_paths defined accross seq regions ({fasta_file_paths})."
                             + " All seqRegions in multiPartSeqRegion must have equal value for fasta_file_path attribute.")
        else:
            self.fasta_file_path = fasta_file_paths.pop()

        self.exon_seq_region = MultiPartSeqRegion(exon_seq_regions)
        if len(cds_seq_regions) > 0:
            self.cds_seq_region = MultiPartSeqRegion(cds_seq_regions)
        else:
            self.cds_seq_region = None

    @override
    def __str__(self) -> str:  # pragma: no cover
        return self.exon_seq_region.__str__() + self.cds_seq_region.__str__()

    def fetch_seq(self, type: Literal['transcript', 'coding'], recursive_fetch: bool = False) -> None:
        """
        Fetch TranslatedSeqRegion the object sequences and store in object properties.

        Args:
            type: type of sequence to fetch
              * 'transcript': Fetch all exon_seq_regions' sequences
              * 'coding': Fetch all cds_seq_regions' sequences
                           or define the ORF from transcript sequence if no cds_seq_regions are defined
            recursive_fetch: if True, fetch sequence for all subparts defining the requested sequence.
        """

        match type:
            case 'transcript':
                self.exon_seq_region.fetch_seq(recursive_fetch=recursive_fetch)
            case _:
                raise ValueError(f"type {type} not implemented yet in TranslatedSeqRegion.fetch_seq method.")

    def get_sequence(self, type: Literal['transcript', 'coding', 'protein'], unmasked: bool = False) -> str:
        """
        Return TranslatedSeqRegion any of the object sequences as a string (optionally with modifications).

        Args:
            type: type of sequence to return
                  'transcript' to return the complete sequence
                  'coding' to return only the coding sequence
                  'protein' to return only the coding sequence
            unmasked: Flag to remove soft masking (lowercase letters) \
                      and return unmasked sequence instead (uppercase). Default `False`.
        Returns:
            The sequence of a translated seq region as a string (empty string if `None`).
        """

        seq: str
        match type:
            case 'transcript':
                seq = str(self.exon_seq_region.get_sequence(unmasked=unmasked))
            case 'coding':
                seq = str(self.coding_dna_sequence)
                if unmasked:
                    seq = seq.upper()
            case 'protein':
                seq = str(self.protein_sequence)
            case _:
                raise ValueError(f"type {type} not implemented yet in MultiPartSeqRegion.set_multipart_sequence method.")

        return seq

    def set_sequence(self, type: Literal['transcript', 'coding', 'protein'], sequence: str) -> None:
        """
        Method to set the different TranslatedSeqRegion sequences, analogous to `get_sequence` method.

        Args:
            type: type of sequence to set
                  'coding' to set the coding (ORF/CDS) sequence
                  'protein' to set the protein sequence
            sequence: (c)DNA or protein sequence to store (string)

        Raises:
            valueError: type is not recognised.
        """

        match type:
            case 'coding':
                self.coding_dna_sequence = sequence
            case 'protein':
                self.protein_sequence = sequence
            case _:
                raise ValueError(f"type {type} not implemented yet in TranslatedSeqRegion.set_sequence method.")

    def translate(self) -> str | None:
        """
        Method to translate (c)DNA sequence of this sequence region to protein sequence.

        Stores the resulting protein sequence in the `protein_sequence` attribute and returns it.

        Returns:
            Protein sequence corresponding to the sequence region's `sequence`. Returns `None` if no Open Reading Frame was found in the sequence.
        """
        dna_sequence = self.exon_seq_region.get_sequence(unmasked=True)

        # Find the best open reading frame
        orfs = find_orfs(dna_sequence, self.codon_table, return_type='longest')

        if len(orfs) > 0:
            orf = orfs.pop()
            self.coding_dna_sequence = orf['sequence']  # TODO: use setter

            # Translate to protein
            self.protein_sequence = str(Seq.translate(sequence=orf['sequence'], table=self.codon_table, cds=False, to_stop=True))  # type: ignore

            return self.protein_sequence
        else:
            logger.warning('No open reading frames found, so no translation made.')
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

    # Remove any softmasking
    unmasked_dna_sequence = dna_sequence.upper()

    # Split the DNA sequence in codons (3-base blocks).
    # Frameshift the sequence by 0, 1 or 2 (skip first N bases) to obtain all possible codons.
    CODON_SIZE = 3
    codons: Dict[int, List[str]] = dict()
    for frameshift in range(0, CODON_SIZE):
        codons[frameshift] = [unmasked_dna_sequence[i:i + CODON_SIZE] for i in range(frameshift, len(unmasked_dna_sequence), CODON_SIZE)]

    # Read through all codons accross all frameshifts and determine the ORFs
    orfs: List[Dict[str, Any]] = []
    for frameshift in range(0, CODON_SIZE):
        reading_frame_opened = False
        index_opened: int = -1

        for i, codon in enumerate(codons[frameshift]):

            if codon in codon_table.stop_codons:
                if reading_frame_opened:
                    orf: Dict[str, Any] = {}
                    orf['sequence'] = ''.join(codons[frameshift][index_opened:i + 1])
                    orf['seq_start'] = frameshift + index_opened * CODON_SIZE + 1  # Relative (DNA) sequence start position (1-based)
                    orf['seq_end'] = frameshift + (i + 1) * CODON_SIZE  # Relative (DNA) sequence end position (1-based)
                    orf['complete'] = True
                    orf['frameshift'] = frameshift

                    orfs.append(orf)

                reading_frame_opened = False
                index_opened = -1

            if codon in codon_table.start_codons:
                if not reading_frame_opened:
                    reading_frame_opened = True
                    index_opened = i

    logger.debug(f'{len(orfs)} orfs found.')

    if len(orfs) == 0:
        logger.warning('No open reading frames found in provided sequence.')
        return orfs

    if return_type == 'all':
        logger.debug(f'Returning all {len(orfs)} orfs.')
        return orfs
    elif return_type == 'longest':
        orfs.sort(key=lambda orf: len(orf['sequence']), reverse=False)
        logger.debug(f"Returning longest orf (length {len(orfs[-1]['sequence'])}).")
        return [orfs.pop()]
    else:
        raise ValueError(f"return_type {return_type} is not a valid value.")
