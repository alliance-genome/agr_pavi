'use client';

import React from 'react';
import styles from './ValidationMessage.module.css';

export type ValidationSeverity = 'error' | 'warning' | 'info' | 'success';

export interface ValidationMessageProps {
    message: string;
    severity?: ValidationSeverity;
    fieldId?: string;
    showIcon?: boolean;
    className?: string;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
    message,
    severity = 'error',
    fieldId,
    showIcon = true,
    className = '',
}) => {
    const getIcon = () => {
        switch (severity) {
            case 'error':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                );
            case 'info':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                );
            case 'success':
                return (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                );
        }
    };

    return (
        <div
            className={`${styles.validation} ${styles[severity]} ${className}`}
            role={severity === 'error' ? 'alert' : 'status'}
            aria-live={severity === 'error' ? 'assertive' : 'polite'}
            id={fieldId ? `${fieldId}-validation` : undefined}
        >
            {showIcon && (
                <span className={styles.icon} aria-hidden="true">
                    {getIcon()}
                </span>
            )}
            <span className={styles.message}>{message}</span>
        </div>
    );
};

// Validation summary for forms with multiple errors
interface ValidationSummaryProps {
    errors: string[];
    warnings?: string[];
    title?: string;
    className?: string;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
    errors,
    warnings = [],
    title = 'Please fix the following issues:',
    className = '',
}) => {
    if (errors.length === 0 && warnings.length === 0) {
        return null;
    }

    return (
        <div className={`${styles.summary} ${className}`} role="alert" aria-live="polite">
            {errors.length > 0 && (
                <div className={styles.summarySection}>
                    <h4 className={styles.summaryTitle}>
                        <span className={`${styles.icon} ${styles.error}`} aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </span>
                        {title}
                    </h4>
                    <ul className={styles.errorList}>
                        {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}
            {warnings.length > 0 && (
                <div className={`${styles.summarySection} ${styles.warningSection}`}>
                    <h4 className={styles.summaryTitle}>
                        <span className={`${styles.icon} ${styles.warning}`} aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </span>
                        Warnings:
                    </h4>
                    <ul className={styles.errorList}>
                        {warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// Inline validation for form fields
interface InlineValidationProps {
    isValid: boolean;
    errorMessage?: string;
    successMessage?: string;
    showSuccess?: boolean;
    className?: string;
}

export const InlineValidation: React.FC<InlineValidationProps> = ({
    isValid,
    errorMessage,
    successMessage,
    showSuccess = false,
    className = '',
}) => {
    if (isValid && showSuccess && successMessage) {
        return (
            <ValidationMessage
                message={successMessage}
                severity="success"
                className={className}
            />
        );
    }

    if (!isValid && errorMessage) {
        return (
            <ValidationMessage
                message={errorMessage}
                severity="error"
                className={className}
            />
        );
    }

    return null;
};
