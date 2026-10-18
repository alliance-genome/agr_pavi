'use server';

import { fetchAllianceJson } from '@/utils/allianceCache';

export interface GeneMatch {
    id: string;
    symbol: string;
    species: string;
}

// Resolve an exact gene symbol within a species using the Alliance search
// API (same endpoint the /submit gene autocomplete uses). Returns every
// result whose symbol and species match the request case-insensitively —
// the caller decides what to do with 0, 1, or many.
//
// Hot path: fan-out from bulk upload calls this once per CSV row. The
// shared cache coalesces concurrent identical lookups and remembers
// results for 5 minutes, which collapses a 100-row re-upload or a
// resolve-retry of the same list to near-zero upstream load.
export async function resolveGeneBySymbolSpecies(
    symbol: string,
    species: string
): Promise<GeneMatch[]> {
    const url = `https://www.alliancegenome.org/api/search?category=gene_search_result&q=${encodeURIComponent(
        symbol
    )}&species=${encodeURIComponent(species)}&limit=20`;
    let body: any;
    try {
        body = await fetchAllianceJson<any>(url, 'search');
    } catch (e) {
        throw new Error(`Gene search failed: ${(e as Error).message}`);
    }
    const results = (body?.['results'] ?? []) as Array<Record<string, unknown>>;

    const wantSymbol = symbol.trim().toLowerCase();
    const wantSpecies = species.trim().toLowerCase();

    return results
        .map((r): GeneMatch | undefined => {
            const id = (r['curie'] ?? r['id']) as string | undefined;
            const sym = r['symbol'] as string | undefined;
            const sp = r['species'] as string | undefined;
            if (!id || !sym || !sp) return undefined;
            return { id, symbol: sym, species: sp };
        })
        .filter((m): m is GeneMatch => m !== undefined)
        .filter(
            (m) =>
                m.symbol.toLowerCase() === wantSymbol &&
                m.species.toLowerCase() === wantSpecies
        );
}

// Direct gene-id lookup. Returns undefined for 400 / 404 so a single bad id
// becomes a "not found" skip, not a batch-killing throw.
export async function resolveGeneById(geneId: string): Promise<GeneMatch | undefined> {
    const id = geneId.trim();
    if (!id) return undefined;
    const url = `https://www.alliancegenome.org/api/gene/${encodeURIComponent(id)}`;
    let body: any;
    try {
        body = await fetchAllianceJson<any>(url, 'gene');
    } catch (e) {
        const status = (e as { status?: number }).status;
        if (status === 400 || status === 404) return undefined;
        throw new Error(`Gene lookup failed: ${(e as Error).message}`);
    }

    // Alliance v9 wraps everything under { category, gene }; v8 returned flat.
    const g = body?.gene ?? body;
    if (!g) return undefined;

    const resolvedId =
        (g.primaryExternalId as string | undefined) ??
        (g.id as string | undefined) ??
        id;
    const symbol =
        (g.geneSymbol?.displayText as string | undefined) ??
        (g.geneSymbol?.formatText as string | undefined) ??
        (g.symbol as string | undefined) ??
        resolvedId;
    const species =
        (g.taxon?.species?.fullName as string | undefined) ??
        (g.species?.fullName as string | undefined) ??
        (typeof g.species === 'string' ? g.species : undefined) ??
        'Unknown';

    return { id: resolvedId, symbol, species };
}
