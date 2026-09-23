// Default transcript for a gene picked through the search box (no example /
// bulk-upload names): the canonical protein-coding transcript is preselected
// and listed first, once per loaded list, without overriding the user later.
jest.mock(
    '@/utils/agrSpeciesConfig',
    () => ({
        getSpecies: jest.fn(() => ({ jBrowsefastaurl: 'https://example.test/fasta.fa.gz' })),
        getSingleGenomeLocation: jest.fn(() => ({ chromosome: '1', start: 1, end: 2 })),
        gffFileUrl: jest.fn(() => 'https://example.test/gff.gz'),
    })
);

const mockFetchTranscripts = jest.fn();
jest.mock('@/utils/tabixTranscripts', () => ({
    ...jest.requireActual('@/utils/tabixTranscripts'),
    fetchTranscriptsGff: (...a: unknown[]) => mockFetchTranscripts(...a),
}));

import { act, renderHook, waitFor } from '@testing-library/react';
import { useTranscriptSelection } from '../useTranscriptSelection';
import type { GffTranscript } from '@/utils/tabixTranscripts';

const nullRef = { current: null } as any;

const tx = (name: string, coding: boolean, isCanonical?: boolean, canonicalLabel?: string): GffTranscript => ({
    id: `rna-${name}`,
    name,
    curie: name,
    strand: 1,
    isCanonical,
    canonicalLabel,
    exons: [{ start: 1, end: 30 }],
    cds_regions: coding ? [{ start: 1, end: 30, phase: 0 }] : [],
});

const geneFor = (taxonId: string, symbol: string) =>
    ({ id: `X:${symbol}`, symbol, species: { taxonId }, genomeLocations: [{ chromosome: '1', start: 1, end: 2 }] }) as any;

describe('useTranscriptSelection: default transcript for a searched gene', () => {
    beforeEach(() => mockFetchTranscripts.mockReset());

    it('preselects the canonical coding transcript and lists it first (mouse Sod1)', async () => {
        mockFetchTranscripts.mockResolvedValue([
            tx('ENSMUST00000232505', false),
            tx('NM_011434.2', true),
            tx('ENSMUST00000023707', true, true, 'Ensembl canonical'),
        ]);
        const { result } = renderHook(() =>
            useTranscriptSelection({ gene: geneFor('NCBITaxon:10090', 'Sod1'), agrjBrowseDataRelease: '9.1.0' }, nullRef)
        );

        await waitFor(() => expect(result.current.selectedTranscriptIds).toEqual(['rna-ENSMUST00000023707']));
        expect(result.current.transcriptList[0].name).toBe('ENSMUST00000023707');
        expect(result.current.transcriptList.map((t) => t.name)).toEqual([
            'ENSMUST00000023707', 'ENSMUST00000232505', 'NM_011434.2',
        ]);
    });

    it('does not reselect after the user clears the selection', async () => {
        mockFetchTranscripts.mockResolvedValue([tx('ENSMUST00000023707', true, true)]);
        // Create the gene once: the app passes a stable gene object, and a new
        // object on every render would make the hook reload the list.
        const gene = geneFor('NCBITaxon:10090', 'Sod1');
        const { result } = renderHook(() =>
            useTranscriptSelection({ gene, agrjBrowseDataRelease: '9.1.0' }, nullRef)
        );
        await waitFor(() => expect(result.current.selectedTranscriptIds).toHaveLength(1));

        act(() => result.current.setSelectedTranscriptIds([]));
        await new Promise((r) => setTimeout(r, 200));
        expect(result.current.selectedTranscriptIds).toEqual([]);
        expect(mockFetchTranscripts).toHaveBeenCalledTimes(1);
    });

    it('preselects and labels the MANE Select transcript for a human gene (TP53)', async () => {
        mockFetchTranscripts.mockResolvedValue([
            tx('ENST00000413465.6', true),
            tx('ENST00000269305.9', true),
        ]);
        const { result } = renderHook(() =>
            useTranscriptSelection({ gene: geneFor('NCBITaxon:9606', 'TP53'), agrjBrowseDataRelease: '9.1.0' }, nullRef)
        );

        await waitFor(() => expect(result.current.selectedTranscriptIds).toEqual(['rna-ENST00000269305.9']));
        expect(result.current.transcriptList[0]).toMatchObject({ name: 'ENST00000269305.9', canonicalLabel: 'MANE Select' });
    });
});
