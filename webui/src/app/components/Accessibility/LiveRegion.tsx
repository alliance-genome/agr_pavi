'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import styles from './Accessibility.module.css';

type Politeness = 'polite' | 'assertive';

interface LiveRegionContextType {
    // eslint-disable-next-line no-unused-vars
    announce: (message: string, politeness?: Politeness) => void;
}

const LiveRegionContext = createContext<LiveRegionContextType | null>(null);

export function useLiveRegion() {
    const context = useContext(LiveRegionContext);
    if (!context) {
        throw new Error('useLiveRegion must be used within a LiveRegionProvider');
    }
    return context;
}

interface LiveRegionProviderProps {
    children: React.ReactNode;
}

export function LiveRegionProvider({ children }: LiveRegionProviderProps) {
    const [politeMessage, setPoliteMessage] = useState('');
    const [assertiveMessage, setAssertiveMessage] = useState('');

    const announce = useCallback((message: string, politeness: Politeness = 'polite') => {

        // Clear the message first to ensure screen readers pick up repeated announcements
        if (politeness === 'assertive') {
            setAssertiveMessage('');
            setTimeout(() => setAssertiveMessage(message), 50);
        } else {
            setPoliteMessage('');
            setTimeout(() => setPoliteMessage(message), 50);
        }

        // Clear the message after a delay
        setTimeout(() => {
            if (politeness === 'assertive') {
                setAssertiveMessage('');
            } else {
                setPoliteMessage('');
            }
        }, 5000);
    }, []);

    return (
        <LiveRegionContext.Provider value={{ announce }}>
            {children}
            {/* Polite announcements - used for status updates */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className={styles.srOnly}
            >
                {politeMessage}
            </div>
            {/* Assertive announcements - used for important alerts */}
            <div
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                className={styles.srOnly}
            >
                {assertiveMessage}
            </div>
        </LiveRegionContext.Provider>
    );
}
