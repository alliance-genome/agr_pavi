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
