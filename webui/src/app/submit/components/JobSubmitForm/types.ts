import { AlignmentEntryStatus } from "../AlignmentEntry/types"

export interface JobType {
    readonly uuid?: string,
    status: string,
    inputValidationPassed?: boolean
}

export interface JobSumbissionPayloadRecord {
    /** Unique identifier for the alignment entry. */
    unique_entry_id: string,
    base_seq_name: string,
    seq_id: string,
    seq_strand: string,
    exon_seq_regions: Array<{
        start: number,
        end: number
    }>,
    cds_seq_regions: Array<{
        start: number,
        end: number,
        frame: 0 | 1 | 2
    }>,
    fasta_file_url: string,
    variant_ids: string[],
    alt_seq_name_suffix?: string,
    /** Species name for display in alignment results */
    species?: string
}

export type PayloadPart = JobSumbissionPayloadRecord[] | undefined

export interface InputPayloadPart {
    index: number,
    status: AlignmentEntryStatus,
    payloadPart: PayloadPart
    /** The form selections that produced this payload part, captured so the
     * job can later be re-opened in the Submit form pre-filled ("Edit these
     * sequences"). Only set on the READY dispatch. */
    formInput?: {
        geneId: string,
        transcriptNames: string[],
        alleleIds: string[]
    }
}

export type InputPayloadPartMap = Map<number, InputPayloadPart>

export interface InputPayloadDispatchAction {
    type: string,
    index: number,
    value: Partial<InputPayloadPart>
}
