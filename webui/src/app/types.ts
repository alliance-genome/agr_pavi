export interface jobType {
    readonly uuid?: string,
    status: string,
    inputValidationPassed?: boolean
}

export interface geneInfo {
    readonly id: string,
    readonly symbol: string,
    readonly species: any,
    readonly genomeLocations: Array<any>
}

export interface transcriptInfo {
    readonly id: string,
    readonly name: string,
    readonly exons: Array<{
        refStart: number
        refEnd: number
    }>
}

export interface jobSumbissionPayloadRecord {
    name: string,
    seq_id: string,
    seq_strand: string,
    seq_regions: Array<{
        start: number,
        end: number
    }>,
    fasta_file_url: string
}
