'use server';

import { fetchAllianceJson } from '@/utils/allianceCache';

/**
 * Look up the canonical UniProt accession for an Alliance gene ID.
 *
 * Preference order (first match wins):
 *   1. gcrpCrossReference.referencedCurie — Alliance's own canonical pick
 *   2. A SwissProt-shaped accession from crossReferences (6 chars, upper)
 *   3. The first UniProtKB:... crossReference, whatever its shape
 *
 * Returns undefined when the gene has no UniProt mapping at all (common
 * for some invertebrates / fungi).
 */
export async function resolveUniProtForGene(geneId: string): Promise<string | undefined> {
    if (!geneId) return undefined;
    const url = `https://www.alliancegenome.org/api/gene/${encodeURIComponent(geneId)}`;
    let body: any;
    try {
        body = await fetchAllianceJson<any>(url, 'gene');
    } catch {
        return undefined;
    }
    const gene = body?.gene ?? body;
    if (!gene) return undefined;

    const gcrp = gene?.gcrpCrossReference?.referencedCurie as string | undefined;
    if (typeof gcrp === 'string' && gcrp.toLowerCase().startsWith('uniprotkb:')) {
        return gcrp.slice('UniProtKB:'.length);
    }

    const xrefs = Array.isArray(gene?.crossReferences) ? gene.crossReferences : [];
    const uniprots: string[] = [];
    for (const xr of xrefs) {
        const r = xr?.referencedCurie;
        if (typeof r === 'string' && r.toLowerCase().startsWith('uniprotkb:')) {
            uniprots.push(r.slice('UniProtKB:'.length));
        }
    }
    if (uniprots.length === 0) return undefined;
    // Prefer the canonical SwissProt shape ([OPQ][0-9][A-Z0-9]{3}[0-9]
    // or [A-NR-Z]... total 6 chars). TrEMBL (A0A... 10+ chars) is a
    // last resort because its annotations are usually sparse.
    const reviewed = uniprots.find(u => /^[A-Z0-9]{6}$/.test(u) && !u.startsWith('A0A'));
    return reviewed ?? uniprots[0];
}

export interface ProteinDomain {
    /** InterPro-stable accession or source DB accession (e.g. 'IPR011615', 'cd08367'). */
    accession: string;
    /** Human-readable name (e.g. "P53 DNA-binding domain"). */
    name: string;
    /** Entry type: 'domain', 'family', 'repeat', etc. */
    type: string;
    /** Source database: 'cdd', 'pfam', 'smart', 'profile', 'interpro', etc. */
    sourceDatabase: string;
    /** The InterPro parent accession when the source entry integrates into one. */
    integrated?: string;
    /** 1-based [start, end] inclusive residue positions. */
    start: number;
    end: number;
}

/**
 * Fetch domain matches for a UniProt accession from EBI InterPro.
 *
 * We only ask for `entry/all/protein/uniprot/{acc}` which gives one row
 * per domain match with the residue range. Non-matching sources (go_terms,
 * member_databases) are stripped — we just want "where on the protein".
 *
 * Returns [] on any failure (404, network, parse) so a missing domain
 * record never surfaces as a page error.
 *
 * Cached via the Alliance cache plumbing because we already have TTL +
 * promise-coalescing there and this is a very similar access pattern
 * (per-gene fan-out, idempotent GETs).
 */
export async function fetchProteinDomains(uniprotAcc: string): Promise<ProteinDomain[]> {
    const acc = uniprotAcc.replace(/^UniProtKB:/i, '').trim();
    if (!acc) return [];
    const url = `https://www.ebi.ac.uk/interpro/api/entry/all/protein/uniprot/${encodeURIComponent(acc)}/?page_size=100`;
    let body: any;
    try {
        // Reuse the Alliance cache for its TTL + coalescing primitives; EBI
        // domain data is just as cache-friendly as Alliance gene info.
        body = await fetchAllianceJson<any>(url, 'gene');
    } catch (e) {
        const status = (e as { status?: number }).status;
        // 204 = no matches, 404 = unknown accession. Both map to [] rather
        // than a thrown error so the UI shows "no domains" instead of a
        // broken state.
        if (status === 204 || status === 404) return [];
        console.warn(`InterPro fetch failed for ${acc}:`, e);
        return [];
    }
    const results = Array.isArray(body?.results) ? body.results : [];
    const out: ProteinDomain[] = [];
    for (const r of results) {
        const meta = r?.metadata ?? {};
        const proteins = Array.isArray(r?.proteins) ? r.proteins : [];
        for (const p of proteins) {
            const locs = Array.isArray(p?.entry_protein_locations) ? p.entry_protein_locations : [];
            for (const loc of locs) {
                const frags = Array.isArray(loc?.fragments) ? loc.fragments : [];
                for (const f of frags) {
                    const start = Number(f?.start);
                    const end = Number(f?.end);
                    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
                    out.push({
                        accession: String(meta.accession ?? ''),
                        name: String(meta.name ?? meta.accession ?? ''),
                        type: String(meta.type ?? 'domain'),
                        sourceDatabase: String(meta.source_database ?? ''),
                        integrated: meta.integrated ? String(meta.integrated) : undefined,
                        start,
                        end,
                    });
                }
            }
        }
    }
    // Sort by start position so the UI renders left-to-right.
    out.sort((a, b) => a.start - b.start || a.end - b.end);
    return out;
}
