'use client';

import React from 'react';
import styles from '@/app/components/Skeleton/Skeleton.module.css';
import alignStyles from './AlignmentSkeleton.module.css';

export interface AlignmentSkeletonProps {
    rows?: number;
    animated?: boolean;
    'aria-label'?: string;
}

/**
 * Skeleton loading state for alignment viewer
 * Mimics the appearance of an MSA with sequence labels and alignment tracks
 */
export function AlignmentSkeleton({
    rows = 8,
    animated = true,
    'aria-label': ariaLabel = 'Loading alignment...',
}: AlignmentSkeletonProps) {
    const skeletonClass = animated ? styles.skeleton : '';

    return (
        <div
            className={alignStyles.container}
            role="status"
            aria-label={ariaLabel}
            aria-busy="true"
        >
            {/* Header with controls skeleton */}
            <div className={alignStyles.header}>
                <div className={alignStyles.controlGroup}>
                    <div className={`${skeletonClass} ${alignStyles.label}`} />
                    <div className={`${skeletonClass} ${alignStyles.dropdown}`} />
                </div>
                <div className={`${skeletonClass} ${alignStyles.sequenceCount}`} />
            </div>

            {/* Navigation ruler skeleton */}
            <div className={alignStyles.navigation}>
                <div className={`${skeletonClass} ${alignStyles.labelSpacer}`} />
                <div className={`${skeletonClass} ${alignStyles.ruler}`} />
            </div>

            {/* Alignment rows */}
            <div className={alignStyles.alignmentArea}>
                {Array.from({ length: rows }).map((_, index) => (
                    <div
                        key={index}
                        className={alignStyles.row}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className={`${skeletonClass} ${alignStyles.sequenceLabel}`} />
                        <div className={`${skeletonClass} ${alignStyles.sequenceTrack}`} />
                    </div>
                ))}
            </div>

            <span className="sr-only">{ariaLabel}</span>
        </div>
    );
}

export default AlignmentSkeleton;
