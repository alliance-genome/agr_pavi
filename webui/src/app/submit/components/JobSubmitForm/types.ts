import { AlignmentEntryStatus } from "../AlignmentEntry/types"

export interface JobType {
    readonly uuid?: string,
    status: string,
    inputValidationPassed?: boolean
}

export interface JobSumbissionPayloadRecord {
    name: string,
    seq_id: string,
    seq_strand: string,
    exon_seq_regions: Array<{
        start: number,
        end: number
    }>,
    fasta_file_url: string
}

export type PayloadPart = JobSumbissionPayloadRecord[] | undefined

export interface InputPayloadPart {
    index: number,
    status: AlignmentEntryStatus,
    payloadPart: PayloadPart
}

export type InputPayloadPartMap = Map<number, InputPayloadPart>

export interface InputPayloadDispatchAction {
    type: string,
    index: number,
    value: Partial<InputPayloadPart>
}
