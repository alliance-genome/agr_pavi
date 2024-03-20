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

_DEFAULT_DIR = '/tmp/pavi/'
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


def fetch_file(url: str, dest_dir: str = _DEFAULT_DIR, reuse_local_cache: Optional[bool] = None) -> str:
    """
    Fetch file from URL and return its local path.

    Parses `url` to determine scheme and sends it to the appropriate data_file_mover function for retrieval.
    Result is cached in the data_file_mover module's `_stored_files` memory cache, which is used to speed up
    repeated retrieval.

    Args:
        url: URL to fetch local file for
        dest_dir: Destination directory to search/download remote files in/to.
        reuse_local_cache: Argument to override local cache reuse behavior defined at data_file_mover level.

    Returns:
        Absolute path to local file matching the requested URL (string).
    """
    global _stored_files
    local_path = None
    if url not in _stored_files.keys():
        url_components = urlparse(url)
        if url_components.scheme == 'file':
            filepath = url_components.netloc + url_components.path
            local_path = find_local_file(filepath)
        else:
            local_path = download_from_url(url, dest_dir, reuse_local_cache=reuse_local_cache)
        _stored_files[url] = local_path
    else:
        local_path = _stored_files[url]

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
            raise FileNotFoundError(f"Specified path '{path}' exists but is not a file.")
        else:
            return str(Path(path).resolve())


def download_from_url(url: str, dest_dir: str = _DEFAULT_DIR, chunk_size: int = 10 * 1024, reuse_local_cache: Optional[bool] = None) -> str:
    """
    Download file from remote URL and return its absolute local path.

    Parses `url` to determine scheme and downloads the remote file to local filesystem as appropriate.
    When local cache reuse is enabled, does not download but returns identically named files at `dest_dir` location when found.
    When local cache reuse is disabled, removes identically named files at `dest_dir` location when found before initiating download.

    Args:
        url: URL to remote file to download
        dest_dir: Destination directory to search/download remote file in/to.
        chunk_size: Chunk size use while downloading
        reuse_local_cache: Argument to override local cache reuse behavior defined at data_file_mover level.

    Returns:
        Absolute path to the found/downloaded file (string).

    Raises:
        `ValueError`: if `url` scheme is not supported or `url` is not accessible.
    """

    if reuse_local_cache is None:
        reuse_local_cache = _reuse_local_cache

    url_components = urlparse(url)
    if url_components.scheme in ['http', 'https']:

        if not is_accessible_url(url):
            raise ValueError(f"URL {url} is not accessible.")

        Path(dest_dir).mkdir(parents=True, exist_ok=True)

        filename = unquote(os.path.basename(url_components.path))
        local_file_path = os.path.join(dest_dir, filename)

        if os.path.exists(local_file_path) and os.path.isfile(local_file_path):
            if reuse_local_cache is True:
                # Return the local file path without downloading new content
                return str(Path(local_file_path).resolve())
            else:
                os.remove(local_file_path)

        # Download file through streaming to support large files
        tmp_file_path = f"{local_file_path}.part"
        response = requests.get(url, stream=True)

        with open(tmp_file_path, mode="wb") as local_file:
            for chunk in response.iter_content(chunk_size=chunk_size):
                local_file.write(chunk)

        os.rename(tmp_file_path, local_file_path)

        return str(Path(local_file_path).resolve())
    else:
        # Currently not supported
        raise ValueError(f"URL with scheme '{url_components.scheme}' is currently not supported.")
