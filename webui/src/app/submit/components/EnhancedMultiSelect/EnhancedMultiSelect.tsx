'use client';

import React, { useCallback, useMemo } from 'react';
import { MultiSelect, MultiSelectProps, MultiSelectChangeEvent } from 'primereact/multiselect';
import styles from './EnhancedMultiSelect.module.css';

interface EnhancedMultiSelectProps<T> extends Omit<MultiSelectProps, 'onChange'> {
    value: T[];
    options: T[];
    optionLabel?: string;
    optionValue?: string;
    // eslint-disable-next-line no-unused-vars
    onChange: (value: T[]) => void;
    showSelectAll?: boolean;
    showCountBadge?: boolean;
    selectAllLabel?: string;
    clearAllLabel?: string;
    // eslint-disable-next-line no-unused-vars
    countBadgeTemplate?: (count: number, total: number) => string;
    emptyMessage?: string;
    loading?: boolean;
    maxDisplayItems?: number;
}

export function EnhancedMultiSelect<T>({
    value,
    options,
    optionLabel,
    optionValue,
    onChange,
    showSelectAll = true,
    showCountBadge = true,
    selectAllLabel = 'Select All',
    clearAllLabel = 'Clear All',
    countBadgeTemplate,
    emptyMessage = 'No items available',
    loading = false,
    maxDisplayItems = 3,
    className = '',
    placeholder,
    ...rest
}: EnhancedMultiSelectProps<T>) {
    const selectedCount = value?.length ?? 0;
    const totalCount = options?.length ?? 0;
    const allSelected = selectedCount > 0 && selectedCount === totalCount;

    const handleChange = useCallback(
        (e: MultiSelectChangeEvent) => {
            onChange(e.value);
        },
        [onChange]
    );

    const handleSelectAll = useCallback(() => {
        if (allSelected) {
            onChange([]);
        } else {
            onChange([...options]);
        }
    }, [allSelected, onChange, options]);

    const countBadgeText = useMemo(() => {
        if (countBadgeTemplate) {
            return countBadgeTemplate(selectedCount, totalCount);
        }
        return `${selectedCount}/${totalCount}`;
    }, [selectedCount, totalCount, countBadgeTemplate]);

    // Custom selected items template
    const selectedItemsTemplate = useCallback(
        (selected: T[]) => {
            if (!selected || selected.length === 0) {
                return <span className={styles.placeholder}>{placeholder || 'Select items'}</span>;
            }

            if (selected.length > maxDisplayItems) {
                return (
                    <span className={styles.selectedSummary}>
                        {selected.length} items selected
                    </span>
                );
            }

            const labels = selected.map((item) => {
                if (optionLabel && typeof item === 'object' && item !== null) {
                    return (item as Record<string, unknown>)[optionLabel];
                }
                return String(item);
            });

            return (
                <span className={styles.selectedItems}>
                    {labels.join(', ')}
                </span>
            );
        },
        [maxDisplayItems, optionLabel, placeholder]
    );

    // Custom panel header with select all
    const panelHeaderTemplate = useMemo(() => {
        if (!showSelectAll || totalCount === 0) {
            return undefined;
        }

        return (
            <div className={styles.panelHeader}>
                <button
                    type="button"
                    className={styles.selectAllButton}
                    onClick={handleSelectAll}
                >
                    <span className={styles.checkbox}>
                        {allSelected && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </span>
                    <span>{allSelected ? clearAllLabel : selectAllLabel}</span>
                </button>
                {showCountBadge && (
                    <span className={styles.countBadge}>{countBadgeText}</span>
                )}
            </div>
        );
    }, [showSelectAll, totalCount, handleSelectAll, allSelected, clearAllLabel, selectAllLabel, showCountBadge, countBadgeText]);

    // Empty message
    const emptyMessageText = useMemo(() => {
        if (loading) {
            return 'Loading...';
        }
        return emptyMessage;
    }, [loading, emptyMessage]);

    return (
        <div className={`${styles.container} ${className}`}>
            <MultiSelect
                value={value}
                options={options}
                optionLabel={optionLabel}
                optionValue={optionValue}
                onChange={handleChange}
                placeholder={placeholder}
                selectedItemTemplate={selectedItemsTemplate}
                panelHeaderTemplate={panelHeaderTemplate}
                emptyMessage={emptyMessageText}
                className={styles.multiSelect}
                showSelectAll={false} // We use our own
                disabled={loading}
                {...rest}
            />
            {showCountBadge && selectedCount > 0 && (
                <span
                    className={`${styles.externalBadge} ${allSelected ? styles.allSelected : ''}`}
                    aria-label={`${selectedCount} of ${totalCount} selected`}
                >
                    {selectedCount}
                </span>
            )}
        </div>
    );
}
