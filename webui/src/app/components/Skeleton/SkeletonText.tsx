'use client';

import React from 'react';
import styles from './Skeleton.module.css';

export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
export type TextWidth = 'full' | 'threeQuarter' | 'half' | 'quarter' | 'third' | 'twoThird';

export interface SkeletonTextProps {
    size?: TextSize;
    width?: TextWidth;
    lines?: number;
    className?: string;
    animated?: boolean;
    'aria-label'?: string;
}

const sizeClasses: Record<TextSize, string> = {
    xs: styles.textXs,
    sm: styles.textSm,
    base: styles.textBase,
    lg: styles.textLg,
    xl: styles.textXl,
    '2xl': styles.text2xl,
    '3xl': styles.text3xl,
};

const widthClasses: Record<TextWidth, string> = {
    full: styles.widthFull,
    threeQuarter: styles.widthThreeQuarter,
    half: styles.widthHalf,
    quarter: styles.widthQuarter,
    third: styles.widthThird,
    twoThird: styles.widthTwoThird,
};

export function SkeletonText({
    size = 'base',
    width = 'full',
    lines = 1,
    className = '',
    animated = true,
    'aria-label': ariaLabel = 'Loading text...',
}: SkeletonTextProps) {
    if (lines > 1) {
        return (
            <div
                className={`${styles.paragraph} ${className}`}
                role="status"
                aria-label={ariaLabel}
                aria-busy="true"
            >
                {Array.from({ length: lines }).map((_, index) => (
                    <div
                        key={index}
                        className={`
                            ${animated ? styles.skeleton : ''}
                            ${styles.paragraphLine}
                            ${sizeClasses[size]}
                            ${index === lines - 1 ? '' : styles.widthFull}
                        `}
                        style={index === lines - 1 ? { width: '80%' } : undefined}
                    />
                ))}
                <span className="sr-only">{ariaLabel}</span>
            </div>
        );
    }

    return (
        <div
            className={`
                ${animated ? styles.skeleton : ''}
                ${styles.text}
                ${sizeClasses[size]}
                ${widthClasses[width]}
                ${className}
            `}
            role="status"
            aria-label={ariaLabel}
            aria-busy="true"
        >
            <span className="sr-only">{ariaLabel}</span>
        </div>
    );
}

export default SkeletonText;
