import {
    TRANSCRIPT_TYPES,
    buildNcListUrl,
    buildIsoformTrackConfig,
} from '../trackConfig';

describe('buildNcListUrl', () => {
    it('substitutes {release} and appends the All_Genes trackData path', () => {
        const template = 'https://s3.amazonaws.com/agrjbrowse/docker/{release}/human/';
        const url = buildNcListUrl(template, '8.2.0', '17');
        expect(url).toBe(
            'https://s3.amazonaws.com/agrjbrowse/docker/8.2.0/human/tracks/All_Genes/17/trackData.jsonz'
        );
    });
});

describe('buildIsoformTrackConfig', () => {
    const region = { chromosome: '17', start: 100, end: 200 };
    const config = buildIsoformTrackConfig({
        region,
        apolloName: 'human',
        geneSymbol: 'TP53',
        geneId: 'HGNC:11998',
        speciesTaxonId: 'NCBITaxon:9606',
        trackData: [{ some: 'nclist' }],
    });

    it('places region, genome and transcriptTypes at the top level', () => {
        expect(config.region).toEqual(region);
        expect(config.genome).toBe('human');
        expect(config.transcriptTypes).toBe(TRANSCRIPT_TYPES);
        expect(config.htpVariant).toBe('');
    });

    it('builds a single ISOFORM track carrying the fetched trackData and gene bounds', () => {
        expect(config.tracks).toHaveLength(1);
        const track = config.tracks[0];
        expect(track.type).toBe('ISOFORM');
        expect(track.trackData).toEqual([{ some: 'nclist' }]);
        expect(track.geneBounds).toEqual({ start: 100, end: 200 });
        expect(track.geneSymbol).toBe('TP53');
        expect(track.geneId).toBe('HGNC:11998');
        expect(track.speciesTaxonId).toBe('NCBITaxon:9606');
    });
});

describe('TRANSCRIPT_TYPES', () => {
    it('includes the common transcript biotypes', () => {
        expect(TRANSCRIPT_TYPES).toContain('mRNA');
        expect(TRANSCRIPT_TYPES).toContain('ncRNA');
        expect(TRANSCRIPT_TYPES).toContain('transcript');
        expect(TRANSCRIPT_TYPES.length).toBeGreaterThanOrEqual(20);
    });
});
