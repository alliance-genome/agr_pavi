'use client';

import React from 'react';
import { Card } from 'primereact/card';
import { Breadcrumbs } from '../components/Breadcrumbs';
import styles from './accessibility.module.css';

export default function AccessibilityPage() {
    return (
        <div className={styles.container}>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'Accessibility Statement' },
                ]}
            />

            <h1 className={styles.title}>Accessibility Statement</h1>

            <div className={styles.content}>
                <Card className={styles.section}>
                    <h2>Our Commitment</h2>
                    <p>
                        The Alliance of Genome Resources is committed to ensuring digital accessibility
                        for people with disabilities. We are continually improving the user experience
                        for everyone and applying the relevant accessibility standards.
                    </p>
                </Card>

                <Card className={styles.section}>
                    <h2>Conformance Status</h2>
                    <p>
                        PAVI (Protein Annotation and Variant Inspector) aims to conform to the
                        Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. These guidelines
                        explain how to make web content more accessible for people with disabilities.
                    </p>
                </Card>

                <Card className={styles.section}>
                    <h2>Accessibility Features</h2>
                    <ul className={styles.featureList}>
                        <li>
                            <strong>Keyboard Navigation:</strong> All interactive elements are accessible
                            via keyboard. Press <kbd>Tab</kbd> to navigate forward and{' '}
                            <kbd>Shift + Tab</kbd> to navigate backward.
                        </li>
                        <li>
                            <strong>Skip Links:</strong> Skip navigation links are provided to allow
                            keyboard users to bypass repetitive content.
                        </li>
                        <li>
                            <strong>Keyboard Shortcuts:</strong> Press <kbd>?</kbd> to view available
                            keyboard shortcuts at any time.
                        </li>
                        <li>
                            <strong>Focus Indicators:</strong> Visible focus indicators are displayed
                            on all interactive elements when navigating with a keyboard.
                        </li>
                        <li>
                            <strong>Screen Reader Support:</strong> Semantic HTML and ARIA landmarks
                            are used to provide context and structure for assistive technologies.
                        </li>
                        <li>
                            <strong>Color Contrast:</strong> Text and interactive elements meet WCAG
                            2.1 Level AA contrast requirements.
                        </li>
                        <li>
                            <strong>Reduced Motion:</strong> Animations respect the{' '}
                            <code>prefers-reduced-motion</code> system setting.
                        </li>
                        <li>
                            <strong>Responsive Design:</strong> The interface adapts to different
                            screen sizes and zoom levels up to 200%.
                        </li>
                    </ul>
                </Card>

                <Card className={styles.section}>
                    <h2>Known Limitations</h2>
                    <p>
                        While we strive for full accessibility, some content may have limitations:
                    </p>
                    <ul>
                        <li>
                            Complex protein alignment visualizations may require additional time
                            for screen reader users to navigate.
                        </li>
                        <li>
                            Some third-party content or embedded resources may not fully conform
                            to accessibility standards.
                        </li>
                    </ul>
                </Card>

                <Card className={styles.section}>
                    <h2>Feedback</h2>
                    <p>
                        We welcome your feedback on the accessibility of PAVI. Please let us know
                        if you encounter accessibility barriers:
                    </p>
                    <ul>
                        <li>
                            Email:{' '}
                            <a href="mailto:help@alliancegenome.org">help@alliancegenome.org</a>
                        </li>
                        <li>
                            GitHub:{' '}
                            <a
                                href="https://github.com/alliance-genome/agr_pavi/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Report an issue
                            </a>
                        </li>
                    </ul>
                    <p>
                        We try to respond to accessibility feedback within 5 business days.
                    </p>
                </Card>

                <Card className={styles.section}>
                    <h2>Technical Specifications</h2>
                    <p>
                        PAVI relies on the following technologies to work with the particular
                        combination of web browser and any assistive technologies or plugins
                        installed on your computer:
                    </p>
                    <ul>
                        <li>HTML5</li>
                        <li>WAI-ARIA</li>
                        <li>CSS</li>
                        <li>JavaScript</li>
                    </ul>
                    <p>
                        These technologies are relied upon for conformance with the accessibility
                        standards used.
                    </p>
                </Card>

                <Card className={styles.section}>
                    <h2>Assessment Approach</h2>
                    <p>
                        The Alliance of Genome Resources assessed the accessibility of PAVI by
                        the following approaches:
                    </p>
                    <ul>
                        <li>Self-evaluation using automated testing tools</li>
                        <li>Manual testing with keyboard navigation</li>
                        <li>Testing with screen readers (NVDA, VoiceOver)</li>
                        <li>Review of WCAG 2.1 Level AA success criteria</li>
                    </ul>
                </Card>

                <p className={styles.lastUpdated}>
                    This statement was last updated on December 2025.
                </p>
            </div>
        </div>
    );
}
