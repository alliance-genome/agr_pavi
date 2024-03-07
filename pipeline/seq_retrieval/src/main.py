import click
import json

def validate_strand(ctx, param, value):
    """Returns a normalised version of strings representing a strand.
    Negative strand is normalised to '-', positive strand to '+'.
    Throws a click.BadParameter exception if an unrecognised string was provided."""
    POS_CHOICES = ['+', '+1', 'pos']
    NEG_CHOICES = ['-', '-1', 'neg']
    if   value in POS_CHOICES:
        return '+'
    elif value in NEG_CHOICES:
        return '-'
    else:
        raise click.BadParameter(f"Must be one of {POS_CHOICES} for positive strand, or {NEG_CHOICES} for negative strand.")

def process_seq_regions(ctx, param, value):
    """Parse the seq_regions parameter value and validate it's structure.
    Value is expected to be a JSON-formatted list of sequence regions to retrieve.
    Each region should have:
     * a 'start' property indicating the region start (inclusive)
     * a 'end' property indicating the region end (inclusive)
    Throws a click.BadParameter exception if value could not be parsed as JSON or had an invalid structure."""
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
@click.option("--seq_strand", type=click.STRING, default='+', callback=validate_strand,
              help="The sequence strand to retrieve sequences for.")
@click.option("--seq_regions", type=click.UNPROCESSED, required=True, callback=process_seq_regions,
              help="A list of sequence regions to retrieve sequences for.")
def main(seq_id, seq_strand, seq_regions):
    """Main method for sequence retrieval from JBrowse fastaidx indexed fasta files.
    Returns a single (transcript) sequence made by concatenating all sequence regions requested
    (in specified order)."""
    click.echo(f"Received request to retrieve sequences for {seq_id}, strand {seq_strand}, seq_regions {seq_regions}!")

if __name__ == '__main__':
    main()
