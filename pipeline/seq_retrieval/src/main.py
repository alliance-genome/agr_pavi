#!/usr/bin/env python3
"""
Main module serving the CLI for PAVI sequence retrieval.

Retrieves multiple sequence regions and returns them as one chained sequence.
"""
import click
import json
import logging
import re
from typing import get_args, List, TypedDict, Optional

import data_mover.data_file_mover as data_file_mover
from seq_region import SeqRegion, TranslatedSeqRegion
from log_mgmt import set_log_level, get_logger

logger = get_logger(name=__name__)

STRAND_POS_CHOICES = ['+', '+1', 'pos']
STRAND_NEG_CHOICES = ['-', '-1', 'neg']


class SeqRegionDict(TypedDict):
    """
    Type representing seq_region input params after processing
     * 'start' property indicates the region start (1-based, inclusive)
     * 'end' property indicates the region end (1-based, inclusive)
     * Optional 'frame' property indicates the framing of the region for translation (0-based, 0..2, default 0)
    """
    start: int
    end: int
    frame: Optional[SeqRegion.FRAME_TYPE]


def validate_strand_param(ctx: click.Context, param: click.Parameter, value: str) -> SeqRegion.STRAND_TYPE:  # noqa: U100
    """
    Processes and normalises the value of click input argument `strand`.

    Returns:
        A normalised version of strings representing a strand: '-' or '+'

    Raises:
        click.BadParameter: If an unrecognised string was provided.
    """

    if value in STRAND_POS_CHOICES:
        return '+'
    elif value in STRAND_NEG_CHOICES:
        return '-'
    else:
        raise click.BadParameter(f"Must be one of {STRAND_POS_CHOICES} for positive strand, or {STRAND_NEG_CHOICES} for negative strand.")


def process_seq_regions_param(ctx: click.Context, param: click.Parameter, value: str) -> List[SeqRegionDict]:  # noqa: U100
    """
    Parse the value of click input parameter seq_regions and validate it's structure.

    Value is expected to be a JSON-formatted list of sequence regions to retrieve.
    Sequence regions can either be define as dicts or as string.

    Dict format expected: '{"start": 1234, "end": 5678, "frame": 0}' (see SeqRegionDict)
    String format expected: '`start`..`end`'

    Returns:
        List of dicts representing SeqRegion attributes

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
                if 'frame' in region.keys():
                    valid_frame_types = get_args(SeqRegion.FRAME_TYPE)
                    if region['frame'] not in valid_frame_types:
                        raise click.BadParameter(f"'frame' property of region {region} is not correctly typed. Value {region['frame']} must be one of {valid_frame_types}.")
                else:
                    region['frame'] = None
            elif isinstance(region, str):
                re_match = re.fullmatch(r'(\d+)\.\.(\d+)', region)
                if re_match is not None:
                    region = dict(start=int(re_match.group(1)),
                                  end=int(re_match.group(2)),
                                  frame=None)
                else:
                    raise click.BadParameter(f"Region {region} of type string has invalid format. Region of type string must be formatted '`start`..`end`'")
            else:
                raise click.BadParameter(f"Region {region} is not a valid type. All regions in seq_regions list must be valid dicts (JSON-objects) or strings.")

            seq_regions[index] = region

        return seq_regions


@click.command(context_settings={'show_default': True})
@click.option("--seq_id", type=click.STRING, required=True,
              help="The sequence ID to retrieve sequences for.")
@click.option("--seq_strand", type=click.Choice(STRAND_POS_CHOICES + STRAND_NEG_CHOICES), default='+', callback=validate_strand_param,
              help="The sequence strand to retrieve sequences for.")
@click.option("--exon_seq_regions", type=click.UNPROCESSED, required=True, callback=process_seq_regions_param,
              help="A JSON list of sequence regions to retrieve sequences for "
                   + "(dicts formatted '{\"start\": 1234, \"end\": 5678, \"frame\": 0}' or strings formatted '`start`..`end`').")
@click.option("--cds_seq_regions", type=click.UNPROCESSED, default=[], callback=process_seq_regions_param,
              help="A JSON list of CDS sequence regions to use for translation for output-type protein "
                   + "(dicts formatted '{\"start\": 1234, \"end\": 5678, \"frame\": 0}' or strings formatted '`start`..`end`').")
@click.option("--fasta_file_url", type=click.STRING, required=True,
              help="""URL to (faidx-indexed) fasta file to retrieve sequences from.
                   Assumes additional index files can be found at `<fasta_file_url>.fai`,
                   and at `<fasta_file_url>.gzi` if the fastafile is compressed.
                   Use "file://*" for local file or "http(s)://*" for remote files.""")
@click.option("--output_type", type=click.Choice(['transcript', 'protein'], case_sensitive=False), required=True,
              help="""The output type to return.""")
@click.option("--name", type=click.STRING, required=True,
              help="The sequence name to use in the output fasta header.")
@click.option("--reuse_local_cache", is_flag=True,
              help="""When defined and using remote `fasta_file_url`, reused local files
              if file already exists at destination path, rather than re-downloading and overwritting.""")
@click.option("--unmasked", is_flag=True,
              help="""When defined, return unmasked sequences (undo soft masking present in reference files).""")
@click.option("--debug", is_flag=True,
              help="""Flag to enable debug printing.""")
def main(seq_id: str, seq_strand: SeqRegion.STRAND_TYPE, exon_seq_regions: List[SeqRegionDict], cds_seq_regions: List[SeqRegionDict], fasta_file_url: str, output_type: str,
         name: str, reuse_local_cache: bool, unmasked: bool, debug: bool) -> None:
    """
    Main method for sequence retrieval from JBrowse faidx indexed fasta files. Receives input args from click.

    Prints a single (transcript) sequence obtained by concatenating the sequence of
    all sequence regions requested (in positional order defined by specified seq_strand).
    """

    if debug:
        set_log_level(logging.DEBUG)
    else:
        set_log_level(logging.INFO)

    logger.info(f'Running seq_retrieval for {name}.')

    data_file_mover.set_local_cache_reuse(reuse_local_cache)

    exon_seq_region_objs: List[SeqRegion] = []
    for region in exon_seq_regions:
        exon_seq_region_objs.append(SeqRegion(seq_id=seq_id, start=region['start'], end=region['end'], strand=seq_strand,
                                              fasta_file_url=fasta_file_url))

    cds_seq_region_objs: List[SeqRegion] = []
    for region in cds_seq_regions:
        cds_seq_region_objs.append(SeqRegion(seq_id=seq_id, start=region['start'], end=region['end'], strand=seq_strand,
                                             frame=region['frame'],
                                             fasta_file_url=fasta_file_url))

    fullRegion = TranslatedSeqRegion(exon_seq_regions=exon_seq_region_objs, cds_seq_regions=cds_seq_region_objs)

    fullRegion.fetch_seq(type='transcript', recursive_fetch=True)
    seq_concat = fullRegion.get_sequence(type='transcript', unmasked=unmasked)

    logger.debug(f"full region: {fullRegion.seq_id}:{fullRegion.start}-{fullRegion.end}:{fullRegion.strand}")

    click.echo('>' + name)
    if output_type == 'transcript':
        click.echo(seq_concat)
    elif output_type == 'protein':
        protein_seq = fullRegion.translate()
        click.echo(protein_seq)
    else:
        raise NotImplementedError(f"Reporting on results of output_type {output_type} is currently not implemented.")


if __name__ == '__main__':
    main()
