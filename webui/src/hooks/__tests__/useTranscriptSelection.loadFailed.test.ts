// useTranscriptSelection imports this remote module at module scope; mock it so
// the hook can be required in jsdom (mirrors AlignmentEntry.test.tsx).
jest.mock(
    '@/utils/agrSpeciesConfig',
    () => ({
        getSpecies: jest.fn(() => ({
            jBrowsefastaurl: 'https://example.test/fasta.fa.gz',
            jBrowsenclistbaseurltemplate: 'https://example.test/docker/{release}/zfin/zebrafish/',
            jBrowseurltemplate: 'tracks/All_Genes/{refseq}/trackData.jsonz',
        })),
        getSingleGenomeLocation: jest.fn(() => ({ chromosome: '5', start: 1, end: 2 })),
        resolveJBrowseRelease: (sc: { jBrowseDataReleaseOverride?: string }, r: string) =>
            sc?.jBrowseDataReleaseOverride ?? r,
    })
);

// Control the transcript fetch so we can simulate a missing-NCList rejection.
const mockFetchTranscripts = jest.fn();
jest.mock('generic-sequence-panel', () => ({
    fetchTranscripts: (...a: any[]) => mockFetchTranscripts(...a),
}));
jest.mock('generic-sequence-panel/dist/NCListFeature', () => ({ __esModule: true, default: class {} }));

import { renderHook, waitFor } from '@testing-library/react';

import { useTranscriptSelection } from '../useTranscriptSelection';

const gene = {
    id: 'ZFIN:ZDB-GENE-990415-270',
    symbol: 'tp53',
    species: { taxonId: 'NCBITaxon:7955' },
    genomeLocations: [{ chromosome: '5', start: 1, end: 2 }],
} as any;

// The hook only calls .current?.show() on this ref.
const nullRef = { current: null } as any;

describe('useTranscriptSelection — transcript load failure', () => {
    beforeEach(() => {
        mockFetchTranscripts.mockReset();
    });

    it('flags transcriptLoadFailed when the NCList fetch rejects (missing track data)', async () => {
        mockFetchTranscripts.mockRejectedValue(new Error('404 Not Found'));

        const { result } = renderHook(() =>
            useTranscriptSelection({ gene, agrjBrowseDataRelease: '9.1.0', setupCompleted: true }, nullRef)
        );

        await waitFor(() => expect(result.current.transcriptLoadFailed).toBe(true));
        expect(result.current.transcriptList).toHaveLength(0);
        expect(result.current.transcriptListLoading).toBe(false);
    });

    it('does not flag failure on a successful fetch (even an empty one)', async () => {
        mockFetchTranscripts.mockResolvedValue([]);

        const { result } = renderHook(() =>
            useTranscriptSelection({ gene, agrjBrowseDataRelease: '9.1.0', setupCompleted: true }, nullRef)
        );

        await waitFor(() => expect(mockFetchTranscripts).toHaveBeenCalled());
        await waitFor(() => expect(result.current.transcriptListLoading).toBe(false));
        expect(result.current.transcriptLoadFailed).toBe(false);
    });
});
