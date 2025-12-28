'use client';

import React, { Component, ReactNode, useState } from 'react';
import styles from './ErrorBoundary.module.css';

export interface ErrorInfo {
    componentStack: string;
}

export interface ErrorFallbackProps {
    error: Error;
    errorInfo?: ErrorInfo;
    resetError?: () => void;
    title?: string;
    message?: string;
    showDetails?: boolean;
    showReload?: boolean;
    showGoHome?: boolean;
    variant?: 'card' | 'inline' | 'fullPage';
    className?: string;
}

export function ErrorFallback({
    error,
    errorInfo,
    resetError,
    title = 'Something went wrong',
    message = 'We encountered an unexpected error. Please try again.',
    showDetails = process.env.NODE_ENV === 'development',
    showReload = true,
    showGoHome = true,
    variant = 'card',
    className = '',
}: ErrorFallbackProps) {
    const [detailsOpen, setDetailsOpen] = useState(false);

    const handleReload = () => {
        window.location.reload();
    };

    const handleGoHome = () => {
        window.location.href = '/';
    };

    const handleRetry = () => {
        if (resetError) {
            resetError();
        } else {
            handleReload();
        }
    };

    // Inline variant for smaller error displays
    if (variant === 'inline') {
        return (
            <div className={`${styles.inline} ${className}`} role="alert">
                <div className={styles.inlineContent}>
                    <i className={`pi pi-exclamation-triangle ${styles.inlineIcon}`} />
                    <div className={styles.inlineText}>
                        <h4 className={styles.inlineTitle}>{title}</h4>
                        <p className={styles.inlineMessage}>{error.message || message}</p>
                        {resetError && (
                            <button
                                className={styles.inlineAction}
                                onClick={handleRetry}
                                type="button"
                            >
                                Try again
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`
                ${styles.container}
                ${variant === 'fullPage' ? styles.fullPage : ''}
                ${className}
            `}
            role="alert"
        >
            <div className={styles.card}>
                <div className={`${styles.iconContainer} ${styles.iconError}`}>
                    <i className={`pi pi-exclamation-triangle ${styles.icon}`} />
                </div>

                <h2 className={styles.title}>{title}</h2>
                <p className={styles.message}>{message}</p>

                <div className={styles.actions}>
                    <button
                        className={styles.primaryButton}
                        onClick={handleRetry}
                        type="button"
                    >
                        <i className="pi pi-refresh" />
                        Try Again
                    </button>

                    {showGoHome && (
                        <button
                            className={styles.secondaryButton}
                            onClick={handleGoHome}
                            type="button"
                        >
                            <i className="pi pi-home" />
                            Go Home
                        </button>
                    )}

                    {showReload && (
                        <button
                            className={styles.secondaryButton}
                            onClick={handleReload}
                            type="button"
                        >
                            <i className="pi pi-sync" />
                            Reload Page
                        </button>
                    )}
                </div>

                {showDetails && (
                    <div className={styles.details}>
                        <button
                            className={styles.detailsToggle}
                            onClick={() => setDetailsOpen(!detailsOpen)}
                            type="button"
                            aria-expanded={detailsOpen}
                        >
                            <i className={`pi pi-chevron-${detailsOpen ? 'up' : 'down'}`} />
                            {detailsOpen ? 'Hide' : 'Show'} Error Details
                        </button>

                        {detailsOpen && (
                            <div className={styles.detailsContent}>
                                <div className={styles.errorInfo}>
                                    <span className={styles.errorInfoLabel}>Error: </span>
                                    {error.name}: {error.message}
                                </div>

                                {error.stack && (
                                    <pre className={styles.errorStack}>
                                        {error.stack}
                                    </pre>
                                )}

                                {errorInfo?.componentStack && (
                                    <>
                                        <div className={styles.errorInfo} style={{ marginTop: '1rem' }}>
                                            <span className={styles.errorInfoLabel}>Component Stack:</span>
                                        </div>
                                        <pre className={styles.errorStack}>
                                            {errorInfo.componentStack}
                                        </pre>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    FallbackComponent?: React.ComponentType<ErrorFallbackProps>;
    // eslint-disable-next-line no-unused-vars
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    // eslint-disable-next-line no-unused-vars
    onReset?: (details: { reason: 'imperative-api' }) => void;
    title?: string;
    message?: string;
    showDetails?: boolean;
    variant?: 'card' | 'inline' | 'fullPage';
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        const info: ErrorInfo = {
            componentStack: errorInfo.componentStack || '',
        };

        this.setState({ errorInfo: info });

        // Call optional error handler
        this.props.onError?.(error, info);

        // Log error in development
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', error);
            console.error('Component stack:', errorInfo.componentStack);
        }
    }

    resetError = (): void => {
        this.props.onReset?.({ reason: 'imperative-api' });
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        const { hasError, error, errorInfo } = this.state;
        const {
            children,
            fallback,
            FallbackComponent,
            title,
            message,
            showDetails,
            variant,
        } = this.props;

        if (hasError && error) {
            // Custom fallback element
            if (fallback !== undefined) {
                return fallback;
            }

            // Custom fallback component
            if (FallbackComponent) {
                return (
                    <FallbackComponent
                        error={error}
                        errorInfo={errorInfo || undefined}
                        resetError={this.resetError}
                        title={title}
                        message={message}
                        showDetails={showDetails}
                        variant={variant}
                    />
                );
            }

            // Default fallback
            return (
                <ErrorFallback
                    error={error}
                    errorInfo={errorInfo || undefined}
                    resetError={this.resetError}
                    title={title}
                    message={message}
                    showDetails={showDetails}
                    variant={variant}
                />
            );
        }

        return children;
    }
}

// Convenience wrapper for async boundaries
export interface AsyncBoundaryProps {
    children: ReactNode;
    loading?: ReactNode;
    fallback?: ReactNode;
    // eslint-disable-next-line no-unused-vars
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function AsyncBoundary({
    children,
    loading,
    fallback,
    onError,
}: AsyncBoundaryProps) {
    return (
        <ErrorBoundary fallback={fallback} onError={onError}>
            <React.Suspense fallback={loading || null}>
                {children}
            </React.Suspense>
        </ErrorBoundary>
    );
}

export default ErrorBoundary;
