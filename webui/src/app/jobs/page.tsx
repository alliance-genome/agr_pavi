'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { JobTable } from './components/JobTable';
import { useJobHistory } from '../../hooks/useJobHistory';
import styles from './jobs.module.css';

export default function JobsPage() {
    const router = useRouter();
    const {
        jobs,
        isLoading,
        removeJob,
        removeMultiple,
        toggleStar,
        getStats,
        clearHistory,
    } = useJobHistory();

    const stats = getStats();

    return (
        <div className={styles.container}>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'My Jobs' },
                ]}
            />

            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1 className={styles.title}>My Jobs</h1>
                    <p className={styles.description}>
                        View and manage your alignment job history
                    </p>
                </div>
                <Button
                    label="Submit New Job"
                    icon="pi pi-plus"
                    onClick={() => router.push('/submit')}
                />
            </div>

            {/* Stats cards */}
            <div className={styles.statsGrid}>
                <Card className={styles.statCard}>
                    <div className={styles.statContent}>
                        <i className="pi pi-list" style={{ color: 'var(--agr-primary)' }} />
                        <div className={styles.statDetails}>
                            <span className={styles.statValue}>{stats.total}</span>
                            <span className={styles.statLabel}>Total Jobs</span>
                        </div>
                    </div>
                </Card>
                <Card className={styles.statCard}>
                    <div className={styles.statContent}>
                        <i className="pi pi-check-circle" style={{ color: 'var(--agr-success)' }} />
                        <div className={styles.statDetails}>
                            <span className={styles.statValue}>{stats.completed}</span>
                            <span className={styles.statLabel}>Completed</span>
                        </div>
                    </div>
                </Card>
                <Card className={styles.statCard}>
                    <div className={styles.statContent}>
                        <i className="pi pi-spin pi-spinner" style={{ color: 'var(--agr-info)' }} />
                        <div className={styles.statDetails}>
                            <span className={styles.statValue}>{stats.running}</span>
                            <span className={styles.statLabel}>In Progress</span>
                        </div>
                    </div>
                </Card>
                <Card className={styles.statCard}>
                    <div className={styles.statContent}>
                        <i className="pi pi-times-circle" style={{ color: 'var(--agr-error)' }} />
                        <div className={styles.statDetails}>
                            <span className={styles.statValue}>{stats.failed}</span>
                            <span className={styles.statLabel}>Failed</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Job table */}
            <Card className={styles.tableCard}>
                <JobTable
                    jobs={jobs}
                    onRemove={removeJob}
                    onRemoveMultiple={removeMultiple}
                    onToggleStar={toggleStar}
                    isLoading={isLoading}
                />
            </Card>

            {/* Clear history option */}
            {jobs.length > 0 && (
                <div className={styles.footer}>
                    <Button
                        label="Clear All History"
                        icon="pi pi-trash"
                        className="p-button-text p-button-danger"
                        onClick={() => {
                            if (confirm('Are you sure you want to clear all job history? This cannot be undone.')) {
                                clearHistory();
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
}
