"""
Moving files to and from remote locations
"""
import os.path
from pathlib import Path
import requests
from urllib.parse import urlparse, unquote

_stored_files = dict()
_DEFAULT_DIR = '/tmp/pavi/'

def is_accessible_url(url: str):
    """
    Returns True when provided `url` is an accessible URL
    """
    response = requests.head(url)
    if response.ok:
        return True
    else:
        return False

def fetch_file(url: str, dest_dir: str = _DEFAULT_DIR, reuse_local_cache: bool = False):
    """
    Fetch file from URL, return its local path.
    """
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

def find_local_file(path: str):
    """
    Find a file locally based on path and return its absolute path.
    If no file was found at given path, throws Exception.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"No file found at path '{path}'.")
    else:
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Specified path '{path}' exists but is not a file.")
        else:
            return Path(path).resolve()

def download_from_url(url: str, dest_dir: str = _DEFAULT_DIR, chunk_size = 10 * 1024, reuse_local_cache: bool = False):
    url_components = urlparse(url)
    if url_components.scheme in ['http', 'https']:

        if not is_accessible_url(url):
            raise ValueError(f"URL {url} is not accessible.")

        Path(dest_dir).mkdir(parents=True, exist_ok=True)

        filename = unquote(os.path.basename(url_components.path))
        local_file_path = os.path.join(dest_dir, filename)

        if os.path.exists(local_file_path) and os.path.isfile(local_file_path):
            if reuse_local_cache == True:
                #Return the local file path without downloading new content
                return Path(local_file_path).resolve()
            else:
                os.remove(local_file_path)

        #Download file through streaming to support large files
        response = requests.get(url, stream=True)

        with open(local_file_path, mode="wb") as local_file:
            for chunk in response.iter_content(chunk_size=chunk_size):
                local_file.write(chunk)

        return Path(local_file_path).resolve()
    else:
        #Currently not supported
        raise ValueError(f"URL with scheme '{url_components.scheme}' is currently not supported.")
