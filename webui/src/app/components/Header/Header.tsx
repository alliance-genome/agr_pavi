'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import styles from './Header.module.css';

export const Header: React.FC = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
        <header className="agr-header" role="banner">
            <div className="agr-header-content">
                <Link href="/" className={styles.logo}>
                    {/* Alliance of Genome Resources Logo */}
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        {/* Stylized double helix / DNA strand forming an "A" shape */}
                        <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3"/>
                        <path
                            d="M30 75 L50 25 L70 75 M38 58 L62 58"
                            stroke="currentColor"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                        {/* Small circles representing model organisms */}
                        <circle cx="25" cy="50" r="4" fill="currentColor" opacity="0.7"/>
                        <circle cx="75" cy="50" r="4" fill="currentColor" opacity="0.7"/>
                        <circle cx="50" cy="15" r="4" fill="currentColor" opacity="0.7"/>
                        <circle cx="50" cy="85" r="4" fill="currentColor" opacity="0.7"/>
                    </svg>
                    <div className={styles.logoText}>
                        <span className={styles.logoTitle}>PAVI</span>
                        <span className={styles.logoSubtitle}>Protein Annotations & Variants</span>
                    </div>
                </Link>

                {/* Mobile hamburger button */}
                <button
                    className={styles.mobileMenuButton}
                    onClick={toggleMobileMenu}
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={mobileMenuOpen}
                >
                    <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ''}`}></span>
                    <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ''}`}></span>
                    <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.open : ''}`}></span>
                </button>

                {/* Navigation */}
                <nav
                    id="main-navigation"
                    aria-label="Main navigation"
                    className={`agr-header-nav ${styles.nav} ${mobileMenuOpen ? styles.navOpen : ''}`}
                >
                    <Link href="/submit" onClick={() => setMobileMenuOpen(false)}>
                        Submit Job
                    </Link>
                    <Link href="/jobs" onClick={() => setMobileMenuOpen(false)}>
                        My Jobs
                    </Link>
                    <a
                        href="https://www.alliancegenome.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Alliance Home
                    </a>
                    <Link href="/help" onClick={() => setMobileMenuOpen(false)}>
                        Help
                    </Link>
                </nav>
            </div>
        </header>
    );
};
