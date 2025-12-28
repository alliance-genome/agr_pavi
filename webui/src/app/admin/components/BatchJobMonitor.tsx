'use client';

import React, { useState, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import styles from './AdminComponents.module.css';

interface BatchJobInfo {
    jobId: string;
    jobName: string;
    status: string;
    statusReason?: string;
    createdAt?: string;
    startedAt?: string;
    stoppedAt?: string;
    container?: {
        exitCode?: number;
        reason?: string;
        logStreamName?: string;
    };
}

export function BatchJobMonitor() {
    const [jobId, setJobId] = useState('');
    const [jobInfo, setJobInfo] = useState<BatchJobInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // Recent jobs state for future use when backend endpoint is available
    const [recentJobs] = useState<BatchJobInfo[]>([]);

    const lookupBatchJob = useCallback(async () => {
        if (!jobId.trim()) {
            setError('Please enter a Batch Job ID');
            return;
        }

        setLoading(true);
        setError('');
        setJobInfo(null);

        try {
            // This would need a backend endpoint to query AWS Batch
            // For now, we'll show a placeholder that demonstrates the UI
            setError('AWS Batch job lookup requires backend API endpoint. Job ID: ' + jobId);

            // Simulate what the response would look like
            // In production, this would call: /api/admin/batch-job/{jobId}
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to lookup job');
        } finally {
            setLoading(false);
        }
    }, [jobId]);

    const getStatusSeverity = (status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' => {
        switch (status?.toUpperCase()) {
            case 'SUCCEEDED':
                return 'success';
            case 'RUNNING':
            case 'STARTING':
                return 'info';
            case 'PENDING':
            case 'RUNNABLE':
            case 'SUBMITTED':
                return 'warning';
            case 'FAILED':
                return 'danger';
            default:
                return 'secondary';
        }
    };

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                    <h2>AWS Batch Job Monitor</h2>
                    <p>Monitor AWS Batch jobs used for alignment processing</p>
                </div>
            </div>

            <Card className={styles.lookupCard}>
                <div className={styles.lookupForm}>
                    <div className={styles.lookupInput}>
                        <label htmlFor="batch-job-id">Batch Job ID Lookup</label>
                        <div className="p-inputgroup">
                            <InputText
                                id="batch-job-id"
                                value={jobId}
                                onChange={(e) => setJobId(e.target.value)}
                                placeholder="Enter AWS Batch Job ID..."
                                onKeyPress={(e) => e.key === 'Enter' && lookupBatchJob()}
                            />
                            <Button
                                label="Lookup"
                                icon="pi pi-search"
                                onClick={lookupBatchJob}
                                loading={loading}
                            />
                        </div>
                        {error && (
                            <small className={styles.errorText}>{error}</small>
                        )}
                    </div>
                </div>
            </Card>

            {jobInfo && (
                <Card className={styles.resultCard}>
                    <div className={styles.executionDetails}>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Job ID:</span>
                            <code>{jobInfo.jobId}</code>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Job Name:</span>
                            <span>{jobInfo.jobName}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Status:</span>
                            <Tag value={jobInfo.status} severity={getStatusSeverity(jobInfo.status)} />
                        </div>
                        {jobInfo.statusReason && (
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Status Reason:</span>
                                <span>{jobInfo.statusReason}</span>
                            </div>
                        )}
                        {jobInfo.createdAt && (
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Created:</span>
                                <span>{new Date(jobInfo.createdAt).toLocaleString()}</span>
                            </div>
                        )}
                        {jobInfo.startedAt && (
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Started:</span>
                                <span>{new Date(jobInfo.startedAt).toLocaleString()}</span>
                            </div>
                        )}
                        {jobInfo.stoppedAt && (
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Stopped:</span>
                                <span>{new Date(jobInfo.stoppedAt).toLocaleString()}</span>
                            </div>
                        )}
                        {jobInfo.container && (
                            <div className={styles.detailSection}>
                                <h4>Container Details</h4>
                                {jobInfo.container.exitCode !== undefined && (
                                    <div className={styles.detailRow}>
                                        <span className={styles.detailLabel}>Exit Code:</span>
                                        <span className={jobInfo.container.exitCode === 0 ? styles.success : styles.errorText}>
                                            {jobInfo.container.exitCode}
                                        </span>
                                    </div>
                                )}
                                {jobInfo.container.reason && (
                                    <div className={styles.detailRow}>
                                        <span className={styles.detailLabel}>Reason:</span>
                                        <span>{jobInfo.container.reason}</span>
                                    </div>
                                )}
                                {jobInfo.container.logStreamName && (
                                    <div className={styles.detailRow}>
                                        <span className={styles.detailLabel}>Log Stream:</span>
                                        <code className={styles.logStream}>{jobInfo.container.logStreamName}</code>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <Card className={styles.infoCard}>
                <div className={styles.infoContent}>
                    <i className="pi pi-info-circle" style={{ fontSize: '1.5rem', color: 'var(--agr-primary)' }} />
                    <div>
                        <h4>About AWS Batch Monitoring</h4>
                        <p>
                            AWS Batch jobs are used to run the alignment processing containers.
                            Job IDs can be found in the Step Functions execution details or CloudWatch logs.
                        </p>
                        <p>
                            Common job statuses:
                        </p>
                        <div className={styles.statusList}>
                            <Tag value="SUBMITTED" severity="secondary" /> Queued for execution
                            <Tag value="PENDING" severity="warning" /> Waiting for resources
                            <Tag value="RUNNABLE" severity="warning" /> Ready to run
                            <Tag value="RUNNING" severity="info" /> Currently executing
                            <Tag value="SUCCEEDED" severity="success" /> Completed successfully
                            <Tag value="FAILED" severity="danger" /> Execution failed
                        </div>
                    </div>
                </div>
            </Card>

            {recentJobs.length > 0 && (
                <Card>
                    <h3>Recent Jobs</h3>
                    <div className={styles.recentJobsList}>
                        {recentJobs.map((job) => (
                            <div key={job.jobId} className={styles.recentJobItem}>
                                <code>{job.jobId}</code>
                                <Tag value={job.status} severity={getStatusSeverity(job.status)} />
                                <Button
                                    icon="pi pi-eye"
                                    className="p-button-sm p-button-text"
                                    onClick={() => {
                                        setJobId(job.jobId);
                                        setJobInfo(job);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
