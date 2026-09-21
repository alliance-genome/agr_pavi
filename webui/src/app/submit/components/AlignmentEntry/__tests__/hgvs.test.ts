import { looksLikeHgvs, looksLikeGenomicPosition, normalizeHgvs } from '../hgvs';

describe('normalizeHgvs', () => {
    it('trims and collapses inner whitespace', () => {
        expect(normalizeHgvs('  NC_000068.8:g.105521966G>T  ')).toBe('NC_000068.8:g.105521966G>T');
        expect(normalizeHgvs('NC_000068.8:g.105521966  G>T')).toBe('NC_000068.8:g.105521966 G>T');
    });
});

describe('looksLikeHgvs', () => {
    it('accepts genomic HGVS substitutions and indels', () => {
        expect(looksLikeHgvs('NC_000068.8:g.105521966G>T')).toBe(true);
        expect(looksLikeHgvs('NC_000011.10:g.31790705C>A')).toBe(true);
        expect(looksLikeHgvs('NC_000068.8:g.105521966_105521970del')).toBe(true);
        expect(looksLikeHgvs('  NC_000068.8:g.105521966G>T  ')).toBe(true); // normalizes first
    });
    it('rejects gene symbols, allele names, bare positions, and empty', () => {
        expect(looksLikeHgvs('Pax6')).toBe(false);
        expect(looksLikeHgvs('Sey')).toBe(false);
        expect(looksLikeHgvs('105521966')).toBe(false);
        expect(looksLikeHgvs('')).toBe(false);
        expect(looksLikeHgvs('NC_000068.8:g.105521966')).toBe(false); // no change suffix
    });
});

describe('looksLikeGenomicPosition', () => {
    it('accepts a bare position number and a position + change without accession', () => {
        expect(looksLikeGenomicPosition('105521966')).toBe(true);
        expect(looksLikeGenomicPosition('105521966G>T')).toBe(true);
        expect(looksLikeGenomicPosition('  105521966  ')).toBe(true); // normalizes first
    });
    it('rejects full HGVS, gene symbols, and short digit runs', () => {
        expect(looksLikeGenomicPosition('NC_000068.8:g.105521966G>T')).toBe(false); // starts with accession
        expect(looksLikeGenomicPosition('Pax6')).toBe(false);
        expect(looksLikeGenomicPosition('Sey')).toBe(false);
        expect(looksLikeGenomicPosition('123')).toBe(false); // fewer than 4 digits
        expect(looksLikeGenomicPosition('')).toBe(false);
    });
});
