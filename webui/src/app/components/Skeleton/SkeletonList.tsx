'use client';

import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonListProps {
    items?: number;
    showIcon?: boolean;
    showSubtitle?: boolean;
    className?: string;
    animated?: boolean;
    'aria-label'?: string;
}

export function SkeletonList({
    items = 5,
    showIcon = true,
    showSubtitle = true,
    className = '',
    animated = true,
    'aria-label': ariaLabel = 'Loading list...',
}: SkeletonListProps) {
    const skeletonClass = animated ? styles.skeleton : '';

    return (
        <div
            className={`${styles.list} ${className}`}
            role="status"
            aria-label={ariaLabel}
            aria-busy="true"
        >
            {Array.from({ length: items }).map((_, index) => (
                <div key={index} className={styles.listItem}>
                    {showIcon && (
                        <div className={`${skeletonClass} ${styles.listItemIcon}`} />
                    )}
                    <div className={styles.listItemContent}>
                        <div className={`${skeletonClass} ${styles.listItemTitle}`} />
                        {showSubtitle && (
                            <div className={`${skeletonClass} ${styles.listItemSubtitle}`} />
                        )}
                    </div>
                </div>
            ))}
            <span className="sr-only">{ariaLabel}</span>
        </div>
    );
}

export default SkeletonList;
