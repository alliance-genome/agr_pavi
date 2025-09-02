"""
Module containing the translated MultiPartSeqRegion class.
"""

from Bio import Seq  # Bio.Seq biopython submodule
from Bio.Data import CodonTable
from math import ceil
from typing import Dict, List, Literal, Optional, override, Set, TypedDict

from .seq_region import SeqRegion, AltSeqInfo
from .multipart_seq_region import MultiPartSeqRegion
from variant import SeqEmbeddedVariantsList, Variant
from log_mgmt import get_logger

logger = get_logger(name=__name__)


CODON_SIZE = 3


class CalculatedOrf(TypedDict):
    sequence: str
    seq_start: int
    """Relative sequence start position (1-based)"""
    seq_end: int
    """Relative sequence end position (1-based)"""
    complete: bool
    frameshift: int


class InvalidatedOrfException(Exception):
    """
    Exception raised when an ORF in a sequence region becomes invalid (due to altering the sequence).
    """
    def __init__(self, message: str):
        super().__init__(message)


class InvalidatedTranslationException(Exception):
    """
    Exception raised when the translation of a sequence region was invalidated (due to altering the sequence).
    """
    def __init__(self, message: str):
        super().__init__(message)


class OrfNotFoundException(Exception):
    """
    Exception raised when finding ORFs in a sequence region fails.
    """
    def __init__(self, message: str):
        super().__init__(message)


class TranslatedSeqRegion():
    """
    Defines a genetically translated sequence region, consisting of multiple (non-continuous) sequence regions.
    """

    exon_seq_region: MultiPartSeqRegion
    """Multipart sequence region representing the exons of a translated sequence region"""

    codon_table: CodonTable.CodonTable = CodonTable.unambiguous_dna_by_name["Standard"]
    """Codon table to be used for translating cDNA to protein sequences."""

    coding_seq_region: MultiPartSeqRegion | None
    """Multipart sequence region representing the coding regions of a translated sequence region"""

    coding_dna_sequence: str | None = None
    """DNA sequence of the coding sequence (sub)regions"""

    coding_sequence_source: Literal['orf', 'cds'] | None = None
    """The source of the coding sequence of this multi-part sequence region (from CDS input or calculated from ORF)."""

    protein_sequence: str | None = None
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
        strands: Set[str | None] = set([seq_region.strand for seq_region in (exon_seq_regions + cds_seq_regions)])
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
            # Ensure all CDS seq regions define the frame property
            for seq_region in cds_seq_regions:
                if seq_region.frame is None:
                    raise ValueError(f"undefined frame property found in seq region {seq_region}."
                                     + " cds_seq_regions require frame property to be set for all seq regions.")

            self.coding_seq_region = MultiPartSeqRegion(cds_seq_regions)
            self.coding_sequence_source = 'cds'
        else:
            self.coding_seq_region = None

    @override
    def __str__(self) -> str:  # pragma: no cover
        return self.exon_seq_region.__str__() + self.coding_seq_region.__str__()

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
            case 'coding':
                if self.coding_seq_region:
                    coding_sequence = self.coding_seq_region.get_sequence(inframe_only=True)
                    self.set_sequence(type='coding', sequence=coding_sequence)
                else:
                    dna_sequence = self.exon_seq_region.get_sequence(unmasked=True)

                    # Find the best open reading frame
                    orfs = find_orfs(dna_sequence, self.codon_table, return_type='longest')

                    if len(orfs) > 0:
                        # Save resulting coding region as MultiPartSeqRegion in coding_seq_region attribute
                        orf = orfs.pop()

                        self.coding_sequence_source = 'orf'

                        self.coding_seq_region = self.exon_seq_region.sub_region(rel_start=orf['seq_start'], rel_end=orf['seq_end'])
                        self.coding_seq_region.set_sequence(sequence=orf['sequence'])

                        self.set_sequence(type='coding', sequence=orf['sequence'])
                    else:
                        msg = 'No open reading frames found in transcript sequence.'
                        logger.warning(msg)
                        raise OrfNotFoundException(msg)
            case _:
                raise ValueError(f"type {type} not implemented yet in TranslatedSeqRegion.fetch_seq method.")

    def get_sequence(self, type: Literal['transcript', 'coding', 'protein'], unmasked: bool = False, autofetch: bool = True) -> str:
        """
        Return any of the object's sequences as a string.

        Args:
            type: type of sequence to return
                  'transcript' to return the complete sequence
                  'coding' to return only the coding sequence
                  'protein' to return only the coding sequence
            unmasked: Flag to remove soft masking (lowercase letters) \
                      and return unmasked sequence instead (uppercase). Default `False`.
            autofetch: Flag to enable/disable automatic fetching of sequence \
                       when not already available. Default `True` (enabled).
        Returns:
            The sequence of a translated seq region as a string (empty string if `None`).
        """

        seq: str
        match type:
            case 'transcript':
                seq = self.exon_seq_region.get_sequence(unmasked=unmasked, autofetch=autofetch)
            case 'coding':
                if self.coding_dna_sequence is None and autofetch:
                    self.fetch_seq('coding', recursive_fetch=True)

                seq = str(self.coding_dna_sequence) if self.coding_dna_sequence is not None else ''

                if unmasked:
                    seq = seq.upper()
            case 'protein':
                if self.protein_sequence is None and autofetch:
                    self.translate()

                seq = str(self.protein_sequence) if self.protein_sequence is not None else ''

            case _:
                raise ValueError(f"type {type} not implemented yet in MultiPartSeqRegion.set_multipart_sequence method.")

        return seq

    def get_alt_sequence(self, type: Literal['transcript', 'coding', 'protein'], variants: List[Variant], unmasked: bool = False, autofetch: bool = True) -> AltSeqInfo:
        """
        Get an alternative sequence of the object by applying a list of variants to the reference sequence.

        Replaces the ref sequence of the variants found in the sequence region with its alt sequence.
        For `type` 'protein', the coding reference sequence is altered and then translated.

        Args:
            type: type of sequence to return
                  'transcript' to return the complete sequence
                  'coding' to return only the coding sequence
                  'protein' to return only the coding sequence
            unmasked: Flag to remove soft masking (lowercase letters) \
                      and return unmasked sequence instead (uppercase). Default `False`.
            variants: List of variants to apply to the sequence
            autofetch: Flag to enable/disable automatic fetching of sequence \
                       when not already available. Default `True` (enabled).
        Returns:
            The sequence of a translated seq region as a string.
        Raises:
            InvalidOrfException: if the ORF of the coding sequence became invalid due to the introduced variants,
                                 when requesting coding or protein sequence.
        """

        alt_seq_info: AltSeqInfo

        match type:
            case 'transcript':
                alt_seq_info = self.exon_seq_region.get_alt_sequence(unmasked=unmasked, variants=variants, autofetch=autofetch)
            case 'coding':
                coding_alt_seq: str
                coding_alt_embedded_variants: SeqEmbeddedVariantsList

                if self.coding_dna_sequence is None and autofetch:
                    self.fetch_seq('coding', recursive_fetch=True)

                if self.coding_seq_region is None:
                    raise ValueError('No reference coding sequence region found, so no variants can be applied to it.')
                if self.coding_dna_sequence is None:
                    raise ValueError('No reference coding sequence found, so no variants can be applied to it.')

                ref_coding_seq = self.coding_dna_sequence
                alt_coding_seq_info = self.coding_seq_region.get_alt_sequence(unmasked=unmasked, variants=variants, autofetch=autofetch, inframe_only=True)

                ## Evaluate alternative coding sequence's ORF
                # If the reference start codon is different from the alternative start codon,
                # reject the alternative coding sequence and any further coding sequence searches
                ref_start_codon = ref_coding_seq[0:CODON_SIZE]
                alt_start_codon = alt_coding_seq_info.sequence[0:CODON_SIZE]

                if ref_start_codon != alt_start_codon:
                    err_msg = 'Reference start codon is different from alternative start codon. '\
                              'Alternative coding sequence rejected. No alternatives searched.'
                    logger.info(err_msg)
                    raise InvalidatedOrfException(err_msg)

                # Check if stop codon in current coding region changed
                # * If an early stop was gained or previous stop maintained, accept alternative coding sequence
                # * If the reference stop codon was lost, extend the alternative coding sequence and search for new (longer) ORF using reference start codon
                new_orfs = find_orfs(dna_sequence=alt_coding_seq_info.sequence, codon_table=self.codon_table, force_start=1)

                if len(new_orfs) > 0:
                    # An early stop was gained or previous stop maintained,
                    # accepting the alternative coding sequence

                    coding_alt_seq = new_orfs[0]['sequence']
                    # Trim embedded variants (and shift their positions using orf relative start?)
                    # Reuse code from get/fetch_alt_sequence methods
                    coding_alt_embedded_variants = SeqEmbeddedVariantsList.trimmed_on_rel_positions(alt_coding_seq_info.embedded_variants, trim_end=new_orfs[0]['seq_end'])

                else:
                    # Reference stop codon was lost,
                    # extend the alternative coding sequence and search for new (longer) ORF using reference start codon
                    logger.info('Stop codon not found in alternative coding sequence. '
                                'Alternative coding sequence rejected. Extending the alternative coding sequence and searching for new (longer) ORF using same reference start codon.')

                    logger.debug('Exon seq region: %s', self.exon_seq_region)
                    logger.debug('Original coding seq region: %s', self.coding_seq_region)

                    frame_offset = self.coding_seq_region.frame or 0

                    ref_coding_region_rel_start: int
                    if self.strand == '-':
                        ref_coding_region_rel_start = self.exon_seq_region.to_rel_position(self.coding_seq_region.end) + frame_offset
                    else:
                        ref_coding_region_rel_start = self.exon_seq_region.to_rel_position(self.coding_seq_region.start) + frame_offset

                    extended_coding_region = self.exon_seq_region.sub_region(rel_start=ref_coding_region_rel_start, rel_end=self.exon_seq_region.seq_length)

                    logger.debug('Extended coding seq region: %s', extended_coding_region)

                    extended_region_alt_seq_info = extended_coding_region.get_alt_sequence(unmasked=unmasked, variants=variants, autofetch=autofetch, inframe_only=True)
                    extended_region_alt_orfs = find_orfs(dna_sequence=extended_region_alt_seq_info.sequence, codon_table=self.codon_table, force_start=1)

                    # If no extended ORF was found, reject alternative coding sequence
                    if not len(extended_region_alt_orfs) > 0:
                        err_msg = 'Stop codon lost and no alternative found in extended alternative coding sequence. '\
                                  'Alternative coding sequence rejected.'
                        logger.info(err_msg)
                        raise InvalidatedOrfException(err_msg)

                    # Otherwise, accept alternative ORF sequence of extended region
                    # seq = extended_region_alt_orfs[0]['sequence']
                    coding_alt_seq = extended_region_alt_orfs[0]['sequence']
                    # Trim embedded variants (and shift their positions using orf relative start?)
                    # Reuse code from get/fetch_alt_sequence methods
                    coding_alt_embedded_variants = SeqEmbeddedVariantsList.trimmed_on_rel_positions(extended_region_alt_seq_info.embedded_variants, trim_end=extended_region_alt_orfs[0]['seq_end'])

                alt_seq_info = AltSeqInfo(sequence=coding_alt_seq, embedded_variants=coding_alt_embedded_variants)

                if unmasked:
                    alt_seq_info.sequence = alt_seq_info.sequence.upper()

            case 'protein':
                protein_alt_seq: str
                protein_alt_embedded_variants: SeqEmbeddedVariantsList

                if len(variants) > 0:
                    try:
                        alt_coding_seq_info = self.get_alt_sequence(type='coding', unmasked=unmasked, variants=variants, autofetch=autofetch)
                    except InvalidatedOrfException:
                        raise InvalidatedTranslationException('Translation invalidated due to variants invalidating the ORF.')

                    if alt_coding_seq_info.sequence == '':
                        raise ValueError('No alternative coding sequence region found, so no translation possible.')

                    # Calculate embedded variants positions in protein sequence from embedded variants positions in coding sequence
                    protein_embedded_variants = SeqEmbeddedVariantsList(alt_coding_seq_info.embedded_variants.copy())
                    for variant in protein_embedded_variants:
                        variant.rel_start = coding_to_protein_rel_position(variant.rel_start)
                        variant.rel_end = coding_to_protein_rel_position(variant.rel_end)

                    protein_alt_seq = self.translate(coding_sequence=alt_coding_seq_info.sequence) or ''
                    protein_alt_embedded_variants = protein_embedded_variants
                else:
                    if self.protein_sequence is None and autofetch:
                        self.translate()

                    protein_alt_seq = str(self.protein_sequence) if self.protein_sequence is not None else ''
                    protein_alt_embedded_variants = SeqEmbeddedVariantsList()

                alt_seq_info = AltSeqInfo(sequence=protein_alt_seq, embedded_variants=protein_alt_embedded_variants)

            case _:
                raise ValueError(f"type {type} not implemented yet in MultiPartSeqRegion.set_multipart_sequence method.")

        return alt_seq_info

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

    def translate(self, coding_sequence: Optional[str] = None) -> str | None:
        """
        Translate a coding (c)DNA sequence of this sequence region to protein sequence.

        Translates the `coding_sequence` input if provided, or the coding sequence of this TranslatedSeqRegion otherwise (`self.get_sequence('coding')`).
        Stores the resulting protein sequence as attribute in this object if no `coding_sequence` input was provided.

        Returns:
            Protein sequence corresponding to the input `coding_sequence`, or to the region's coding sequence if undefined. \
            `None` if no coding_sequence was provided or no open reading frame was found matching the input params.
        """

        store_protein: bool = False

        if coding_sequence is None:
            coding_sequence = self.get_sequence('coding')
            store_protein = True

        if coding_sequence:
            # Translate to protein
            protein_sequence = str(Seq.translate(sequence=coding_sequence, table=self.codon_table, cds=False, to_stop=True))  # type: ignore

            if store_protein:
                self.set_sequence('protein', protein_sequence)

            return protein_sequence
        else:
            logger.warning('No coding sequence found, so no translation made.')
            return None


def find_orfs(dna_sequence: str, codon_table: CodonTable.CodonTable, force_start: Optional[int] = None, return_type: str = 'all') -> List[CalculatedOrf]:
    """
    Find Open Reading Frames (ORFs) in a (spliced) DNA sequence.

    Defines ORFs as reading frame from first start codon to first stop codon.
    Continues to search for more ORFs after previous ORF was closed.
    Only reports complete ORFs (with start and stop codon found in sequence).

    Args:
        dna_sequence: the DNA sequence to search open reading frames in
        codon_table: the codon table to define start and stop codons
        force_start: the relative position of the start codon to use for ORF definition (1-based index)
        return_type: 'all' to return all ORFs found, 'longest' to return the longest found. Irrelevant when force_start is not None (then only first/shortest ORF is returned)

    Returns:
        List of open reading frames found (in accordance to `return_type`).

    Raises:
        ValueError: if `return_type` does not have a valid value.
    """

    # Remove any softmasking
    unmasked_dna_sequence = dna_sequence.upper()
    force_start_offset = 0

    if force_start is not None:
        unmasked_dna_sequence = unmasked_dna_sequence[force_start - 1:]
        force_start_offset = force_start - 1

    # Split the DNA sequence in codons (3-base blocks).
    # Frameshift the sequence by 0, 1 or 2 (skip first N bases) to obtain all possible codons.
    codons: Dict[int, List[str]] = dict()
    for frameshift in range(0, CODON_SIZE):
        codons[frameshift] = [unmasked_dna_sequence[i:i + CODON_SIZE] for i in range(frameshift, len(unmasked_dna_sequence), CODON_SIZE)]

    # Read through all codons accross all frameshifts and determine the ORFs
    orfs: List[CalculatedOrf] = []
    for frameshift in range(0, CODON_SIZE):
        reading_frame_opened = False
        index_opened: int = -1

        # When using force_start, only use 0-frame codons
        if force_start is not None and frameshift > 0:
            break

        for i, codon in enumerate(codons[frameshift]):

            # When using force_start, first codon should be start codon
            if force_start is not None and i == 0 and codon not in codon_table.start_codons:
                raise ValueError('find_orfs expects first codon to be a start codon when using force_start argument.')

            if codon in codon_table.stop_codons:
                if reading_frame_opened:
                    seq_start = frameshift + index_opened * CODON_SIZE + 1 + force_start_offset  # Relative (DNA) sequence start position (1-based)
                    seq_end = frameshift + (i + 1) * CODON_SIZE + force_start_offset  # Relative (DNA) sequence end position (1-based)
                    orf: CalculatedOrf = {
                        'sequence': dna_sequence[seq_start - 1:seq_end],
                        'seq_start': seq_start,
                        'seq_end': seq_end,
                        'complete': True,
                        'frameshift': frameshift
                    }

                    orfs.append(orf)

                # When using force_start, only return first ORF
                if force_start is not None:
                    break

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


def coding_to_protein_rel_position(pos: int) -> int:
    """
    Converts relative position `pos` in coding sequence to it's corresponding relative position in protein sequence.

    Assumes full coding-sequence translation (no frameshift, start of coding seq is start codon).

    Returns:
        Relative position in protein sequence
    """
    return ceil(pos / 3)
