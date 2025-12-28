'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import styles from './Accessibility.module.css';

interface Shortcut {
    keys: string[];
    description: string;
    category: string;
}

const shortcuts: Shortcut[] = [
    // Navigation
    { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Navigation' },
    { keys: ['g', 'h'], description: 'Go to home page', category: 'Navigation' },
    { keys: ['g', 's'], description: 'Go to submit page', category: 'Navigation' },
    { keys: ['/'], description: 'Focus search input', category: 'Navigation' },

    // Accessibility
    { keys: ['Tab'], description: 'Move to next focusable element', category: 'Accessibility' },
    { keys: ['Shift', 'Tab'], description: 'Move to previous focusable element', category: 'Accessibility' },
    { keys: ['Enter'], description: 'Activate focused element', category: 'Accessibility' },
    { keys: ['Escape'], description: 'Close modal or cancel action', category: 'Accessibility' },

    // Actions
    { keys: ['Alt', 's'], description: 'Submit form', category: 'Actions' },
    { keys: ['Alt', 'r'], description: 'Reset form', category: 'Actions' },
];

interface KeyboardShortcutsProps {
    customShortcuts?: Shortcut[];
}

export function KeyboardShortcuts({ customShortcuts = [] }: KeyboardShortcutsProps) {
    const [visible, setVisible] = useState(false);
    const [lastKey, setLastKey] = useState<string | null>(null);
    const [lastKeyTime, setLastKeyTime] = useState<number>(0);

    const allShortcuts = [...shortcuts, ...customShortcuts];
    const categories = [...new Set(allShortcuts.map(s => s.category))];

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.isContentEditable;

        // Show shortcuts modal with ?
        if (e.key === '?' && !isInputField) {
            e.preventDefault();
            setVisible(true);
            return;
        }

        // Close modal with Escape
        if (e.key === 'Escape' && visible) {
            setVisible(false);
            return;
        }

        // Handle two-key sequences (g + h, g + s)
        const now = Date.now();
        if (!isInputField) {
            if (lastKey === 'g' && now - lastKeyTime < 500) {
                if (e.key === 'h') {
                    e.preventDefault();
                    window.location.href = '/';
                } else if (e.key === 's') {
                    e.preventDefault();
                    window.location.href = '/submit';
                }
                setLastKey(null);
            } else if (e.key === 'g') {
                setLastKey('g');
                setLastKeyTime(now);
            }

            // Focus search with /
            if (e.key === '/' && !isInputField) {
                const searchInput = document.querySelector('input[type="search"], input[name="search"]') as HTMLInputElement;
                if (searchInput) {
                    e.preventDefault();
                    searchInput.focus();
                }
            }
        }
    }, [visible, lastKey, lastKeyTime]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const renderKey = (key: string) => (
        <kbd key={key} className={styles.kbd}>
            {key}
        </kbd>
    );

    return (
        <>
            <Button
                icon="pi pi-keyboard"
                className={`p-button-text p-button-rounded ${styles.shortcutsButton}`}
                onClick={() => setVisible(true)}
                aria-label="Show keyboard shortcuts"
                tooltip="Keyboard shortcuts (?)"
                tooltipOptions={{ position: 'bottom' }}
            />
            <Dialog
                header="Keyboard Shortcuts"
                visible={visible}
                onHide={() => setVisible(false)}
                className={styles.shortcutsDialog}
                modal
                dismissableMask
            >
                <div className={styles.shortcutsContent}>
                    {categories.map(category => (
                        <div key={category} className={styles.shortcutCategory}>
                            <h3>{category}</h3>
                            <dl className={styles.shortcutList}>
                                {allShortcuts
                                    .filter(s => s.category === category)
                                    .map((shortcut, index) => (
                                        <div key={index} className={styles.shortcutItem}>
                                            <dt className={styles.shortcutKeys}>
                                                {shortcut.keys.map((key, i) => (
                                                    <React.Fragment key={key}>
                                                        {i > 0 && <span className={styles.keyPlus}>+</span>}
                                                        {renderKey(key)}
                                                    </React.Fragment>
                                                ))}
                                            </dt>
                                            <dd className={styles.shortcutDescription}>
                                                {shortcut.description}
                                            </dd>
                                        </div>
                                    ))}
                            </dl>
                        </div>
                    ))}
                </div>
            </Dialog>
        </>
    );
}
