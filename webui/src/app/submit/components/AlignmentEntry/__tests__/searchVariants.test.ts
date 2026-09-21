// __tests__/searchVariants.test.ts
import { searchVariants } from '../serverActions';

const SEARCH_BODY = {
    results: [
        { name: 'NC_000068.8:g.105516549C>T', species: 'Mus musculus', genes: ['Pax6 (Mmu)'] },
        { name: 'NC_000068.8:g.105516553G>C', species: 'Mus musculus', genes: ['Pax6 (Mmu)'] },
        { name: 'NC_000011.10:g.31790705C>A', species: 'Homo sapiens', genes: ['PAX6 (Hsa)'] }, // wrong gene/species
        { name: 'NC_000068.8:g.105516549C>T', species: 'Mus musculus', genes: ['Pax6 (Mmu)'] }, // dup
    ],
};

function mockSearch(body: unknown, ok = true) {
    global.fetch = jest.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body }) as unknown as typeof fetch;
}

describe('searchVariants', () => {
    it('keeps only current-gene hits, maps to HGVS-keyed AlleleInfo, dedups', async () => {
        mockSearch(SEARCH_BODY);
        const alleles = await searchVariants('MGI:97490', 'Pax6', 'Mus musculus', 'Sey');
        expect(alleles.map(a => a.id)).toEqual([
            'NC_000068.8:g.105516549C>T',
            'NC_000068.8:g.105516553G>C',
        ]);
        expect(alleles[0].source).toBe('search');
        const v = alleles[0].variants instanceof Map
            ? Array.from(alleles[0].variants.values()) : Object.values(alleles[0].variants as any);
        expect(v[0]).toMatchObject({ id: 'NC_000068.8:g.105516549C>T', consequences: [] });
    });

    it('respects limit', async () => {
        mockSearch(SEARCH_BODY);
        const alleles = await searchVariants('MGI:97490', 'Pax6', 'Mus musculus', 'Sey', 1);
        expect(alleles).toHaveLength(1);
    });

    it('returns [] on error', async () => {
        mockSearch({}, false);
        expect(await searchVariants('MGI:97490', 'Pax6', 'Mus musculus', 'Sey')).toEqual([]);
    });
});
