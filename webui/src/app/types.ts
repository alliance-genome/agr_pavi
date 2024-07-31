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
