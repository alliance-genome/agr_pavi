import { searchAllelesByName } from '../serverActions';

// Shape mirrors the live Alliance allele_search_result records: the allele
// symbol plus its genomic HGVS in `variants[]` and the owning gene.
const BODY = {
    results: [
        {
            id: 'WB:WBVar00089919', symbol: 'n1046', species: 'Caenorhabditis elegans',
            genes: ['let-60 (Cel)'], variants: ['NC_003282.8:g.11691040C>T'],
        },
        {
            id: 'WB:WBVar00000001', symbol: 'e1370', species: 'Caenorhabditis elegans',
            genes: ['daf-2 (Cel)'], variants: ['NC_003279.8:g.100A>G'], // other gene
        },
        {
            id: 'WB:WBVar00000002', symbol: 'noHgvs', species: 'Caenorhabditis elegans',
            genes: ['let-60 (Cel)'], variants: ['some-non-genomic-id'], // no genomic HGVS
        },
    ],
};

function mockSearch(body: unknown, ok = true) {
    global.fetch = jest.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body }) as unknown as typeof fetch;
}

const keys = (a: { variants: unknown }) =>
    a.variants instanceof Map ? Array.from(a.variants.keys()) : Object.keys(a.variants as Record<string, unknown>);

describe('searchAllelesByName', () => {
    it('resolves an allele name to a gene-scoped, HGVS-keyed AlleleInfo', async () => {
        mockSearch(BODY);
        const alleles = await searchAllelesByName('WB:WBGene00002335', 'let-60', 'Caenorhabditis elegans', 'n1046');
        expect(alleles).toHaveLength(1);
        expect(alleles[0].id).toBe('WB:WBVar00089919');
        expect(alleles[0].displayName).toBe('n1046');
        expect(alleles[0].source).toBe('search');
        expect(keys(alleles[0])).toEqual(['NC_003282.8:g.11691040C>T']);
    });

    it('excludes other-gene hits and alleles with no genomic HGVS', async () => {
        mockSearch(BODY);
        const alleles = await searchAllelesByName('WB:WBGene00002335', 'let-60', 'Caenorhabditis elegans', 'x');
        expect(alleles.map((a) => a.displayName)).toEqual(['n1046']);
    });

    it('returns [] on a failed request', async () => {
        mockSearch({}, false);
        expect(await searchAllelesByName('WB:WBGene00002335', 'let-60', 'Caenorhabditis elegans', 'n1046')).toEqual([]);
    });
});
