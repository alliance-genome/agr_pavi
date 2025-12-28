'use client';

import React, { useCallback, useId } from 'react';
import styles from './DisplayModeSelector.module.css';

export interface DisplayMode {
    id: string;
    label: string;
    icon?: string;
    description?: string;
    badge?: 'new' | 'beta' | 'recommended';
    disabled?: boolean;
}

export type TabVariant = 'tabs' | 'cards' | 'segmented';

export interface DisplayModeSelectorProps {
    modes: DisplayMode[];
    selectedMode: string;
    // eslint-disable-next-line no-unused-vars
    onModeChange: (modeId: string) => void;
    variant?: TabVariant;
    ariaLabel?: string;
    className?: string;
}

export function DisplayModeSelector({
    modes,
    selectedMode,
    onModeChange,
    variant = 'tabs',
    ariaLabel = 'Display mode selection',
    className = '',
}: DisplayModeSelectorProps) {
    const baseId = useId();

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent, currentIndex: number) => {
            const enabledModes = modes.filter(m => !m.disabled);
            const currentEnabledIndex = enabledModes.findIndex(m => m.id === modes[currentIndex].id);

            let newIndex = currentEnabledIndex;

            switch (event.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    event.preventDefault();
                    newIndex = (currentEnabledIndex + 1) % enabledModes.length;
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    event.preventDefault();
                    newIndex = currentEnabledIndex === 0
                        ? enabledModes.length - 1
                        : currentEnabledIndex - 1;
                    break;
                case 'Home':
                    event.preventDefault();
                    newIndex = 0;
                    break;
                case 'End':
                    event.preventDefault();
                    newIndex = enabledModes.length - 1;
                    break;
                default:
                    return;
            }

            const newMode = enabledModes[newIndex];
            onModeChange(newMode.id);

            // Focus the new tab
            const newTabElement = document.getElementById(`${baseId}-tab-${newMode.id}`);
            newTabElement?.focus();
        },
        [modes, onModeChange, baseId]
    );

    const getContainerClass = () => {
        switch (variant) {
            case 'cards':
                return styles.cardTabs;
            case 'segmented':
                return styles.segmentedTabs;
            default:
                return styles.tabContainer;
        }
    };

    const getTabClass = (mode: DisplayMode) => {
        const isActive = mode.id === selectedMode;
        const baseClass = variant === 'cards'
            ? styles.cardTab
            : variant === 'segmented'
                ? styles.segmentedTab
                : styles.tab;

        return `${baseClass} ${isActive ? styles.active : ''}`;
    };

    const renderBadge = (badge?: 'new' | 'beta' | 'recommended') => {
        if (!badge) return null;

        const labels = {
            new: 'New',
            beta: 'Beta',
            recommended: 'Recommended',
        };

        return (
            <span className={`${styles.tabBadge} ${styles[badge]}`}>
                {labels[badge]}
            </span>
        );
    };

    return (
        <div className={`${styles.container} ${className}`}>
            <div
                className={getContainerClass()}
                role="tablist"
                aria-label={ariaLabel}
            >
                {modes.map((mode, index) => (
                    <button
                        key={mode.id}
                        id={`${baseId}-tab-${mode.id}`}
                        role="tab"
                        aria-selected={mode.id === selectedMode}
                        aria-controls={`${baseId}-panel-${mode.id}`}
                        tabIndex={mode.id === selectedMode ? 0 : -1}
                        className={getTabClass(mode)}
                        onClick={() => !mode.disabled && onModeChange(mode.id)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        disabled={mode.disabled}
                    >
                        {mode.icon && (
                            <i className={`${styles.tabIcon} ${mode.icon}`} aria-hidden="true" />
                        )}
                        <span className={styles.tabLabel}>{mode.label}</span>
                        {mode.description && variant === 'cards' && (
                            <span className={styles.tabDescription}>{mode.description}</span>
                        )}
                        {renderBadge(mode.badge)}
                    </button>
                ))}
            </div>
        </div>
    );
}

// Pre-configured display modes for PAVI alignment views
export const ALIGNMENT_DISPLAY_MODES: DisplayMode[] = [
    {
        id: 'virtualized',
        label: 'Virtualized',
        icon: 'pi pi-bolt',
        description: 'High-performance view for large alignments',
        badge: 'recommended',
    },
    {
        id: 'interactive',
        label: 'Interactive',
        icon: 'pi pi-eye',
        description: 'Full-featured alignment visualization',
    },
    {
        id: 'text',
        label: 'Text',
        icon: 'pi pi-file',
        description: 'Plain text FASTA format',
    },
];

export default DisplayModeSelector;
