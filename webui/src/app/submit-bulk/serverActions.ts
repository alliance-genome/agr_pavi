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
