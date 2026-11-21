import { allianceGeneUrl, allianceAlleleUrl } from '../allianceLinks';

describe('allianceGeneUrl', () => {
    it('builds the gene URL for canonical MOD curies', () => {
        expect(allianceGeneUrl('HGNC:234')).toBe('https://www.alliancegenome.org/gene/HGNC%3A234');
        expect(allianceGeneUrl('RGD:71009')).toBe('https://www.alliancegenome.org/gene/RGD%3A71009');
        expect(allianceGeneUrl('MGI:99675')).toBe('https://www.alliancegenome.org/gene/MGI%3A99675');
        expect(allianceGeneUrl('ZFIN:ZDB-GENE-040625-156')).toBe('https://www.alliancegenome.org/gene/ZFIN%3AZDB-GENE-040625-156');
    });

    it('trims whitespace around the curie', () => {
        expect(allianceGeneUrl('  HGNC:234 ')).toBe('https://www.alliancegenome.org/gene/HGNC%3A234');
    });

    it('returns undefined for non-curie strings so callers can fall back to plain text', () => {
        expect(allianceGeneUrl(undefined)).toBeUndefined();
        expect(allianceGeneUrl(null)).toBeUndefined();
        expect(allianceGeneUrl('')).toBeUndefined();
        // bare HGVS, no DB prefix
        expect(allianceGeneUrl('NC_000002.12:g.24918626A>T')).toBeUndefined();
        // leading digit — not a DB prefix
        expect(allianceGeneUrl('234:HGNC')).toBeUndefined();
        // no colon
        expect(allianceGeneUrl('ADCY3')).toBeUndefined();
    });
});

describe('allianceAlleleUrl', () => {
    it('builds the allele URL for MOD and dbSNP curies', () => {
        expect(allianceAlleleUrl('ZFIN:ZDB-ALT-150105-7')).toBe('https://www.alliancegenome.org/allele/ZFIN%3AZDB-ALT-150105-7');
        // dbSNP ids are treated as curies with the "rs" DB prefix on Alliance.
        // Even without a colon, if someone passes "rs123" it should NOT resolve:
        // Alliance routes dbSNP through its allele endpoint but the input we
        // store is a curie like "NCBIVariation:rs..." — bare "rs..." is ambiguous.
        expect(allianceAlleleUrl('rs768407459')).toBeUndefined();
    });

    it('rejects bare HGVS so a malformed input does not become a broken link', () => {
        expect(allianceAlleleUrl('NC_000002.12:g.24918626A>T')).toBeUndefined();
    });
});
