"""
Module containing all SeqRegion-related classes (and related functions)
"""

from .seq_region import SeqRegion
from .multipart_seq_region import MultiPartSeqRegion
from .translated_seq_region import TranslatedSeqRegion, InvalidOrfException
from .variant import Variant
from .variant import variants_overlap
