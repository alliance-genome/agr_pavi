'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from 'primereact/card';
import { Chart } from 'primereact/chart';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import styles from './AdminComponents.module.css';

interface JobRecord {
    uuid: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    submittedAt: string;
    completedAt?: string;
    genes: string[];
    transcriptCount: number;
    duration?: number;
    error?: string;
}

interface AnalyticsSummary {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    runningJobs: number;
    pendingJobs: number;
    successRate: number;
    avgDuration: number;
    totalTranscripts: number;
}

interface GeneStats {
    gene: string;
    count: number;
    successRate: number;
}

interface ErrorStats {
    error: string;
    count: number;
    percentage: number;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export function JobAnalytics() {
    const [jobs, setJobs] = useState<JobRecord[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const [isLoading, setIsLoading] = useState(true);

    const timeRangeOptions = [
        { label: 'Last 7 days', value: '7d' },
        { label: 'Last 30 days', value: '30d' },
        { label: 'Last 90 days', value: '90d' },
        { label: 'All time', value: 'all' },
    ];

    useEffect(() => {
        loadJobData();
    }, []);

    const loadJobData = () => {
        setIsLoading(true);
        try {
            const stored = localStorage.getItem('pavi_job_history');
            if (stored) {
                const parsed = JSON.parse(stored);
                setJobs(parsed);
            }
        } catch (error) {
            console.error('Failed to load job history:', error);
        }
        setIsLoading(false);
    };

    const filteredJobs = useMemo(() => {
        if (timeRange === 'all') return jobs;

        const now = new Date();
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        return jobs.filter(job => new Date(job.submittedAt) >= cutoff);
    }, [jobs, timeRange]);

    const summary: AnalyticsSummary = useMemo(() => {
        const completed = filteredJobs.filter(j => j.status === 'completed');
        const failed = filteredJobs.filter(j => j.status === 'failed');
        const running = filteredJobs.filter(j => j.status === 'running');
        const pending = filteredJobs.filter(j => j.status === 'pending');

        const durations = completed
            .filter(j => j.duration !== undefined)
            .map(j => j.duration as number);

        const avgDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;

        const totalTranscripts = filteredJobs.reduce((sum, j) => sum + (j.transcriptCount || 0), 0);

        return {
            totalJobs: filteredJobs.length,
            completedJobs: completed.length,
            failedJobs: failed.length,
            runningJobs: running.length,
            pendingJobs: pending.length,
            successRate: filteredJobs.length > 0
                ? (completed.length / (completed.length + failed.length)) * 100 || 0
                : 0,
            avgDuration,
            totalTranscripts,
        };
    }, [filteredJobs]);

    const jobsOverTimeData = useMemo(() => {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 180;
        const labels: string[] = [];
        const completedData: number[] = [];
        const failedData: number[] = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            const dayJobs = filteredJobs.filter(j => j.submittedAt.startsWith(dateStr));
            completedData.push(dayJobs.filter(j => j.status === 'completed').length);
            failedData.push(dayJobs.filter(j => j.status === 'failed').length);
        }

        return {
            labels,
            datasets: [
                {
                    label: 'Completed',
                    data: completedData,
                    backgroundColor: 'rgba(34, 197, 94, 0.5)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 2,
                    fill: true,
                },
                {
                    label: 'Failed',
                    data: failedData,
                    backgroundColor: 'rgba(239, 68, 68, 0.5)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 2,
                    fill: true,
                },
            ],
        };
    }, [filteredJobs, timeRange]);

    const statusDistributionData = useMemo(() => ({
        labels: ['Completed', 'Failed', 'Running', 'Pending'],
        datasets: [{
            data: [
                summary.completedJobs,
                summary.failedJobs,
                summary.runningJobs,
                summary.pendingJobs,
            ],
            backgroundColor: [
                'rgba(34, 197, 94, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(59, 130, 246, 0.8)',
                'rgba(234, 179, 8, 0.8)',
            ],
            borderWidth: 0,
        }],
    }), [summary]);

    const topGenes: GeneStats[] = useMemo(() => {
        const geneMap = new Map<string, { total: number; completed: number }>();

        filteredJobs.forEach(job => {
            job.genes.forEach(gene => {
                const current = geneMap.get(gene) || { total: 0, completed: 0 };
                current.total++;
                if (job.status === 'completed') current.completed++;
                geneMap.set(gene, current);
            });
        });

        return Array.from(geneMap.entries())
            .map(([gene, stats]) => ({
                gene,
                count: stats.total,
                successRate: (stats.completed / stats.total) * 100,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredJobs]);

    const errorStats: ErrorStats[] = useMemo(() => {
        const errorMap = new Map<string, number>();
        const failedJobs = filteredJobs.filter(j => j.status === 'failed');

        failedJobs.forEach(job => {
            const errorType = job.error || 'Unknown error';
            errorMap.set(errorType, (errorMap.get(errorType) || 0) + 1);
        });

        return Array.from(errorMap.entries())
            .map(([error, count]) => ({
                error: error.length > 50 ? error.substring(0, 50) + '...' : error,
                count,
                percentage: (count / failedJobs.length) * 100,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [filteredJobs]);

    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                },
            },
        },
    };

    const doughnutOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
            },
        },
        cutout: '60%',
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} />
                <p>Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className={styles.analyticsContainer}>
            <div className={styles.analyticsHeader}>
                <h2>Job Analytics</h2>
                <div className={styles.headerActions}>
                    <Dropdown
                        value={timeRange}
                        options={timeRangeOptions}
                        onChange={(e) => setTimeRange(e.value)}
                        className={styles.timeRangeDropdown}
                    />
                    <Button
                        icon="pi pi-refresh"
                        className="p-button-outlined"
                        onClick={loadJobData}
                        tooltip="Refresh data"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className={styles.summaryGrid}>
                <Card className={styles.summaryCard}>
                    <div className={styles.summaryContent}>
                        <i className="pi pi-list" style={{ color: 'var(--agr-primary)' }} />
                        <div>
                            <span className={styles.summaryValue}>{summary.totalJobs}</span>
                            <span className={styles.summaryLabel}>Total Jobs</span>
                        </div>
                    </div>
                </Card>
                <Card className={styles.summaryCard}>
                    <div className={styles.summaryContent}>
                        <i className="pi pi-check-circle" style={{ color: 'var(--agr-success)' }} />
                        <div>
                            <span className={styles.summaryValue}>{summary.successRate.toFixed(1)}%</span>
                            <span className={styles.summaryLabel}>Success Rate</span>
                        </div>
                    </div>
                </Card>
                <Card className={styles.summaryCard}>
                    <div className={styles.summaryContent}>
                        <i className="pi pi-clock" style={{ color: 'var(--agr-info)' }} />
                        <div>
                            <span className={styles.summaryValue}>{formatDuration(summary.avgDuration)}</span>
                            <span className={styles.summaryLabel}>Avg Duration</span>
                        </div>
                    </div>
                </Card>
                <Card className={styles.summaryCard}>
                    <div className={styles.summaryContent}>
                        <i className="pi pi-database" style={{ color: 'var(--agr-warning)' }} />
                        <div>
                            <span className={styles.summaryValue}>{summary.totalTranscripts.toLocaleString()}</span>
                            <span className={styles.summaryLabel}>Transcripts Analyzed</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className={styles.chartsRow}>
                <Card className={styles.chartCard}>
                    <h3>Jobs Over Time</h3>
                    <div className={styles.chartContainer}>
                        <Chart type="line" data={jobsOverTimeData} options={chartOptions} />
                    </div>
                </Card>
                <Card className={styles.chartCardSmall}>
                    <h3>Status Distribution</h3>
                    <div className={styles.chartContainer}>
                        <Chart type="doughnut" data={statusDistributionData} options={doughnutOptions} />
                    </div>
                </Card>
            </div>

            {/* Details Row */}
            <div className={styles.detailsRow}>
                <Card className={styles.detailCard}>
                    <h3>Top Genes Analyzed</h3>
                    {topGenes.length > 0 ? (
                        <DataTable value={topGenes} size="small" stripedRows>
                            <Column field="gene" header="Gene" />
                            <Column field="count" header="Jobs" sortable />
                            <Column
                                field="successRate"
                                header="Success Rate"
                                body={(row: GeneStats) => (
                                    <div className={styles.progressCell}>
                                        <ProgressBar
                                            value={row.successRate}
                                            showValue={false}
                                            style={{ height: '8px', width: '60px' }}
                                        />
                                        <span>{row.successRate.toFixed(0)}%</span>
                                    </div>
                                )}
                                sortable
                            />
                        </DataTable>
                    ) : (
                        <p className={styles.emptyMessage}>No gene data available</p>
                    )}
                </Card>

                <Card className={styles.detailCard}>
                    <h3>Failure Analysis</h3>
                    {errorStats.length > 0 ? (
                        <DataTable value={errorStats} size="small" stripedRows>
                            <Column
                                field="error"
                                header="Error Type"
                                body={(row: ErrorStats) => (
                                    <span title={row.error}>{row.error}</span>
                                )}
                            />
                            <Column field="count" header="Count" sortable />
                            <Column
                                field="percentage"
                                header="% of Failures"
                                body={(row: ErrorStats) => (
                                    <Tag
                                        severity="danger"
                                        value={`${row.percentage.toFixed(1)}%`}
                                    />
                                )}
                                sortable
                            />
                        </DataTable>
                    ) : (
                        <p className={styles.emptyMessage}>No failures recorded</p>
                    )}
                </Card>
            </div>

            {/* Active Jobs */}
            {(summary.runningJobs > 0 || summary.pendingJobs > 0) && (
                <Card className={styles.activeJobsCard}>
                    <h3>
                        <i className="pi pi-spin pi-spinner" style={{ marginRight: '0.5rem' }} />
                        Active Jobs ({summary.runningJobs + summary.pendingJobs})
                    </h3>
                    <DataTable
                        value={filteredJobs.filter(j => j.status === 'running' || j.status === 'pending')}
                        size="small"
                        stripedRows
                    >
                        <Column
                            field="uuid"
                            header="Job ID"
                            body={(row: JobRecord) => (
                                <code>{row.uuid.slice(0, 8)}...</code>
                            )}
                        />
                        <Column
                            field="status"
                            header="Status"
                            body={(row: JobRecord) => (
                                <Tag
                                    severity={row.status === 'running' ? 'info' : 'warning'}
                                    value={row.status}
                                    icon={row.status === 'running' ? 'pi pi-spin pi-spinner' : undefined}
                                />
                            )}
                        />
                        <Column
                            field="genes"
                            header="Genes"
                            body={(row: JobRecord) => row.genes.slice(0, 3).join(', ')}
                        />
                        <Column
                            field="submittedAt"
                            header="Submitted"
                            body={(row: JobRecord) => new Date(row.submittedAt).toLocaleString()}
                        />
                    </DataTable>
                </Card>
            )}
        </div>
    );
}
