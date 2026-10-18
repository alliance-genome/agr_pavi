// Server-side cache for Alliance Genome API responses.
//
// Why not Next's built-in `fetch({ next: { revalidate } })`? That caches
// per-response in the data cache, but doesn't coalesce *concurrent*
// in-flight requests to the same URL. Our hot paths (bulk upload with
// 100 rows, ortholog alignment with N selected orthologs) fan out
// parallel server-action calls that would each hit the Alliance API
// separately. A promise-coalescing in-process cache collapses those to
// a single upstream request.
//
// Scope: one process. On a single-node EC2 dev box this is the whole
// server. If we ever scale horizontally the cache will fragment — fine,
// each node still coalesces its own fan-out, which is where the real
// cost is.
//
// Not an LRU — just a Map with a hard cap and a drop-first-N eviction
// when the cap is hit. The access patterns are bursty-fan-out, not
// hot-key-with-tail, so true LRU bookkeeping would be overkill.

interface Entry<T> {
    value: T;
    expiresAt: number;
}

interface CacheOptions {
    // Max entries before oldest insertions get dropped. Not a true LRU.
    maxEntries?: number;
}

const DEFAULT_MAX_ENTRIES = 500;

class AsyncCache<T> {
    private readonly maxEntries: number;
    private readonly done = new Map<string, Entry<T>>();
    private readonly inflight = new Map<string, Promise<T>>();

    constructor(options: CacheOptions = {}) {
        this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    }

    async getOrFetch(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
        const now = Date.now();
        const hit = this.done.get(key);
        if (hit && hit.expiresAt > now) {
            return hit.value;
        }
        // Coalesce concurrent misses for the same key onto a single upstream call.
        const flying = this.inflight.get(key);
        if (flying) return flying;

        const p = (async () => {
            try {
                const value = await fetcher();
                this.store(key, { value, expiresAt: Date.now() + ttlMs });
                return value;
            } finally {
                this.inflight.delete(key);
            }
        })();
        this.inflight.set(key, p);
        return p;
    }

    private store(key: string, entry: Entry<unknown>): void {
        if (this.done.size >= this.maxEntries) {
            // Drop ~10% of oldest keys. Cheaper than per-get LRU bookkeeping;
            // works fine for the bursty fan-out patterns these cache serves.
            const toDrop = Math.max(1, Math.floor(this.maxEntries * 0.1));
            let dropped = 0;
            for (const k of this.done.keys()) {
                this.done.delete(k);
                if (++dropped >= toDrop) break;
            }
        }
        this.done.set(key, entry as Entry<T>);
    }

    clear(): void {
        this.done.clear();
        this.inflight.clear();
    }
}

// One shared cache for all Alliance JSON responses. Keys are the full
// request URL so query-param variations don't collide.
const allianceCache = new AsyncCache<unknown>();

export const TTL = {
    // Gene info, orthologs, alleles — Alliance data is updated on a
    // monthly release cadence, so 1h is still fresh and cuts almost all
    // repeat work in a session.
    gene: 60 * 60 * 1000,
    orthologs: 60 * 60 * 1000,
    alleles: 60 * 60 * 1000,
    // Autocomplete / search — user is iterating queries fast, don't
    // want to serve a stale list from 20min ago when the API changed.
    search: 5 * 60 * 1000,
    // Per-variant lookup rarely changes.
    variant: 30 * 60 * 1000,
} as const;

export type AllianceTTL = keyof typeof TTL;

// Cached GET to a URL that returns JSON. `ttl` selects a bucket from
// the TTL table so callers don't have to reason about milliseconds.
// Non-OK HTTP responses are NOT cached — treat them as transient so
// the next call retries.
export async function fetchAllianceJson<T = unknown>(
    url: string,
    ttl: AllianceTTL,
    extraHeaders?: Record<string, string>,
): Promise<T> {
    return allianceCache.getOrFetch(url, TTL[ttl], async () => {
        const res = await fetch(url, {
            headers: { accept: 'application/json', ...(extraHeaders ?? {}) },
        });
        if (!res.ok) {
            // Throw with status so callers can distinguish 4xx (user error)
            // from 5xx (server error). The throw also means a failed
            // response is not cached — the next identical request retries.
            const err = new Error(`Alliance API ${res.status} for ${url}`);
            (err as { status?: number }).status = res.status;
            throw err;
        }
        return (await res.json()) as T;
    }) as Promise<T>;
}

// Escape hatch for tests and admin tooling.
export function clearAllianceCache(): void {
    allianceCache.clear();
}

// Memoize a whole async function keyed by an arbitrary string. Use for
// multi-request operations that can't be captured as a single URL cache
// (e.g. fetchAlleles paginates with fetchUntilDistinct — we want one
// cache entry per gene_id across the whole paginated result).
//
// Each memoize() gets its own AsyncCache so two memoized functions
// with the same key-space don't clobber each other. The returned
// function coalesces concurrent calls for the same key onto one
// shared promise. Thrown errors are not cached — the next call retries.
export function memoize<Args extends unknown[], R>(
    fn: (..._args: Args) => Promise<R>,
    keyFn: (..._args: Args) => string,
    ttl: AllianceTTL,
): (..._args: Args) => Promise<R> {
    const cache = new AsyncCache<R>();
    return async (...args: Args): Promise<R> =>
        cache.getOrFetch(keyFn(...args), TTL[ttl], () => fn(...args));
}
