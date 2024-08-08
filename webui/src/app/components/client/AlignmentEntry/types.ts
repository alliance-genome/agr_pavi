export interface GeneInfo {
    readonly id: string,
    readonly symbol: string,
    readonly species: any,
    readonly genomeLocations: Array<any>
}

export enum AlignmentEntryStatus {
    /* eslint-disable no-unused-vars */
    PENDING_INPUT = 'Pending input',
    PROCESSING = 'Processing',
    FAILED_PROCESSING = 'Failed processing',
    READY = 'Ready'
}
