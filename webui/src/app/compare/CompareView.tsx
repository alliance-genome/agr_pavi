'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';

import { fetchAlignmentResults, fetchAlignmentSeqInfo } from '../result/components/AlignmentResultView/serverActions';
import { fetchJobStatusFull } from '../progress/components/JobProgressTracker/serverActions';
import { SeqInfoDict } from '../result/components/InteractiveAlignment/types';

interface CompareViewProps {
    readonly uuidA: string;
    readonly uuidB: string;
}

interface JobBundle {
    uuid: string;
    status: string | null;
    stage: string | null;
    seqInfo: SeqInfoDict | undefined;
    alignment: string | undefined;
    error: string | null;
}

/** Species counts + variant counts, derived once per side. */
function summarise(seqInfo: SeqInfoDict | undefined) {
    if (!seqInfo) return null;
    const seqNames = Object.keys(seqInfo);
    const species = new Set<string>();
    let variants = 0;
    for (const [, info] of Object.entries(seqInfo)) {
        if (info.species) species.add(info.species);
        if (Array.isArray(info.embedded_variants)) variants += info.embedded_variants.length;
    }
    return { seqNames, species: Array.from(species).sort(), variants };
}

/** Set operations used by the Venn-ish lists in the overlap panel. */
function sortedSetOps(a: readonly string[], b: readonly string[]) {
    const setA = new Set(a);
    const setB = new Set(b);
    const shared: string[] = [];
    const onlyA: string[] = [];
    const onlyB: string[] = [];
    for (const n of a) (setB.has(n) ? shared : onlyA).push(n);
    for (const n of b) if (!setA.has(n)) onlyB.push(n);
    return {
        shared: shared.sort(),
        onlyA: onlyA.sort(),
        onlyB: onlyB.sort(),
    };
}

async function loadJob(uuid: string): Promise<JobBundle> {
    try {
        const [status, seqInfo, alignment] = await Promise.all([
            fetchJobStatusFull(uuid),
            fetchAlignmentSeqInfo(uuid),
            fetchAlignmentResults(uuid),
        ]);
        return {
            uuid,
            status: status?.status ?? null,
            stage: status?.stage ?? null,
            seqInfo,
            alignment,
            error: null,
        };
    } catch (e) {
        return {
            uuid,
            status: null,
            stage: null,
            seqInfo: undefined,
            alignment: undefined,
            error: (e as Error).message || String(e),
        };
    }
}

export function CompareView({ uuidA, uuidB }: CompareViewProps) {
    const [sideA, setSideA] = useState<JobBundle | null>(null);
    const [sideB, setSideB] = useState<JobBundle | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setSideA(null);
        setSideB(null);
        // Parallel. Each side has its own loading state so the one that
        // comes back faster can render immediately.
        let doneCount = 0;
        const bump = () => {
            doneCount += 1;
            if (doneCount >= 2 && !cancelled) setLoading(false);
        };
        void loadJob(uuidA).then((j) => {
            if (!cancelled) setSideA(j);
            bump();
        });
        void loadJob(uuidB).then((j) => {
            if (!cancelled) setSideB(j);
            bump();
        });
        return () => { cancelled = true; };
    }, [uuidA, uuidB]);

    const summaryA = useMemo(() => summarise(sideA?.seqInfo), [sideA]);
    const summaryB = useMemo(() => summarise(sideB?.seqInfo), [sideB]);

    const overlap = useMemo(() => {
        if (!summaryA || !summaryB) return null;
        return sortedSetOps(summaryA.seqNames, summaryB.seqNames);
    }, [summaryA, summaryB]);

    const speciesOverlap = useMemo(() => {
        if (!summaryA || !summaryB) return null;
        return sortedSetOps(summaryA.species, summaryB.species);
    }, [summaryA, summaryB]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <SideCard side="A" job={sideA} summary={summaryA} loading={loading && !sideA} />
                <SideCard side="B" job={sideB} summary={summaryB} loading={loading && !sideB} />
            </div>

            {overlap && (
                <Card title="Sequence overlap">
                    <OverlapGrid
                        shared={overlap.shared}
                        onlyA={overlap.onlyA}
                        onlyB={overlap.onlyB}
                        countsLabel="sequence"
                    />
                </Card>
            )}

            {speciesOverlap && (
                <Card title="Species overlap">
                    <OverlapGrid
                        shared={speciesOverlap.shared}
                        onlyA={speciesOverlap.onlyA}
                        onlyB={speciesOverlap.onlyB}
                        countsLabel="species"
                    />
                </Card>
            )}

            {sideA?.alignment && sideB?.alignment && (
                <Card title="Alignments (raw Clustal output)">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <AlignmentBlock label={`A — ${uuidA.slice(0, 8)}`} text={sideA.alignment} />
                        <AlignmentBlock label={`B — ${uuidB.slice(0, 8)}`} text={sideB.alignment} />
                    </div>
                </Card>
            )}
        </div>
    );
}

function SideCard({
    side,
    job,
    summary,
    loading,
}: {
    readonly side: 'A' | 'B';
    readonly job: JobBundle | null;
    readonly summary: ReturnType<typeof summarise>;
    readonly loading: boolean;
}) {
    const header = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.5rem',
                borderRadius: 4,
                background: side === 'A' ? '#dbeafe' : '#fef3c7',
                color: side === 'A' ? '#1e40af' : '#92400e',
                fontWeight: 700,
            }}>
                SIDE {side}
            </span>
            {job && (
                <Link
                    href={`/result?uuid=${job.uuid}`}
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}
                >
                    {job.uuid.slice(0, 8)}…
                </Link>
            )}
            {job?.status && <Tag value={job.status} severity={job.status === 'completed' ? 'success' : 'info'} />}
        </div>
    );

    if (loading) {
        return (
            <Card header={header}>
                <div style={{ color: '#6b7280' }}>
                    <i className="pi pi-spin pi-spinner" style={{ marginRight: '0.5rem' }} />
                    Loading…
                </div>
            </Card>
        );
    }

    if (!job || job.error) {
        return (
            <Card header={header}>
                <div style={{ color: '#dc2626' }}>
                    <i className="pi pi-exclamation-triangle" style={{ marginRight: '0.5rem' }} />
                    {job?.error ?? 'Job not found.'}
                </div>
            </Card>
        );
    }

    if (!summary) {
        return (
            <Card header={header}>
                <div style={{ color: '#6b7280' }}>No seq-info data available for this job.</div>
            </Card>
        );
    }

    return (
        <Card header={header}>
            <dl style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                columnGap: '1rem',
                rowGap: '0.3rem',
                margin: 0,
                fontSize: '0.85rem',
            }}>
                <dt style={{ color: '#6b7280' }}>Stage:</dt>
                <dd style={{ margin: 0 }}>{job.stage ?? '—'}</dd>
                <dt style={{ color: '#6b7280' }}>Sequences:</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{summary.seqNames.length}</dd>
                <dt style={{ color: '#6b7280' }}>Species:</dt>
                <dd style={{ margin: 0 }}>{summary.species.length} ({summary.species.join(', ')})</dd>
                <dt style={{ color: '#6b7280' }}>Variants:</dt>
                <dd style={{ margin: 0 }}>{summary.variants}</dd>
            </dl>
        </Card>
    );
}

function OverlapGrid({
    shared,
    onlyA,
    onlyB,
    countsLabel,
}: {
    readonly shared: string[];
    readonly onlyA: string[];
    readonly onlyB: string[];
    readonly countsLabel: string;
}) {
    const data = Math.max(shared.length, onlyA.length, onlyB.length) === 0
        ? [{ shared: '', onlyA: '', onlyB: '' }]
        : Array.from({ length: Math.max(shared.length, onlyA.length, onlyB.length) }, (_, i) => ({
            shared: shared[i] ?? '',
            onlyA: onlyA[i] ?? '',
            onlyB: onlyB[i] ?? '',
        }));

    return (
        <>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                fontSize: '0.8rem',
            }}>
                <Badge label={`Shared ${countsLabel}`} count={shared.length} tone="success" />
                <Badge label={`Only in A`} count={onlyA.length} tone="info" />
                <Badge label={`Only in B`} count={onlyB.length} tone="warning" />
            </div>
            <DataTable value={data} size="small" scrollable scrollHeight="260px" emptyMessage=" ">
                <Column
                    field="shared"
                    header="Shared"
                    body={(row: { shared: string }) => (
                        <code style={{ fontSize: '0.75rem' }}>{row.shared}</code>
                    )}
                />
                <Column
                    field="onlyA"
                    header="Only in A"
                    body={(row: { onlyA: string }) => (
                        <code style={{ fontSize: '0.75rem', color: '#1e40af' }}>{row.onlyA}</code>
                    )}
                />
                <Column
                    field="onlyB"
                    header="Only in B"
                    body={(row: { onlyB: string }) => (
                        <code style={{ fontSize: '0.75rem', color: '#92400e' }}>{row.onlyB}</code>
                    )}
                />
            </DataTable>
        </>
    );
}

function Badge({ label, count, tone }: { readonly label: string; readonly count: number; readonly tone: 'success' | 'info' | 'warning' }) {
    const bg = tone === 'success' ? '#dcfce7' : tone === 'info' ? '#dbeafe' : '#fef3c7';
    const fg = tone === 'success' ? '#166534' : tone === 'info' ? '#1e40af' : '#92400e';
    return (
        <div style={{
            padding: '0.3rem 0.6rem',
            borderRadius: 6,
            background: bg,
            color: fg,
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 600,
        }}>
            <span>{label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
        </div>
    );
}

function AlignmentBlock({ label, text }: { readonly label: string; readonly text: string }) {
    return (
        <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.3rem' }}>
                {label}
            </div>
            <pre style={{
                margin: 0,
                padding: '0.5rem',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                fontSize: '0.7rem',
                lineHeight: 1.3,
                overflow: 'auto',
                maxHeight: '500px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}>
                {text}
            </pre>
        </div>
    );
}
