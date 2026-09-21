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
    readonly proteinAccession?: string,
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

export type VariantImpact = 'HIGH' | 'MODERATE' | 'LOW' | 'MODIFIER'
export type SiftPrediction = 'deleterious' | 'deleterious_low_confidence' | 'tolerated' | 'tolerated_low_confidence'
export type PolyphenPrediction = 'probably_damaging' | 'possibly_damaging' | 'benign' | 'unknown'

export interface VariantConsequence {
    readonly transcriptId?: string,
    readonly transcriptName?: string,
    readonly molecularConsequences: string[],
    readonly impact?: VariantImpact,
    readonly proteinStartPosition?: number,
    readonly sift?: SiftPrediction,
    readonly polyphen?: PolyphenPrediction,
}

export interface VariantInfo {
    readonly id: string,
    readonly displayName: string,
    consequences: VariantConsequence[],
}

export type AlleleSource = 'gene' | 'lookup' | 'search'

export interface AlleleInfo {
    readonly id: string,
    readonly displayName: string,
    variants: Map<string, VariantInfo>,
    hasDisease: boolean,
    hasPhenotype: boolean,
    readonly source?: AlleleSource,
}

export type FeatureStrand = 1 | -1

export enum AlignmentEntryStatus {
    /* eslint-disable no-unused-vars */
    PENDING_INPUT = 'Pending input',
    PROCESSING = 'Processing',
    FAILED_PROCESSING = 'Failed processing',
    READY = 'Ready'
}
