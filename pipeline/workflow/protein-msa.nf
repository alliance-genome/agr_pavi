params.image_registry = ''
params.image_tag = 'latest'
params.input_seq_regions_str = ''
params.input_seq_regions_file = ''
params.publish_dir = 'pipeline-results/'
params.publish_dir_prefix = ''

process sequence_retrieval {
    memory '200 MB'

    container "${params.image_registry}agr_pavi/pipeline_seq_retrieval:${params.image_tag}"

    input:
        val request_map

    output:
        path "${request_map.name}-protein.fa"

    script:
        encoded_exon_regions = groovy.json.JsonOutput.toJson(request_map.exon_seq_regions)
        encoded_cds_regions = groovy.json.JsonOutput.toJson(request_map.cds_seq_regions)
        """
        main.py --output_type protein \
            --name ${request_map.name} --seq_id ${request_map.seq_id} --seq_strand ${request_map.seq_strand} \
            --fasta_file_url ${request_map.fasta_file_url} --exon_seq_regions '${encoded_exon_regions}' --cds_seq_regions '${encoded_cds_regions}' \
            > ${request_map.name}-protein.fa
        """
}

process alignment {
    memory '2 GB'

    container "${params.image_registry}agr_pavi/pipeline_alignment:${params.image_tag}"

    publishDir "${params.publish_dir_prefix}${params.publish_dir}", mode: 'copy'

    input:
        path 'alignment-input.fa'

    output:
        path 'alignment-output.aln'

    script:
        """
        clustalo -i alignment-input.fa --outfmt=clustal --resno -o alignment-output.aln
        """
}

workflow {
    def seq_regions_json = '[]'
    if (params.input_seq_regions_str) {
        print('Reading input seq_regions argument from string.')
        seq_regions_json = params.input_seq_regions_str
    }
    else if (params.input_seq_regions_file) {
        print("Reading input seq_regions argument from file '${params.input_seq_regions_file}'.")
        def in_file = file(params.input_seq_regions_file)
        seq_regions_json = in_file.text
    }

    def seq_regions_channel = Channel.of(seq_regions_json).splitJson()

    seq_regions_channel | sequence_retrieval | collectFile(name: 'alignment-input.fa', sort: { file -> file.name }) | alignment
}
