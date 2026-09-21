'use client';

import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import styles from './JobMetadata.module.css';

interface JobMetadataProps {
    uuid: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    submittedAt?: Date;
    completedAt?: Date;
    genes?: string[];
    transcriptCount?: number;
}

export function JobMetadata({
    uuid,
    status,
    submittedAt,
    completedAt,
    genes = [],
    transcriptCount = 0,
}: JobMetadataProps) {
    const toast = useRef<Toast>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('');

    // Calculate elapsed time
    React.useEffect(() => {
        if (!submittedAt) return;

        const updateElapsed = () => {
            const start = submittedAt.getTime();
            const end = completedAt ? completedAt.getTime() : Date.now();
            const seconds = Math.floor((end - start) / 1000);

            if (seconds < 60) {
                setElapsedTime(`${seconds}s`);
            } else {
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                setElapsedTime(`${mins}m ${secs}s`);
            }
        };

        updateElapsed();

        // Only update if job is still running
        if (status === 'pending' || status === 'running') {
            const interval = setInterval(updateElapsed, 1000);
            return () => clearInterval(interval);
        }
    }, [submittedAt, completedAt, status]);

    const copyUuid = async () => {
        await navigator.clipboard.writeText(uuid);
        toast.current?.show({
            severity: 'success',
            summary: 'Copied',
            detail: 'Job ID copied to clipboard',
            life: 2000,
        });
    };

    const copyShareLink = async () => {
        const url = `${window.location.origin}/result?uuid=${uuid}`;
        await navigator.clipboard.writeText(url);
        toast.current?.show({
            severity: 'success',
            summary: 'Copied',
            detail: 'Share link copied to clipboard',
            life: 2000,
        });
    };

    const getStatusSeverity = (): 'success' | 'info' | 'warning' | 'danger' => {
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

    return (
        <>
            <Toast ref={toast} />
            <Card className={styles.container}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        <i className="pi pi-info-circle" />
                        Job Details
                    </h3>
                    <Tag
                        value={status.charAt(0).toUpperCase() + status.slice(1)}
                        severity={getStatusSeverity()}
                        icon={status === 'running' ? 'pi pi-spin pi-spinner' : undefined}
                    />
                </div>

                <div className={styles.grid}>
                    <div className={styles.item}>
                        <span className={styles.label}>Job ID</span>
                        <div className={styles.valueWithAction}>
                            <code className={styles.code} title={uuid}>
                                {uuid.slice(0, 8)}...{uuid.slice(-4)}
                            </code>
                            <Button
                                icon="pi pi-copy"
                                className="p-button-text p-button-sm"
                                onClick={copyUuid}
                                tooltip="Copy full ID"
                                tooltipOptions={{ position: 'top' }}
                            />
                        </div>
                    </div>

                    {submittedAt && (
                        <div className={styles.item}>
                            <span className={styles.label}>Submitted</span>
                            <span className={styles.value}>
                                {submittedAt.toLocaleString()}
                            </span>
                        </div>
                    )}

                    {elapsedTime && (
                        <div className={styles.item}>
                            <span className={styles.label}>
                                {status === 'completed' || status === 'failed' ? 'Duration' : 'Elapsed'}
                            </span>
                            <span className={styles.value}>{elapsedTime}</span>
                        </div>
                    )}

                    {genes.length > 0 && (
                        <div className={styles.item}>
                            <span className={styles.label}>Genes</span>
                            <div className={styles.genesList}>
                                {genes.slice(0, 5).map((gene, idx) => (
                                    <span key={idx} className={styles.geneTag}>{gene}</span>
                                ))}
                                {genes.length > 5 && (
                                    <span className={styles.moreGenes}>+{genes.length - 5}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {transcriptCount > 0 && (
                        <div className={styles.item}>
                            <span className={styles.label}>Transcripts</span>
                            <span className={styles.value}>{transcriptCount}</span>
                        </div>
                    )}
                </div>

                {status === 'completed' && (
                    <div className={styles.actions}>
                        <Button
                            label="Copy Share Link"
                            icon="pi pi-link"
                            className="p-button-outlined p-button-sm"
                            onClick={copyShareLink}
                        />
                    </div>
                )}
            </Card>
        </>
    );
}
