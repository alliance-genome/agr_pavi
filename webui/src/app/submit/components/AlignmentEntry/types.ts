export interface GeneInfo {
    readonly id: string,
    readonly symbol: string,
    readonly species: any,
    readonly genomeLocations: Array<any>
}

export interface GeneAutocompleteApiResponse {
    readonly symbol: string,
    readonly name_key: string,
    readonly name: string,
    readonly category: string,
    readonly primaryKey: string
}

export interface GeneSuggestion {
    readonly id: string,
    readonly displayName: string,
}

export interface TranscriptInfo {
    readonly id: string,
    readonly curie: string,
    readonly name: string,
    readonly strand: FeatureStrand,
    readonly exons: Array<{
        refStart: number
        refEnd: number
    }>,
    readonly cds_regions: Array<{
        refStart: number
        refEnd: number,
        phase: 0 | 1 | 2
    }>
}

export interface VariantInfo {
    readonly id: string,
    readonly displayName: string,
}

export interface AlleleInfo {
    readonly id: string,
    readonly displayName: string,
    variants: Map<string, VariantInfo>
}

export type FeatureStrand = 1 | -1

export enum AlignmentEntryStatus {
    /* eslint-disable no-unused-vars */
    PENDING_INPUT = 'Pending input',
    PROCESSING = 'Processing',
    FAILED_PROCESSING = 'Failed processing',
    READY = 'Ready'
}
