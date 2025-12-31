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

// Gene with no alleles - tests optional allele behavior
mockGenes.set('MOCK:GENE_NO_ALLELES', {
    id: 'MOCK:GENE_NO_ALLELES',
    symbol: 'GENENOALLELES',
    species: {
        taxonId: 1,
        shortName: 'Mocks'
    },
    genomeLocations: [{
        chromosome: "1",
        start: 1000,
        end: 2000,
        assembly: "GRCh38",
        strand: "+"
    }]
})

// Gene with many alleles - tests scrolling/filtering
mockGenes.set('MOCK:GENE_MANY_ALLELES', {
    id: 'MOCK:GENE_MANY_ALLELES',
    symbol: 'GENEMANYALLELES',
    species: {
        taxonId: 1,
        shortName: 'Mocks'
    },
    genomeLocations: [{
        chromosome: "5",
        start: 5000,
        end: 6000,
        assembly: "GRCh38",
        strand: "+"
    }]
})

// Gene with single allele single variant - simplest case
mockGenes.set('MOCK:GENE_SINGLE_ALLELE', {
    id: 'MOCK:GENE_SINGLE_ALLELE',
    symbol: 'GENESINGLEALLELE',
    species: {
        taxonId: 1,
        shortName: 'Mocks'
    },
    genomeLocations: [{
        chromosome: "3",
        start: 3000,
        end: 4000,
        assembly: "GRCh38",
        strand: "-"
    }]
})

const mockAlleles = new Map<string, AlleleInfo[]>()

// Standard case: 2 alleles, one with 2 variants, one with 1 variant
mockAlleles.set('MOCK:GENE1', [
    {id: 'ALLELE:MOCK1',
     displayName: 'MOCK1',
     variants: new Map([['VARIANT:MOCK1.1', {id: 'VARIANT:MOCK1.1', displayName: 'MOCK1.1'}],
                        ['VARIANT:MOCK1.2', {id: 'VARIANT:MOCK1.2', displayName: 'MOCK1.2'}] ])},
    {id: 'ALLELE:MOCK2',
     displayName: 'MOCK2',
     variants: new Map([['VARIANT:MOCK2.1', {id: 'VARIANT:MOCK2.1', displayName: 'MOCK2.1'}]])}
])

// No alleles case
mockAlleles.set('MOCK:GENE_NO_ALLELES', [])

// Many alleles case - tests filtering
mockAlleles.set('MOCK:GENE_MANY_ALLELES', [
    {id: 'ALLELE:DELETION1', displayName: 'del-1',
     variants: new Map([['VAR:DEL1', {id: 'VAR:DEL1', displayName: 'c.100delA'}]])},
    {id: 'ALLELE:DELETION2', displayName: 'del-2',
     variants: new Map([['VAR:DEL2', {id: 'VAR:DEL2', displayName: 'c.200delG'}]])},
    {id: 'ALLELE:INSERTION1', displayName: 'ins-1',
     variants: new Map([['VAR:INS1', {id: 'VAR:INS1', displayName: 'c.300insT'}]])},
    {id: 'ALLELE:SUBSTITUTION1', displayName: 'sub-1',
     variants: new Map([['VAR:SUB1', {id: 'VAR:SUB1', displayName: 'c.400A>G'}]])},
    {id: 'ALLELE:COMPLEX1', displayName: 'complex-1',
     variants: new Map([
         ['VAR:COMP1A', {id: 'VAR:COMP1A', displayName: 'c.500A>T'}],
         ['VAR:COMP1B', {id: 'VAR:COMP1B', displayName: 'c.501G>C'}],
         ['VAR:COMP1C', {id: 'VAR:COMP1C', displayName: 'c.502delT'}]
     ])}
])

// Single allele case
mockAlleles.set('MOCK:GENE_SINGLE_ALLELE', [
    {id: 'ALLELE:SINGLE', displayName: 'single-allele',
     variants: new Map([['VAR:SINGLE', {id: 'VAR:SINGLE', displayName: 'c.123A>G'}]])}
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
