import gffutils  # type: ignore
import click


@click.command(context_settings={'show_default': True})
@click.option("--infile", type=click.STRING, required=True, help="Example: 'GFF_HUMAN_0.gff'")
@click.option("--outfile", type=click.STRING, required=True, help="Example: 'GFF-HUMAN.db'")
def main(infile: str, outfile: str) -> None:
    gffutils.create_db(infile, outfile, force=True, keep_order=True, merge_strategy='merge', sort_attribute_values=True)


if __name__ == '__main__':
    main()
