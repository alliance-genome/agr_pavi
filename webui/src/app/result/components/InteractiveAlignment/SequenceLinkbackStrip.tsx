'use client';

import React, { useMemo } from 'react';
import { SeqInfoDict } from './types';
import { allianceGeneUrl } from '@/utils/allianceLinks';

export interface SequenceLinkbackStripProps {
    readonly seqInfoDict: SeqInfoDict;
    readonly alignmentData: Array<{ name: string; sequence: string }>;
}

interface StripRow {
    fullName: string;
    symbol: string;
    transcript?: string;
    species?: string;
    geneId?: string;
}

/**
 * Compact one-line-per-sequence strip rendered above the alignment
 * viewer, giving curators a quick hop from each row's gene symbol
 * back to its Alliance gene page. Works under every display mode
 * (Nightingale Virtualized, Legacy, Canvas) because it reads from
 * the already-parsed Clustal output + seqInfoDict and renders DOM
 * anchors — independent of what the viewer below is doing.
 *
 * Gene ID resolution:
 *   1. Explicit `embedded_variants[].gene_id` from seq-info
 *   2. Sibling-symbol propagation inside the alignment (ref + alt
 *      alleles of the same gene share a gene_id)
 * Sequences with no resolvable curie render as plain text.
 */
export function SequenceLinkbackStrip({ seqInfoDict, alignmentData }: SequenceLinkbackStripProps) {
    const rows = useMemo<StripRow[]>(() => {
        // Pass 1: collect explicit gene_ids from seq-info.
        const byFullName = new Map<string, string>();
        const bySymbol = new Map<string, string>();
        for (const { name } of alignmentData) {
            const info = seqInfoDict[name];
            const gid = info?.embedded_variants?.find(v => v.gene_id)?.gene_id;
            if (gid) {
                byFullName.set(name, gid);
                const sym = name.split('_')[0];
                if (sym && !bySymbol.has(sym)) bySymbol.set(sym, gid);
            }
        }
        // Pass 2: build rows with sibling-propagation fallback.
        return alignmentData.map(({ name }) => {
            const parts = name.split('_');
            const symbol = parts[0] ?? name;
            // Transcript ID is the longest underscore chunk that looks like
            // an accession (contains a digit). Falls through to the second
            // chunk when nothing matches.
            const transcript = parts.slice(1).find(p => /\d/.test(p)) ?? parts[1];
            const species = seqInfoDict[name]?.species;
            const geneId = byFullName.get(name) ?? bySymbol.get(symbol);
            return { fullName: name, symbol, transcript, species, geneId };
        });
    }, [alignmentData, seqInfoDict]);

    if (rows.length === 0) return null;

    return (
        <div
            role="group"
            aria-label="Sequences in this alignment"
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem 1rem',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem',
                background: 'var(--agr-background-alt, #f8f9fa)',
                border: '1px solid var(--agr-border-color, #e5e7eb)',
                borderRadius: 6,
                fontSize: '0.8rem',
            }}
        >
            <span
                style={{
                    fontWeight: 600,
                    color: 'var(--agr-text-secondary, #6b7280)',
                    paddingRight: '0.25rem',
                    flexShrink: 0,
                }}
            >
                Sequences:
            </span>
            {rows.map((r) => {
                const href = allianceGeneUrl(r.geneId);
                return (
                    <span
                        key={r.fullName}
                        style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.35rem' }}
                        title={r.fullName}
                    >
                        <span style={{ fontWeight: 600 }}>
                            {href ? (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--agr-primary, #2563eb)',
                                        textDecoration: 'none',
                                        borderBottom: '1px dotted currentColor',
                                    }}
                                >
                                    {r.symbol}
                                </a>
                            ) : (
                                r.symbol
                            )}
                        </span>
                        {r.transcript && (
                            <span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--agr-text-secondary, #6b7280)', fontSize: '0.75rem' }}>
                                {r.transcript}
                            </span>
                        )}
                        {r.species && (
                            <span style={{ fontStyle: 'italic', color: 'var(--agr-text-secondary, #6b7280)', fontSize: '0.75rem' }}>
                                {r.species}
                            </span>
                        )}
                    </span>
                );
            })}
        </div>
    );
}

export default SequenceLinkbackStrip;
