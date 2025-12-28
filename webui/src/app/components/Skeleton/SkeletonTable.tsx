'use client';

import React from 'react';
import styles from './Skeleton.module.css';

export type ColumnWidth = 'narrow' | 'normal' | 'wide';

export interface SkeletonTableColumn {
    width?: ColumnWidth;
}

export interface SkeletonTableProps {
    rows?: number;
    columns?: number | SkeletonTableColumn[];
    showHeader?: boolean;
    className?: string;
    animated?: boolean;
    'aria-label'?: string;
}

export function SkeletonTable({
    rows = 5,
    columns = 4,
    showHeader = true,
    className = '',
    animated = true,
    'aria-label': ariaLabel = 'Loading table...',
}: SkeletonTableProps) {
    const skeletonClass = animated ? styles.skeleton : '';

    // Normalize columns to array format
    const columnDefs: SkeletonTableColumn[] = typeof columns === 'number'
        ? Array.from({ length: columns }, () => ({ width: 'normal' as ColumnWidth }))
        : columns;

    const getColumnClass = (width?: ColumnWidth): string => {
        switch (width) {
            case 'narrow':
                return styles.tableCellNarrow;
            case 'wide':
                return styles.tableCellWide;
            default:
                return '';
        }
    };

    return (
        <div
            className={`${styles.table} ${className}`}
            role="status"
            aria-label={ariaLabel}
            aria-busy="true"
        >
            {showHeader && (
                <div className={`${styles.tableRow} ${styles.tableHeader}`}>
                    {columnDefs.map((col, index) => (
                        <div
                            key={`header-${index}`}
                            className={`${skeletonClass} ${styles.tableCell} ${getColumnClass(col.width)}`}
                        />
                    ))}
                </div>
            )}

            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className={styles.tableRow}>
                    {columnDefs.map((col, colIndex) => (
                        <div
                            key={`cell-${rowIndex}-${colIndex}`}
                            className={`${skeletonClass} ${styles.tableCell} ${getColumnClass(col.width)}`}
                        />
                    ))}
                </div>
            ))}

            <span className="sr-only">{ariaLabel}</span>
        </div>
    );
}

export default SkeletonTable;
