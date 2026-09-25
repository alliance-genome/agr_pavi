import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { dataCache, CACHE_CONFIGS } from '../dataCache';

// A fetch that fails returns undefined (the result page's server actions do).
// Caching that would serve the failure back for the whole TTL (24 h for the
// session config, persisted in localStorage), so "Try Again" and page reloads
// could never recover once the job finished.
describe('dataCache: failed (empty) fetches are not cached', () => {
    beforeEach(() => {
        dataCache.clear();
        window.localStorage.clear();
    });

    it('does not cache an undefined result; the next call fetches again', async () => {
        const fetcher = jest.fn<() => Promise<string | undefined>>()
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce('CLUSTAL alignment');

        expect(await dataCache.getOrFetch('aln', fetcher, CACHE_CONFIGS.session)).toBeUndefined();
        expect(await dataCache.getOrFetch('aln', fetcher, CACHE_CONFIGS.session)).toBe('CLUSTAL alignment');
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('still caches real results', async () => {
        const fetcher = jest.fn<() => Promise<string>>().mockResolvedValue('CLUSTAL alignment');
        await dataCache.getOrFetch('aln', fetcher, CACHE_CONFIGS.session);
        await dataCache.getOrFetch('aln', fetcher, CACHE_CONFIGS.session);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('treats an empty entry already persisted by an older version as a miss', async () => {
        // What older versions wrote to localStorage for a failed fetch: JSON.stringify
        // drops `data: undefined`, leaving an entry with no data.
        window.localStorage.setItem(
            'pavi_cache_aln',
            JSON.stringify({ timestamp: Date.now(), ttl: CACHE_CONFIGS.session.ttl, key: 'aln' }),
        );
        const fetcher = jest.fn<() => Promise<string>>().mockResolvedValue('CLUSTAL alignment');

        expect(await dataCache.getOrFetch('aln', fetcher, CACHE_CONFIGS.session)).toBe('CLUSTAL alignment');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
});
