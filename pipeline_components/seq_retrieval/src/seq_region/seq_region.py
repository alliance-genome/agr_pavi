"""
Module containing the SeqRegion class and related functions.
"""
from typing import cast, Dict, List, Literal, Optional, override, TypedDict, TYPE_CHECKING

from Bio import Seq  # Bio.Seq biopython submodule
import pysam

from data_mover import data_file_mover
from log_mgmt import get_logger

if TYPE_CHECKING:
    from .variant import Variant

from .variant import EmbeddedVariant, SeqSubstitutionType

logger = get_logger(name=__name__)


class SeqRegion():
    """
    Defines a (continuous) genetic sequence region.
    """

    seq_id: str
    """The sequence identifier found in the fasta file on which the sequence region is located"""

    start: int
    """The start position of the sequence region (1-based, inclusive). Asserted to be `start` < `end`."""

    end: int
    """The end position of the sequence region (1-base, inclusive). Asserted to be `start` < `end`."""

    FRAME_TYPE = Literal[0, 1, 2]
    frame: Optional[FRAME_TYPE]
    """Startposition of the first complete reading frame in the seq region."""

    STRAND_TYPE = Optional[Literal['+', '-']]
    strand: STRAND_TYPE
    """The (genomic) strand of the sequence region"""

    seq_length: int
    """Sequence length (expected) of the sequence region."""

    fasta_file_path: str
    """Absolute path to (faidx indexed) FASTA file containing reference sequences"""

    sequence: Optional[str]
    """the DNA sequence of a sequence region"""

    def __init__(self, seq_id: str, start: int, end: int, fasta_file_url: str, strand: STRAND_TYPE = None, frame: Optional[FRAME_TYPE] = None, seq: Optional[str] = None):
        """
        Initializes a SeqRegion instance

        Args:
            seq_id: The sequence identifier found in the fasta file on which the sequence region is located
            start: The start position of the sequence region (1-based, inclusive).\
                   If negative strand, `start` and `end` are swapped if `end` < `start`.
            end: The end position of the sequence region (1-base, inclusive).\
                 If negative strand, `start` and `end` are swapped if `end` < `start`.
            strand: the (genomic) strand of the sequence region
            frame: optional int indicating startposition of the first complete reading frame in the seq region
            fasta_file_url: URL of faidx-indexed FASTA file containing the reference sequences to retrieve (regions of).\
                            Faidx-index files `fasta_file_url`.fai and `fasta_file_url`.gzi for compressed fasta file must be accessible URLs.
            seq: optional DNA sequence of the sequence region

        Raises:
            ValueError: if value of `end` < `start` and `strand` is '+'
        """
        self.seq_id = seq_id
        self.strand = strand
        self.frame = frame

        # If strand is -, ensure start <= end (swap as required)
        if strand == '-':
            if end < start:
                self.start = end
                self.end = start
            else:
                self.start = start
                self.end = end
        # If strand is + (or undefined), throw error when end < start (likely user error)
        else:
            if end < start:
                raise ValueError(f"Unexpected position order: end {end} < start {start}.")
            else:
                self.start = start
                self.end = end

        self.seq_length = self.end - self.start + 1

        # Fetch the file(s)
        self.fasta_file_path = fetch_faidx_files(fasta_file_url)

        self.sequence = seq

    @override
    def __str__(self) -> str:  # pragma: no cover
        object_str = f'{self.seq_id}:{self.start}-{self.end}'
        if self.strand is not None:
            object_str += f':{self.strand}'
        if self.frame is not None:
            object_str += f' (frame:{self.frame})'
        return object_str

    @override
    def __repr__(self) -> str:  # pragma: no cover
        return self.__str__()

    def fetch_seq(self) -> str:
        """
        Fetch sequence found at `seq_id`:`start`-`end`(:`strand`)
        by reading from faidx files at `fasta_file_path`.

        Assumes `+` as strand if undefined.
        Stores resulting sequence in `sequence` attribute.

        Returns:
            Return the fetched sequence as a string
        """
        try:
            fasta_file = pysam.FastaFile(self.fasta_file_path)
        except ValueError:
            raise FileNotFoundError(f"Missing index file matching path {self.fasta_file_path}.")
        except IOError:
            raise IOError(f"Error while reading fasta file or index matching path {self.fasta_file_path}.")
        else:
            seq: str = fasta_file.fetch(reference=self.seq_id, start=(self.start - 1), end=self.end)
            fasta_file.close()

            if self.strand == '-':
                seq = str(Seq.reverse_complement(seq))

        self.set_sequence(seq)

        return seq

    def set_sequence(self, sequence: str) -> None:
        """
        Set the `sequence` attribute.

        Asserts the length of `sequence` matches the expected sequence length for this region.

        Args:
            sequence: DNA sequence (string)

        Raises:
            valueError: If the length of `sequence` provided does not match the region length
        """

        seq_len = len(sequence)
        if seq_len != self.seq_length:
            raise ValueError(f"Sequence length {seq_len} does not match expected length {self.seq_length}.")
        else:
            self.sequence = sequence

    def get_sequence(self, unmasked: bool = False, autofetch: bool = True, inframe_only: bool = False) -> str:
        """
        Return the `sequence` attribute as a string.

        Args:
            unmasked: Flag to remove soft masking (lowercase letters) \
                      and return unmasked sequence instead (uppercase). Default `False`.
            autofetch: Flag to enable/disable automatic fetching of sequence \
                       when not already available. Default `True` (enabled).
            inframe_only: Flag to return only complete in-frame codons (start==frame, len(seq) % 3 == 0).\
                          Default `False`.
        Returns:
            The sequence of a seq region as a string (empty string if `None`).
        """

        if self.sequence is None and autofetch:
            self.fetch_seq()

        seq = str(self.sequence)
        if unmasked:
            seq = seq.upper()

        if inframe_only:
            seq = self.inframe_sequence(seq)

        return seq

    def inframe_sequence(self, sequence: Optional[str] = None) -> str:
        """
        Return the sequence of the SeqRegion within complete reading frames.

        Skips the first n bases of the sequence where n is `self.frame` if `frame` is set.
        Trims the end of the resultingsequence to a length that matches complete codons (a multiple of 3).

        Args:
            sequence: optional DNA sequence of the sequence region to convert, otherwise uses `self.sequence`

        Returns:
            The in-frame sequence of a seq region as a string (empty string if `None`).
        """
        seq: str
        if sequence is None:
            seq = str(self.sequence)
        else:
            seq = str(sequence)

        start: int = 0
        length: int = 0
        if seq != "":
            start = self.frame or 0
            length = (len(seq) - start) // 3 * 3  # Floor the length to full codons

        if length > 0:
            seq = seq[start:start + length]
        else:
            seq = ""

        return seq

    def inframe_seq_region(self) -> 'SeqRegion':
        """
        Return the subregion of the SeqRegion within complete reading frames.

        Skips the first n bases of the region where n is `self.frame` if `frame` is set.
        Trims the end of the resulting region to a sequencelength that matches complete codons (a multiple of 3).

        Returns:
            The in-frame subregion of a seq region.
        """

        rel_start: int = self.frame or 0  # 0-based relative start of inframe region
        length = (self.seq_length - rel_start) // 3 * 3  # Floor the length to full codons
        rel_end: int = rel_start + length - 1  # 0-based relative end of inframe region

        return self.sub_region(rel_start + 1, rel_end + 1)

    def get_alt_sequence(self, unmasked: bool = False, variants: List['Variant'] = [], autofetch: bool = True, inframe_only: bool = False) -> 'AltSeqInfo':
        """
        Calculate an alternative `sequence` of the SeqRegion by applying a list of variants to it.

        Replaces the ref sequence of the variants found in the sequence region with its alt sequence.

        Args:
            unmasked: Flag to remove soft masking (lowercase letters) \
                      and return unmasked sequence instead (uppercase). Default `False`.
            variants:  List of variants to apply to the sequence before returning.
            autofetch: Flag to enable/disable automatic fetching of sequence \
                       when not already available. Default `True` (enabled).
            inframe_only: Flag to return only complete in-frame codons (start==frame, len(seq) % 3 == 0).\
                          Default `False`.
        Returns:
            `AltSeqInfo` object representing the alternative sequence result.
        Raises:
            ValueError:
             * If `variants` is empty or contains overlapping variants.
             * If any of the variants does not overlap the SeqRegion.
            NotImplementedError: If `variants` contains partially overlapping indels.
        """
        from .variant import variants_overlap  # Imported here to prevent circular dependency

        if len(variants) < 1:
            raise ValueError('variants_alt_sequence method requires at least one variant to be provided.')
        elif len(variants) > 1 and variants_overlap(variants):
            raise ValueError('variants_alt_sequence method does not support overlapping variants.')

        # Position all variants relative to the SeqRegion
        class PositionedVariant(TypedDict):
            variant: 'Variant'
            """The Variant object"""
            boundary_start: int
            boundary_end: int
            rel_start: int
            """The relative start position of the variant in the SeqRegion's sequence"""
            rel_end: int
            """The relative end position of the variant in the SeqRegion's sequence"""
            boundary_start_overhang: int
            """The number of bases the variant is overhanging the start of the SeqRegion (outside of the SeqRegion boundary)"""
            boundary_end_overhang: int
            """The number of bases the variant is overhanging the end of the SeqRegion (outside of the SeqRegion boundary)"""
            overlap_ref_seq: str
            """Strand-corrected part of the variant's reference sequence that overlaps the SeqRegion"""
            overlap_alt_seq: str
            """Strand-corrected part of the variant's alternative sequence that overlaps the SeqRegion"""

        positioned_variants: Dict[int, PositionedVariant] = {}  # Variants indexed by relative position in SeqRegion

        for variant in variants:
            # If variant is not in the SeqRegion boundaries, raise error
            variant_seq_region = SeqRegion(seq_id=variant.genomic_seq_id, start=variant.genomic_start_pos, end=variant.genomic_end_pos,
                                           fasta_file_url='file:' + self.fasta_file_path)
            if self.overlaps(variant_seq_region) is not True:
                raise ValueError(f'Variant {variant.variant_id} ({variant.genomic_seq_id}:{variant.genomic_start_pos}-{variant.genomic_end_pos}) '
                                 + f'out of boundaries of SeqRegion {self}.')

            # Calculate the variant's start position relative to the SeqRegion
            start_overhang: int = 0
            end_overhang: int = 0
            boundary_start: int
            boundary_end: int
            if self.strand == "-":
                boundary_start = min(variant.genomic_end_pos, self.end)
                start_overhang = variant.genomic_end_pos - boundary_start
                boundary_end = max(variant.genomic_start_pos, self.start)
                end_overhang = boundary_end - variant.genomic_start_pos
            else:
                boundary_start = max(variant.genomic_start_pos, self.start)
                start_overhang = boundary_start - variant.genomic_start_pos
                boundary_end = min(variant.genomic_end_pos, self.end)
                end_overhang = variant.genomic_end_pos - boundary_end

            if (start_overhang > 0 or end_overhang > 0) and variant.genomic_alt_seq != '' \
               and len(variant.genomic_ref_seq) != len(variant.genomic_alt_seq):
                logger.error('Embedding of partially overlapping indels not supported. '
                             + f'Variant {variant} only partially overlaps SeqRegion {self}.')
                raise NotImplementedError('Embedding of partially overlapping indels not supported.')

            rel_variant_start_pos = self.to_rel_position(boundary_start)

            # Calculate the part of the variant's reference and alternative sequence that overlaps the SeqRegion
            overlap_ref_seq = variant.genomic_ref_seq
            overlap_alt_seq = variant.genomic_alt_seq

            if self.strand == '-':
                overlap_ref_seq = str(Seq.reverse_complement(overlap_ref_seq))
                overlap_alt_seq = str(Seq.reverse_complement(overlap_alt_seq))

            # Remove overhangs (for partial overlapping variants)
            overlap_ref_seq = overlap_ref_seq[start_overhang:len(overlap_ref_seq) - end_overhang]
            if overlap_alt_seq:
                overlap_alt_seq = overlap_alt_seq[start_overhang:len(overlap_alt_seq) - end_overhang]

            positioned_variants[rel_variant_start_pos] = {
                'variant': variant,
                'boundary_start': boundary_start,
                'boundary_end': boundary_end,
                'boundary_start_overhang': start_overhang,
                'boundary_end_overhang': end_overhang,
                'overlap_ref_seq': overlap_ref_seq,
                'overlap_alt_seq': overlap_alt_seq,
                'rel_start': rel_variant_start_pos,
                'rel_end': rel_variant_start_pos + abs(boundary_end - boundary_start)
            }

        # Replace the reference sequence with the alternative sequence for each variant
        # Loop through variants in relative positional reverse order to avoid changes in indices due to indels
        sequence = self.get_sequence(unmasked=unmasked, autofetch=autofetch, inframe_only=False)
        for rel_start, positioned_variant in sorted(positioned_variants.items(), reverse=True):
            rel_end = rel_start + abs(positioned_variant['boundary_end'] - positioned_variant['boundary_start'])

            # Replace variant sequence
            if not positioned_variant['variant'].genomic_ref_seq:
                # Insertions
                sequence = sequence[:rel_start] + positioned_variant['overlap_alt_seq'] + sequence[(rel_end - 1):]
            else:
                # All other variants
                seq_region_variant_seq = sequence[(rel_start - 1):(rel_end)]

                if seq_region_variant_seq.upper() != positioned_variant['overlap_ref_seq'].upper():
                    logger.error(f'Variant ({positioned_variant["variant"]}) '
                                 + f'does not match the reference sequence of SeqRegion {self} at positions {rel_start}-{rel_end}.'
                                 + f'Expected: "{positioned_variant['overlap_ref_seq']}", Found: "{seq_region_variant_seq}"')
                    raise ValueError('Unexpected variant reference sequence mismatch.')
                sequence = sequence[:(rel_start - 1)] + positioned_variant['overlap_alt_seq'] + sequence[rel_end:]

        alt_seq_offset = 0

        if inframe_only:
            sequence = self.inframe_sequence(sequence)

            if self.frame is not None:
                alt_seq_offset -= self.frame

        # Calculate the position of each variant in the new (alternative) sequence
        # Loop through variants in relative positional order to include index changes due to indels
        alt_embedded_variants: List[EmbeddedVariant] = []
        for rel_start, positioned_variant in sorted(positioned_variants.items(), reverse=False):

            alt_rel_start = positioned_variant['rel_start'] + alt_seq_offset
            alt_rel_end = positioned_variant['rel_end'] + alt_seq_offset

            if positioned_variant['variant'].seq_substitution_type == SeqSubstitutionType.DELETION:
                # Relative position of deletions in the alternative sequence
                # should be marking the flanking bases (-1 start, +1 end)
                alt_rel_start -= 1
                alt_rel_end += 1
            elif positioned_variant['variant'].seq_substitution_type == SeqSubstitutionType.INSERTION:
                # Relative position of insertions in the alternative sequence
                # should only mark the inserted bases (reference positions indicate
                # insertion site flanking bases, so +1 start, -1 end)
                alt_rel_start += 1
                alt_rel_end -= 1

            alt_seq_len_diff = len(positioned_variant['overlap_alt_seq']) - len(positioned_variant['overlap_ref_seq'])

            # Adjust relative end position to account for insertions, deletions and indels
            alt_rel_end += alt_seq_len_diff

            alt_embedded_variants.append(EmbeddedVariant(
                variant=positioned_variant['variant'],
                rel_start=alt_rel_start,
                rel_end=alt_rel_end
            ))

            alt_seq_offset += alt_seq_len_diff

        return {
            'sequence': sequence,
            'embedded_variants': alt_embedded_variants
        }

    def overlaps(self, seq_region_2: "SeqRegion") -> bool:
        """
        Compare two SeqRegion instances and check for overlap.

        Args:
            seq_region_2: SeqRegion instance to check for overlap with self

        Returns:
            True if SeqRegion overlaps with another SeqRegion instance, False otherwise.
        """
        if self.fasta_file_path != seq_region_2.fasta_file_path or \
           self.seq_id != seq_region_2.seq_id or \
           (self.strand is not None and seq_region_2.strand is not None and self.strand != seq_region_2.strand):
            return False

        if max(self.start, seq_region_2.start) <= min(self.end, seq_region_2.end):
            return True
        else:
            return False

    def sub_region(self, rel_start: int, rel_end: int) -> 'SeqRegion':
        """
        Return a subregion of the SeqRegion

        Args:
            rel_start: Relative start position (1-based) of the subregion
            rel_end: Relative end position (1-based) of the subregion

        Returns:
            SeqRegion object representing the subregion
        Raises:
            ValueError: when rel_start or rel_end falls outside the SeqRegion boundaries
        """
        if rel_start < 1 or self.seq_length < rel_end:
            raise ValueError(f'Relative start position {rel_start} or relative end position {rel_end} fall outside the boundaries of the SeqRegion {self} (len {self.seq_length}).')

        new_start: int
        new_end: int
        new_frame: Optional[SeqRegion.FRAME_TYPE] = None

        if self.frame is not None:
            new_frame = cast(SeqRegion.FRAME_TYPE, (self.frame - (rel_start - 1)) % 3)

        if self.strand == '-':
            new_end = self.end - (rel_start - 1)
            new_start = self.end - (rel_end - 1)
        else:
            new_start = self.start + (rel_start - 1)
            new_end = self.start + (rel_end - 1)

        return SeqRegion(seq_id=self.seq_id,
                         start=new_start,
                         end=new_end,
                         strand=self.strand,
                         fasta_file_url='file:' + self.fasta_file_path,
                         frame=new_frame,
                         seq=self.sequence[(rel_start - 1):rel_end] if self.sequence is not None else None)

    def to_rel_position(self, seq_position: int) -> int:
        """
        Convert absolute sequence position to relative position within the SeqRegion

        Args:
            seq_position: absolute sequence position to be converted

        Returns:
            Relative position within the SeqRegion sequence (1-based)

        Raises:
            ValueError: when abs_position falls outside of the SeqRegion boundaries
        """
        if seq_position < self.start or self.end < seq_position:
            raise ValueError(f'Seq position {seq_position} out of boundaries of SeqRegion {self}.')

        rel_position: int

        if self.strand == '-':
            rel_position = self.end - seq_position + 1
        else:
            rel_position = seq_position - self.start + 1

        return rel_position


class AltSeqInfo(TypedDict):
    """Alternative sequence information."""

    embedded_variants: List['EmbeddedVariant']
    """List of the variants embedded in the sequence"""
    sequence: str
    """The sequence of the alternative sequence region (as a string)."""


def fetch_faidx_files(fasta_file_url: str) -> str:
    """
    Fetch faidx-indexed fasta file and index files.

    Fetches fasta file and index files (.fai + .gzi if fasta file is (bgzip) compressed).

    Args:
        fasta_file_url: URL of faidx-indexed FASTA file to fetch.\
                        Index files `fasta_file_url`.fai and `fasta_file_url`.gzi for compressed fasta file must be accessible URLs.

    Returns:
        Absolute path to fasta file matching the requested URL (string).
    """
    # Fetch the fasta file
    local_fasta_file_path = data_file_mover.fetch_file(fasta_file_url)

    # Fetch additional faidx index files in addition to fasta file itself
    # (to the same location)
    index_files = [fasta_file_url + '.fai']
    if fasta_file_url.endswith('.gz'):
        index_files.append(fasta_file_url + '.gzi')

    for index_file in index_files:
        data_file_mover.fetch_file(index_file)

    return local_fasta_file_path
