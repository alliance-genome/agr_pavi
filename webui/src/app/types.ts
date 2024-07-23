export interface jobType {
    uuid?: string,
    status: string,
    inputValidationPassed?: boolean
}

export interface geneInfo {
    id: string,
    symbol: string,
    species: any,
    genomeLocations: Array<any>
}
