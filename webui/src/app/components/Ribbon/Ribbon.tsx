import React from 'react';
import styles from './Ribbon.module.css';

// Environment ribbon shown in the top-right corner. Driven by the build-time
// env var NEXT_PUBLIC_ENV_RIBBON (e.g. "BETA" on production, "DEV" on the dev
// instance). Unset -> no ribbon.
const LABEL = process.env.NEXT_PUBLIC_ENV_RIBBON;

// Known environments get a distinct colour; anything else falls back to grey.
const RIBBON_COLORS: Record<string, string> = {
    BETA: '#e0781d', // amber/orange
    DEV: '#2563eb',  // blue
};

export const Ribbon: React.FC = () => {
    if (!LABEL) {
        return null;
    }
    const text = LABEL.toUpperCase();
    const color = RIBBON_COLORS[text] ?? '#6b7280';
    return (
        <div className={styles.ribbon} aria-hidden="true">
            <span style={{ backgroundColor: color }}>{text}</span>
        </div>
    );
};
