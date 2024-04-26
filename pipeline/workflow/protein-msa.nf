import groovy.json.JsonOutput

params.image_registry = ''
params.image_tag = 'latest'
params.input_seq_regions_str = ''
params.input_seq_regions_file = ''

process sequence_retrieval {
    container "${params.image_registry}agr_pavi/pipeline_seq_retrieval:${params.image_tag}"

    input:
        val request_map

    output:
        path "${request_map.name}-protein.fa"

    script:
        encoded_seq_regions = JsonOutput.toJson(request_map.seq_regions)
        """
        main.py --output_type protein \
            --name ${request_map.name} --seq_id ${request_map.seq_id} --seq_strand ${request_map.seq_strand} \
            --fasta_file_url ${request_map.fasta_file_url} --seq_regions '${encoded_seq_regions}' \
            > ${request_map.name}-protein.fa
        """
}

process alignment {
    container "${params.image_registry}agr_pavi/pipeline_alignment:${params.image_tag}"

    publishDir "pipeline-results/", mode: 'copy'

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
        seq_regions_json = params.input_seq_regions_str
    }
    else if (params.input_seq_regions_file) {
        def in_file = file(params.input_seq_regions_file)
        seq_regions_json = in_file.text
    }

    def seq_regions_channel = Channel.of(seq_regions_json).splitJson()

    seq_regions_channel | sequence_retrieval | collectFile(name: 'alignment-input.fa', sort: { file -> file.name }) | alignment
}
