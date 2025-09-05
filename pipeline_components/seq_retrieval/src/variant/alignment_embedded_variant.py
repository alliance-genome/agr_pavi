from Bio.SeqRecord import SeqRecord
from typing import Any, Iterable, override, Optional

from .seq_embedded_variant import SeqEmbeddedVariant


class AlignmentEmbeddedVariant(SeqEmbeddedVariant):
    """
    SeqEmbeddedVariant object representing a variant embedded in an alignment sequence.

    Contains additional properties related to the embedding into the alignment (gapped sequence).
    """

    alignment_start_pos: int
    """The relative start position of the variant in the alignment sequence (1-based)."""
    alignment_end_pos: int
    """The relative end position of the variant in the alignment sequence (1-based)."""

    def __init__(self, embedded_variant: SeqEmbeddedVariant, alignment_record: Optional[SeqRecord] = None, alignment_start_pos: Optional[int] = None, alignment_end_pos: Optional[int] = None):
        self.__dict__.update(vars(embedded_variant))

        if alignment_record is not None:
            self.alignment_start_pos = seq_to_alignment_position(alignment_record, embedded_variant.seq_start_pos)
            self.alignment_end_pos = seq_to_alignment_position(alignment_record, embedded_variant.seq_end_pos)
        else:
            if alignment_start_pos is None or alignment_end_pos is None:
                raise ValueError('alignment_record or (alignment_start_pos and alignment_end_pos) must be provided')
            self.alignment_start_pos = alignment_start_pos
            self.alignment_end_pos = alignment_end_pos

    @override
    @classmethod
    def from_dict(cls, alignment_embedded_variant_dict: dict[str, Any]) -> 'AlignmentEmbeddedVariant':
        if 'alignment_start_pos' not in alignment_embedded_variant_dict:
            raise KeyError('alignment_start_pos not in alignment_embedded_variant_dict')
        elif not isinstance(alignment_embedded_variant_dict['alignment_start_pos'], int):
            raise TypeError('alignment_start_pos must be an integer')

        if 'alignment_end_pos' not in alignment_embedded_variant_dict:
            raise KeyError('alignment_end_pos not in alignment_embedded_variant_dict')
        elif not isinstance(alignment_embedded_variant_dict['alignment_end_pos'], int):
            raise TypeError('alignment_end_pos must be an integer')

        seq_embedded_variant_dict = alignment_embedded_variant_dict.copy()
        del seq_embedded_variant_dict['alignment_start_pos']
        del seq_embedded_variant_dict['alignment_end_pos']

        return cls(embedded_variant=SeqEmbeddedVariant.from_dict(seq_embedded_variant_dict),
                   alignment_start_pos=alignment_embedded_variant_dict['alignment_start_pos'],
                   alignment_end_pos=alignment_embedded_variant_dict['alignment_end_pos'])


class AlignmentEmbeddedVariantsList(list[AlignmentEmbeddedVariant]):
    """
    Representation of a list of AlignmentEmbeddedVariant objects.
    """

    def __init__(self, iterable: Iterable[AlignmentEmbeddedVariant] = []):
        for item in iterable:
            if not isinstance(item, AlignmentEmbeddedVariant):
                raise TypeError(f"Expected AlignmentEmbeddedVariant, got {type(item)}")
        super().__init__(iterable)


def seq_to_alignment_position(seq_record: SeqRecord, pos: int) -> int:
    """
    Convert a sequence position to its corresponding alignment position.

    Args:
        seq: Alignment sequence record to generate relative position for.
        pos: Sequence position to be converted.

    Returns:
        Alignment position of the sequence record.
    """
    if seq_record.seq is None:
        raise ValueError(f"Sequence record '{seq_record.id}' has no sequence.")

    no_gap_seq_len: int = len(seq_record.seq) - seq_record.seq.count('-')
    '''The ungapped sequence length of the sequence record'''

    if pos < 1:
        raise ValueError(f"Out of bounds: sequence position ({pos}) before start of sequence.")
    elif pos > (no_gap_seq_len + 1):
        raise ValueError(f"Out of bounds: sequence position ({pos}) after end of sequence (+1).")

    covered_ungapped_seq_len: int = 0
    alignment_pos = 0
    for i in range(0, len(seq_record.seq)):
        alignment_pos += 1

        base = seq_record.seq[i]
        if base != "-":
            covered_ungapped_seq_len += 1

        if pos == covered_ungapped_seq_len:
            break

        if covered_ungapped_seq_len == no_gap_seq_len:
            # End of ungapped sequence reached, but pos not reached.
            # Report alignment_pos as last ungapped position, +1 if trailing gap is present.
            if len(seq_record.seq) > i + 1:
                alignment_pos += 1
            break

    return alignment_pos
