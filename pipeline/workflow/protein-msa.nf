params.input_seq_regions

process sequence_retrieval {
    container 'agr_pavi/seq_retrieval'

    input:
        val request_map

    output:
        path 'protein.fa'

    script:
        """
        main.py --output_type protein \
            --name ${request_map.name} --seq_id ${request_map.seq_id} --seq_strand ${request_map.seq_strand} \
            --fasta_file_url ${request_map.fasta_file_url} --seq_regions '${request_map.seq_regions}' \
            > protein.fa
        """
}

process alignment {
    container 'agr_pavi/alignment'

    input:
        path 'alignment-input.fa'

    output:
        path 'alignment-output.aln'

    script:
        """
        clustalo -i alignment-input.fa -outfmt=clustal -o alignment-output.aln
        """
}

workflow {
    def seq_region_channel = Channel.of(params.input_seq_regions).splitJson()

    seq_region_channel | sequence_retrieval | collectFile(name: 'alignment-input.fa') | alignment
}
