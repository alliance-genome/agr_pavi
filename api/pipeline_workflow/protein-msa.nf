params.image_registry = ''
params.image_tag = 'latest'
params.input_seq_regions_str = ''
params.input_seq_regions_file = ''
params.publish_dir = 'pipeline-results/'
params.publish_dir_prefix = ''

process sequence_retrieval {
    memory '500 MB'

    container "${params.image_registry}agr_pavi/pipeline_seq_retrieval:${params.image_tag}"

    input:
        val request_map

    output:
        path "${request_map.unique_entry_id}-protein.fa", emit: output_sequences
        path "${request_map.unique_entry_id}-seqinfo.json", emit: seq_info

    script:
        encoded_exon_regions = groovy.json.JsonOutput.toJson(request_map.exon_seq_regions)
        encoded_cds_regions = groovy.json.JsonOutput.toJson(request_map.cds_seq_regions)
        variant_ids = groovy.json.JsonOutput.toJson(request_map.variant_ids)
        alt_seq_name_suffix = request_map.alt_seq_name_suffix ?: '_alt'
        """
        seq_retrieval.py --output_type protein \
            --unique_entry_id '${request_map.unique_entry_id}' --base_seq_name '${request_map.base_seq_name}' --seq_id '${request_map.seq_id}' --seq_strand '${request_map.seq_strand}' \
            --fasta_file_url '${request_map.fasta_file_url}' --exon_seq_regions '${encoded_exon_regions}' --cds_seq_regions '${encoded_cds_regions}' \
            --variant_ids '${variant_ids}' --alt_seq_name_suffix '${alt_seq_name_suffix}'
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

process collectAndAlignSeqInfo {
    debug true
    memory '500 MB'

    container "${params.image_registry}agr_pavi/pipeline_seq_retrieval:${params.image_tag}"

    publishDir "${params.publish_dir_prefix}${params.publish_dir}", mode: 'copy'

    input:
        path seq_info_files
        path alignment_output_file

    output:
        stdout
        path 'aligned_seq_info.json'

    script:
        """
        seq_info_align.py --sequence-info-files '${seq_info_files.collect{it.name}.sort{it}.join(' ')}' --alignment-result-file '${alignment_output_file}'
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

    // Retrieve sequences (w embedded variants)
    sequence_retrieval(seq_regions_channel)

    // Collect all sequences and align
    alignment(sequence_retrieval.out.output_sequences.collectFile(name: 'alignment-input.fa', sort: { file -> file.name }))

    // Merge seqinfo and add alignment positions
    collectAndAlignSeqInfo(sequence_retrieval.out.seq_info.collect(), alignment.out)
}
