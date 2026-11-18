'use client';

import React, { useMemo } from 'react';
import { SeqInfoDict } from './types';
import {
    computeHotspotPeaks,
    impactColor,
    impactLabel,
    type HotspotVariant,
    type VepImpact,
} from './variantImpact';

export interface HotspotPanelProps {
    readonly seqInfoDict: SeqInfoDict;
    readonly alignmentData: Array<{ name: string; sequence: string }>;
}

const LEGEND_ORDER: VepImpact[] = ['HIGH', 'MODERATE', 'LOW', 'MODIFIER'];

export function HotspotPanel({ seqInfoDict, alignmentData }: HotspotPanelProps) {
    const alignmentLength = useMemo(
        () => alignmentData.reduce((acc, r) => Math.max(acc, r.sequence.length), 0),
        [alignmentData],
    );

    const { bins, max, totalVariants, byImpact } = useMemo(() => {
        const variants: HotspotVariant[] = [];
        const counts: Record<string, number> = { HIGH: 0, MODERATE: 0, LOW: 0, MODIFIER: 0, UNKNOWN: 0 };
        for (const row of alignmentData) {
            const info = seqInfoDict[row.name];
            for (const v of info?.embedded_variants ?? []) {
                variants.push({ position: v.alignment_start_pos, impact: v.impact });
                const key = (v.impact ?? 'UNKNOWN').toUpperCase();
                counts[key] = (counts[key] ?? 0) + 1;
            }
        }
        const peaks = computeHotspotPeaks(variants, alignmentLength);
        return { ...peaks, totalVariants: variants.length, byImpact: counts };
    }, [alignmentData, seqInfoDict, alignmentLength]);

    if (alignmentLength === 0) return null;

    const bars = Array.from({ length: alignmentLength }, (_, i) => {
        const col = i + 1;
        const value = bins[col] ?? 0;
        const intensity = max > 0 ? value / max : 0;
        return { col, value, intensity };
    });

    return (
        <div
            style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'var(--agr-background-alt, #f8f9fa)',
                border: '1px solid var(--agr-border-color, #e5e7eb)',
                borderRadius: 6,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                }}
            >
                <strong style={{ fontSize: '0.85rem' }}>Variant Impact & Hotspot Density</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--agr-text-secondary, #6b7280)' }}>
                    {totalVariants === 0
                        ? 'no embedded variants'
                        : `${totalVariants} variants across ${alignmentData.length} sequences`}
                </span>
            </div>

            <div
                role="group"
                aria-label="VEP impact legend"
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    fontSize: '0.7rem',
                    marginBottom: totalVariants > 0 ? '0.5rem' : 0,
                }}
            >
                {LEGEND_ORDER.map((b) => (
                    <span
                        key={b}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        title={`${byImpact[b] ?? 0} ${impactLabel(b)}`}
                    >
                        <span
                            aria-hidden="true"
                            style={{
                                display: 'inline-block',
                                width: 10,
                                height: 10,
                                background: impactColor(b),
                                borderRadius: 2,
                            }}
                        />
                        <span>{impactLabel(b)}</span>
                        <span style={{ color: 'var(--agr-text-secondary, #6b7280)' }}>
                            ({byImpact[b] ?? 0})
                        </span>
                    </span>
                ))}
            </div>

            {totalVariants > 0 && (
                <div
                    role="img"
                    aria-label={`Hotspot density across ${alignmentLength} alignment columns`}
                    style={{
                        position: 'relative',
                        display: 'flex',
                        height: '18px',
                        background: 'var(--agr-gray-200, #e5e7eb)',
                        borderRadius: 2,
                        overflow: 'hidden',
                    }}
                >
                    {bars.map((b) => (
                        <div
                            key={b.col}
                            data-testid={`hotspot-col-${b.col}`}
                            title={b.value > 0 ? `col ${b.col}: ${b.value.toFixed(2)} weighted` : undefined}
                            style={{
                                flex: '1 1 0',
                                minWidth: 0,
                                background:
                                    b.intensity > 0
                                        ? `rgba(220, 38, 38, ${0.15 + 0.85 * b.intensity})`
                                        : 'transparent',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default HotspotPanel;
