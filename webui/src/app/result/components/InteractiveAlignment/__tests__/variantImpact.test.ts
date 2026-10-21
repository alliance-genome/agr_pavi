/**
 * Biological validation for the variant impact helpers.
 *
 * The TP53 R175H / R248Q / R273H / R282W cluster is the classic
 * canonical hotspot in the DNA-binding domain of the human p53 tumour
 * suppressor — these four codons account for ~30% of all cancer-
 * associated TP53 missense variants in COSMIC. Any method that claims
 * to summarise "where variant impact concentrates on a protein" must
 * light up this region for TP53.
 *
 * This test fixes PAVI's hotspot aggregation parameters (±2 window,
 * HIGH=4 / MODERATE=2 weights, linear falloff) against those positions.
 * If the shape of the hotspot formula changes, this test will fail and
 * the methodology doc should be updated to match.
 *
 * See docs/variant-impact-methodology.md for the full write-up.
 */

import { describe, expect, it } from '@jest/globals';
import {
    impactColor,
    impactWeight,
    impactLabel,
    computeHotspotPeaks,
} from '../variantImpact';

describe('impactColor', () => {
    it('maps each VEP bucket to its traffic-light colour', () => {
        expect(impactColor('HIGH')).toBe('#dc2626');
        expect(impactColor('MODERATE')).toBe('#ea580c');
        expect(impactColor('LOW')).toBe('#ca8a04');
        expect(impactColor('MODIFIER')).toBe('#64748b');
    });

    it('is case-insensitive', () => {
        expect(impactColor('high')).toBe('#dc2626');
        expect(impactColor('Moderate')).toBe('#ea580c');
    });

    it('falls back to gray for unknown / null / empty', () => {
        expect(impactColor(null)).toBe('#6b7280');
        expect(impactColor(undefined)).toBe('#6b7280');
        expect(impactColor('')).toBe('#6b7280');
        expect(impactColor('CATASTROPHIC')).toBe('#6b7280');
    });
});

describe('impactWeight', () => {
    it('encodes 4:2:1:0.25 ratio across HIGH / MODERATE / LOW / MODIFIER', () => {
        expect(impactWeight('HIGH')).toBe(4);
        expect(impactWeight('MODERATE')).toBe(2);
        expect(impactWeight('LOW')).toBe(1);
        expect(impactWeight('MODIFIER')).toBe(0.25);
    });

    it('treats unknown as a middling (weight 1) signal', () => {
        expect(impactWeight(null)).toBe(1);
        expect(impactWeight(undefined)).toBe(1);
        expect(impactWeight('')).toBe(1);
        expect(impactWeight('UNKNOWN')).toBe(1);
    });
});

describe('impactLabel', () => {
    it('produces human-friendly text', () => {
        expect(impactLabel('HIGH')).toBe('high impact');
        expect(impactLabel('MODERATE')).toBe('moderate impact');
        expect(impactLabel('LOW')).toBe('low impact');
        expect(impactLabel('MODIFIER')).toBe('modifier');
        expect(impactLabel(null)).toBe('unknown impact');
    });
});

describe('computeHotspotPeaks — degenerate inputs', () => {
    it('returns an empty 1-indexed array when seqLength is 0', () => {
        const { bins, max } = computeHotspotPeaks([], 0);
        expect(bins.length).toBe(1);  // index 0 only
        expect(max).toBe(0);
    });

    it('returns zero bins and max=0 when no variants', () => {
        const { bins, max } = computeHotspotPeaks([], 400);
        expect(bins.length).toBe(401);
        expect(max).toBe(0);
        // Spot-check an interior column
        expect(bins[200]).toBe(0);
    });

    it('ignores variants outside [1, seqLength]', () => {
        const { bins, max } = computeHotspotPeaks(
            [
                { position: 0, impact: 'HIGH' },
                { position: -5, impact: 'HIGH' },
                { position: 500, impact: 'HIGH' },
                { position: 999, impact: 'HIGH' },
            ],
            400,
        );
        expect(max).toBe(0);
        expect(bins[1]).toBe(0);
        expect(bins[400]).toBe(0);
    });

    it('ignores variants with null / missing position', () => {
        const { max } = computeHotspotPeaks(
            [
                { position: null, impact: 'HIGH' },
                { position: undefined, impact: 'HIGH' },
            ],
            400,
        );
        expect(max).toBe(0);
    });
});

describe('computeHotspotPeaks — single-variant falloff shape', () => {
    // A single HIGH variant at the middle of a 100-wide alignment, ±2 window.
    // Weights at distances 0, 1, 2 should be 4·1.0, 4·0.6, 4·0.2 respectively.
    const { bins, max } = computeHotspotPeaks(
        [{ position: 50, impact: 'HIGH' }],
        100,
    );

    it('centres full weight on the variant column', () => {
        expect(bins[50]).toBeCloseTo(4.0, 5);
        expect(max).toBeCloseTo(4.0, 5);
    });

    it('applies the linear falloff at ±1 (60% of centre weight)', () => {
        expect(bins[49]).toBeCloseTo(4 * 0.6, 5);
        expect(bins[51]).toBeCloseTo(4 * 0.6, 5);
    });

    it('applies 20% weight at the window edge (±2)', () => {
        expect(bins[48]).toBeCloseTo(4 * 0.2, 5);
        expect(bins[52]).toBeCloseTo(4 * 0.2, 5);
    });

    it('decays to zero beyond the window', () => {
        expect(bins[47]).toBe(0);
        expect(bins[53]).toBe(0);
    });

    it('clips the falloff at the alignment edge without wrapping', () => {
        const edge = computeHotspotPeaks([{ position: 1, impact: 'HIGH' }], 100);
        expect(edge.bins[1]).toBeCloseTo(4.0, 5);
        expect(edge.bins[2]).toBeCloseTo(4 * 0.6, 5);
        expect(edge.bins[3]).toBeCloseTo(4 * 0.2, 5);
        // No negative-index contribution leaked back around.
        expect(edge.bins[100]).toBe(0);
    });
});

describe('computeHotspotPeaks — TP53 known hotspots (biological validation)', () => {
    // Canonical TP53 cancer hotspots in the DNA-binding domain. All HIGH
    // or MODERATE impact per VEP (missense_variant → MODERATE for most,
    // some stop_gained alleles are HIGH).
    //
    // Positions are 1-based codon positions in canonical human p53
    // (UniProt P04637 isoform 1, 393 aa).
    const TP53_HOTSPOT_VARIANTS = [
        { position: 175, impact: 'MODERATE' },  // R175H
        { position: 245, impact: 'MODERATE' },  // G245S
        { position: 248, impact: 'MODERATE' },  // R248Q
        { position: 249, impact: 'HIGH' },      // R249S (frameshift-adjacent)
        { position: 273, impact: 'MODERATE' },  // R273H
        { position: 282, impact: 'MODERATE' },  // R282W
    ];
    const SEQ_LEN = 393;

    const { bins, max } = computeHotspotPeaks(TP53_HOTSPOT_VARIANTS, SEQ_LEN);

    it('produces a non-zero signal across all six canonical hotspot codons', () => {
        for (const v of TP53_HOTSPOT_VARIANTS) {
            expect(bins[v.position!]).toBeGreaterThan(0);
        }
    });

    it('peaks inside the DNA-binding domain (residues 95-312), not elsewhere', () => {
        // Find the global max column.
        let maxCol = 0;
        for (let c = 1; c <= SEQ_LEN; c++) {
            if (bins[c] === max) { maxCol = c; break; }
        }
        expect(maxCol).toBeGreaterThanOrEqual(95);
        expect(maxCol).toBeLessThanOrEqual(312);
    });

    it('the global max falls on R249 (HIGH + nearby MODERATE)', () => {
        // R248Q (MODERATE, weight 2) + R249S (HIGH, weight 4) are one
        // residue apart; the HIGH centre + 0.6 of the MODERATE at d=1
        // dominates every other position. Expected peak at 249:
        //   from 249 (d=0): 4 · 1.0 = 4.0
        //   from 248 (d=1): 2 · 0.6 = 1.2
        //                   = 5.2
        expect(bins[249]).toBeCloseTo(5.2, 5);
        expect(bins[249]).toBeCloseTo(max, 5);
        // 248 is slightly lower (its own 2.0 + 249's 2.4 = 4.4) but still
        // way above the isolated-hotspot columns.
        expect(bins[248]).toBeCloseTo(4.4, 5);
        expect(bins[248]).toBeGreaterThan(bins[175]);
    });

    it('normalised intensity at R175 and R273 is at least 25% of the peak', () => {
        // Isolated hotspots (no close neighbour) sit alone at ~MODERATE
        // weight (2). Normalised against the R248+R249 double-peak (max 6)
        // that puts them at 2/6 = 0.33 of the peak — well above the 25%
        // threshold needed for the gradient render to make them visible.
        expect(bins[175] / max).toBeGreaterThan(0.25);
        expect(bins[273] / max).toBeGreaterThan(0.25);
    });

    it('leaves the N-terminal transactivation domain (residues 1-42) dark', () => {
        // No hotspots in TAD → no signal should bleed from downstream
        // variants (closest is R175, 133 residues away; well outside ±2).
        for (let c = 1; c <= 42; c++) {
            expect(bins[c]).toBe(0);
        }
    });

    it('a lone MODIFIER variant contributes negligibly next to the hotspots', () => {
        // Add an intronic MODIFIER (weight 0.25) at codon 100. Peak should
        // not shift and the MODIFIER's contribution should be < 10% of
        // the double-peak max.
        const withNoise = computeHotspotPeaks(
            [...TP53_HOTSPOT_VARIANTS, { position: 100, impact: 'MODIFIER' }],
            SEQ_LEN,
        );
        expect(withNoise.max).toBeCloseTo(max, 5);
        expect(withNoise.bins[100] / withNoise.max).toBeLessThan(0.1);
    });
});
