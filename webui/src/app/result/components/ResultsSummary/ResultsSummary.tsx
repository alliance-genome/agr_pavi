'use client';

import React, { useMemo } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Tooltip } from 'primereact/tooltip';
import { parse } from 'clustal-js';
import { SeqInfoDict } from '../InteractiveAlignment/types';
import styles from './ResultsSummary.module.css';

export interface AlignmentStats {
    sequenceCount: number;
    alignmentLength: number;
    conservationScore: number;
    gapPercentage: number;
    variantsCount: number;
    failuresCount: number;
}

export interface ResultsSummaryProps {
    jobId: string;
    alignmentResult?: string;
    seqInfoDict?: SeqInfoDict;
    isLoading?: boolean;
    completedAt?: Date;
    processingTime?: number; // in seconds
    onDownload?: () => void;
    onShare?: () => void;
}

export function ResultsSummary({
    jobId,
    alignmentResult,
    seqInfoDict,
    isLoading = false,
    completedAt,
    processingTime,
    onDownload,
    onShare,
}: ResultsSummaryProps) {

    const stats: AlignmentStats = useMemo(() => {
        if (!alignmentResult) {
            return {
                sequenceCount: 0,
                alignmentLength: 0,
                conservationScore: 0,
                gapPercentage: 0,
                variantsCount: 0,
                failuresCount: 0,
            };
        }

        // Parse CLUSTAL alignment to get sequences
        let sequences: string[] = [];
        try {
            const parsedAlignment = parse(alignmentResult);
            sequences = parsedAlignment['alns'].map((aln: { id: string; seq: string }) => aln.seq);
        } catch {
            // Fallback: try FASTA format
            const lines = alignmentResult.split('\n');
            let currentSeq = '';
            for (const line of lines) {
                if (line.startsWith('>')) {
                    if (currentSeq) sequences.push(currentSeq);
                    currentSeq = '';
                } else {
                    currentSeq += line.trim();
                }
            }
            if (currentSeq) sequences.push(currentSeq);
        }

        const sequenceCount = sequences.length;
        const alignmentLength = sequences.length > 0 ? sequences[0].length : 0;

        // Calculate gap percentage
        let totalGaps = 0;
        let totalChars = 0;
        for (const seq of sequences) {
            for (const char of seq) {
                totalChars++;
                if (char === '-') {
                    totalGaps++;
                }
            }
        }
        const gapPercentage = totalChars > 0 ? (totalGaps / totalChars) * 100 : 0;

        // Calculate conservation score (positions with same residue across all sequences)
        let conservedPositions = 0;
        if (alignmentLength > 0 && sequenceCount > 1) {
            for (let i = 0; i < alignmentLength; i++) {
                const residuesAtPosition = new Set<string>();
                for (const seq of sequences) {
                    if (i < seq.length && seq[i] !== '-') {
                        residuesAtPosition.add(seq[i].toUpperCase());
                    }
                }
                if (residuesAtPosition.size === 1) {
                    conservedPositions++;
                }
            }
        }
        const conservationScore = alignmentLength > 0
            ? (conservedPositions / alignmentLength) * 100
            : 0;

        // Count variants and failures from seqInfoDict
        let variantsCount = 0;
        let failuresCount = 0;

        if (seqInfoDict) {
            for (const seqInfo of Object.values(seqInfoDict)) {
                if (seqInfo.error) {
                    failuresCount++;
                }
                if (seqInfo.embedded_variants) {
                    variantsCount += seqInfo.embedded_variants.length;
                }
            }
        }

        return {
            sequenceCount,
            alignmentLength,
            conservationScore,
            gapPercentage,
            variantsCount,
            failuresCount,
        };
    }, [alignmentResult, seqInfoDict]);

    const getOverallStatus = (): 'success' | 'warning' | 'error' => {
        if (stats.failuresCount > 0) {
            return stats.failuresCount > stats.sequenceCount / 2 ? 'error' : 'warning';
        }
        return 'success';
    };

    const getStatusIcon = (status: 'success' | 'warning' | 'error'): string => {
        switch (status) {
            case 'success': return 'pi pi-check-circle';
            case 'warning': return 'pi pi-exclamation-triangle';
            case 'error': return 'pi pi-times-circle';
        }
    };

    const getStatusLabel = (status: 'success' | 'warning' | 'error'): string => {
        switch (status) {
            case 'success': return 'Completed Successfully';
            case 'warning': return 'Completed with Warnings';
            case 'error': return 'Completed with Errors';
        }
    };

    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    const getQualityClass = (score: number): string => {
        if (score >= 80) return styles.excellent;
        if (score >= 60) return styles.good;
        if (score >= 40) return styles.moderate;
        return styles.poor;
    };

    const status = getOverallStatus();

    if (isLoading) {
        return (
            <div className={styles.container}>
                <Card className={styles.summaryCard}>
                    <div className={styles.loading}>
                        <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.5rem' }} />
                        <span>Loading job results...</span>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Tooltip target=".tooltip-target" />
            <Card className={`${styles.summaryCard} ${styles[status]}`}>
                {/* Header Section */}
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <div className={`${styles.statusIcon} ${styles[status]}`}>
                            <i className={getStatusIcon(status)} />
                        </div>
                        <div className={styles.titleText}>
                            <h2>Alignment Results</h2>
                            <p>{getStatusLabel(status)}</p>
                        </div>
                    </div>
                    <div className={styles.actions}>
                        {onDownload && (
                            <Button
                                icon="pi pi-download"
                                label="Download"
                                className="p-button-outlined p-button-sm"
                                onClick={onDownload}
                            />
                        )}
                        {onShare && (
                            <Button
                                icon="pi pi-share-alt"
                                className="p-button-outlined p-button-sm p-button-secondary"
                                onClick={onShare}
                                tooltip="Share results"
                            />
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Sequences</span>
                        <span className={styles.statValue}>
                            <i className="pi pi-list" />
                            {stats.sequenceCount}
                        </span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Alignment Length</span>
                        <span className={styles.statValue}>
                            <i className="pi pi-arrows-h" />
                            {stats.alignmentLength.toLocaleString()} aa
                        </span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Variants</span>
                        <span className={`${styles.statValue} ${stats.variantsCount > 0 ? styles.warning : ''}`}>
                            <i className="pi pi-bolt" />
                            {stats.variantsCount}
                        </span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Issues</span>
                        <span className={`${styles.statValue} ${stats.failuresCount > 0 ? styles.error : styles.success}`}>
                            <i className={stats.failuresCount > 0 ? 'pi pi-exclamation-circle' : 'pi pi-check'} />
                            {stats.failuresCount}
                        </span>
                    </div>
                </div>

                {/* Quality Indicators */}
                {stats.alignmentLength > 0 && (
                    <div className={styles.qualitySection}>
                        <div className={styles.qualityItem}>
                            <span className={styles.qualityLabel}>Conservation:</span>
                            <div className={styles.qualityBar}>
                                <div
                                    className={`${styles.qualityFill} ${getQualityClass(stats.conservationScore)}`}
                                    style={{ width: `${Math.min(100, stats.conservationScore)}%` }}
                                />
                            </div>
                            <span className={styles.qualityValue}>{stats.conservationScore.toFixed(1)}%</span>
                            <Tag
                                severity={stats.conservationScore >= 60 ? 'success' : 'warning'}
                                value={stats.conservationScore >= 80 ? 'High' : stats.conservationScore >= 60 ? 'Moderate' : 'Low'}
                                className="tooltip-target"
                                data-pr-tooltip="Percentage of fully conserved positions"
                            />
                        </div>
                        <div className={styles.qualityItem}>
                            <span className={styles.qualityLabel}>Gap Content:</span>
                            <div className={styles.qualityBar}>
                                <div
                                    className={`${styles.qualityFill} ${getQualityClass(100 - stats.gapPercentage)}`}
                                    style={{ width: `${Math.min(100, stats.gapPercentage)}%` }}
                                />
                            </div>
                            <span className={styles.qualityValue}>{stats.gapPercentage.toFixed(1)}%</span>
                            <Tag
                                severity={stats.gapPercentage < 20 ? 'success' : stats.gapPercentage < 40 ? 'warning' : 'danger'}
                                value={stats.gapPercentage < 20 ? 'Low' : stats.gapPercentage < 40 ? 'Moderate' : 'High'}
                                className="tooltip-target"
                                data-pr-tooltip="Percentage of gap characters in alignment"
                            />
                        </div>
                    </div>
                )}

                {/* Job Details */}
                <div className={styles.detailsSection}>
                    <div className={styles.detailItem}>
                        <i className="pi pi-tag" />
                        <span>Job ID:</span>
                        <code>{jobId.slice(0, 8)}...</code>
                    </div>
                    {completedAt && (
                        <div className={styles.detailItem}>
                            <i className="pi pi-calendar" />
                            <span>Completed:</span>
                            <span>{completedAt.toLocaleString()}</span>
                        </div>
                    )}
                    {processingTime !== undefined && (
                        <div className={styles.detailItem}>
                            <i className="pi pi-clock" />
                            <span>Processing Time:</span>
                            <span>{formatDuration(processingTime)}</span>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

export default ResultsSummary;
