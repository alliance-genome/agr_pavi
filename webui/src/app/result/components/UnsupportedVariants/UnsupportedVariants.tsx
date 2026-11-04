'use client'

import type { SeqInfoDict } from '../InteractiveAlignment/types'

interface UnsupportedEntry {
    seqName: string
    variantId: string
    reason: string
}

function collectUnsupported(seqInfoDict: SeqInfoDict): UnsupportedEntry[] {
    const out: UnsupportedEntry[] = []
    for (const [seqName, info] of Object.entries(seqInfoDict)) {
        if (!info?.unsupported_variants) continue
        for (const v of info.unsupported_variants) {
            out.push({ seqName, variantId: v.variant_id, reason: v.reason })
        }
    }
    return out
}

interface UnsupportedVariantsProps {
    seqInfoDict: SeqInfoDict
}

/**
 * Shows a warning card listing variants the pipeline refused to translate
 * (stop_lost, splice_acceptor_variant, splice_donor_variant,
 * splice_region_variant, transcript_ablation) with the reason for each. The
 * rest of the alignment is unaffected — the supported variants on the same
 * sequence are still embedded as usual.
 *
 * Renders nothing when every sequence has either no unsupported variants or
 * no SeqInfo at all, so the card stays out of the user's way for the
 * common SNV-only case.
 */
export default function UnsupportedVariants({ seqInfoDict }: UnsupportedVariantsProps) {
    const entries = collectUnsupported(seqInfoDict)
    if (entries.length === 0) return null

    return (
        <div
            className="agr-card agr-card-warning"
            role="region"
            aria-label="Variants skipped by the pipeline"
        >
            <div className="agr-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>
                    <i className="pi pi-exclamation-triangle" style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                    {entries.length} variant{entries.length === 1 ? '' : 's'} skipped
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--agr-text-muted)' }}>
                    These variants were not applied to the alignment because the pipeline
                    cannot translate their consequence class yet. The supported variants on
                    the same sequences are unaffected.
                </p>
            </div>
            <div className="agr-card-body">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {entries.map((e, i) => (
                        <li
                            key={`${e.seqName}:${e.variantId}:${i}`}
                            style={{ display: 'grid', gridTemplateColumns: 'minmax(10rem, auto) 1fr', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--agr-border-subtle)' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <code style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{e.variantId}</code>
                                <small style={{ color: 'var(--agr-text-muted)', fontStyle: 'italic' }}>{e.seqName}</small>
                            </div>
                            <div style={{ fontSize: '0.9rem' }}>{e.reason}</div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
