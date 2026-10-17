'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { withBasePath } from '@/utils/basePath';

interface StatsResponse {
    window_days: number;
    totals: { today: number; week: number; all_time: number };
    requests_per_day: Array<{ date: string; count: number }>;
    top_endpoints: Array<{ path_template: string; count: number }>;
    popular_jobs: Array<{ job_uuid: string; count: number }>;
    export_formats: Array<{ export_format: string; count: number }>;
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

    if (data.length === 0) return <div style={{ color: '#9ca3af' }}>No data.</div>;

    return (
        <div>
            <svg viewBox="0 0 600 180" width="100%" style={{ display: 'block' }} role="img" aria-label="Requests per day">
                {/* y-axis grid lines at 0, 50%, 100% of maxY */}
                {[0, 0.5, 1].map((frac) => {
                    const y = 168 - 12 - frac * (160 - 24);
                    return (
                        <g key={frac}>
                            <line x1={24} x2={576} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="2 2" />
                            <text x={2} y={y + 4} fontSize={10} fill="#9ca3af">
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
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
    if (items.length === 0) return <div style={{ color: '#9ca3af' }}>No {label.toLowerCase()} yet.</div>;
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
                        <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 3, height: 14, position: 'relative', overflow: 'hidden' }}>
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [windowDays, setWindowDays] = useState<number>(30);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(withBasePath(`/api/stats?days=${windowDays}`));
            if (!res.ok) {
                const detail = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
                throw new Error(detail.detail || `HTTP ${res.status}`);
            }
            const data = await res.json() as StatsResponse;
            setStats(data);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [windowDays]);

    useEffect(() => {
        load();
    }, [load]);

    const statCard = (label: string, value: number) => (
        <div style={{
            flex: '1 1 180px',
            padding: '0.9rem 1rem',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
        }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
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
                    <span style={{ color: '#dc2626', marginLeft: '0.5rem' }}>
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
