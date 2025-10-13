class TranslationException(Exception):
    """
    Exception raised when the translation of a sequence region fails.
    """


class SequenceNotFoundException(Exception):
    """
    Exception raised when a sequence which was expected (to be stored) was not found.
    """


class OrfException(Exception):
    """
    Exception related to ORF calculation failures.
    """


class OrfNotFoundException(OrfException):
    """
    Exception raised when finding ORFs in a sequence region fails.
    """


class InvalidatedOrfException(OrfException):
    """
    Exception raised when an ORF in a sequence region becomes invalid (due to altering the sequence).
    """


def exception_description(e: Exception) -> str:
    descr: str
    if len(e.__notes__) > 0:
        descr = str(e.__notes__[0])
    else:
        descr = str(e)
    return descr
