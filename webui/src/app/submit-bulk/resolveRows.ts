import { ExampleGene } from '@/app/submit/components/ExampleDataLoader/ExampleDataLoader';
import { RawRow, ResolveResult, SkippedRow } from './types';
import { GeneMatch, resolveGeneBySymbolSpecies, resolveGeneById } from './serverActions';

type SymbolResolver = (_symbol: string, _species: string) => Promise<GeneMatch[]>;
type IdResolver = (_geneId: string) => Promise<GeneMatch | undefined>;

export interface ResolveRowsOptions {
    // Max concurrent Alliance API lookups. Low enough to be polite, high
    // enough that a 50-row list resolves in seconds instead of minutes.
    concurrency?: number;
    // Progress callback fired as each row's resolver settles. `done` is
    // the number of rows completed so far (success or skip), `total` is
    // the full row count.
    onProgress?: (_done: number, _total: number) => void;
    symbolResolver?: SymbolResolver;
    idResolver?: IdResolver;
}

type RowOutcome =
    | { kind: 'entry'; entry: ExampleGene; sourceLine: number; matchId: string }
    | { kind: 'skip'; skip: SkippedRow };

async function resolveSingle(
    raw: RawRow,
    symbolResolver: SymbolResolver,
    idResolver: IdResolver
): Promise<Omit<RowOutcome, 'sourceLine'> & { sourceLine?: number }> {
    // Direct gene-id path: skip the symbol+species search entirely.
    if (raw.geneId) {
        let match: GeneMatch | undefined;
        try {
            match = await idResolver(raw.geneId);
        } catch (e) {
            return {
                kind: 'skip',
                skip: {
                    lineNumber: raw.lineNumber,
                    raw,
                    reason: `gene_id lookup failed: ${e instanceof Error ? e.message : String(e)}`,
                },
            };
        }
        if (!match) {
            return {
                kind: 'skip',
                skip: {
                    lineNumber: raw.lineNumber,
                    raw,
                    reason: `no gene found for id "${raw.geneId}"`,
                },
            };
        }
        return {
            kind: 'entry',
            entry: {
                geneId: match.id,
                geneName: match.symbol,
                species: match.species,
                transcriptNames: raw.transcript ? [raw.transcript] : undefined,
                alleleIds: raw.variants.length > 0 ? raw.variants : undefined,
            },
            matchId: match.id,
        };
    }

    // Symbol + species path (previous behavior).
    if (!raw.species || !raw.symbol) {
        return {
            kind: 'skip',
            skip: {
                lineNumber: raw.lineNumber,
                raw,
                reason: 'missing gene_id, or missing species and gene_symbol',
            },
        };
    }

    let matches: GeneMatch[];
    try {
        matches = await symbolResolver(raw.symbol, raw.species);
    } catch (e) {
        return {
            kind: 'skip',
            skip: {
                lineNumber: raw.lineNumber,
                raw,
                reason: `lookup failed: ${e instanceof Error ? e.message : String(e)}`,
            },
        };
    }

    if (matches.length === 0) {
        return {
            kind: 'skip',
            skip: {
                lineNumber: raw.lineNumber,
                raw,
                reason: `no gene found for "${raw.symbol}" in ${raw.species}`,
            },
        };
    }
    if (matches.length > 1) {
        return {
            kind: 'skip',
            skip: {
                lineNumber: raw.lineNumber,
                raw,
                reason: `ambiguous — matched ${matches.length} genes`,
            },
        };
    }

    const match = matches[0];
    return {
        kind: 'entry',
        entry: {
            geneId: match.id,
            geneName: match.symbol,
            species: match.species,
            transcriptNames: raw.transcript ? [raw.transcript] : undefined,
            alleleIds: raw.variants.length > 0 ? raw.variants : undefined,
        },
        matchId: match.id,
    };
}

// Bounded-concurrency map: at most `limit` tasks in flight at once.
// Preserves input order in the returned array (via explicit indexing)
// which matters so the entry/skip ordering stays stable and dedup picks
// the *first* occurrence of a gene, not whichever happened to resolve
// first.
async function mapWithLimit<T, R>(
    items: T[],
    limit: number,
    worker: (_item: T, _index: number) => Promise<R>,
    onComplete?: () => void
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;
    async function pump(): Promise<void> {
        while (true) {
            const i = nextIndex++;
            if (i >= items.length) return;
            results[i] = await worker(items[i], i);
            onComplete?.();
        }
    }
    const runners = Array.from({ length: Math.min(limit, items.length) }, () => pump());
    await Promise.all(runners);
    return results;
}

// Turn parsed rows into form entries, best-effort: every row that resolves
// to exactly one gene becomes an ExampleGene; the rest are reported with a
// reason. Genes already resolved from an earlier row are deduped by id.
// Rows are resolved in parallel (default 8 concurrent). Progress is
// reported row-by-row so the UI can show "X of N" in near real time.
export async function resolveRows(
    rows: RawRow[],
    options: ResolveRowsOptions | SymbolResolver = {}
): Promise<ResolveResult> {
    // Back-compat: the old signature was `resolveRows(rows, resolver)`.
    const opts: ResolveRowsOptions =
        typeof options === 'function' ? { symbolResolver: options } : options;
    const concurrency = Math.max(1, opts.concurrency ?? 8);
    const symbolResolver = opts.symbolResolver ?? resolveGeneBySymbolSpecies;
    const idResolver = opts.idResolver ?? resolveGeneById;
    const onProgress = opts.onProgress;

    let done = 0;
    onProgress?.(0, rows.length);

    const outcomes = await mapWithLimit(
        rows,
        concurrency,
        (raw) => resolveSingle(raw, symbolResolver, idResolver),
        () => {
            done += 1;
            onProgress?.(done, rows.length);
        }
    );

    // Second pass: dedup entries by match id while preserving row order,
    // and promote duplicates to the skipped list with a clear reason.
    const entries: ExampleGene[] = [];
    const skipped: SkippedRow[] = [];
    const seenGeneIds = new Set<string>();

    for (let i = 0; i < outcomes.length; i++) {
        const o = outcomes[i];
        const raw = rows[i];
        if (o.kind === 'skip') {
            skipped.push(o.skip);
            continue;
        }
        if (seenGeneIds.has(o.matchId)) {
            skipped.push({
                lineNumber: raw.lineNumber,
                raw,
                reason: `duplicate — ${o.entry.geneName} (${o.matchId}) already loaded`,
            });
            continue;
        }
        seenGeneIds.add(o.matchId);
        entries.push(o.entry);
    }

    return { entries, skipped };
}
