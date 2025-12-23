'use client';

import Link from 'next/link';
import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="agr-header">
            <div className="agr-header-content">
                <Link href="/" className="agr-header-logo">
                    <svg width="32" height="32" viewBox="0 0 100 100" fill="currentColor">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6"/>
                        <text x="50" y="62" textAnchor="middle" fontSize="36" fontWeight="bold">P</text>
                    </svg>
                    <span>PAVI</span>
                </Link>
                <nav className="agr-header-nav">
                    <Link href="/submit">Submit Job</Link>
                    <a href="https://www.alliancegenome.org" target="_blank" rel="noopener noreferrer">
                        Alliance Home
                    </a>
                    <a href="https://www.alliancegenome.org/help" target="_blank" rel="noopener noreferrer">
                        Help
                    </a>
                </nav>
            </div>
        </header>
    );
};
