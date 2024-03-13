"""
Main module serving the CLI for PAVI sequence retrieval.

Retrieves multiple sequence regions and returns them as one chained sequence.
"""
import click
import typing
import json

import data_mover.data_file_mover as data_file_mover
from seq_region import SeqRegion, chain_seq_region_seqs

def validate_strand_param(ctx, param, value) -> typing.Literal['+', '-']:
    """
    Processes and normalises the value of click input argument `strand`.

    Returns:
        A normalised version of strings representing a strand: '-' or '+'

    Raises:
        click.BadParameter: If an unrecognised string was provided.
    """
    POS_CHOICES = ['+', '+1', 'pos']
    NEG_CHOICES = ['-', '-1', 'neg']
    if   value in POS_CHOICES:
        return '+'
    elif value in NEG_CHOICES:
        return '-'
    else:
        raise click.BadParameter(f"Must be one of {POS_CHOICES} for positive strand, or {NEG_CHOICES} for negative strand.")

def process_seq_regions_param(ctx, param, value) -> typing.List[typing.Dict[str,typing.Any]]:
    """
    Parse the value of click input parameter seq_regions and validate it's structure.

    Value is expected to be a JSON-formatted list of sequence regions to retrieve.
    Each region should have:
     * a 'start' property indicating the region start (1-based, inclusive)
     * a 'end' property indicating the region end (1-based, inclusive)

    Returns:
        List of dicts representing start and end of seq region

    Raises:
        click.BadParameter: If value could not be parsed as JSON or had an invalid structure or values.
    """
    seq_regions = None
    try:
        seq_regions = json.loads(value)
    except:
        raise click.BadParameter(f"Must be a valid JSON-formatted string.")
    else:
        if not isinstance(seq_regions, list):
            raise click.BadParameter("Must be a valid list (JSON-array) of sequence regions to retrieve.")
        for region in seq_regions:
            if not isinstance(region, dict):
                raise click.BadParameter(f"Region {region} is not a valid dict. All regions in seq_regions list must be valid dicts (JSON-objects).")
            if 'start' not in region.keys():
                raise click.BadParameter(f"Region {region} does not have a 'start' property, which is a required property.")
            if 'end' not in region.keys():
                raise click.BadParameter(f"Region {region} does not have a 'end' property, which is a required property.")
            if not isinstance(region['start'], int):
                raise click.BadParameter(f"'start' property of region {region} is not an integer. All positions must be integers.")
            if not isinstance(region['end'], int):
                raise click.BadParameter(f"'end' property of region {region} is not an integer. All positions must be integers.")

        return seq_regions

@click.command()
@click.option("--seq_id", type=click.STRING, required=True,
              help="The sequence ID to retrieve sequences for.")
@click.option("--seq_strand", type=click.STRING, default='+', callback=validate_strand_param,
              help="The sequence strand to retrieve sequences for.")
@click.option("--seq_regions", type=click.UNPROCESSED, required=True, callback=process_seq_regions_param,
              help="A list of sequence regions to retrieve sequences for.")
@click.option("--fasta_file_url", type=click.STRING, required=True,
              help="""URL to (faidx-indexed) fasta file to retrieve sequences from.\
                   Assumes additional index files can be found at `<fasta_file_url>.fai`,
                   and at `<fasta_file_url>.gzi` if the fastafile is compressed.
                   Use "file://*" URL for local file or "http(s)://*" for remote files.""")
@click.option("--reuse_local_cache", is_flag=True,
              help="""When defined and using remote `fasta_file_url`, reused local files
              if file already exists at destination path, rather than re-downloading and overwritting.""")
def main(seq_id: str, seq_strand: str, seq_regions: typing.List, fasta_file_url: str, reuse_local_cache: bool):
    """
    Main method for sequence retrieval from JBrowse faidx indexed fasta files. Receives input args from click.

    Prints a single (transcript) sequence obtained by concatenating the sequence of
    all sequence regions requested (in positional order defined by specified seq_strand).
    """

    click.echo(f"Received request to retrieve sequences for {seq_id}, strand {seq_strand}, seq_regions {seq_regions}!")

    data_file_mover.set_local_cache_reuse(reuse_local_cache)

    seq_region_objs = []
    for region in seq_regions:
        seq_region_objs.append(SeqRegion(seq_id=seq_id, start=region['start'], end=region['end'], strand=seq_strand,
                                          fasta_file_url=fasta_file_url))

    for seq_region in seq_region_objs:
        #Retrieve sequence for region
        seq_region.fetch_seq()

    #Concatenate all regions into single sequence
    seq_concat = chain_seq_region_seqs(seq_region_objs, seq_strand)
    click.echo(f"\nSeq concat: {seq_concat}")

if __name__ == '__main__':
    main()
