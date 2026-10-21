// Shared helpers for variant impact colour-coding + hotspot scoring.
// Lives alongside the alignment viewer so the pin colors, the hotspot
// track and the variant cards all read from the same scale.

export type VepImpact = 'HIGH' | 'MODERATE' | 'LOW' | 'MODIFIER';

/**
 * Traffic-light palette for VEP impact. Chosen to work on both themes
 * at the alignment grid tile size (~24-28px bars + 12-18px pins), with
 * enough luminance distance that red / orange / amber stay distinct on
 * a dark page.
 *
 * MODIFIER = non-coding or regulatory region — we colour it slate rather
 * than green so it reads as "informational, not reassuring".
 */
const IMPACT_COLORS: Record<VepImpact | 'UNKNOWN', string> = {
    HIGH: '#dc2626',
    MODERATE: '#ea580c',
    LOW: '#ca8a04',
    MODIFIER: '#64748b',
    UNKNOWN: '#6b7280',
};

export function impactColor(impact?: string | null): string {
    if (!impact) return IMPACT_COLORS.UNKNOWN;
    const u = impact.toUpperCase() as VepImpact;
    return IMPACT_COLORS[u] ?? IMPACT_COLORS.UNKNOWN;
}

/**
 * Numeric weight for hotspot aggregation. Higher = more concerning so
 * the sum across sequences lands high on positions where multiple
 * variants cluster AND at least some are predicted damaging.
 *
 * Scales roughly to "equivalent HIGH-impact variants": a single
 * MODIFIER contributes 0.25 of a HIGH, a LOW contributes 0.5, etc.
 */
export function impactWeight(impact?: string | null): number {
    if (!impact) return 1;  // treat unknown as a middling signal
    const u = impact.toUpperCase();
    if (u === 'HIGH') return 4;
    if (u === 'MODERATE') return 2;
    if (u === 'LOW') return 1;
    if (u === 'MODIFIER') return 0.25;
    return 1;
}

/**
 * Short human label for the impact pill in cards and tooltips.
 */
export function impactLabel(impact?: string | null): string {
    if (!impact) return 'unknown impact';
    const u = impact.toUpperCase();
    if (u === 'HIGH') return 'high impact';
    if (u === 'MODERATE') return 'moderate impact';
    if (u === 'LOW') return 'low impact';
    if (u === 'MODIFIER') return 'modifier';
    return impact.toLowerCase();
}

export interface HotspotVariant {
    /** 1-based alignment position (ignored when null / <1). */
    position: number | null | undefined;
    /** VEP impact bucket; drives per-variant weight via impactWeight(). */
    impact?: string | null;
}

export interface HotspotPeaks {
    /** 1-indexed Float32Array: `bins[c]` = cumulative impact-weight at column c. */
    bins: Float32Array;
    /** The maximum value in bins; use to normalise rendering intensity. */
    max: number;
}

/**
 * Impact-weighted density per alignment column with a linear falloff
 * over a ±W half-window.
 *
 * Centred weight at each variant's column = `impactWeight(impact)`.
 * At offset `|d|` from the centre, the contribution is scaled by
 * `1 − 0.8·(|d|/W)` (full at d=0, 20% at d=±W, zero outside).
 *
 * See docs/variant-impact-methodology.md §5 for parameter justification.
 *
 * Pure function so the behaviour can be unit-tested against known
 * hotspot positions (e.g. TP53 R175H / R248Q / R273H).
 */
export function computeHotspotPeaks(
    variants: HotspotVariant[],
    seqLength: number,
    halfWindow: number = 2,
): HotspotPeaks {
    const bins = new Float32Array(seqLength + 1);  // 1-indexed
    if (seqLength === 0 || variants.length === 0) {
        return { bins, max: 0 };
    }
    for (const v of variants) {
        const pos = v.position ?? 0;
        if (pos < 1 || pos > seqLength) continue;
        const w = impactWeight(v.impact);
        for (let d = -halfWindow; d <= halfWindow; d++) {
            const col = pos + d;
            if (col < 1 || col > seqLength) continue;
            const fall = halfWindow === 0 ? 1 : 1 - 0.8 * (Math.abs(d) / halfWindow);
            bins[col] += w * fall;
        }
    }
    let max = 0;
    for (let i = 0; i < bins.length; i++) if (bins[i] > max) max = bins[i];
    return { bins, max };
}
