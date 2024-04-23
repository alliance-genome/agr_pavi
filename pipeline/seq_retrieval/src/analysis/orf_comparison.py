from gffutils import FeatureDB
from Bio.Data import CodonTable

from typing import List
import click

import sys
sys.path.append('../')
from seq_region import SeqRegion, MultiPartSeqRegion
from seq_region.multipart_seq_region import find_orfs

import logging
from log_mgmt import get_logger, set_log_level
logger = get_logger(name=__name__)

# db = gffutils.create_db("GFF_HUMAN_0.gff", 'GFF-HUMAN.db', force=True, keep_order=True,merge_strategy='merge', sort_attribute_values=True)

@click.command(context_settings={'show_default': True})
@click.option("--mod", type=click.STRING, required=True, help="Example: 'XBXL'")
@click.option("--fasta_file", type=click.STRING, required=True, help="Example: '/home/mlp/AGR/fastas/XENLA_9.2_genome.fa.gz'")
def main(mod: str, fasta_file: str) -> None:
    # MOD = 'XBXL'
    # FASTA_FILE = 'file:///home/mlp/AGR/fastas/XENLA_9.2_genome.fa.gz'

    db = FeatureDB(f'GFF-{mod}.db', keep_order=True)
    CDS_OUTPUT_FILENAME = f'{mod}-CDS.tsv'
    ORF_OUTPUT_FILENAME = f'{mod}-ORF.tsv'

    DEBUG = False

    if DEBUG:
        set_log_level(logging.DEBUG)
        CDS_OUTPUT_FILENAME += '.debug'
        ORF_OUTPUT_FILENAME += '.debug'

    cds_outfile = open(CDS_OUTPUT_FILENAME,mode='w')
    orf_outfile = open(ORF_OUTPUT_FILENAME,mode='w')

    for transcript in db.features_of_type('mRNA'):
        # if transcript.id != 'rna23588':
        #     continue

        #Skip Mitochondrial seqs
        if transcript.seqid in ['MtDNA', 'MT', 'M', 'mitochondrion_genome', 'chrmt']:
            continue

        exons = db.children(transcript, level=1, featuretype='exon')


        seq_region_objs: List[SeqRegion] = []
        for exon in exons:

            seq_region_objs.append(SeqRegion(seq_id=exon.seqid, start=exon.start, end=exon.end, strand=exon.strand,
                                            fasta_file_url='file://' + fasta_file))

        # Skip transcripts with no exons in GFF
        if len(seq_region_objs) == 0:
            continue

        # Skip if error occurs during MultiParSeqRegion definition
        transcript_region: MultiPartSeqRegion
        try:
            transcript_region = MultiPartSeqRegion(seq_regions=seq_region_objs)
        except Exception as err:
            logger.warning(f'Skipping transcript {transcript.id} because exception during MultiPartSeqRegion creation: {err}')
            continue

        # print(f'Transcript: {transcript.start}-{transcript.end}')

        # Skip if Error occured during sequence retrieval
        try:
            transcript_region.fetch_seq(recursive_fetch=True)
            dna_sequence = transcript_region.get_sequence(unmasked=False)
        except Exception as err:
            logger.warning(f'Skipping transcript {transcript.id} because exception during sequence(s) retrieval: {err}')
            continue
        # print(dna_sequence)

        codon_table: CodonTable.CodonTable = CodonTable.unambiguous_dna_by_name["Standard"]

        # Find the best open reading frame
        orfs = find_orfs(dna_sequence, codon_table, return_type='longest')

        # print(f'ORF: {orfs[0]['seq_start']}-{orfs[0]['seq_end']}')
        if len(orfs) > 0:
            orf_outfile.write(f"{transcript.id}\t{orfs[0]['seq_start']}\t{orfs[0]['seq_end']}\n")
        else:
            orf_outfile.write(f"{transcript.id}\t-\t-\n")

        cds_parts_iterator = db.children(transcript, level=1, featuretype='CDS')
        cds_parts = []
        for cds_part in cds_parts_iterator:
            cds_parts.append(cds_part)

        cds_start: int | None = None
        cds_end: int | None = None

        abs_cds_start: int | None = None
        abs_cds_end: int | None = None
        cds_error: str | None = None
        cds_regions: List[SeqRegion] = []

        if len(cds_parts) > 0:

            for cds_part in cds_parts:
                if cds_part.start < transcript.start or transcript.end < cds_part.end:
                    cds_error = 'out-of-bounds'
                    logger.warning(f'Out-of-bounds CDS regions detected, cancelling CDS calculations for {transcript.id}.')
                    break

                cds_regions.append(SeqRegion(seq_id=cds_part.seqid, start=cds_part.start, end=cds_part.end, strand=cds_part.strand,
                                             fasta_file_url='file://' + fasta_file))

            for i in range(0,len(cds_regions)-1):
                for j in range(i+1,len(cds_regions)):
                    logger.info(f'Overlap analysis for {cds_regions[i]} and {cds_regions[j]}')
                    if cds_regions[i].overlaps(cds_regions[j]):
                        cds_error = 'overlapping'
                        logger.warning(f'Overlapping CDS regions detected, cancelling CDS calculations for {transcript.id}.' +
                                " Conflicting CDS parts: {cds_regions[i]} and {cds_regions[j]}\n")
                        break

            if cds_error is None:
                abs_cds_start = min(map(lambda region: region.start, cds_regions))
                abs_cds_end = max(map(lambda region: region.end, cds_regions))

                if transcript_region.strand == '-':
                    cds_start = transcript_region.seq_to_rel_pos(abs_cds_end)
                else:
                    cds_start = transcript_region.seq_to_rel_pos(abs_cds_start)

                cds_end = sum(map(lambda region: region.seq_length, cds_regions)) + cds_start - 1

        if cds_start is not None:
                cds_outfile.write(f"{transcript.id}\t{cds_start}\t{cds_end}\n")
        else:
            cds_outfile.write(f"{transcript.id}\t-\t-\n")

        # Define and print comparison result
        result = []
        if len(orfs) == 0 and len(cds_parts) == 0:
            result.append('equal')
        elif len(orfs) == 0:
            result.append('undetected-ORF')
        elif len(cds_parts) == 0:
            result.append('no-CDS')
        else:
            orf = orfs.pop()
            if cds_start is None:
                result.append(f'{cds_error}-CDS')
            elif orf['seq_start'] == cds_start and orf['seq_end'] == cds_end:
                result.append('equal')
            elif orf['seq_end'] == cds_end and orf['seq_start'] < cds_start:
                result.append('shortened-start')
            elif orf['seq_end'] - orf['seq_start'] > cds_end - cds_start:
                result.append('shorter-orf')
            else:
                result.append('unknown')

        print(f"{transcript.id}\t{','.join(result)}")

    orf_outfile.close()
    cds_outfile.close()

if __name__ == '__main__':
    main()
