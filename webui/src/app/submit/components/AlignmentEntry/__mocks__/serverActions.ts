import { GeneInfo, AlleleInfo, GeneSuggestion } from "../types";

const mockGenes = new Map<string, GeneInfo>()
mockGenes.set('MOCK:GENE1', {
    id: 'MOCK:GENE1',
    symbol: 'MOCKGENE1',
    species: {
        taxonId: 1,
        shortName: 'Mocks'
    },
    genomeLocations: [{
        chromosome: "17",
        start: 43044295,
        end: 43170327,
        assembly: "GRCh38",
        strand: "-"
    }]
})

const mockAlleles = new Map<string, AlleleInfo[]>()
mockAlleles.set('MOCK:GENE1', [
    {id: 'ALLELE:MOCK1',
     displayName: 'MOCK1',
     variants: new Map([['VARIANT:MOCK1.1', {id: 'VARIANT:MOCK1.1', displayName: 'MOCK1.1'}],
                        ['VARIANT:MOCK1.2', {id: 'VARIANT:MOCK1.2', displayName: 'MOCK1.2'}] ])},
    {id: 'ALLELE:MOCK2',
     displayName: 'MOCK2',
     variants: new Map([['VARIANT:MOCK2.1', {id: 'VARIANT:MOCK2.1', displayName: 'MOCK2.1'}]])}
])

export async function fetchGeneInfo (geneId: string): Promise<GeneInfo|undefined> {
    console.log('Mocking fetchGeneInfo for geneId:', geneId)
    return Promise.resolve(mockGenes.get(geneId))
}

export async function fetchAlleles (geneId: string): Promise<AlleleInfo[]> {
    console.log('Mocking fetchAlleles for geneId:', geneId)
    return Promise.resolve(mockAlleles.get(geneId) || [])
}

export async function fetchGeneSuggestionsAutocomplete (geneQuery: string): Promise<GeneSuggestion[]> {
    console.log('Mocking fetchGeneSuggestionsAutocomplete for geneQuery:', geneQuery)

    const autoCompleteSuggestions: GeneSuggestion[] = []

    // Partial mock gene query matching
    mockGenes.values().forEach((mockGene) => {
        const queryInSymbol: boolean = mockGene.symbol.toLowerCase().includes(geneQuery.toLowerCase())
        const queryInId: boolean = mockGene.id.toLowerCase().includes(geneQuery.toLowerCase()) && mockGene.id.toLocaleLowerCase() !== geneQuery.toLocaleLowerCase()
        if( queryInSymbol || queryInId ) {
            autoCompleteSuggestions.push({
                id: mockGene.id,
                displayName: `${mockGene.symbol} (${mockGene.species.shortName})`
            })
        }
    })

    return Promise.resolve(autoCompleteSuggestions)
}
