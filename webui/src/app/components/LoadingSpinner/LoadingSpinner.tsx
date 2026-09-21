'use client';

import React from 'react';
import styles from './LoadingSpinner.module.css';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type SpinnerColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'white' | 'dark';
export type SpinnerVariant = 'spinner' | 'dots' | 'bar';

export interface LoadingSpinnerProps {
    size?: SpinnerSize;
    color?: SpinnerColor;
    variant?: SpinnerVariant;
    label?: string;
    showLabel?: boolean;
    overlay?: boolean;
    centered?: boolean;
    inline?: boolean;
    className?: string;
    'aria-label'?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
    xs: styles.xs,
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
    xl: styles.xl,
    xxl: styles.xxl,
};

const colorClasses: Record<SpinnerColor, string> = {
    primary: styles.primary,
    secondary: styles.secondary,
    success: styles.success,
    warning: styles.warning,
    danger: styles.danger,
    white: styles.white,
    dark: styles.dark,
};

const labelSizeClasses: Record<SpinnerSize, string> = {
    xs: styles.labelXs,
    sm: styles.labelSm,
    md: styles.label,
    lg: styles.labelLg,
    xl: styles.labelXl,
    xxl: styles.labelXxl,
};

export function LoadingSpinner({
    size = 'md',
    color = 'primary',
    variant = 'spinner',
    label,
    showLabel = false,
    overlay = false,
    centered = false,
    inline = false,
    className = '',
    'aria-label': ariaLabel,
}: LoadingSpinnerProps) {
    const accessibleLabel = ariaLabel || label || 'Loading...';

    const renderSpinner = () => {
        switch (variant) {
            case 'dots':
                return (
                    <div
                        className={`${styles.dots} ${size === 'sm' || size === 'xs' ? styles.dotsSm : ''} ${size === 'lg' || size === 'xl' || size === 'xxl' ? styles.dotsLg : ''}`}
                    >
                        <div className={styles.dot} />
                        <div className={styles.dot} />
                        <div className={styles.dot} />
                    </div>
                );

            case 'bar':
                return (
                    <div className={styles.bar}>
                        <div className={styles.barSegment} />
                        <div className={styles.barSegment} />
                        <div className={styles.barSegment} />
                        <div className={styles.barSegment} />
                    </div>
                );

            default:
                return (
                    <div
                        className={`${styles.spinner} ${sizeClasses[size]} ${colorClasses[color]}`}
                    />
                );
        }
    };

    const renderLabel = () => {
        if (!showLabel || !label) return null;
        return (
            <span className={`${styles.label} ${labelSizeClasses[size]}`}>
                {label}
            </span>
        );
    };

    // Overlay variant - full-screen loading
    if (overlay) {
        return (
            <div
                className={`${styles.overlay} ${className}`}
                role="status"
                aria-label={accessibleLabel}
                aria-busy="true"
            >
                <div className={styles.overlayContent}>
                    {renderSpinner()}
                    {label && <span className={styles.overlayLabel}>{label}</span>}
                </div>
                <span className="sr-only">{accessibleLabel}</span>
            </div>
        );
    }

    // Centered variant - takes full container space
    if (centered) {
        return (
            <div
                className={`${styles.centered} ${className}`}
                role="status"
                aria-label={accessibleLabel}
                aria-busy="true"
            >
                {renderSpinner()}
                {renderLabel()}
                <span className="sr-only">{accessibleLabel}</span>
            </div>
        );
    }

    // Inline variant
    if (inline) {
        return (
            <span
                className={`${styles.inline} ${className}`}
                role="status"
                aria-label={accessibleLabel}
                aria-busy="true"
            >
                {renderSpinner()}
                <span className="sr-only">{accessibleLabel}</span>
            </span>
        );
    }

    // Default container variant
    return (
        <div
            className={`${styles.container} ${className}`}
            role="status"
            aria-label={accessibleLabel}
            aria-busy="true"
        >
            {renderSpinner()}
            {renderLabel()}
            <span className="sr-only">{accessibleLabel}</span>
        </div>
    );
}

// Pre-configured variants for common use cases
export function ButtonSpinner({
    size = 'sm',
    color = 'white',
    className = '',
}: Pick<LoadingSpinnerProps, 'size' | 'color' | 'className'>) {
    return (
        <LoadingSpinner
            size={size}
            color={color}
            inline
            className={`${styles.buttonSpinner} ${className}`}
            aria-label="Loading"
        />
    );
}

export function PageLoader({
    label = 'Loading...',
    className = '',
}: Pick<LoadingSpinnerProps, 'label' | 'className'>) {
    return (
        <LoadingSpinner
            size="xl"
            color="primary"
            centered
            showLabel
            label={label}
            className={className}
        />
    );
}

export function InlineLoader({
    size = 'sm',
    color = 'primary',
    className = '',
}: Pick<LoadingSpinnerProps, 'size' | 'color' | 'className'>) {
    return (
        <LoadingSpinner
            size={size}
            color={color}
            inline
            className={className}
        />
    );
}

export default LoadingSpinner;
