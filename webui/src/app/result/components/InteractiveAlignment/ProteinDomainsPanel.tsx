'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { SeqInfoDict } from './types';
import { fetchProteinDomains, resolveUniProtForGene, resolveGeneBySymbol, ProteinDomain } from './domains';

export interface ProteinDomainsPanelProps {
    readonly seqInfoDict: SeqInfoDict;
    /** Alignment sequences, parsed from the Clustal output. Supplies the
     *  gapped sequence for mapping protein-domain residue indices to
     *  alignment columns (gaps shift the residue coordinates). */
    readonly alignmentData: Array<{ name: string; sequence: string }>;
}

interface SeqDomains {
    seqName: string;
    ungappedLength: number;
    uniprot: string | null;
    domains: ProteinDomain[];
    status: 'loading' | 'no-gene-id' | 'no-uniprot' | 'ok' | 'empty' | 'error';
    error?: string;
}

/**
 * Convert an ungapped residue position (1-based) to the matching
 * alignment column (1-based) by walking the gapped sequence. Needed
 * because InterPro reports positions in the ungapped protein sequence
 * but we want to render domain bars over the aligned view.
 */
function ungappedToAlignmentCol(gapped: string, residueIdx: number): number | null {
    let residueCount = 0;
    for (let col = 0; col < gapped.length; col++) {
        const ch = gapped[col];
        if (ch !== '-' && ch !== '.') {
            residueCount += 1;
            if (residueCount === residueIdx) return col + 1;
        }
    }
    return null;
}

// Palette for domain-type color coding. Picked for colorblind
// distinguishability and consistent light/dark backgrounds.
const TYPE_COLORS: Record<string, string> = {
    domain: '#2563eb',
    family: '#9333ea',
    repeat: '#ea580c',
    conserved_site: '#059669',
    active_site: '#dc2626',
    binding_site: '#ca8a04',
    unknown: '#6b7280',
};

function domainColor(type: string): string {
    return TYPE_COLORS[type?.toLowerCase()] ?? TYPE_COLORS.unknown;
}

export function ProteinDomainsPanel({ seqInfoDict, alignmentData }: ProteinDomainsPanelProps) {
    const [perSeq, setPerSeq] = useState<SeqDomains[]>([]);

    // Resolve a gene_id per aligned sequence. The pipeline only writes
    // `gene_id` into seq-info for sequences with variants, so most rows in
    // a comparative alignment come back missing it. Two frontend fallbacks:
    //
    //   1. Within-alignment propagation: group sequences by the first
    //      underscore-separated token of the name (the gene symbol in the
    //      PAVI naming convention) and share any gene_id found in the
    //      group. Covers "ref + alt alleles of the same gene".
    //
    //   2. Symbol search (deferred to the useEffect below): for sequences
    //      still lacking a gene_id, parse the symbol from the name and
    //      search Alliance. Done async so it doesn't block the panel.
    const seqsToLoad = useMemo(() => {
        const extractSymbol = (name: string): string => (name.split('_')[0] || name).trim();

        // First pass: collect any gene_id explicitly in seq-info.
        const explicit = alignmentData.map(({ name, sequence }) => {
            const info = seqInfoDict[name];
            const variants = info?.embedded_variants ?? [];
            const geneId = variants.find(v => v.gene_id)?.gene_id;
            const ungappedLength = sequence.replace(/[-.]/g, '').length;
            return { name, symbol: extractSymbol(name), geneId: geneId as string | undefined, ungappedLength };
        });

        // Second pass: propagate gene_id across siblings with the same
        // leading symbol. If any alt-allele row resolved, the ref sibling
        // picks up the same gene_id for free.
        const bySymbol = new Map<string, string>();
        for (const s of explicit) if (s.geneId && s.symbol) bySymbol.set(s.symbol, s.geneId);

        return explicit.map(s => ({
            ...s,
            geneId: s.geneId ?? bySymbol.get(s.symbol),
        }));
    }, [alignmentData, seqInfoDict]);

    useEffect(() => {
        let cancelled = false;
        // Prime all slots as loading. Even sequences without an explicit
        // gene_id get the loading state because we'll try the symbol-based
        // fallback — only promote to 'no-gene-id' once that falls through.
        setPerSeq(seqsToLoad.map(s => ({
            seqName: s.name,
            ungappedLength: s.ungappedLength,
            uniprot: null,
            domains: [],
            status: 'loading',
        })));

        // Fire resolver + fetch per sequence in parallel. The cache in
        // allianceCache coalesces duplicate gene lookups across sequences.
        //
        // Fallback path: if we don't have a gene_id at all, try Alliance's
        // search endpoint using the symbol parsed from the sequence name.
        // Resolving-by-symbol is lossy (same symbol can map to different
        // species' orthologs) but is almost always better than showing
        // nothing — ortholog domain layouts are usually similar enough
        // to be informative for comparative alignments.
        void (async () => {
            await Promise.all(seqsToLoad.map(async (s) => {
                try {
                    let geneId = s.geneId;
                    if (!geneId) {
                        geneId = await resolveGeneBySymbol(s.symbol);
                        if (!geneId) {
                            if (cancelled) return;
                            setPerSeq(prev => prev.map(r => r.seqName === s.name ? { ...r, status: 'no-gene-id' } : r));
                            return;
                        }
                    }
                    const uniprot = await resolveUniProtForGene(geneId);
                    if (!uniprot) {
                        if (cancelled) return;
                        setPerSeq(prev => prev.map(r => r.seqName === s.name ? { ...r, status: 'no-uniprot' } : r));
                        return;
                    }
                    const domains = await fetchProteinDomains(uniprot);
                    if (cancelled) return;
                    setPerSeq(prev => prev.map(r => r.seqName === s.name ? {
                        ...r,
                        uniprot,
                        domains,
                        status: domains.length === 0 ? 'empty' : 'ok',
                    } : r));
                } catch (e) {
                    if (cancelled) return;
                    setPerSeq(prev => prev.map(r => r.seqName === s.name ? {
                        ...r,
                        status: 'error',
                        error: (e as Error).message,
                    } : r));
                }
            }));
        })();

        return () => { cancelled = true; };
    }, [seqsToLoad]);

    // Build the per-sequence row (bar + legend) now that we have domains
    // + the gapped sequence to resolve alignment columns.
    const rows = useMemo(() => {
        return perSeq.map((r) => {
            const alnSeq = alignmentData.find(a => a.name === r.seqName)?.sequence ?? '';
            const alnLen = alnSeq.length || 1;
            const bars = r.domains.map((d) => {
                const startCol = ungappedToAlignmentCol(alnSeq, d.start);
                const endCol = ungappedToAlignmentCol(alnSeq, d.end);
                if (startCol == null || endCol == null) return null;
                const leftPct = ((startCol - 1) / alnLen) * 100;
                const widthPct = Math.max(0.5, ((endCol - startCol + 1) / alnLen) * 100);
                return {
                    key: `${d.accession}:${d.start}-${d.end}`,
                    leftPct,
                    widthPct,
                    color: domainColor(d.type),
                    label: `${d.name} (${d.accession} · ${d.sourceDatabase})`,
                };
            }).filter((x): x is NonNullable<typeof x> => x !== null);
            return { ...r, bars };
        });
    }, [perSeq, alignmentData]);

    if (rows.length === 0) return null;

    return (
        <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: 'var(--agr-background-alt, #f8f9fa)',
            border: '1px solid var(--agr-border-color, #e5e7eb)',
            borderRadius: 6,
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '0.5rem',
            }}>
                <strong style={{ fontSize: '0.85rem' }}>Protein Domains (InterPro)</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--agr-text-secondary, #6b7280)' }}>
                    EBI InterPro · mapped by UniProt accession
                </span>
            </div>

            {rows.map((row) => (
                <div
                    key={row.seqName}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(200px, 24ch) 1fr',
                        gap: '0.75rem',
                        alignItems: 'center',
                        padding: '0.3rem 0',
                        borderTop: '1px dashed var(--agr-border-color, #e5e7eb)',
                    }}
                >
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>
                        <div style={{ color: 'var(--agr-primary, #2563eb)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.seqName}>
                            {row.seqName}
                        </div>
                        <div style={{ color: 'var(--agr-text-secondary, #6b7280)', fontSize: '0.68rem' }}>
                            {row.status === 'ok' && row.uniprot && (
                                <>UniProt&nbsp;{row.uniprot} &middot; {row.domains.length}&nbsp;domain{row.domains.length === 1 ? '' : 's'}</>
                            )}
                            {row.status === 'empty' && row.uniprot && (
                                <>UniProt&nbsp;{row.uniprot} &middot; no domains</>
                            )}
                            {row.status === 'no-uniprot' && 'no UniProt mapping'}
                            {row.status === 'no-gene-id' && 'no gene id in seq-info'}
                            {row.status === 'loading' && (
                                <><i className="pi pi-spin pi-spinner" style={{ fontSize: '0.6rem', marginRight: 4 }} />loading…</>
                            )}
                            {row.status === 'error' && (
                                <span style={{ color: 'var(--agr-danger, #dc2626)' }}>{row.error ?? 'error'}</span>
                            )}
                        </div>
                    </div>
                    <div
                        role="group"
                        aria-label={`Domain tracks for ${row.seqName}`}
                        style={{
                            position: 'relative',
                            height: '14px',
                            background: 'var(--agr-gray-200, #e5e7eb)',
                            borderRadius: 2,
                        }}
                    >
                        {row.bars.map((b) => (
                            <div
                                key={b.key}
                                title={b.label}
                                style={{
                                    position: 'absolute',
                                    left: `${b.leftPct}%`,
                                    width: `${b.widthPct}%`,
                                    top: 0,
                                    bottom: 0,
                                    background: b.color,
                                    borderRadius: 2,
                                    cursor: 'help',
                                    opacity: 0.85,
                                }}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
