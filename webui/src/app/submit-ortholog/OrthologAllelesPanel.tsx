'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { fetchAlleles } from '@/app/submit/components/AlignmentEntry/serverActions';
import type { AlleleInfo } from '@/app/submit/components/AlignmentEntry/types';

/**
 * Variants on each variant object inside AlleleInfo. Mirrors the helpers
 * in AlignmentEntry.tsx — alleles come across the server-action boundary
 * as either Map or plain object depending on serialisation path, so we
 * normalise with the same shape-check.
 */
function getVariantKeys(variants: AlleleInfo['variants']): string[] {
    return variants instanceof Map
        ? Array.from(variants.keys())
        : Object.keys(variants as unknown as Record<string, unknown>);
}

function getVariantCount(variants: AlleleInfo['variants']): number {
    return variants instanceof Map ? variants.size : Object.keys(variants as object).length;
}

export interface OrthologAllelesPanelProps {
    /** Alliance gene curie, e.g. "WB:WBGene00000149". */
    readonly geneId: string;
    /** Human label for the current allele context (gene symbol or similar). */
    readonly geneSymbol?: string;
    /**
     * Called whenever the user's allele selection changes. The payload is
     * a flat list of underlying variant IDs (one allele can bundle
     * multiple variants) — ready to pass straight into the pipeline job
     * payload's `variant_ids` field.
     */
    // eslint-disable-next-line no-unused-vars
    readonly onSelectionChange: (variantIds: string[]) => void;
}

/**
 * Expandable per-ortholog allele picker.
 *
 * Lazy-loads alleles the first time the panel is opened, caches them in
 * local state, and reports the user's selection back as a flat list of
 * variant IDs via onSelectionChange. The parent (OrthologForm) threads
 * that list into the pipeline job payload's variant_ids field.
 *
 * Deliberately simpler than the full AlignmentEntry allele UI:
 * - Alleles only (no transcript picker — ortholog flow picks the default
 *   canonical transcript via pickDefaultTranscript, same as before).
 * - No HGVS-paste shortcut yet. If the ortholog allele catalogue misses
 *   a specific allele, fall back to the regular /submit flow.
 */
export function OrthologAllelesPanel({
    geneId,
    geneSymbol,
    onSelectionChange,
}: OrthologAllelesPanelProps) {
    const [alleles, setAlleles] = useState<AlleleInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedAlleleIds, setSelectedAlleleIds] = useState<string[]>([]);

    const load = useCallback(async () => {
        if (loading || loaded) return;
        setLoading(true);
        setError(null);
        try {
            const list = await fetchAlleles(geneId, []);
            setAlleles(list);
            setLoaded(true);
        } catch (e) {
            console.error(`Failed to load alleles for ${geneId}:`, e);
            setError('Could not load alleles for this gene.');
        } finally {
            setLoading(false);
        }
    }, [geneId, loading, loaded]);

    useEffect(() => {
        // Load on mount — the panel is only mounted when the user expands
        // its parent row, so this doesn't trigger per-gene fetches on page
        // load. Caching lives in fetchAlleles' underlying memoized server
        // action, so collapsing + re-expanding is instant.
        load();
    }, [load]);

    // Translate selected allele IDs → their underlying variant IDs, dedup.
    // The pipeline backend wants variant_ids, not allele_ids.
    const selectedVariantIds = useMemo(() => {
        if (selectedAlleleIds.length === 0) return [];
        const alleleById = new Map(alleles.map((a) => [a.id, a]));
        const out = new Set<string>();
        for (const id of selectedAlleleIds) {
            const a = alleleById.get(id);
            if (!a) continue;
            for (const vid of getVariantKeys(a.variants)) out.add(vid);
        }
        return Array.from(out);
    }, [selectedAlleleIds, alleles]);

    // Report upwards whenever the resolved list changes.
    useEffect(() => {
        onSelectionChange(selectedVariantIds);
    }, [selectedVariantIds, onSelectionChange]);

    // MultiSelect options: show allele symbol + variant-count hint so the
    // user can tell which allele bundles multiple variants (common in
    // worm / fly where one allele name maps to a cluster).
    const options = useMemo(
        () => alleles.map((a) => ({
            label: `${a.displayName || a.id}${getVariantCount(a.variants) > 1 ? ` (${getVariantCount(a.variants)} variants)` : ''}`,
            value: a.id,
            source: a.source,
        })),
        [alleles],
    );

    if (loading) {
        return (
            <div style={{
                padding: '0.5rem 1rem 0.5rem 2.75rem',
                fontSize: '0.8125rem',
                color: 'var(--agr-text-secondary)',
            }}>
                <i className="pi pi-spin pi-spinner" style={{ marginRight: '0.5rem' }} />
                Loading alleles for {geneSymbol ?? geneId}…
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                padding: '0.5rem 1rem 0.5rem 2.75rem',
                fontSize: '0.8125rem',
                color: 'var(--agr-danger)',
            }}>
                <i className="pi pi-exclamation-triangle" style={{ marginRight: '0.5rem' }} />
                {error}{' '}
                <Button
                    label="Retry"
                    text
                    size="small"
                    onClick={() => { setLoaded(false); load(); }}
                />
            </div>
        );
    }

    if (loaded && alleles.length === 0) {
        return (
            <div style={{
                padding: '0.5rem 1rem 0.5rem 2.75rem',
                fontSize: '0.8125rem',
                color: 'var(--agr-text-muted)',
                fontStyle: 'italic',
            }}>
                No curated alleles available for {geneSymbol ?? geneId}.
            </div>
        );
    }

    return (
        <div style={{
            padding: '0.5rem 1rem 0.75rem 2.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            background: 'var(--agr-background-alt)',
            borderBottom: '1px solid var(--agr-border-color)',
        }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--agr-text-secondary)' }}>
                Variants for {geneSymbol ?? geneId}:
            </label>
            <MultiSelect
                value={selectedAlleleIds}
                options={options}
                onChange={(e) => setSelectedAlleleIds(e.value as string[])}
                optionLabel="label"
                optionValue="value"
                filter
                placeholder={`Select from ${alleles.length} alleles`}
                maxSelectedLabels={3}
                style={{ minWidth: '20rem', maxWidth: '32rem', flex: '1 1 20rem' }}
                className="p-inputtext-sm"
            />
            {selectedVariantIds.length > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--agr-text-muted)' }}>
                    {selectedVariantIds.length} variant{selectedVariantIds.length === 1 ? '' : 's'} will be embedded
                </span>
            )}
        </div>
    );
}

export default OrthologAllelesPanel;
