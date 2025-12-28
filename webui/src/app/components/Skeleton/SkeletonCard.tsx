'use client';

import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonCardProps {
    showAvatar?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    bodyLines?: number;
    footerButtons?: number;
    className?: string;
    animated?: boolean;
    'aria-label'?: string;
}

export function SkeletonCard({
    showAvatar = true,
    showHeader = true,
    showFooter = false,
    bodyLines = 3,
    footerButtons = 2,
    className = '',
    animated = true,
    'aria-label': ariaLabel = 'Loading card...',
}: SkeletonCardProps) {
    const skeletonClass = animated ? styles.skeleton : '';

    return (
        <div
            className={`${styles.card} ${className}`}
            role="status"
            aria-label={ariaLabel}
            aria-busy="true"
        >
            {showHeader && (
                <div className={styles.cardHeader}>
                    {showAvatar && (
                        <div className={`${skeletonClass} ${styles.cardAvatar}`} />
                    )}
                    <div className={styles.cardTitle}>
                        <div className={`${skeletonClass} ${styles.cardTitleLine}`} />
                        <div className={`${skeletonClass} ${styles.cardSubtitleLine}`} />
                    </div>
                </div>
            )}

            <div className={styles.cardBody}>
                {Array.from({ length: bodyLines }).map((_, index) => (
                    <div
                        key={index}
                        className={`${skeletonClass} ${styles.cardBodyLine}`}
                        style={index === bodyLines - 1 ? { width: '75%' } : undefined}
                    />
                ))}
            </div>

            {showFooter && (
                <div className={styles.cardFooter}>
                    {Array.from({ length: footerButtons }).map((_, index) => (
                        <div
                            key={index}
                            className={`${skeletonClass} ${styles.button} ${styles.buttonSm}`}
                            style={{ width: '80px' }}
                        />
                    ))}
                </div>
            )}

            <span className="sr-only">{ariaLabel}</span>
        </div>
    );
}

export default SkeletonCard;
