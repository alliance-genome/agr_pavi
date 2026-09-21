'use client';

import React from 'react';
import { Timeline } from 'primereact/timeline';
import { Card } from 'primereact/card';
import styles from './ProgressTimeline.module.css';

export interface ProgressStep {
    id: string;
    label: string;
    description?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    timestamp?: Date;
    duration?: number; // in seconds
}

interface ProgressTimelineProps {
    steps: ProgressStep[];
    estimatedTimeRemaining?: number; // in seconds
}

export function ProgressTimeline({ steps, estimatedTimeRemaining }: ProgressTimelineProps) {
    const getStatusIcon = (status: ProgressStep['status']) => {
        switch (status) {
            case 'completed':
                return 'pi pi-check-circle';
            case 'running':
                return 'pi pi-spin pi-spinner';
            case 'failed':
                return 'pi pi-times-circle';
            default:
                return 'pi pi-circle';
        }
    };

    const getStatusClass = (status: ProgressStep['status']) => {
        switch (status) {
            case 'completed':
                return styles.completed;
            case 'running':
                return styles.running;
            case 'failed':
                return styles.failed;
            default:
                return styles.pending;
        }
    };

    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    const formatEstimatedTime = (seconds: number): string => {
        if (seconds < 60) return `~${seconds} seconds remaining`;
        const mins = Math.ceil(seconds / 60);
        return `~${mins} minute${mins > 1 ? 's' : ''} remaining`;
    };

    const customizedMarker = (step: ProgressStep) => (
        <span className={`${styles.marker} ${getStatusClass(step.status)}`}>
            <i className={getStatusIcon(step.status)} />
        </span>
    );

    const customizedContent = (step: ProgressStep) => (
        <div className={`${styles.content} ${getStatusClass(step.status)}`}>
            <div className={styles.header}>
                <span className={styles.label}>{step.label}</span>
                {step.duration !== undefined && step.status === 'completed' && (
                    <span className={styles.duration}>{formatDuration(step.duration)}</span>
                )}
            </div>
            {step.description && (
                <p className={styles.description}>{step.description}</p>
            )}
            {step.timestamp && step.status !== 'pending' && (
                <time className={styles.timestamp}>
                    {step.timestamp.toLocaleTimeString()}
                </time>
            )}
        </div>
    );

    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const totalSteps = steps.length;
    const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

    return (
        <Card className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    <i className="pi pi-list-check" style={{ marginRight: '0.5rem' }} />
                    Processing Steps
                </h3>
                <div className={styles.summary}>
                    <span className={styles.stepCount}>
                        Step {completedSteps + (steps.some(s => s.status === 'running') ? 1 : 0)} of {totalSteps}
                    </span>
                    {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
                        <span className={styles.estimate}>
                            {formatEstimatedTime(estimatedTimeRemaining)}
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.progressBarContainer}>
                <div className={styles.progressBar}>
                    <div
                        className={styles.progressFill}
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <span className={styles.progressLabel}>{progressPercentage}%</span>
            </div>

            <Timeline
                value={steps}
                marker={customizedMarker}
                content={customizedContent}
                className={styles.timeline}
            />
        </Card>
    );
}

// Default processing steps for PAVI alignment jobs
export const DEFAULT_PROGRESS_STEPS: ProgressStep[] = [
    {
        id: 'submit',
        label: 'Job Submitted',
        description: 'Your alignment request has been received',
        status: 'pending',
    },
    {
        id: 'sequence-retrieval',
        label: 'Retrieving Sequences',
        description: 'Fetching protein sequences from databases',
        status: 'pending',
    },
    {
        id: 'alignment',
        label: 'Running Alignment',
        description: 'Computing sequence alignment with Clustal Omega',
        status: 'pending',
    },
    {
        id: 'processing',
        label: 'Processing Results',
        description: 'Analyzing alignment and preparing visualization',
        status: 'pending',
    },
    {
        id: 'complete',
        label: 'Complete',
        description: 'Results ready for viewing',
        status: 'pending',
    },
];
