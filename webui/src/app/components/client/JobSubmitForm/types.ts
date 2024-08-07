export interface JobType {
    readonly uuid?: string,
    status: string,
    inputValidationPassed?: boolean
}

export interface JobSumbissionPayloadRecord {
    name: string,
    seq_id: string,
    seq_strand: string,
    seq_regions: Array<{
        start: number,
        end: number
    }>,
    fasta_file_url: string
}

export type PayloadPart = JobSumbissionPayloadRecord[] | undefined
