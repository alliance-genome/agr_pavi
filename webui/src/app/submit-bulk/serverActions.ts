'use server';

export interface GeneMatch {
    id: string;
    symbol: string;
    species: string;
}

// Resolve an exact gene symbol within a species using the Alliance search
// API (same endpoint the /submit gene autocomplete uses). Returns every
// result whose symbol and species match the request case-insensitively —
// the caller decides what to do with 0, 1, or many.
export async function resolveGeneBySymbolSpecies(
    symbol: string,
    species: string
): Promise<GeneMatch[]> {
    const url = `https://www.alliancegenome.org/api/search?category=gene_search_result&q=${encodeURIComponent(
        symbol
    )}&species=${encodeURIComponent(species)}&limit=20`;
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) {
        throw new Error(`Gene search failed with HTTP ${response.status}`);
    }
    const body = await response.json();
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
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (response.status === 400 || response.status === 404) return undefined;
    if (!response.ok) {
        throw new Error(`Gene lookup failed with HTTP ${response.status}`);
    }

    // Alliance v9 wraps everything under { category, gene }; v8 returned flat.
    const body = await response.json();
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
