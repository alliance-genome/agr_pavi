"""
Module used to find, access and copy files at/to/from remote locations
"""

import os.path
from pathlib import Path
import requests
from typing import Dict, Optional
from urllib.parse import urlparse, unquote

from log_mgmt import get_logger

logger = get_logger(name=__name__)

_stored_files: Dict[str, str] = dict()
"""Module level memory cache of filepaths for all files accessed through this module."""

_DEFAULT_DIR = "/tmp/pavi/"
"""Module level default destination directory to search/download remote files in/to."""

_reuse_local_cache = False
"""
Module level toggle defining local file cache reuse behaviour.
 * When True, reuse identically named files existing pre-runtime at local destination location for remote files
 * When False, delete identically named files existing pre-runtime at local destination location for remote files before downloading.

Change the value through the `set_local_cache_reuse` function.
"""


def set_local_cache_reuse(reuse: bool) -> None:
    """
    Define data_file_mover module-level behaviour on local file cache reuse.

    data_file_mover will
     * reuse identically named files at local target location when available pre-runtime when set to `True`.
     * remove identically named files at local target location when present pre-runtime when set to `False`.

    Args:
        reuse (bool): set to `True` to enable local cache reuse behavior (default `False`)
    """
    global _reuse_local_cache
    _reuse_local_cache = reuse


def is_accessible_url(url: str) -> bool:
    """
    Check whether provided `url` is an accessible (remote) URL

    Args:
        url: URL to be checked for accessability

    Returns:
        `True` when provided `url` is an accessible URL, `False` otherwise
    """
    response = requests.head(url)
    if response.ok:
        return True
    else:
        return False


def fetch_file(
    url: str, dest_dir: str = _DEFAULT_DIR, reuse_local_cache: Optional[bool] = None
) -> str:
    """
    Search local file path matching URL in caches, fetch file from URL if not found.

    First searched the data_file_mover module's `_stored_files` memory cache for result of previous retrievals,
    then searches the local file cache if `reuse_local_file_cache` is True.
    If not found, parses `url` to determine scheme and sends it to the appropriate data_file_mover function for retrieval.
    Result is cached in the data_file_mover module's `_stored_files` memory cache, which is used to speed up
    repeated retrieval.

    Args:
        url: URL to fetch local file for
        dest_dir: Destination directory to search/download remote files in/to.
        reuse_local_cache: Argument to override local cache reuse behavior defined at data_file_mover level.

    Returns:
        Absolute path to local file matching the requested URL (string).

    Raises:
        `NotImplementedError`: if the requested URL has a scheme that is currently not supported.
    """

    local_path: str

    if reuse_local_cache is None:
        reuse_local_cache = _reuse_local_cache

    if url in _stored_files.keys():
        logger.debug(f"Fetching {url} from memory cache.")
        local_path = _stored_files[url]
    else:
        url_components = urlparse(url)
        if url_components.scheme == "file":
            filepath = url_components.netloc + url_components.path
            local_path = find_local_file(filepath)

        elif url_components.scheme in ["http", "https"]:
            filename = unquote(os.path.basename(url_components.path))
            local_file_path = os.path.join(dest_dir, filename)

            if reuse_local_cache is True:
                try:
                    local_path = find_local_file(local_file_path)
                except FileNotFoundError:
                    logger.info(
                        f"File for {url} not found on download destination, downloading from remote to {dest_dir}."
                    )
                    local_path = download_from_url(url, local_file_path)
                else:
                    logger.info(f"Found file for {url} in local file cache.")

            else:
                logger.info(f"Downloading {url} from remote to {dest_dir}.")
                local_path = download_from_url(url, local_file_path)
        else:
            # Currently not supported
            raise NotImplementedError(
                f"URL with scheme '{url_components.scheme}' is currently not supported."
            )

        _stored_files[url] = local_path

    return local_path


def find_local_file(path: str) -> str:
    """
    Find a file locally based on path and return its absolute path.

    Args:
        path: path to local file to find, can be relative.

    Returns:
        Absolute path to file found at `path` (string).

    Raises:
        `FileNotFoundError`: If `path` is not found, or is not a file.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"No file found at path '{path}'.")
    else:
        if not os.path.isfile(path):
            raise FileNotFoundError(
                f"Specified path '{path}' exists but is not a file."
            )
        else:
            return str(Path(path).resolve())


def download_from_url(url: str, dest_filepath: str, chunk_size: int = 10 * 1024) -> str:
    """
    Download file from remote URL and return its absolute local path.

    Parses `url` to determine scheme and downloads the remote file to local filesystem as appropriate.
    Removes file at `dest_filepath` when found before initiating download.

    Args:
        url: URL to remote file to download
        dest_filepath: Destination filepath to download remote file to.
        chunk_size: Chunk size use while downloading

    Returns:
        Absolute path to the downloaded file (string).

    Raises:
        `ValueError`: if `url` is not accessible.
        `NotImplementedError`: if `url` scheme is not supported
    """

    url_components = urlparse(url)
    if url_components.scheme in ["http", "https"]:
        if not is_accessible_url(url):
            raise ValueError(f"URL {url} is not accessible.")

        Path(os.path.dirname(dest_filepath)).mkdir(parents=True, exist_ok=True)

        if os.path.exists(dest_filepath) and os.path.isfile(dest_filepath):
            logger.warning(
                f"Pre-existing file {dest_filepath} found at download destination, deleting before download."
            )
            os.remove(dest_filepath)

        logger.debug(f"Downloading {url}...")
        # Download file through streaming to support large files
        tmp_file_path = f"{dest_filepath}.part"
        response = requests.get(url, stream=True)

        with open(tmp_file_path, mode="wb") as local_file:
            for chunk in response.iter_content(chunk_size=chunk_size):
                local_file.write(chunk)

        os.rename(tmp_file_path, dest_filepath)
        logger.debug(f"Download of {url} completed.")

        return find_local_file(dest_filepath)
    else:
        # Currently not supported
        raise NotImplementedError(
            f"URL with scheme '{url_components.scheme}' is currently not supported."
        )
