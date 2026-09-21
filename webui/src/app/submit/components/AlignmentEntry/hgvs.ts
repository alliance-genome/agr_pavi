// Genomic HGVS: RefSeq accession + ":g." + start position + a change suffix
// (>subst, _range del/dup/ins/delins). Requires a change suffix so a bare
// position ("...:g.105521966") is routed to text search, not a doomed lookup.
const GENOMIC_HGVS_RE = /^[A-Za-z0-9_.]+:g\.\d+[A-Za-z_>].*$/;

/** Trim outer whitespace and collapse internal whitespace runs to one space. */
export function normalizeHgvs(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
}

/** True when `text` (after normalization) looks like a genomic HGVS string. */
export function looksLikeHgvs(text: string): boolean {
    const t = normalizeHgvs(text);
    return GENOMIC_HGVS_RE.test(t);
}

// A bare genomic position: a run of >=4 digits with no RefSeq accession /
// ":g." prefix (e.g. "105521966", or "105521966G>T"). Such input cannot be
// resolved — /api/variant needs the whole HGVS and no Alliance endpoint
// searches by position — so the UI routes it to a guidance hint instead of a
// doomed lookup or text search. A full HGVS starts with its accession, so it
// never matches this.
const GENOMIC_POSITION_RE = /^\d{4,}/;

/**
 * True when `text` looks like a bare genomic position (or position + change)
 * lacking the accession a full HGVS lookup requires. Used to prompt the user
 * for the complete HGVS rather than silently returning no results.
 */
export function looksLikeGenomicPosition(text: string): boolean {
    return GENOMIC_POSITION_RE.test(normalizeHgvs(text));
}
