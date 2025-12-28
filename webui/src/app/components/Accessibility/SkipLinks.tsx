'use client';

import React from 'react';
import styles from './Accessibility.module.css';

interface SkipLink {
    id: string;
    label: string;
}

interface SkipLinksProps {
    links?: SkipLink[];
}

const defaultLinks: SkipLink[] = [
    { id: 'main-content', label: 'Skip to main content' },
    { id: 'main-navigation', label: 'Skip to navigation' },
    { id: 'footer', label: 'Skip to footer' },
];

export function SkipLinks({ links = defaultLinks }: SkipLinksProps) {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <nav className={styles.skipLinks} aria-label="Skip links">
            {links.map((link) => (
                <a
                    key={link.id}
                    href={`#${link.id}`}
                    className={styles.skipLink}
                    onClick={(e) => handleClick(e, link.id)}
                >
                    {link.label}
                </a>
            ))}
        </nav>
    );
}
