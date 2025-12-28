'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import styles from './AdminComponents.module.css';

interface ExecutionInfo {
    uuid: string;
    status: string;
    stage: string;
    created_at: string;
    updated_at: string;
    error_message?: string;
}

interface ExecutionDetails {
    uuid: string;
    status: string;
    stage: string;
    progress: Record<string, unknown>;
    result?: Record<string, unknown>;
    error_message?: string;
    created_at: string;
    updated_at: string;
}

export function StepFunctionsMonitor() {
    const [executions, setExecutions] = useState<ExecutionInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedExecution, setSelectedExecution] = useState<ExecutionDetails | null>(null);
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [lookupUuid, setLookupUuid] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');

    const fetchRecentExecutions = useCallback(async () => {
        setLoading(true);
        try {
            // Note: This would need a backend endpoint to list recent executions
            // For now, we'll show how to look up individual executions
            setExecutions([]);
        } catch (error) {
            console.error('Failed to fetch executions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const lookupExecution = useCallback(async () => {
        if (!lookupUuid.trim()) {
            setLookupError('Please enter a job UUID');
            return;
        }

        setLookupLoading(true);
        setLookupError('');

        try {
            const response = await fetch(`/api/pipeline-job/${lookupUuid}`);

            if (!response.ok) {
                if (response.status === 404) {
                    setLookupError('Job not found');
                } else {
                    setLookupError(`Error: ${response.status} ${response.statusText}`);
                }
                return;
            }

            const data = await response.json();
            setSelectedExecution(data);
            setDetailsVisible(true);

            // Add to executions list if not already there
            setExecutions(prev => {
                const exists = prev.some(e => e.uuid === data.uuid);
                if (!exists) {
                    return [data, ...prev].slice(0, 20); // Keep last 20
                }
                return prev.map(e => e.uuid === data.uuid ? data : e);
            });
        } catch (error) {
            setLookupError(error instanceof Error ? error.message : 'Failed to lookup job');
        } finally {
            setLookupLoading(false);
        }
    }, [lookupUuid]);

    useEffect(() => {
        fetchRecentExecutions();
    }, [fetchRecentExecutions]);

    const getStatusSeverity = (status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED':
            case 'SUCCEEDED':
                return 'success';
            case 'RUNNING':
            case 'PENDING':
                return 'info';
            case 'FAILED':
            case 'ERROR':
                return 'danger';
            case 'TIMED_OUT':
            case 'ABORTED':
                return 'warning';
            default:
                return 'secondary';
        }
    };

    const getStageSeverity = (stage: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' => {
        switch (stage?.toUpperCase()) {
            case 'DONE':
                return 'success';
            case 'ALIGNMENT':
            case 'SEQUENCE_RETRIEVAL':
            case 'COLLECTING_RESULTS':
                return 'info';
            case 'INITIALIZING':
                return 'warning';
            case 'ERROR':
                return 'danger';
            default:
                return 'secondary';
        }
    };

    const statusBodyTemplate = (rowData: ExecutionInfo) => (
        <Tag value={rowData.status} severity={getStatusSeverity(rowData.status)} />
    );

    const stageBodyTemplate = (rowData: ExecutionInfo) => (
        <Tag value={rowData.stage} severity={getStageSeverity(rowData.stage)} />
    );

    const dateBodyTemplate = (rowData: ExecutionInfo, field: 'created_at' | 'updated_at') => {
        const date = rowData[field];
        if (!date) return '-';
        return new Date(date).toLocaleString();
    };

    const actionsBodyTemplate = (rowData: ExecutionInfo) => (
        <Button
            icon="pi pi-eye"
            className="p-button-sm p-button-text"
            onClick={() => {
                setLookupUuid(rowData.uuid);
                lookupExecution();
            }}
            tooltip="View Details"
        />
    );

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                    <h2>Step Functions Monitor</h2>
                    <p>Track AWS Step Functions execution status for pipeline jobs</p>
                </div>
                <div className={styles.sectionActions}>
                    <Button
                        label="Refresh"
                        icon="pi pi-refresh"
                        className="p-button-sm"
                        onClick={fetchRecentExecutions}
                        loading={loading}
                    />
                </div>
            </div>

            <Card className={styles.lookupCard}>
                <div className={styles.lookupForm}>
                    <div className={styles.lookupInput}>
                        <label htmlFor="job-uuid">Job UUID Lookup</label>
                        <div className="p-inputgroup">
                            <InputText
                                id="job-uuid"
                                value={lookupUuid}
                                onChange={(e) => setLookupUuid(e.target.value)}
                                placeholder="Enter job UUID..."
                                onKeyPress={(e) => e.key === 'Enter' && lookupExecution()}
                            />
                            <Button
                                label="Lookup"
                                icon="pi pi-search"
                                onClick={lookupExecution}
                                loading={lookupLoading}
                            />
                        </div>
                        {lookupError && (
                            <small className={styles.errorText}>{lookupError}</small>
                        )}
                    </div>
                </div>
            </Card>

            {executions.length > 0 ? (
                <Card className={styles.tableCard}>
                    <DataTable
                        value={executions}
                        paginator
                        rows={10}
                        className={styles.dataTable}
                        emptyMessage="No executions found. Use the lookup above to find a specific job."
                    >
                        <Column field="uuid" header="Job UUID" style={{ width: '30%' }} />
                        <Column field="status" header="Status" body={statusBodyTemplate} style={{ width: '15%' }} />
                        <Column field="stage" header="Stage" body={stageBodyTemplate} style={{ width: '15%' }} />
                        <Column
                            field="created_at"
                            header="Created"
                            body={(row) => dateBodyTemplate(row, 'created_at')}
                            style={{ width: '17%' }}
                        />
                        <Column
                            field="updated_at"
                            header="Updated"
                            body={(row) => dateBodyTemplate(row, 'updated_at')}
                            style={{ width: '17%' }}
                        />
                        <Column body={actionsBodyTemplate} style={{ width: '6%' }} />
                    </DataTable>
                </Card>
            ) : (
                <Card className={styles.emptyCard}>
                    <div className={styles.emptyMessage}>
                        <i className="pi pi-inbox" style={{ fontSize: '3rem', color: 'var(--agr-gray-400)' }} />
                        <h3>No Executions Loaded</h3>
                        <p>Use the UUID lookup above to find and track specific pipeline jobs.</p>
                    </div>
                </Card>
            )}

            <Dialog
                header="Execution Details"
                visible={detailsVisible}
                style={{ width: '700px' }}
                onHide={() => setDetailsVisible(false)}
            >
                {selectedExecution && (
                    <div className={styles.executionDetails}>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>UUID:</span>
                            <code>{selectedExecution.uuid}</code>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Status:</span>
                            <Tag value={selectedExecution.status} severity={getStatusSeverity(selectedExecution.status)} />
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Stage:</span>
                            <Tag value={selectedExecution.stage} severity={getStageSeverity(selectedExecution.stage)} />
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Created:</span>
                            <span>{new Date(selectedExecution.created_at).toLocaleString()}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Updated:</span>
                            <span>{new Date(selectedExecution.updated_at).toLocaleString()}</span>
                        </div>
                        {selectedExecution.error_message && (
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Error:</span>
                                <span className={styles.errorText}>{selectedExecution.error_message}</span>
                            </div>
                        )}
                        {selectedExecution.progress && (
                            <div className={styles.detailSection}>
                                <h4>Progress</h4>
                                <pre className={styles.jsonPreview}>
                                    {JSON.stringify(selectedExecution.progress, null, 2)}
                                </pre>
                            </div>
                        )}
                        {selectedExecution.result && (
                            <div className={styles.detailSection}>
                                <h4>Result</h4>
                                <pre className={styles.jsonPreview}>
                                    {JSON.stringify(selectedExecution.result, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </Dialog>
        </div>
    );
}
