"""
Unit testing for data_file_mover module
"""

from pathlib import Path
import os.path

from data_mover.data_file_mover import is_accessible_url, download_from_url, find_local_file, fetch_file


FASTA_URL = 'https://s3.amazonaws.com/agrjbrowse/fasta/GCF_000146045.2_R64_genomic.fna.gz'
DOWNLOAD_DIR = 'tests/tmp/'


def test_is_accessible_url():
    response = is_accessible_url(FASTA_URL)

    assert isinstance(response, bool)
    assert response is True


def test_download_from_url():
    downloaded_file_path = download_from_url(url=FASTA_URL, dest_dir=DOWNLOAD_DIR, reuse_local_cache=False)

    expected_rel_file_path = os.path.join(DOWNLOAD_DIR, 'GCF_000146045.2_R64_genomic.fna.gz')
    expected_abs_file_path = str(Path(expected_rel_file_path).resolve())

    assert isinstance(downloaded_file_path, str)
    assert downloaded_file_path == expected_abs_file_path

    assert find_local_file(expected_rel_file_path) == expected_abs_file_path

    # Test cached retrieval
    download_last_modified = os.path.getmtime(filename=downloaded_file_path)

    fetched_file_path = fetch_file(url=FASTA_URL, dest_dir=DOWNLOAD_DIR, reuse_local_cache=True)
    fetch_last_modified = os.path.getmtime(filename=fetched_file_path)

    # Assert fetched file has not been redownloaded but is the previously downloaded file
    assert download_last_modified == fetch_last_modified
