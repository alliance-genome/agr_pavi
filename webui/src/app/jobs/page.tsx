'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { JobTable } from './components/JobTable';
import { useJobHistory } from '../../hooks/useJobHistory';
import { fetchJobStatusFull } from '../progress/components/JobProgressTracker/serverActions';
import { withBasePath } from '@/utils/basePath';
import styles from './jobs.module.css';

export default function JobsPage() {
    const router = useRouter();
    const {
        jobs,
        isLoading,
        addJob,
        removeJob,
        removeMultiple,
        toggleStar,
        getStats,
        clearHistory,
    } = useJobHistory();

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [uuidInput, setUuidInput] = useState('');
    const [addError, setAddError] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<string | null>(null);

    const handleImportFile = useCallback(async (file: File) => {
        setIsImporting(true);
        setImportMessage(null);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await fetch(withBasePath('/api/pipeline-job/import'), {
                method: 'POST',
                body: form,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            const data = await res.json() as {
                job_id: string;
                source_format: string;
                source_job_id: string | null;
                sequence_count: number;
                variant_count: number;
            };
            addJob({
                uuid: data.job_id,
                status: 'completed',
                genes: [],
                transcriptCount: data.sequence_count,
                title: `Imported from ${file.name}`,
            });
            setImportMessage(
                `Imported ${data.source_format.toUpperCase()} as ${data.job_id.slice(0, 8)}... ` +
                `(${data.sequence_count} sequences, ${data.variant_count} variants).`
            );
        } catch (e) {
            setImportMessage(`Import failed: ${(e as Error).message}`);
        } finally {
            setIsImporting(false);
            if (importInputRef.current) importInputRef.current.value = '';
        }
    }, [addJob]);

    const stats = getStats();

    const handleAddByUuid = useCallback(async () => {
        const uuid = uuidInput.trim();
        if (!uuid) {
            setAddError('Please enter a job UUID');
            return;
        }

        // Check if already in history
        if (jobs.some(j => j.uuid === uuid)) {
            setAddError('This job is already in your history');
            return;
        }

        setIsAdding(true);
        setAddError('');

        try {
            const status = await fetchJobStatusFull(uuid);
            if (!status) {
                setAddError('Job not found. Please check the UUID.');
                setIsAdding(false);
                return;
            }

            // Map API status to our status type
            const jobStatus = status.status === 'completed' ? 'completed'
                : status.status === 'failed' ? 'failed'
                : status.status === 'running' ? 'running'
                : 'pending';

            addJob({
                uuid,
                status: jobStatus,
                genes: [],
                transcriptCount: 0,
                title: 'Imported job',
                ...(status.status === 'failed' && status.error_message ? { error: status.error_message } : {}),
            });

            setShowAddDialog(false);
            setUuidInput('');
        } catch {
            setAddError('Failed to fetch job status. Please try again.');
        } finally {
            setIsAdding(false);
        }
    }, [uuidInput, jobs, addJob]);

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
                <div className={styles.headerButtons}>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".db,.json,application/x-sqlite3,application/json"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleImportFile(f);
                        }}
                    />
                    <Button
                        label="Import file"
                        icon="pi pi-upload"
                        className="p-button-outlined"
                        loading={isImporting}
                        onClick={() => importInputRef.current?.click()}
                        tooltip="Upload a .db or .json file produced by Export"
                    />
                    <Button
                        label="Add by UUID"
                        icon="pi pi-link"
                        className="p-button-outlined"
                        onClick={() => setShowAddDialog(true)}
                    />
                    <Button
                        label="Submit New Job"
                        icon="pi pi-plus"
                        onClick={() => router.push('/submit')}
                    />
                </div>
            </div>

            {importMessage && (
                <div
                    role="status"
                    style={{
                        padding: '0.75rem 1rem',
                        marginBottom: '1rem',
                        borderRadius: 6,
                        background: importMessage.startsWith('Import failed') ? '#fef2f2' : '#f0fdf4',
                        color: importMessage.startsWith('Import failed') ? '#991b1b' : '#166534',
                        border: `1px solid ${importMessage.startsWith('Import failed') ? '#fecaca' : '#bbf7d0'}`,
                    }}
                >
                    {importMessage}
                </div>
            )}

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

            {/* Add by UUID Dialog */}
            <Dialog
                header="Add Job by UUID"
                visible={showAddDialog}
                onHide={() => {
                    setShowAddDialog(false);
                    setUuidInput('');
                    setAddError('');
                }}
                style={{ width: '450px' }}
                footer={
                    <div className={styles.dialogFooter}>
                        <Button
                            label="Cancel"
                            icon="pi pi-times"
                            className="p-button-text"
                            onClick={() => {
                                setShowAddDialog(false);
                                setUuidInput('');
                                setAddError('');
                            }}
                        />
                        <Button
                            label="Add Job"
                            icon="pi pi-check"
                            loading={isAdding}
                            onClick={handleAddByUuid}
                        />
                    </div>
                }
            >
                <div className={styles.dialogContent}>
                    <p className={styles.dialogDescription}>
                        Enter a job UUID to add it to your history. This is useful if you
                        submitted a job from another browser or received a job link from someone.
                    </p>
                    <div className={styles.inputGroup}>
                        <label htmlFor="uuid-input">Job UUID</label>
                        <InputText
                            id="uuid-input"
                            value={uuidInput}
                            onChange={(e) => {
                                setUuidInput(e.target.value);
                                setAddError('');
                            }}
                            placeholder="e.g., c8ad2d84-c0fc-4a13-9523-e37983acf33d"
                            className={addError ? 'p-invalid' : ''}
                            style={{ width: '100%' }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddByUuid();
                            }}
                        />
                        {addError && <small className={styles.errorText}>{addError}</small>}
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
