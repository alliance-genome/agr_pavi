"""
Main module serving the CLI for PAVI sequence retrieval.

Retrieves multiple sequence regions and returns them as one chained sequence.
"""
import click
import json
import logging
import re
from typing import Any, Dict, List, Literal

import data_mover.data_file_mover as data_file_mover
from seq_region import SeqRegion, MultiPartSeqRegion
from log_mgmt import set_log_level, get_logger

logger = get_logger(name=__name__)


def validate_strand_param(ctx: click.Context, param: click.Parameter, value: str) -> Literal['+', '-']:
    """
    Processes and normalises the value of click input argument `strand`.

    Returns:
        A normalised version of strings representing a strand: '-' or '+'

    Raises:
        click.BadParameter: If an unrecognised string was provided.
    """
    POS_CHOICES = ['+', '+1', 'pos']
    NEG_CHOICES = ['-', '-1', 'neg']
    if value in POS_CHOICES:
        return '+'
    elif value in NEG_CHOICES:
        return '-'
    else:
        raise click.BadParameter(f"Must be one of {POS_CHOICES} for positive strand, or {NEG_CHOICES} for negative strand.")


def process_seq_regions_param(ctx: click.Context, param: click.Parameter, value: str) -> List[Dict[str, Any]]:
    """
    Parse the value of click input parameter seq_regions and validate it's structure.

    Value is expected to be a JSON-formatted list of sequence regions to retrieve.
    Sequence regions can either be define as dicts or as string.

    Dict format expected: '{"start": 1234, "end": 5678}'
    String format expected: '`start`..`end`'
    where:
     * 'start' property indicates the region start (1-based, inclusive)
     * 'end' property indicates the region end (1-based, inclusive)

    Returns:
        List of dicts representing start and end of seq region

    Raises:
        click.BadParameter: If value could not be parsed as JSON or had an invalid structure or values.
    """
    seq_regions = None
    try:
        seq_regions = json.loads(value)
    except Exception:
        raise click.BadParameter("Must be a valid JSON-formatted string.")
    else:
        if not isinstance(seq_regions, list):
            raise click.BadParameter("Must be a valid list (JSON-array) of sequence regions to retrieve.")
        for index, region in enumerate(seq_regions):
            if isinstance(region, dict):
                if 'start' not in region.keys():
                    raise click.BadParameter(f"Region {region} does not have a 'start' property, which is a required property.")
                if 'end' not in region.keys():
                    raise click.BadParameter(f"Region {region} does not have a 'end' property, which is a required property.")
                if not isinstance(region['start'], int):
                    raise click.BadParameter(f"'start' property of region {region} is not an integer. All positions must be integers.")
                if not isinstance(region['end'], int):
                    raise click.BadParameter(f"'end' property of region {region} is not an integer. All positions must be integers.")
            elif isinstance(region, str):
                re_match = re.fullmatch(r'(\d+)\.\.(\d+)', region)
                if re_match is not None:
                    region = dict(start=int(re_match.group(1)),
                                  end=int(re_match.group(2)))
                else:
                    raise click.BadParameter(f"Region {region} of type string has invalid format. Region of type string must be formatted '`start`..`end`'")
            else:
                raise click.BadParameter(f"Region {region} is not a valid type. All regions in seq_regions list must be valid dicts (JSON-objects) or strings.")

            seq_regions[index] = region

        return seq_regions


@click.command()
@click.option("--seq_id", type=click.STRING, required=True,
              help="The sequence ID to retrieve sequences for.")
@click.option("--seq_strand", type=click.STRING, default='+', callback=validate_strand_param,
              help="The sequence strand to retrieve sequences for (default '+').")
@click.option("--seq_regions", type=click.UNPROCESSED, required=True, callback=process_seq_regions_param,
              help="A JSON list of sequence regions to retrieve sequences for "
                   + "(dicts formatted '{\"start\": 1234, \"end\": 5678}' or strings formatted '`start`..`end`').")
@click.option("--fasta_file_url", type=click.STRING, required=True,
              help="""URL to (faidx-indexed) fasta file to retrieve sequences from.
                   Assumes additional index files can be found at `<fasta_file_url>.fai`,
                   and at `<fasta_file_url>.gzi` if the fastafile is compressed.
                   Use "file://*" for local file or "http(s)://*" for remote files.""")
@click.option("--reuse_local_cache", is_flag=True,
              help="""When defined and using remote `fasta_file_url`, reused local files
              if file already exists at destination path, rather than re-downloading and overwritting.""")
@click.option("--unmasked", is_flag=True,
              help="""When defined, return unmasked sequences (undo soft masking present in reference files).""")
@click.option("--debug", is_flag=True,
              help="""Flag to enable debug printing.""")
def main(seq_id: str, seq_strand: str, seq_regions: List[Dict[str, int]], fasta_file_url: str, reuse_local_cache: bool, unmasked: bool, debug: bool) -> None:
    """
    Main method for sequence retrieval from JBrowse faidx indexed fasta files. Receives input args from click.

    Prints a single (transcript) sequence obtained by concatenating the sequence of
    all sequence regions requested (in positional order defined by specified seq_strand).
    """

    if debug:
        set_log_level(logging.DEBUG)
    else:
        set_log_level(logging.WARNING)

    data_file_mover.set_local_cache_reuse(reuse_local_cache)

    seq_region_objs: List[SeqRegion] = []
    for region in seq_regions:
        seq_region_objs.append(SeqRegion(seq_id=seq_id, start=region['start'], end=region['end'], strand=seq_strand,
                                         fasta_file_url=fasta_file_url))

    for seq_region in seq_region_objs:
        # Retrieve sequence for region
        seq_region.fetch_seq()

    # Concatenate all regions into single sequence
    fullRegion = MultiPartSeqRegion(seq_regions=seq_region_objs)

    fullRegion.fetch_seq()
    seq_concat = fullRegion.get_sequence(unmasked=unmasked)

    logger.debug(f"full region: {fullRegion.seq_id}:{fullRegion.start}-{fullRegion.end}:{fullRegion.strand}")
    click.echo(seq_concat)


if __name__ == '__main__':
    main()
