"""
Biopython.SeqRecord fixtures for variant unit testing
"""

import pytest

from Bio import AlignIO
from Bio.SeqRecord import SeqRecord
from Bio.Align import MultipleSeqAlignment
import logging

from log_mgmt import get_logger, set_log_level

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)

# Read alignment result file
ALIGNMENT_RESULT_FILE = '../../tests/resources/submit-workflow-success-output.aln'


@pytest.fixture
def wb_C42D8_8a_1_yn32_seq_record() -> SeqRecord:
    alignment: MultipleSeqAlignment
    try:
        alignment = next(AlignIO.parse(ALIGNMENT_RESULT_FILE, "clustal"))
    except Exception as e:
        logger.error(f"Failed to read alignment result file '{ALIGNMENT_RESULT_FILE}': {e}")
        raise e

    if not isinstance(alignment, MultipleSeqAlignment):
        raise Exception('Alignment result file does not contain a multiple sequence alignment.')

    return_record: SeqRecord | None = None
    for record in alignment:
        if not isinstance(record, SeqRecord):
            raise Exception(f"Error while parsing record of alignment result file '{ALIGNMENT_RESULT_FILE}'.")
        if record.seq is None:
            raise Exception(f"Error while reading record sequence for alignment record '{record.id}'.")

        if record.id == 'apl-1_C42D8.8a.1_yn32':
            return_record = record
            break

    if return_record is None:
        raise Exception(f"Failed to find alignment record for 'apl-1_C42D8.8a.1_yn32' in alignment result file '{ALIGNMENT_RESULT_FILE}'.")

    return return_record
