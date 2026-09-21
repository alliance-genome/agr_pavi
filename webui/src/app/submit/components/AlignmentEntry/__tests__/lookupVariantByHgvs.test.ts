import { lookupVariantByHgvs } from '../serverActions';

const OK_PAYLOAD = {
    symbol: 'Pax6<sup>Sey</sup>',
    geneIds: ['MGI:97490'],
    allele: { primaryExternalId: 'MGI:1856155' },
    variantList: [{
        curatedVariantGenomicLocations: [{
            hgvs: 'NC_000068.8:g.105521966G>T',
            predictedVariantConsequences: [{
                variantTranscript: { name: 'NM_001244200.2' },
                vepImpact: { name: 'HIGH' },
                vepConsequences: [{ name: 'stop_gained' }],
                calculatedProteinStart: 208,
            }],
        }],
    }],
};

function mockFetchOnce(status: number, body: unknown) {
    global.fetch = jest.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    }) as unknown as typeof fetch;
}

describe('lookupVariantByHgvs', () => {
    it('builds an AlleleInfo for a 200 payload whose geneIds include the gene', async () => {
        mockFetchOnce(200, OK_PAYLOAD);
        const allele = await lookupVariantByHgvs('MGI:97490', 'NC_000068.8:g.105521966G>T');
        expect(allele).not.toBeNull();
        expect(allele!.id).toBe('MGI:1856155');
        expect(allele!.displayName).toBe('Pax6Sey'); // HTML stripped
        expect(allele!.source).toBe('lookup');
        const variants = allele!.variants instanceof Map
            ? Array.from(allele!.variants.values()) : Object.values(allele!.variants as any);
        expect(variants).toHaveLength(1);
        expect(variants[0].id).toBe('NC_000068.8:g.105521966G>T');
        expect(variants[0].consequences[0]).toMatchObject({
            transcriptName: 'NM_001244200.2', impact: 'HIGH',
            molecularConsequences: ['stop_gained'], proteinStartPosition: 208,
        });
    });

    it('returns null when the variant belongs to a different gene', async () => {
        mockFetchOnce(200, { ...OK_PAYLOAD, geneIds: ['MGI:99999'] });
        expect(await lookupVariantByHgvs('MGI:97490', 'NC_000068.8:g.105521966G>T')).toBeNull();
    });

    it('returns null on non-200', async () => {
        mockFetchOnce(404, {});
        expect(await lookupVariantByHgvs('MGI:97490', 'NC_000068.8:g.1A>T')).toBeNull();
    });

    it('returns null when variantList is missing', async () => {
        mockFetchOnce(200, { symbol: 'x', geneIds: ['MGI:97490'] });
        expect(await lookupVariantByHgvs('MGI:97490', 'NC_000068.8:g.1A>T')).toBeNull();
    });
});
