'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, DataTableSelectionMultipleChangeEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { JobHistoryEntry, JobStatus } from '../../../../hooks/useJobHistory';
import styles from './JobTable.module.css';

interface JobTableProps {
    jobs: JobHistoryEntry[];
    // eslint-disable-next-line no-unused-vars
    onRemove: (uuid: string) => void;
    // eslint-disable-next-line no-unused-vars
    onRemoveMultiple: (uuids: string[]) => void;
    // eslint-disable-next-line no-unused-vars
    onToggleStar: (uuid: string) => void;
    isLoading?: boolean;
}

export function JobTable({ jobs, onRemove, onRemoveMultiple, onToggleStar, isLoading }: JobTableProps) {
    const router = useRouter();
    const [selectedJobs, setSelectedJobs] = useState<JobHistoryEntry[]>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');

    const statusOptions = [
        { label: 'All Statuses', value: 'all' },
        { label: 'Completed', value: 'completed' },
        { label: 'Running', value: 'running' },
        { label: 'Pending', value: 'pending' },
        { label: 'Failed', value: 'failed' },
    ];

    const getStatusSeverity = (status: JobStatus): 'success' | 'info' | 'warning' | 'danger' => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'running':
                return 'info';
            case 'pending':
                return 'warning';
            case 'failed':
                return 'danger';
        }
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDuration = (seconds?: number): string => {
        if (!seconds) return '-';
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    const filteredJobs = jobs.filter(job => {
        if (statusFilter !== 'all' && job.status !== statusFilter) {
            return false;
        }
        if (globalFilter) {
            const searchLower = globalFilter.toLowerCase();
            return (
                job.uuid.toLowerCase().includes(searchLower) ||
                job.genes.some(g => g.toLowerCase().includes(searchLower)) ||
                (job.title && job.title.toLowerCase().includes(searchLower))
            );
        }
        return true;
    });

    const handleViewJob = (job: JobHistoryEntry) => {
        if (job.status === 'completed') {
            router.push(`/result?uuid=${job.uuid}`);
        } else {
            router.push(`/progress?uuid=${job.uuid}`);
        }
    };

    const handleResubmit = (job: JobHistoryEntry) => {
        // Store job data for resubmission and navigate to submit page
        sessionStorage.setItem('pavi_resubmit', JSON.stringify({
            genes: job.genes,
        }));
        router.push('/submit?resubmit=true');
    };

    const confirmDelete = (job: JobHistoryEntry) => {
        confirmDialog({
            message: `Are you sure you want to remove job ${job.uuid.slice(0, 8)}... from history?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => onRemove(job.uuid),
        });
    };

    const confirmDeleteMultiple = () => {
        confirmDialog({
            message: `Are you sure you want to remove ${selectedJobs.length} jobs from history?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => {
                onRemoveMultiple(selectedJobs.map(j => j.uuid));
                setSelectedJobs([]);
            },
        });
    };

    const copyJobUrl = async (job: JobHistoryEntry) => {
        const url = `${window.location.origin}/result?uuid=${job.uuid}`;
        await navigator.clipboard.writeText(url);
        // Could add a toast notification here
    };

    const statusBodyTemplate = (job: JobHistoryEntry) => (
        <Tag
            value={job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            severity={getStatusSeverity(job.status)}
            icon={job.status === 'running' ? 'pi pi-spin pi-spinner' : undefined}
        />
    );

    const genesBodyTemplate = (job: JobHistoryEntry) => (
        <div className={styles.genesList}>
            {job.genes.slice(0, 3).map((gene, idx) => (
                <span key={idx} className={styles.geneTag}>{gene}</span>
            ))}
            {job.genes.length > 3 && (
                <span className={styles.moreGenes}>+{job.genes.length - 3} more</span>
            )}
        </div>
    );

    const dateBodyTemplate = (job: JobHistoryEntry) => (
        <span className={styles.date}>{formatDate(job.submittedAt)}</span>
    );

    const durationBodyTemplate = (job: JobHistoryEntry) => (
        <span className={styles.duration}>{formatDuration(job.duration)}</span>
    );

    const actionsBodyTemplate = (job: JobHistoryEntry) => (
        <div className={styles.actions}>
            <Button
                icon={job.starred ? 'pi pi-star-fill' : 'pi pi-star'}
                className={`p-button-text p-button-sm ${job.starred ? styles.starred : ''}`}
                onClick={() => onToggleStar(job.uuid)}
                tooltip={job.starred ? 'Unstar' : 'Star'}
                tooltipOptions={{ position: 'top' }}
            />
            <Button
                icon="pi pi-eye"
                className="p-button-text p-button-sm"
                onClick={() => handleViewJob(job)}
                tooltip="View"
                tooltipOptions={{ position: 'top' }}
            />
            {job.status === 'completed' && (
                <Button
                    icon="pi pi-link"
                    className="p-button-text p-button-sm"
                    onClick={() => copyJobUrl(job)}
                    tooltip="Copy Link"
                    tooltipOptions={{ position: 'top' }}
                />
            )}
            {job.status === 'failed' && (
                <Button
                    icon="pi pi-replay"
                    className="p-button-text p-button-sm"
                    onClick={() => handleResubmit(job)}
                    tooltip="Resubmit"
                    tooltipOptions={{ position: 'top' }}
                />
            )}
            <Button
                icon="pi pi-trash"
                className="p-button-text p-button-sm p-button-danger"
                onClick={() => confirmDelete(job)}
                tooltip="Delete"
                tooltipOptions={{ position: 'top' }}
            />
        </div>
    );

    const header = (
        <div className={styles.tableHeader}>
            <div className={styles.headerLeft}>
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder="Search jobs..."
                        className={styles.searchInput}
                    />
                </span>
                <Dropdown
                    value={statusFilter}
                    options={statusOptions}
                    onChange={(e) => setStatusFilter(e.value)}
                    className={styles.statusDropdown}
                />
            </div>
            <div className={styles.headerRight}>
                {selectedJobs.length > 0 && (
                    <Button
                        label={`Delete ${selectedJobs.length} Selected`}
                        icon="pi pi-trash"
                        className="p-button-danger p-button-sm"
                        onClick={confirmDeleteMultiple}
                    />
                )}
            </div>
        </div>
    );

    const emptyMessage = (
        <div className={styles.emptyState}>
            <i className="pi pi-inbox" />
            <h3>No Jobs Found</h3>
            <p>
                {globalFilter || statusFilter !== 'all'
                    ? 'No jobs match your current filters.'
                    : 'You haven\'t submitted any alignment jobs yet.'}
            </p>
            <Button
                label="Submit New Job"
                icon="pi pi-plus"
                onClick={() => router.push('/submit')}
            />
        </div>
    );

    return (
        <>
            <ConfirmDialog />
            <DataTable
                value={filteredJobs}
                selectionMode="multiple"
                selection={selectedJobs}
                onSelectionChange={(e: DataTableSelectionMultipleChangeEvent<JobHistoryEntry[]>) => setSelectedJobs(e.value)}
                dataKey="uuid"
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                header={header}
                emptyMessage={emptyMessage}
                loading={isLoading}
                className={styles.table}
                sortField="submittedAt"
                sortOrder={-1}
                stripedRows
                removableSort
            >
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                <Column
                    field="uuid"
                    header="Job ID"
                    body={(job: JobHistoryEntry) => (
                        <code className={styles.jobId} title={job.uuid}>
                            {job.uuid.slice(0, 8)}...
                        </code>
                    )}
                    sortable
                />
                <Column
                    field="status"
                    header="Status"
                    body={statusBodyTemplate}
                    sortable
                />
                <Column
                    field="genes"
                    header="Genes"
                    body={genesBodyTemplate}
                />
                <Column
                    field="transcriptCount"
                    header="Transcripts"
                    sortable
                />
                <Column
                    field="submittedAt"
                    header="Submitted"
                    body={dateBodyTemplate}
                    sortable
                />
                <Column
                    field="duration"
                    header="Duration"
                    body={durationBodyTemplate}
                    sortable
                />
                <Column
                    body={actionsBodyTemplate}
                    header="Actions"
                    style={{ width: '12rem' }}
                />
            </DataTable>
        </>
    );
}
