#!/usr/bin/env python3
"""
Main module serving the CLI for PAVI sequence retrieval.

Retrieves multiple sequence regions and returns them as one chained sequence.
"""
import click
from enum import Enum
import json
import jsonpickle  # type: ignore
import logging
import re
import subprocess
from typing import Any, get_args, List, TypedDict, Optional

from data_mover import data_file_mover
from seq_info import EnumValueHandler, SeqInfo
from seq_region import SeqRegion, TranslatedSeqRegion
from seq_region.exceptions import exception_description
from variant import Variant
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


def process_variants_param(ctx: click.Context, param: click.Parameter, value: str) -> set[str]:  # noqa: U100
    """
    Parse the value of click input parameter variants and validate it's structure.

    Value is expected to be a JSON-formatted list of variant IDs to retrieve.
    Variant IDs must be defined as strings.

    Returns:
        Set of strings representing variant IDs

    Raises:
        click.BadParameter: If value could not be parsed as JSON or had an invalid structure or values.
    """
    variants: set[str] = set()
    try:
        variants_input = json.loads(value)
    except Exception:
        raise click.BadParameter("Must be a valid JSON-formatted string.")
    else:
        if not isinstance(variants_input, list):
            raise click.BadParameter("Must be a valid list (JSON-array) of variant IDs to retrieve.")
        for index, variant in enumerate(variants_input):
            if not isinstance(variant, str):
                raise click.BadParameter(f"Variant {variant} is not a valid string. All variants in variants list must be valid strings.")
            else:
                variants.add(variant)

        return variants


def upload_to_s3(local_path: str, s3_prefix: str) -> None:
    """
    Upload a local file to S3 using AWS CLI.

    Args:
        local_path: Path to the local file to upload
        s3_prefix: S3 URI prefix (e.g., s3://bucket/prefix/)
    """
    import os
    filename = os.path.basename(local_path)
    s3_uri = s3_prefix.rstrip('/') + '/' + filename

    logger.info(f'Uploading {local_path} to {s3_uri}...')

    result = subprocess.run(
        ['aws', 's3', 'cp', local_path, s3_uri],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        logger.error(f'Failed to upload {local_path} to S3: {result.stderr}')
        raise RuntimeError(f'S3 upload failed: {result.stderr}')

    logger.info(f'Successfully uploaded {local_path} to {s3_uri}')


def write_output(unique_entry_id: str, base_seq_name: str, output_type: str, variants_flag: bool, alt_seq_name_suffix: str,
                 ref_seq: Optional[str], alt_seq: Optional[str], ref_info: SeqInfo, alt_info: Optional[SeqInfo],
                 sequence_output_file: str | None = None, s3_output_prefix: str | None = None) -> None:
    # Define sequence names
    ref_seq_name: str = base_seq_name
    alt_seq_name: str

    if variants_flag:
        ref_seq_name = base_seq_name + '_ref'
        alt_seq_name = base_seq_name + alt_seq_name_suffix

    # Print sequence output
    if sequence_output_file is None:
        sequence_output_file = f'{unique_entry_id}-{output_type}.fa'

    if ref_seq is not None or alt_seq is not None:
        with open(sequence_output_file, 'w') as output_file:
            logger.debug(f'Writing sequences to {sequence_output_file}...')

            if ref_seq is not None:
                output_file.write(f'>{ref_seq_name}\n{ref_seq}\n')

            if alt_seq is not None:
                output_file.write(f'>{alt_seq_name}\n{alt_seq}\n')

        # Upload FASTA to S3 if prefix provided
        if s3_output_prefix:
            upload_to_s3(sequence_output_file, s3_output_prefix)

    # Print seq info
    indexed_seq_info: dict[str, Any] = {}
    indexed_seq_info[ref_seq_name] = ref_info
    if variants_flag:
        indexed_seq_info[alt_seq_name] = alt_info

    seq_info_output_file = f'{unique_entry_id}-seqinfo.json'

    jsonpickle.register(Enum, EnumValueHandler, base=True)

    with open(seq_info_output_file, 'w') as output_file:
        logger.debug(f'Writing sequence info to {seq_info_output_file}...')

        output_file.write(jsonpickle.encode(indexed_seq_info, make_refs=False, unpicklable=False))

    # Upload seq info to S3 if prefix provided
    if s3_output_prefix:
        upload_to_s3(seq_info_output_file, s3_output_prefix)


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
@click.option("--variant_ids", type=click.UNPROCESSED, default='[]', callback=process_variants_param,
              help="A JSON string list of variant IDs to embed into the transcript (and protein) sequence")
@click.option("--alt_seq_name_suffix", type=click.STRING, default='_alt',
              help="Suffix to use for naming the alt sequence embedding the variants.")
@click.option("--fasta_file_url", type=click.STRING, required=True,
              help="""URL to (faidx-indexed) fasta file to retrieve sequences from.
                   Assumes additional index files can be found at `<fasta_file_url>.fai`,
                   and at `<fasta_file_url>.gzi` if the fastafile is compressed.
                   Use "file://*" for local file or "http(s)://*" for remote files.""")
@click.option("--output_type", type=click.Choice(['transcript', 'protein'], case_sensitive=False), required=True,
              help="""The output type to return.""")
@click.option("--base_seq_name", type=click.STRING, required=True,
              help="The base name to use for the output sequence names.")
@click.option("--unique_entry_id", type=click.STRING, required=True,
              help="Unique name to identify the sequence pair by and used for output file names.")
@click.option("--sequence_output_file", type=click.STRING, required=False,
              help="""The sequence output file to write to (default "`name`-`output_type`.fa").""")
@click.option("--reuse_local_cache", is_flag=True,
              help="""When defined and using remote `fasta_file_url`, reused local files
              if file already exists at destination path, rather than re-downloading and overwritting.""")
@click.option("--unmasked", is_flag=True,
              help="""When defined, return unmasked sequences (undo soft masking present in reference files).""")
@click.option("--s3_output_prefix", type=click.STRING, required=False,
              help="""S3 URI prefix to upload output files to (e.g., s3://bucket/prefix/).""")
@click.option("--debug", is_flag=True,
              help="""Flag to enable debug printing.""")
def main(seq_id: str, seq_strand: SeqRegion.STRAND_TYPE, exon_seq_regions: List[SeqRegionDict], cds_seq_regions: List[SeqRegionDict],
         variant_ids: set[str], alt_seq_name_suffix: str, fasta_file_url: str, output_type: str, base_seq_name: str, unique_entry_id: str,
         sequence_output_file: str, reuse_local_cache: bool, unmasked: bool, s3_output_prefix: str, debug: bool) -> None:
    """
    Main method for sequence retrieval from JBrowse faidx indexed fasta files. Receives input args from click.

    Prints a single (transcript) sequence obtained by concatenating the sequence of
    all sequence regions requested (in positional order defined by specified seq_strand).
    """

    if debug:
        set_log_level(logging.DEBUG)
    else:
        set_log_level(logging.INFO)

    logger.info(f'Running seq_retrieval for {unique_entry_id}.')

    data_file_mover.set_local_cache_reuse(reuse_local_cache)

    # Fetch variant info for all variant IDs through the public web API
    variant_info: dict[str, Variant] = {}
    for variant_id in variant_ids:
        logger.debug(f"Fetching variant info for {variant_id}...")
        variant_info[variant_id] = Variant.from_variant_id(variant_id)
        logger.debug(f"Variant info for {variant_id} fetched: {variant_info[variant_id]}")

    # Parse exon_seq_regions and cds_seq_regions into respective SeqRegion objects
    exon_seq_region_objs: List[SeqRegion] = []
    for region in exon_seq_regions:
        exon_seq_region_objs.append(SeqRegion(seq_id=seq_id, start=region['start'], end=region['end'], strand=seq_strand,
                                              fasta_file_url=fasta_file_url))

    cds_seq_region_objs: List[SeqRegion] = []
    for region in cds_seq_regions:
        cds_seq_region_objs.append(SeqRegion(seq_id=seq_id, start=region['start'], end=region['end'], strand=seq_strand,
                                             frame=region['frame'],
                                             fasta_file_url=fasta_file_url))

    # Build complete sequence region (using exons + cds)
    fullRegion = TranslatedSeqRegion(exon_seq_regions=exon_seq_region_objs, cds_seq_regions=cds_seq_region_objs)

    logger.debug(f"full region: {fullRegion.seq_id}:{fullRegion.start}-{fullRegion.end}:{fullRegion.strand}")

    # Initiate output variables
    ref_seq: str | None = None
    alt_seq: str | None = None
    ref_info: SeqInfo = SeqInfo()
    alt_info: SeqInfo | None = None
    error_msg: str

    # Retrieve relevant sequence info
    if output_type == 'transcript':
        try:
            ref_seq = fullRegion.get_sequence(type='transcript', unmasked=unmasked)
        except Exception as e:  # pragma: no cover
            logger.error(f'Failed to retrieve transcript sequence for TranslatedSeqRegion {fullRegion}: {e}')
            error_msg = exception_description(e)
            ref_info = SeqInfo(error=error_msg)

        if variant_info:
            # Generate additional sequence for full region with variants embedded
            try:
                seq_info = fullRegion.get_alt_sequence(type='transcript', unmasked=unmasked, variants=list(variant_info.values()))
            except Exception as e:  # pragma: no cover
                logger.error(f'Failed to retrieve alternative transcript sequence for TranslatedSeqRegion {fullRegion} with variants ({variant_ids}): {e}')
                error_msg = exception_description(e)
                ref_info = SeqInfo(error=error_msg)
            else:
                alt_seq = seq_info.sequence
                alt_info = SeqInfo(embedded_variants=seq_info.embedded_variants)

    elif output_type == 'protein':
        try:
            ref_seq = fullRegion.get_sequence(type='protein')
        except Exception as e:
            error_msg = exception_description(e)
            ref_info = SeqInfo(error=error_msg)

        if variant_info:
            # Generate additional sequence for full region with variants embedded
            try:
                seq_info = fullRegion.get_alt_sequence(type='protein', variants=list(variant_info.values()))
            except Exception as e:
                logger.error(f'Failed to retrieve alternative protein sequence for TranslatedSeqRegion {fullRegion} with variants ({variant_ids}): {e}')
                error_msg = exception_description(e)
                alt_info = SeqInfo(error=error_msg)
            else:
                alt_seq = seq_info.sequence
                alt_info = SeqInfo(embedded_variants=seq_info.embedded_variants)

            if alt_seq == '':
                logger.error(f'No ORF found for TranslatedSeqRegion {fullRegion} with variants embedded ({variant_ids})')
    else:
        raise NotImplementedError(f"Output_type {output_type} is currently not implemented.")

    write_output(unique_entry_id=unique_entry_id, base_seq_name=base_seq_name, output_type=output_type, sequence_output_file=sequence_output_file, alt_seq_name_suffix=alt_seq_name_suffix,
                 ref_seq=ref_seq, alt_seq=alt_seq, ref_info=ref_info, alt_info=alt_info, variants_flag=len(variant_info) > 0, s3_output_prefix=s3_output_prefix)


if __name__ == '__main__':
    main()
