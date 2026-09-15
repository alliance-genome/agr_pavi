'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';
import { withBasePath } from '@/utils/basePath';

// WebUI version is inlined at build time from package.json (see next.config).
const WEBUI_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const [apiVersion, setApiVersion] = React.useState<string | null>(null);

    // Fetch the API's own version from its health endpoint.
    React.useEffect(() => {
        let cancelled = false;
        fetch(withBasePath('/api/health'))
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d?.version) setApiVersion(String(d.version)); })
            .catch(() => { /* version is best-effort; ignore failures */ });
        return () => { cancelled = true; };
    }, []);

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
                                <Link href="/submit">Submit New Job</Link>
                            </li>
                            <li>
                                <Link href="/jobs">View My Jobs</Link>
                            </li>
                            <li>
                                <Link href="/help/guide">User Guide</Link>
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
                                <Link href="/accessibility">
                                    Accessibility
                                </Link>
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
                    <p className={styles.version}>
                        WebUI v{WEBUI_VERSION}
                        {apiVersion ? ` · API v${apiVersion}` : ''}
                    </p>
                </div>
            </div>
        </footer>
    );
};
