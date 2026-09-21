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

// Gene with a single, very long allele name - exercises HGVS name truncation
mockGenes.set('MOCK:GENE_LONG_ALLELE', {
    id: 'MOCK:GENE_LONG_ALLELE',
    symbol: 'GENELONGALLELE',
    species: {
        taxonId: 1,
        shortName: 'Mocks'
    },
    genomeLocations: [{
        chromosome: "7",
        start: 7000,
        end: 8000,
        assembly: "GRCh38",
        strand: "+"
    }]
})

const mockAlleles = new Map<string, AlleleInfo[]>()

// A pathologically long genomic HGVS (large delins) that must be truncated with
// an ellipsis in the Alleles dropdown rather than blowing out the row.
export const LONG_ALLELE_NAME =
    'NC_000007.14:g.7668402_7668500delinsACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGT'

const mockVariant = (id: string, displayName: string) => ({ id, displayName, consequences: [] })

// Standard case: 2 alleles, one with 2 variants, one with 1 variant
mockAlleles.set('MOCK:GENE1', [
    {id: 'ALLELE:MOCK1', displayName: 'MOCK1', hasDisease: false, hasPhenotype: false,
     variants: new Map([['VARIANT:MOCK1.1', mockVariant('VARIANT:MOCK1.1', 'MOCK1.1')],
                        ['VARIANT:MOCK1.2', mockVariant('VARIANT:MOCK1.2', 'MOCK1.2')] ])},
    {id: 'ALLELE:MOCK2', displayName: 'MOCK2', hasDisease: false, hasPhenotype: false,
     variants: new Map([['VARIANT:MOCK2.1', mockVariant('VARIANT:MOCK2.1', 'MOCK2.1')]])}
])

// No alleles case
mockAlleles.set('MOCK:GENE_NO_ALLELES', [])

// Many alleles case - tests filtering
mockAlleles.set('MOCK:GENE_MANY_ALLELES', [
    {id: 'ALLELE:DELETION1', displayName: 'del-1', hasDisease: false, hasPhenotype: false,
     variants: new Map([['VAR:DEL1', mockVariant('VAR:DEL1', 'c.100delA')]])},
    {id: 'ALLELE:DELETION2', displayName: 'del-2', hasDisease: false, hasPhenotype: false,
     variants: new Map([['VAR:DEL2', mockVariant('VAR:DEL2', 'c.200delG')]])},
    {id: 'ALLELE:INSERTION1', displayName: 'ins-1', hasDisease: false, hasPhenotype: false,
     variants: new Map([['VAR:INS1', mockVariant('VAR:INS1', 'c.300insT')]])},
    {id: 'ALLELE:SUBSTITUTION1', displayName: 'sub-1', hasDisease: false, hasPhenotype: false,
     variants: new Map([['VAR:SUB1', mockVariant('VAR:SUB1', 'c.400A>G')]])},
    {id: 'ALLELE:COMPLEX1', displayName: 'complex-1', hasDisease: false, hasPhenotype: false,
     variants: new Map([
         ['VAR:COMP1A', mockVariant('VAR:COMP1A', 'c.500A>T')],
         ['VAR:COMP1B', mockVariant('VAR:COMP1B', 'c.501G>C')],
         ['VAR:COMP1C', mockVariant('VAR:COMP1C', 'c.502delT')]
     ])}
])

// Single allele case
mockAlleles.set('MOCK:GENE_SINGLE_ALLELE', [
    {id: 'ALLELE:SINGLE', displayName: 'single-allele', hasDisease: false, hasPhenotype: false,
     variants: new Map([['VAR:SINGLE', mockVariant('VAR:SINGLE', 'c.123A>G')]])}
])

// Long-allele case: one allele whose displayName is a very long HGVS string
mockAlleles.set('MOCK:GENE_LONG_ALLELE', [
    {id: 'ALLELE:LONG1', displayName: LONG_ALLELE_NAME, hasDisease: false, hasPhenotype: false,
     variants: new Map([['VAR:LONG1', mockVariant('VAR:LONG1', LONG_ALLELE_NAME)]])}
])

export async function fetchGeneInfo (geneId: string): Promise<GeneInfo|undefined> {
    console.log('Mocking fetchGeneInfo for geneId:', geneId)
    return Promise.resolve(mockGenes.get(geneId))
}

export async function fetchAlleles (geneId: string): Promise<AlleleInfo[]> {
    console.log('Mocking fetchAlleles for geneId:', geneId)
    return Promise.resolve(mockAlleles.get(geneId) || [])
}

// Variant/allele search actions default to no-ops in the manual mock; tests
// that exercise them override these in their jest.mock factory.
export async function searchVariants (): Promise<AlleleInfo[]> {
    return Promise.resolve([])
}

export async function searchAllelesByName (): Promise<AlleleInfo[]> {
    return Promise.resolve([])
}

export async function lookupVariantByHgvs (): Promise<AlleleInfo|null> {
    return Promise.resolve(null)
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
