"""
Module containing all variables and functions to control PAVI logging
"""

import logging
from typing import List

_log_level: int = logging.WARNING
"""Log level to use for all managed loggers. Use `logging` package constants."""

_loggers: List[logging.Logger] = []
"""List of loggers managed by this module."""

FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
logging.basicConfig(format=FORMAT)


def get_logger(name: str = __name__, log_level: int = _log_level) -> logging.Logger:
    """
    Get a logger for logging at the appropriate level.

    Args:
        name: name for the logger.
        log_level: log level to set the logger to. Use `logging` package constants.

    Returns:
        A logger
    """

    validate_log_level(log_level)

    logger = logging.getLogger(name)
    logger.setLevel(_log_level)

    _loggers.append(logger)

    return logger


def validate_log_level(log_level: int) -> None:
    """
    Validate if log_level has a valid value, raise valueError if not.

    Args:
        log_level: integer to validate as log level

    Raises:
        ValueError: if log_level is not a valid logging level.
    """

    ACCEPTABLE_LOG_LEVELS = [logging.CRITICAL, logging.ERROR, logging.WARNING, logging.INFO, logging.DEBUG, logging.NOTSET]
    if log_level not in ACCEPTABLE_LOG_LEVELS:
        raise ValueError(f"log_level {log_level} is not valid. Use a logging package constant.")


def set_log_level(log_level: int) -> None:
    """
    Set the log level for all currently managed and default for future loggers.

    Args:
        log_level: log level to set
    """

    validate_log_level(log_level)

    global _log_level
    _log_level = log_level

    for logger in _loggers:
        logger.setLevel(_log_level)
