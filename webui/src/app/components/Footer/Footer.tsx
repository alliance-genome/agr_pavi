'use client';

import React from 'react';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer id="footer" className="agr-footer" role="contentinfo">
            <div className={styles.footerContent}>
                {/* Main footer grid */}
                <div className={styles.footerGrid}>
                    {/* About section */}
                    <div className={styles.footerSection}>
                        <h4 className={styles.sectionTitle}>About PAVI</h4>
                        <p className={styles.sectionText}>
                            The Protein Annotation and Variant Inspector (PAVI) provides
                            comparative protein sequence analysis and variant annotation
                            across model organisms.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className={styles.footerSection}>
                        <h4 className={styles.sectionTitle}>Quick Links</h4>
                        <ul className={styles.linkList}>
                            <li>
                                <a href="/submit">Submit New Job</a>
                            </li>
                            <li>
                                <a href="/jobs">View My Jobs</a>
                            </li>
                            <li>
                                <a
                                    href="https://www.alliancegenome.org/help"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Help & Documentation
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/alliance-genome/agr_pavi"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    GitHub Repository
                                </a>
                            </li>
                            <li>
                                <a href="/accessibility">
                                    Accessibility
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Alliance Resources */}
                    <div className={styles.footerSection}>
                        <h4 className={styles.sectionTitle}>Alliance Resources</h4>
                        <ul className={styles.linkList}>
                            <li>
                                <a
                                    href="https://www.alliancegenome.org"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Alliance Home
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://www.alliancegenome.org/search"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Gene Search
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://www.alliancegenome.org/downloads"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Data Downloads
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://www.alliancegenome.org/api"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    API Documentation
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Funding acknowledgment */}
                <div className={styles.funding}>
                    <p>
                        The Alliance of Genome Resources is supported by NIH grant
                        U24HG010859.
                    </p>
                </div>

                {/* Copyright bar */}
                <div className={styles.copyright}>
                    <p>
                        &copy; {currentYear}{' '}
                        <a
                            href="https://www.alliancegenome.org"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Alliance of Genome Resources
                        </a>
                        . All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};
