import { GeneInfo, AlleleInfo } from "../types";

const mockGenes = new Map<string, GeneInfo>()
mockGenes.set('MOCK:GENE1', {
    id: 'MOCK:GENE1',
    symbol: 'MOCKGENE1',
    species: {
        taxonId: 1
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
