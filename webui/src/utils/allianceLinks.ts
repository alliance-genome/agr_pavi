/**
 * Alliance URL builders for cross-linking from PAVI back to the main site.
 *
 * Confirmed resolving shapes (2026-11-21):
 *   /gene/{curie}    — HGNC:234, RGD:71009, MGI:99675, ZFIN:ZDB-GENE-...
 *   /allele/{curie}  — ZFIN alt IDs, rs variant IDs, MOD allele IDs
 *
 * Returns undefined when the input is missing or malformed so callers can
 * `href={url}` optionally and fall back to plain text.
 */

const ALLIANCE_BASE = 'https://www.alliancegenome.org';

// A valid Alliance curie is `{DB}:{ID}` where DB is a short alpha(-numeric)
// prefix and ID is non-empty. We don't try to whitelist the DB list (new MODs
// appear) but we do reject obvious non-curies so an HGVS name doesn't get
// turned into a broken link.
const CURIE_RE = /^[A-Za-z][A-Za-z0-9_-]*:[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

function looksLikeCurie(s: unknown): s is string {
    return typeof s === 'string' && CURIE_RE.test(s.trim());
}

export function allianceGeneUrl(geneId: string | null | undefined): string | undefined {
    if (!looksLikeCurie(geneId)) return undefined;
    return `${ALLIANCE_BASE}/gene/${encodeURIComponent(geneId.trim())}`;
}

export function allianceAlleleUrl(alleleId: string | null | undefined): string | undefined {
    if (!looksLikeCurie(alleleId)) return undefined;
    return `${ALLIANCE_BASE}/allele/${encodeURIComponent(alleleId.trim())}`;
}
