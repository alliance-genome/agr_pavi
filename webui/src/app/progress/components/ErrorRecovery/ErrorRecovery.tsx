'use client';

import React from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import styles from './ErrorRecovery.module.css';

export interface ErrorDetails {
    code?: string;
    message: string;
    details?: string;
    timestamp?: Date;
    step?: string;
    recoverable?: boolean;
    suggestions?: string[];
}

interface ErrorRecoveryProps {
    error: ErrorDetails;
    onRetry?: () => void;
    // eslint-disable-next-line no-unused-vars
    onRetryFromStep?: (step: string) => void;
    onDownloadLogs?: () => void;
    onReportIssue?: () => void;
    onStartNew?: () => void;
    isRetrying?: boolean;
    availableRetrySteps?: string[];
}

export function ErrorRecovery({
    error,
    onRetry,
    onRetryFromStep,
    onDownloadLogs,
    onReportIssue,
    onStartNew,
    isRetrying = false,
    availableRetrySteps = [],
}: ErrorRecoveryProps) {
    const getErrorIcon = () => {
        if (error.code?.startsWith('TIMEOUT')) return 'pi-clock';
        if (error.code?.startsWith('NETWORK')) return 'pi-wifi';
        if (error.code?.startsWith('VALIDATION')) return 'pi-exclamation-triangle';
        if (error.code?.startsWith('SERVER')) return 'pi-server';
        return 'pi-times-circle';
    };

    const getErrorType = () => {
        if (error.code?.startsWith('TIMEOUT')) return 'Timeout Error';
        if (error.code?.startsWith('NETWORK')) return 'Network Error';
        if (error.code?.startsWith('VALIDATION')) return 'Validation Error';
        if (error.code?.startsWith('SERVER')) return 'Server Error';
        return 'Processing Error';
    };

    return (
        <Card className={styles.container}>
            <div className={styles.header}>
                <div className={styles.errorIcon}>
                    <i className={`pi ${getErrorIcon()}`} />
                </div>
                <div className={styles.errorInfo}>
                    <h3 className={styles.errorType}>{getErrorType()}</h3>
                    {error.code && (
                        <span className={styles.errorCode}>Error Code: {error.code}</span>
                    )}
                </div>
            </div>

            <div className={styles.messageSection}>
                <p className={styles.message}>{error.message}</p>
                {error.details && (
                    <Panel
                        header="Technical Details"
                        toggleable
                        collapsed
                        className={styles.detailsPanel}
                    >
                        <pre className={styles.details}>{error.details}</pre>
                    </Panel>
                )}
            </div>

            {error.step && (
                <div className={styles.stepInfo}>
                    <i className="pi pi-map-marker" />
                    <span>Failed at step: <strong>{error.step}</strong></span>
                </div>
            )}

            {error.timestamp && (
                <div className={styles.timestamp}>
                    <i className="pi pi-calendar" />
                    <span>{error.timestamp.toLocaleString()}</span>
                </div>
            )}

            {error.suggestions && error.suggestions.length > 0 && (
                <div className={styles.suggestions}>
                    <h4 className={styles.suggestionsTitle}>
                        <i className="pi pi-lightbulb" />
                        Suggestions
                    </h4>
                    <ul className={styles.suggestionsList}>
                        {error.suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={styles.actions}>
                {error.recoverable !== false && onRetry && (
                    <Button
                        label={isRetrying ? 'Retrying...' : 'Retry Job'}
                        icon={isRetrying ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
                        onClick={onRetry}
                        disabled={isRetrying}
                        className={styles.primaryAction}
                    />
                )}

                {availableRetrySteps.length > 0 && onRetryFromStep && (
                    <div className={styles.retrySteps}>
                        <span className={styles.retryLabel}>Or retry from:</span>
                        {availableRetrySteps.map((step) => (
                            <Button
                                key={step}
                                label={step}
                                icon="pi pi-replay"
                                className="p-button-outlined p-button-sm"
                                onClick={() => onRetryFromStep(step)}
                                disabled={isRetrying}
                            />
                        ))}
                    </div>
                )}

                <div className={styles.secondaryActions}>
                    {onDownloadLogs && (
                        <Button
                            label="Download Logs"
                            icon="pi pi-download"
                            className="p-button-text"
                            onClick={onDownloadLogs}
                        />
                    )}
                    {onReportIssue && (
                        <Button
                            label="Report Issue"
                            icon="pi pi-flag"
                            className="p-button-text"
                            onClick={onReportIssue}
                        />
                    )}
                    {onStartNew && (
                        <Button
                            label="Start New Job"
                            icon="pi pi-plus"
                            className="p-button-text"
                            onClick={onStartNew}
                        />
                    )}
                </div>
            </div>
        </Card>
    );
}
