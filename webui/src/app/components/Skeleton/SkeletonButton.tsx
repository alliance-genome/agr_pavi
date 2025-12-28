'use client';

import React from 'react';
import styles from './Skeleton.module.css';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface SkeletonButtonProps {
    size?: ButtonSize;
    width?: string | number;
    iconOnly?: boolean;
    className?: string;
    animated?: boolean;
    'aria-label'?: string;
}

const sizeClasses: Record<ButtonSize, string> = {
    sm: styles.buttonSm,
    md: styles.buttonMd,
    lg: styles.buttonLg,
};

export function SkeletonButton({
    size = 'md',
    width,
    iconOnly = false,
    className = '',
    animated = true,
    'aria-label': ariaLabel = 'Loading button...',
}: SkeletonButtonProps) {
    const buttonClass = iconOnly ? styles.buttonIcon : styles.button;
    const sizeClass = iconOnly ? '' : sizeClasses[size];

    return (
        <div
            className={`
                ${animated ? styles.skeleton : ''}
                ${buttonClass}
                ${sizeClass}
                ${className}
            `}
            style={width ? { width: typeof width === 'number' ? `${width}px` : width } : undefined}
            role="status"
            aria-label={ariaLabel}
            aria-busy="true"
        >
            <span className="sr-only">{ariaLabel}</span>
        </div>
    );
}

export default SkeletonButton;
