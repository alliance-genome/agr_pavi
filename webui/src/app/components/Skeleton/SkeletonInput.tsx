'use client';

import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonInputProps {
    showLabel?: boolean;
    labelWidth?: string;
    width?: string | number;
    height?: string | number;
    className?: string;
    animated?: boolean;
    'aria-label'?: string;
}

export function SkeletonInput({
    showLabel = true,
    labelWidth = '30%',
    width = '100%',
    height,
    className = '',
    animated = true,
    'aria-label': ariaLabel = 'Loading input field...',
}: SkeletonInputProps) {
    const skeletonClass = animated ? styles.skeleton : '';

    const inputStyle: React.CSSProperties = {
        width: typeof width === 'number' ? `${width}px` : width,
        ...(height ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    };

    if (showLabel) {
        return (
            <div
                className={`${styles.inputWithLabel} ${className}`}
                role="status"
                aria-label={ariaLabel}
                aria-busy="true"
            >
                <div
                    className={`${skeletonClass} ${styles.inputLabel}`}
                    style={{ width: labelWidth }}
                />
                <div
                    className={`${skeletonClass} ${styles.input}`}
                    style={inputStyle}
                />
                <span className="sr-only">{ariaLabel}</span>
            </div>
        );
    }

    return (
        <div
            className={`${skeletonClass} ${styles.input} ${className}`}
            style={inputStyle}
            role="status"
            aria-label={ariaLabel}
            aria-busy="true"
        >
            <span className="sr-only">{ariaLabel}</span>
        </div>
    );
}

export default SkeletonInput;
