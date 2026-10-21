'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { withBasePath } from '@/utils/basePath';

interface StatsLatency {
    count: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
}

interface StatsResponse {
    window_days: number;
    totals: { today: number; week: number; all_time: number };
    requests_per_day: Array<{ date: string; count: number }>;
    top_endpoints: Array<{ path_template: string; count: number }>;
    popular_jobs: Array<{ job_uuid: string; count: number }>;
    export_formats: Array<{ export_format: string; count: number }>;
    overall_latency: StatsLatency;
    slow_endpoints: Array<{ path_template: string; latency: StatsLatency }>;
}

interface DiskUsageJob {
    job_uuid: string;
    bytes: number;
    modified_at: string;
    known: boolean;
}

interface DiskUsageResponse {
    results_path: string;
    total_bytes: number;
    job_count: number;
    orphan_count: number;
    jobs: DiskUsageJob[];
}

function fmtBytes(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtMs(ms: number): string {
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 10) return `${ms.toFixed(1)}ms`;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

// Compact latency readout: label + value, colored by severity so a 2s
// p99 catches the eye without the viewer having to parse the number.
function LatencyPill({ label, value }: { readonly label: string; readonly value: number }) {
    // Semantic status tokens pick dark-mode-friendly variants per theme.
    const color =
        value < 50 ? 'var(--agr-success-dark)' :
        value < 500 ? 'var(--agr-warning-dark)' :
        'var(--agr-danger-dark)';
    const bg =
        value < 50 ? 'var(--agr-success-light)' :
        value < 500 ? 'var(--agr-warning-light)' :
        'var(--agr-danger-light)';
    return (
        <div style={{
            padding: '0.4rem 0.7rem',
            borderRadius: 6,
            background: bg,
            border: '1px solid var(--agr-border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 70,
        }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--agr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                {fmtMs(value)}
            </span>
        </div>
    );
}

const WINDOW_OPTIONS = [
    { label: 'Last 7 days', value: 7 },
    { label: 'Last 14 days', value: 14 },
    { label: 'Last 30 days', value: 30 },
    { label: 'Last 90 days', value: 90 },
];

// Compact inline SVG line chart. Avoids pulling in a charting library
// for a one-widget page — the API already returns zero-filled points so
// we only need to project them to pixel coordinates.
function Sparkline({ data }: { readonly data: Array<{ date: string; count: number }> }) {
    const { path, maxY, minDate, maxDate } = useMemo(() => {
        if (data.length === 0) return { path: '', maxY: 0, minDate: '', maxDate: '' };
        const w = 600;
        const h = 160;
        const padX = 24;
        const padY = 12;
        const maxYv = Math.max(1, ...data.map((d) => d.count));
        const dx = (w - padX * 2) / Math.max(1, data.length - 1);
        const pts = data.map((d, i) => {
            const x = padX + i * dx;
            const y = h - padY - (d.count / maxYv) * (h - padY * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });
        const pathD = `M ${pts[0]} L ${pts.slice(1).join(' L ')}`;
        return { path: pathD, maxY: maxYv, minDate: data[0].date, maxDate: data[data.length - 1].date };
    }, [data]);

    if (data.length === 0) return <div style={{ color: 'var(--agr-text-muted)' }}>No data.</div>;

    return (
        <div>
            <svg viewBox="0 0 600 180" width="100%" style={{ display: 'block' }} role="img" aria-label="Requests per day">
                {/* y-axis grid lines at 0, 50%, 100% of maxY */}
                {[0, 0.5, 1].map((frac) => {
                    const y = 168 - 12 - frac * (160 - 24);
                    return (
                        <g key={frac}>
                            <line x1={24} x2={576} y1={y} y2={y} stroke="var(--agr-border-color)" strokeDasharray="2 2" />
                            <text x={2} y={y + 4} fontSize={10} fill="var(--agr-text-muted)">
                                {Math.round(maxY * frac)}
                            </text>
                        </g>
                    );
                })}
                <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round" />
                {/* dots */}
                {data.map((d, i) => {
                    const w = 600;
                    const dx = (w - 24 * 2) / Math.max(1, data.length - 1);
                    const x = 24 + i * dx;
                    const y = 168 - 12 - (d.count / Math.max(1, maxY)) * (160 - 24);
                    return <circle key={d.date} cx={x} cy={y} r={2.5} fill="#2563eb">
                        <title>{d.date}: {d.count}</title>
                    </circle>;
                })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--agr-text-muted)', marginTop: 4 }}>
                <span>{minDate}</span>
                <span>{maxDate}</span>
            </div>
        </div>
    );
}

// Horizontal bar list, one row per entry, bar width proportional to the
// row's count out of the max count in the list. Cheaper than a real
// chart library when every list is at most top_n items.
function BarList({ items, label }: { readonly items: Array<{ key: string; count: number }>; readonly label: string }) {
    if (items.length === 0) return <div style={{ color: 'var(--agr-text-muted)' }}>No {label.toLowerCase()} yet.</div>;
    const max = Math.max(...items.map((i) => i.count));
    return (
        <div>
            {items.map((it) => {
                const pct = Math.round((it.count / max) * 100);
                return (
                    <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.3rem 0' }}>
                        <span style={{
                            flex: '0 0 60%',
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: '0.8rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }} title={it.key}>
                            {it.key}
                        </span>
                        <div style={{ flex: 1, background: 'var(--agr-background-alt)', borderRadius: 3, height: 14, position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                                borderRadius: 3,
                            }} />
                        </div>
                        <span style={{ flex: '0 0 3rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem' }}>
                            {it.count}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export function UsageStats() {
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [disk, setDisk] = useState<DiskUsageResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [windowDays, setWindowDays] = useState<number>(30);
    const [selectedForDelete, setSelectedForDelete] = useState<DiskUsageJob[]>([]);
    const [deleting, setDeleting] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Parallel both fetches — the disk endpoint walks the FS and
            // isn't instant on heavy result trees, but it doesn't block
            // the main stats from rendering.
            const [statsRes, diskRes] = await Promise.all([
                fetch(withBasePath(`/api/stats?days=${windowDays}`)),
                fetch(withBasePath(`/api/stats/disk`)),
            ]);
            if (!statsRes.ok) {
                const detail = await statsRes.json().catch(() => ({ detail: `HTTP ${statsRes.status}` }));
                throw new Error(detail.detail || `HTTP ${statsRes.status}`);
            }
            setStats(await statsRes.json() as StatsResponse);
            if (diskRes.ok) {
                setDisk(await diskRes.json() as DiskUsageResponse);
            } else {
                setDisk(null);
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [windowDays]);

    const deleteSelected = useCallback(async () => {
        if (selectedForDelete.length === 0) return;
        if (!confirm(`Delete ${selectedForDelete.length} job directory/directories and their jobs.db rows? This cannot be undone.`)) {
            return;
        }
        setDeleting(true);
        setDeleteMessage(null);
        try {
            const res = await fetch(withBasePath(`/api/stats/disk/delete`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_uuids: selectedForDelete.map(j => j.job_uuid) }),
            });
            if (!res.ok) {
                const detail = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
                throw new Error(detail.detail || `HTTP ${res.status}`);
            }
            const data = await res.json() as { deleted: number; bytes_freed: number; skipped: string[] };
            setDeleteMessage(
                `Deleted ${data.deleted} job${data.deleted === 1 ? '' : 's'}, freed ${fmtBytes(data.bytes_freed)}` +
                (data.skipped.length > 0 ? ` (${data.skipped.length} skipped)` : '.')
            );
            setSelectedForDelete([]);
            await load();
        } catch (e) {
            setDeleteMessage(`Delete failed: ${(e as Error).message}`);
        } finally {
            setDeleting(false);
        }
    }, [selectedForDelete, load]);

    useEffect(() => {
        load();
    }, [load]);

    const statCard = (label: string, value: number) => (
        <div style={{
            flex: '1 1 180px',
            padding: '0.9rem 1rem',
            background: 'var(--agr-background-alt)',
            border: '1px solid var(--agr-border-color)',
            borderRadius: 8,
        }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--agr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--agr-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {value.toLocaleString()}
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Dropdown
                    value={windowDays}
                    options={WINDOW_OPTIONS}
                    onChange={(e) => setWindowDays(e.value)}
                    disabled={loading}
                    style={{ minWidth: '160px' }}
                    className="p-inputtext-sm"
                />
                <Button
                    label="Refresh"
                    icon="pi pi-refresh"
                    size="small"
                    outlined
                    loading={loading}
                    onClick={load}
                />
                {error && (
                    <span style={{ color: 'var(--agr-danger)', marginLeft: '0.5rem' }}>
                        <i className="pi pi-exclamation-triangle" style={{ marginRight: '0.25rem' }} />
                        {error}
                    </span>
                )}
            </div>

            {stats && (
                <>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {statCard('Today', stats.totals.today)}
                        {statCard('Last 7 days', stats.totals.week)}
                        {statCard('All time', stats.totals.all_time)}
                    </div>

                    <Card title={`Request volume — last ${stats.window_days} days`}>
                        <Sparkline data={stats.requests_per_day} />
                    </Card>

                    <Card title="Latency">
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <LatencyPill label="p50" value={stats.overall_latency.p50} />
                            <LatencyPill label="p95" value={stats.overall_latency.p95} />
                            <LatencyPill label="p99" value={stats.overall_latency.p99} />
                            <LatencyPill label="max" value={stats.overall_latency.max} />
                            <span style={{ alignSelf: 'center', color: 'var(--agr-text-muted)', fontSize: '0.8rem' }}>
                                across {stats.overall_latency.count.toLocaleString()} requests
                            </span>
                        </div>

                        {stats.slow_endpoints.length === 0 ? (
                            <div style={{ color: 'var(--agr-text-muted)' }}>Need at least 5 samples per endpoint to rank.</div>
                        ) : (
                            <DataTable
                                value={stats.slow_endpoints}
                                size="small"
                                emptyMessage="No endpoint data yet."
                            >
                                <Column
                                    field="path_template"
                                    header="Endpoint (slowest p95 first)"
                                    body={(row: { path_template: string }) => (
                                        <code style={{ fontSize: '0.75rem' }}>{row.path_template}</code>
                                    )}
                                />
                                <Column
                                    header="n"
                                    body={(row: { latency: StatsLatency }) => row.latency.count}
                                    style={{ width: '4rem', textAlign: 'right' }}
                                />
                                <Column
                                    header="p50"
                                    body={(row: { latency: StatsLatency }) => fmtMs(row.latency.p50)}
                                    style={{ width: '5rem', textAlign: 'right' }}
                                />
                                <Column
                                    header="p95"
                                    body={(row: { latency: StatsLatency }) => (
                                        <strong>{fmtMs(row.latency.p95)}</strong>
                                    )}
                                    style={{ width: '5rem', textAlign: 'right' }}
                                />
                                <Column
                                    header="p99"
                                    body={(row: { latency: StatsLatency }) => fmtMs(row.latency.p99)}
                                    style={{ width: '5rem', textAlign: 'right' }}
                                />
                                <Column
                                    header="max"
                                    body={(row: { latency: StatsLatency }) => fmtMs(row.latency.max)}
                                    style={{ width: '5rem', textAlign: 'right' }}
                                />
                            </DataTable>
                        )}
                    </Card>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                            <Card title="Top endpoints">
                                <BarList
                                    label="endpoints"
                                    items={stats.top_endpoints.map((e) => ({ key: e.path_template, count: e.count }))}
                                />
                            </Card>
                        </div>
                        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                            <Card title="Export formats">
                                <BarList
                                    label="exports"
                                    items={stats.export_formats.map((e) => ({ key: e.export_format, count: e.count }))}
                                />
                            </Card>
                        </div>
                    </div>

                    {disk && (
                        <Card
                            title={
                                `Disk usage — ${fmtBytes(disk.total_bytes)} across ${disk.job_count} job${disk.job_count === 1 ? '' : 's'}` +
                                (disk.orphan_count > 0 ? ` (${disk.orphan_count} orphan${disk.orphan_count === 1 ? '' : 's'})` : '')
                            }
                        >
                            <div style={{ fontSize: '0.8rem', color: 'var(--agr-text-muted)', marginBottom: '0.5rem' }}>
                                <code>{disk.results_path}</code>
                            </div>
                            {deleteMessage && (
                                <div
                                    role="status"
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        marginBottom: '0.75rem',
                                        borderRadius: 6,
                                        background: deleteMessage.startsWith('Delete failed') ? 'var(--agr-danger-light)' : 'var(--agr-success-light)',
                                        color: deleteMessage.startsWith('Delete failed') ? 'var(--agr-danger-dark)' : 'var(--agr-success-dark)',
                                        border: `1px solid ${deleteMessage.startsWith('Delete failed') ? 'var(--agr-danger)' : 'var(--agr-success)'}`,
                                    }}
                                >
                                    {deleteMessage}
                                </div>
                            )}
                            {selectedForDelete.length > 0 && (
                                <Button
                                    label={`Delete ${selectedForDelete.length} selected`}
                                    icon="pi pi-trash"
                                    size="small"
                                    severity="danger"
                                    loading={deleting}
                                    onClick={deleteSelected}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                            )}
                            <DataTable
                                value={disk.jobs}
                                size="small"
                                dataKey="job_uuid"
                                selectionMode="multiple"
                                selection={selectedForDelete}
                                onSelectionChange={(e) => setSelectedForDelete(e.value as DiskUsageJob[])}
                                emptyMessage="No per-job directories on disk."
                                paginator={disk.jobs.length > 20}
                                rows={20}
                                sortField="bytes"
                                sortOrder={-1}
                            >
                                <Column selectionMode="multiple" headerStyle={{ width: '2.5rem' }} />
                                <Column
                                    field="job_uuid"
                                    header="Job UUID"
                                    body={(row: DiskUsageJob) => (
                                        <>
                                            <a
                                                href={withBasePath(`/result?uuid=${row.job_uuid}`)}
                                                style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}
                                            >
                                                {row.job_uuid}
                                            </a>
                                            {!row.known && (
                                                <span style={{
                                                    marginLeft: '0.5rem',
                                                    fontSize: '0.65rem',
                                                    padding: '0.1rem 0.4rem',
                                                    borderRadius: 10,
                                                    background: 'var(--agr-warning-light)',
                                                    color: 'var(--agr-warning-dark)',
                                                    fontWeight: 600,
                                                }}>
                                                    ORPHAN
                                                </span>
                                            )}
                                        </>
                                    )}
                                />
                                <Column
                                    field="bytes"
                                    header="Size"
                                    body={(row: DiskUsageJob) => fmtBytes(row.bytes)}
                                    style={{ width: '7rem', textAlign: 'right' }}
                                    sortable
                                />
                                <Column
                                    field="modified_at"
                                    header="Modified"
                                    body={(row: DiskUsageJob) => row.modified_at.slice(0, 10)}
                                    style={{ width: '8rem' }}
                                    sortable
                                />
                            </DataTable>
                        </Card>
                    )}

                    <Card title="Most-accessed jobs">
                        <DataTable
                            value={stats.popular_jobs}
                            size="small"
                            emptyMessage="No job-scoped requests yet."
                        >
                            <Column
                                field="job_uuid"
                                header="Job UUID"
                                body={(row: { job_uuid: string }) => (
                                    <a
                                        href={withBasePath(`/result?uuid=${row.job_uuid}`)}
                                        style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}
                                    >
                                        {row.job_uuid}
                                    </a>
                                )}
                            />
                            <Column
                                field="count"
                                header="Requests"
                                style={{ width: '8rem', textAlign: 'right' }}
                                sortable
                            />
                        </DataTable>
                    </Card>
                </>
            )}
        </div>
    );
}
