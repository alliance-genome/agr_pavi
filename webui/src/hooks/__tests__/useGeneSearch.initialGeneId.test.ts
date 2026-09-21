import { renderHook, waitFor } from '@testing-library/react';

import { useGeneSearch } from '../useGeneSearch';

// Take control of the two server actions the hook imports. Jest requires
// out-of-scope variables referenced inside a jest.mock factory to be prefixed
// with "mock". A relative specifier (not the '@/…' alias) reliably overrides
// the adjacent __mocks__ manual mock, and resolves to the same module the hook
// imports via '@/…', so the hook sees these mocks too.
const mockFetchGeneInfo = jest.fn();
const mockFetchGeneSuggestionsAutocomplete = jest.fn();
jest.mock('../../app/submit/components/AlignmentEntry/serverActions', () => ({
    fetchGeneInfo: (...a: any[]) => mockFetchGeneInfo(...a),
    fetchGeneSuggestionsAutocomplete: (...a: any[]) => mockFetchGeneSuggestionsAutocomplete(...a),
}));

const TP53 = {
    id: 'HGNC:11998',
    symbol: 'TP53',
    species: { taxonId: 9606, shortName: 'Hsa' },
    genomeLocations: [{ chromosome: '17', start: 1, end: 2, assembly: 'GRCh38', strand: '-' }],
};

// The hook only ever touches `.current?.hide()` / `.current?.focused` on these
// refs; a null current is safe and keeps the "field not focused" auto-select
// branch active — i.e. it does NOT mask the resolution path under test.
const nullRef = { current: null } as any;

describe('useGeneSearch — initialGeneId resolution', () => {
    beforeEach(() => {
        mockFetchGeneInfo.mockReset();
        mockFetchGeneSuggestionsAutocomplete.mockReset();
        mockFetchGeneInfo.mockResolvedValue(TP53);
        // The real Alliance search returns the exact gene PLUS fuzzy hits, so an
        // exact-ID query yields several suggestions — not exactly one. This is
        // the condition the old "auto-select only when the list has one entry"
        // path silently failed on (gene never resolved -> no transcripts/alleles).
        mockFetchGeneSuggestionsAutocomplete.mockResolvedValue([
            { id: 'HGNC:11998', displayName: 'TP53 (Hsa)' },
            { id: 'HGNC:99991', displayName: 'TP53BP1 (Hsa)' },
            { id: 'HGNC:99992', displayName: 'TP53I3 (Hsa)' },
        ]);
    });

    it('resolves the gene from initialGeneId even when the ID search returns multiple suggestions', async () => {
        const { result } = renderHook(() =>
            useGeneSearch({ initialGeneId: 'HGNC:11998', setupCompleted: true }, nullRef, nullRef)
        );

        await waitFor(() => expect(result.current.gene).toBeDefined());
        expect(result.current.gene?.id).toBe('HGNC:11998');
        expect(result.current.gene?.symbol).toBe('TP53');
        expect(mockFetchGeneInfo).toHaveBeenCalledWith('HGNC:11998');
    });

    it('does not resolve until setupCompleted becomes true', async () => {
        const { result, rerender } = renderHook(
            ({ setup }: { setup: boolean }) =>
                useGeneSearch({ initialGeneId: 'HGNC:11998', setupCompleted: setup }, nullRef, nullRef),
            { initialProps: { setup: false } }
        );

        // Nothing should resolve while setup is incomplete.
        await waitFor(() => expect(mockFetchGeneInfo).not.toHaveBeenCalled());
        expect(result.current.gene).toBeUndefined();

        // Once setup completes, the same initialGeneId resolves.
        rerender({ setup: true });
        await waitFor(() => expect(result.current.gene?.id).toBe('HGNC:11998'));
    });

    it('falls back to a text search when the ID does not resolve directly', async () => {
        // The direct resolve returns nothing (unknown id); the hook should then
        // fall back to searchGene, which runs the autocomplete search.
        mockFetchGeneInfo.mockReset();
        mockFetchGeneInfo.mockResolvedValueOnce(undefined);
        mockFetchGeneInfo.mockResolvedValue(undefined);

        renderHook(() =>
            useGeneSearch({ initialGeneId: 'HGNC:404', setupCompleted: true }, nullRef, nullRef)
        );

        await waitFor(() => expect(mockFetchGeneSuggestionsAutocomplete).toHaveBeenCalledWith('HGNC:404'));
    });
});
