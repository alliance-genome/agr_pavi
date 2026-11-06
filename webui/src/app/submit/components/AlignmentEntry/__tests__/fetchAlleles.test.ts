import { fetchAlleles } from '../serverActions';

// Regression lock for Jennifer Smith's ADCY3 report (2026-11-06): her missense
// NC_000002.12:g.24918626A>T sits at row 27177 in Alliance's unfiltered
// response and was unreachable through the dropdown after Alliance's shape
// shifted to one row per (variant × transcript × consequence). The fix
// narrows to HIGH|MODERATE impact and raises the row ceiling.

// Minimal shape fetchAlleles consumes: a results array (empty is fine — we're
// asserting the request URL, not the parsed payload). The findCategories call
// returns a non-empty category list so fetchAlleles proceeds past the early
// exit.
const CATEGORIES_RESP = {
    supplementalData: { distinctFieldValues: { 'filter.alleleCategory': ['allele', 'variant'] } },
};
const EMPTY_PAGE = { results: [], total: 0, returnedRecords: 0 };

describe('fetchAlleles query construction', () => {
    const originalFetch = global.fetch;
    const originalDebug = console.debug;
    const originalLog = console.log;

    beforeEach(() => {
        console.debug = jest.fn();
        console.log = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        console.debug = originalDebug;
        console.log = originalLog;
        jest.restoreAllMocks();
    });

    it('requests HIGH|MODERATE impact (drops LOW / unknown that would otherwise explode row counts)', async () => {
        const calls: string[] = [];
        global.fetch = jest.fn().mockImplementation(async (url: unknown) => {
            calls.push(String(url));
            const u = String(url);
            if (u.includes('filter.alleleCategory=findCategories')) {
                return { ok: true, status: 200, json: async () => CATEGORIES_RESP };
            }
            return { ok: true, status: 200, json: async () => EMPTY_PAGE };
        }) as unknown as typeof fetch;

        await fetchAlleles('HGNC:234');

        // At least one call to allele-variant-detail must include the impact filter.
        const avdCalls = calls.filter(c => c.includes('/allele-variant-detail') && !c.includes('findCategories'));
        expect(avdCalls.length).toBeGreaterThan(0);
        for (const c of avdCalls) {
            expect(c).toContain('filter.variantImpact=HIGH%7CMODERATE');
        }
    });

    it('still filters on the variant alleleCategory bucket (unchanged behavior)', async () => {
        const calls: string[] = [];
        global.fetch = jest.fn().mockImplementation(async (url: unknown) => {
            calls.push(String(url));
            const u = String(url);
            if (u.includes('filter.alleleCategory=findCategories')) {
                return { ok: true, status: 200, json: async () => CATEGORIES_RESP };
            }
            return { ok: true, status: 200, json: async () => EMPTY_PAGE };
        }) as unknown as typeof fetch;

        await fetchAlleles('HGNC:234');

        const avdCalls = calls.filter(c => c.includes('/allele-variant-detail') && !c.includes('findCategories'));
        for (const c of avdCalls) {
            // 'allele' is stripped from the category list; 'variant' remains.
            expect(c).toContain('filter.alleleCategory=variant');
        }
    });

    it('raises the MAX_ROWS ceiling enough to reach deep variants (ADCY3 regression lock)', async () => {
        // Simulate Alliance returning a full page every time, so fetchUntilDistinct
        // keeps paging until the row cap hits. The fix bumps MAX_ROWS from 3000
        // to 15000, so with pageSize=1000 we expect at least 15 total pages
        // (1 serial + 14 parallel) before the row budget stops us. If someone
        // lowers MAX_ROWS back toward 3000 this test fails loudly.
        const pages: number[] = [];
        global.fetch = jest.fn().mockImplementation(async (url: unknown) => {
            const u = String(url);
            if (u.includes('filter.alleleCategory=findCategories')) {
                return { ok: true, status: 200, json: async () => CATEGORIES_RESP };
            }
            const pageMatch = u.match(/[?&]page=(\d+)/);
            if (pageMatch) pages.push(Number(pageMatch[1]));
            // Always return a full page of 1000 rows — each page has 10 unique
            // keys repeated 100 times, mimicking Alliance's 1-row-per-(variant,
            // transcript, consequence) expansion on genes like ADCY3. This
            // means distinct count stays low (10 per page) so the distinct-cap
            // doesn't short-circuit before the row budget does — the only
            // thing that stops us is MAX_ROWS.
            const page = pageMatch ? Number(pageMatch[1]) : 1;
            const results = Array.from({ length: 1000 }, (_, i) => ({
                allele: { primaryExternalId: `page${page}_variant${i % 10}` },
                symbol: `v${page}_${i % 10}`,
                consequence: { vepConsequences: [{ name: 'missense_variant' }] },
            }));
            return { ok: true, status: 200, json: async () => ({ results, total: 100000, returnedRecords: 1000 }) };
        }) as unknown as typeof fetch;

        await fetchAlleles('HGNC:234');

        // With MAX_ROWS=15000 and pageSize=1000, fetchUntilDistinct should pull
        // 15 pages (1 serial + 14 parallel). If someone drops MAX_ROWS to the
        // old 3000 value, pages.length collapses to 3 and this catches it.
        expect(pages.length).toBeGreaterThanOrEqual(15);
    });
});
