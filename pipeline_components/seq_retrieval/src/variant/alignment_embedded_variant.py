from Bio.SeqRecord import SeqRecord
from typing import Any, Iterable, override, Optional

from .seq_embedded_variant import SeqEmbeddedVariant


class AlignmentEmbeddedVariant(SeqEmbeddedVariant):
    """
    SeqEmbeddedVariant object representing a variant embedded in an alignment sequence.

    Contains additional properties related to the embedding into the alignment (gapped sequence).
    """

    alignment_start: int
    """The relative start position of the variant in the alignment sequence (1-based)."""
    alignment_end: int
    """The relative end position of the variant in the alignment sequence (1-based)."""

    def __init__(self, embedded_variant: SeqEmbeddedVariant, alignment_record: Optional[SeqRecord] = None, alignment_start: Optional[int] = None, alignment_end: Optional[int] = None):
        self.__dict__.update(vars(embedded_variant))

        # if alignment_record is None and (alignment_start is None or alignment_end is None):
        #     raise ValueError('alignment_record or (alignment_start and alignment_end) must be provided')

        if alignment_record is not None:
            self.alignment_start = seq_to_alignment_position(alignment_record, embedded_variant.seq_start_pos)
            self.alignment_end = seq_to_alignment_position(alignment_record, embedded_variant.seq_end_pos)
        else:
            if alignment_start is None or alignment_end is None:
                raise ValueError('alignment_record or (alignment_start and alignment_end) must be provided')
            self.alignment_start = alignment_start
            self.alignment_end = alignment_end

    @override
    @classmethod
    def from_dict(cls, alignment_embedded_variant_dict: dict[str, Any]) -> 'AlignmentEmbeddedVariant':
        if 'alignment_start' not in alignment_embedded_variant_dict:
            raise KeyError('alignment_start not in alignment_embedded_variant_dict')
        elif not isinstance(alignment_embedded_variant_dict['alignment_start'], int):
            raise TypeError('alignment_start must be an integer')

        if 'alignment_end' not in alignment_embedded_variant_dict:
            raise KeyError('alignment_end not in alignment_embedded_variant_dict')
        elif not isinstance(alignment_embedded_variant_dict['alignment_end'], int):
            raise TypeError('alignment_end must be an integer')

        seq_embedded_variant_dict = alignment_embedded_variant_dict.copy()
        del seq_embedded_variant_dict['alignment_start']
        del seq_embedded_variant_dict['alignment_end']

        return cls(embedded_variant=SeqEmbeddedVariant.from_dict(seq_embedded_variant_dict),
                   alignment_start=alignment_embedded_variant_dict['alignment_start'],
                   alignment_end=alignment_embedded_variant_dict['alignment_end'])


class AlignmentEmbeddedVariantsList(list[AlignmentEmbeddedVariant]):
    """
    Representation of a list of AlignmentEmbeddedVariant objects.
    """

    def __init__(self, iterable: Iterable[AlignmentEmbeddedVariant] = []):
        for item in iterable:
            if not isinstance(item, AlignmentEmbeddedVariant):
                raise TypeError(f"Expected AlignmentEmbeddedVariant, got {type(item)}")
        super().__init__(iterable)


def seq_to_alignment_position(seqRecord: SeqRecord, pos: int) -> int:
    """
    Convert a sequence position to its corresponding alignment position.

    Args:
        seq: Alignment sequence record to generate relative position for.
        pos: Sequence position to be converted.

    Returns:
        Alignment position of the sequence record.
    """
    if seqRecord.seq is None:
        raise ValueError(f"Sequence record '{seqRecord.id}' has no sequence.")

    tmp_alignment_pos = pos
    gap_count: int = seqRecord.seq[:tmp_alignment_pos].count("-")
    while tmp_alignment_pos - gap_count < pos:
        tmp_alignment_pos = pos + gap_count
        gap_count = seqRecord.seq[:tmp_alignment_pos].count("-")

    return pos + gap_count
