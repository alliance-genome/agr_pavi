'use client';

import React, { useState, useMemo } from 'react';
import { Button } from 'primereact/button';
import styles from './FailureDisplay.module.css';

export type FailureSeverity = 'error' | 'warning' | 'info';

export interface FailureItem {
    id: string;
    message: string;
    severity: FailureSeverity;
    details?: string;
    suggestedActions?: string[];
}

export interface FailureDisplayProps {
    // Support both old Map format and new structured format
    readonly failureList?: Map<string, string>;
    readonly failures?: FailureItem[];
    readonly title?: string;
    readonly collapsible?: boolean;
    readonly defaultExpanded?: boolean;
    readonly showSummary?: boolean;
    // eslint-disable-next-line no-unused-vars
    readonly onRetry?: (failureId: string) => void;
}

// Error message patterns and suggested actions
const ERROR_PATTERNS: { pattern: RegExp; severity: FailureSeverity; suggestions: string[] }[] = [
    {
        pattern: /sequence.*not found/i,
        severity: 'error',
        suggestions: [
            'Verify the sequence identifier is correct',
            'Check if the sequence exists in the database',
            'Try searching with an alternative identifier',
        ],
    },
    {
        pattern: /timeout|timed out/i,
        severity: 'warning',
        suggestions: [
            'The server may be experiencing high load',
            'Try again in a few minutes',
            'Consider submitting fewer sequences at once',
        ],
    },
    {
        pattern: /network|connection/i,
        severity: 'warning',
        suggestions: [
            'Check your internet connection',
            'The external database may be temporarily unavailable',
            'Try again in a few minutes',
        ],
    },
    {
        pattern: /invalid|malformed/i,
        severity: 'error',
        suggestions: [
            'Check the format of your input',
            'Ensure sequence identifiers are valid',
            'Review the API documentation for correct format',
        ],
    },
];

function categorizeError(message: string): { severity: FailureSeverity; suggestions: string[] } {
    for (const { pattern, severity, suggestions } of ERROR_PATTERNS) {
        if (pattern.test(message)) {
            return { severity, suggestions };
        }
    }
    return {
        severity: 'error',
        suggestions: ['Contact support if this issue persists'],
    };
}

export const FailureDisplay = ({
    failureList,
    failures,
    title = 'Processing Issues',
    collapsible = true,
    defaultExpanded = true,
    showSummary = true,
    onRetry,
}: FailureDisplayProps) => {
    const [expandedItems, setExpandedItems] = useState<Set<string>>(
        defaultExpanded ? new Set(['all']) : new Set()
    );

    // Convert legacy Map format to structured format
    const normalizedFailures: FailureItem[] = useMemo(() => {
        if (failures) return failures;

        if (!failureList || failureList.size === 0) return [];

        return Array.from(failureList.entries()).map(([id, message]) => {
            const { severity, suggestions } = categorizeError(message);
            return {
                id,
                message,
                severity,
                suggestedActions: suggestions,
            };
        });
    }, [failures, failureList]);

    const summary = useMemo(() => {
        const errors = normalizedFailures.filter(f => f.severity === 'error').length;
        const warnings = normalizedFailures.filter(f => f.severity === 'warning').length;
        return { errors, warnings, total: normalizedFailures.length };
    }, [normalizedFailures]);

    const toggleItem = (id: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedItems(new Set(normalizedFailures.map(f => f.id)));
    };

    const collapseAll = () => {
        setExpandedItems(new Set());
    };

    if (normalizedFailures.length === 0) {
        return (
            <div className={styles.emptyState}>
                <i className="pi pi-check-circle" />
                <span>All sequences processed successfully</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <div className={`${styles.severityIcon} ${styles[summary.errors > 0 ? 'error' : 'warning']}`}>
                        <i className={summary.errors > 0 ? 'pi pi-times-circle' : 'pi pi-exclamation-triangle'} />
                    </div>
                    <div>
                        <h3 className={styles.title}>{title}</h3>
                        <p className={styles.subtitle}>
                            {summary.total} issue{summary.total !== 1 ? 's' : ''} detected
                        </p>
                    </div>
                </div>
                {collapsible && normalizedFailures.length > 1 && (
                    <div className={styles.headerActions}>
                        <Button
                            label="Expand All"
                            icon="pi pi-angle-double-down"
                            className="p-button-text p-button-sm"
                            onClick={expandAll}
                        />
                        <Button
                            label="Collapse All"
                            icon="pi pi-angle-double-up"
                            className="p-button-text p-button-sm"
                            onClick={collapseAll}
                        />
                    </div>
                )}
            </div>

            {/* Summary Bar */}
            {showSummary && (
                <div className={styles.summaryBar}>
                    {summary.errors > 0 && (
                        <div className={`${styles.summaryItem} ${styles.error}`}>
                            <i className="pi pi-times-circle" />
                            <span>{summary.errors} error{summary.errors !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                    {summary.warnings > 0 && (
                        <div className={`${styles.summaryItem} ${styles.warning}`}>
                            <i className="pi pi-exclamation-triangle" />
                            <span>{summary.warnings} warning{summary.warnings !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Accordion */}
            <div className={styles.accordion} role="region" aria-label="Failure details">
                {normalizedFailures.map((failure) => {
                    const isExpanded = expandedItems.has(failure.id);

                    return (
                        <div key={failure.id} className={styles.accordionItem}>
                            <button
                                className={styles.accordionHeader}
                                onClick={() => toggleItem(failure.id)}
                                aria-expanded={isExpanded}
                                aria-controls={`failure-content-${failure.id}`}
                            >
                                <i
                                    className={`pi pi-chevron-right ${styles.accordionChevron} ${isExpanded ? styles.open : ''}`}
                                />
                                <span className={`${styles.accordionSeverity} ${styles[failure.severity]}`} />
                                <span className={styles.accordionTitle}>{failure.id}</span>
                                <span className={`${styles.accordionBadge} ${styles[failure.severity]}`}>
                                    {failure.severity}
                                </span>
                            </button>

                            {isExpanded && (
                                <div
                                    id={`failure-content-${failure.id}`}
                                    className={styles.accordionContent}
                                    role="region"
                                >
                                    <div className={styles.errorMessage}>
                                        <p className={styles.errorText}>{failure.message}</p>

                                        {failure.details && (
                                            <code className={styles.errorCode}>{failure.details}</code>
                                        )}

                                        {failure.suggestedActions && failure.suggestedActions.length > 0 && (
                                            <div className={styles.suggestedActions}>
                                                <div className={styles.suggestedActionsTitle}>
                                                    Suggested Actions
                                                </div>
                                                <ul className={styles.actionsList}>
                                                    {failure.suggestedActions.map((action, idx) => (
                                                        <li key={idx} className={styles.actionItem}>
                                                            <i className="pi pi-check" />
                                                            {action}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {onRetry && (
                                            <Button
                                                label="Retry"
                                                icon="pi pi-refresh"
                                                className="p-button-outlined p-button-sm"
                                                onClick={() => onRetry(failure.id)}
                                                style={{ marginTop: '0.75rem' }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FailureDisplay;
