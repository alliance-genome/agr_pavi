import click

@click.command()
@click.option("--seq_id", required=True, help="The sequence ID to retrieve sequences for.")
@click.option("--seq_strand", required=True, help="The sequence strand to retrieve sequences for.")
@click.option("--genes", required=True, help="A list of gene maps to retrieve sequences for.")
def main(seq_id, seq_strand, genes):
    """Main method for sequence retrieval from JBrowse fastaidx indexed fasta files."""
    click.echo(f"Received request to retrieve sequences for {seq_id} strand {seq_strand}!")

if __name__ == '__main__':
    main()
