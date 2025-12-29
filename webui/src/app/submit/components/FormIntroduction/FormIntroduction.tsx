'use client';

import React from 'react';
import styles from './FormIntroduction.module.css';

export const FormIntroduction: React.FC = () => {
    return (
        <div className={styles.introduction}>
            <div className={styles.content}>
                <h2 className={styles.title}>Create a New Alignment</h2>
                <p className={styles.description}>
                    PAVI allows you to compare protein sequences across different
                    species to identify conserved regions and evolutionary relationships.
                    Enter gene identifiers or paste sequences to get started.
                </p>

                <div className={styles.steps}>
                    <div className={styles.step}>
                        <span className={styles.stepNumber}>1</span>
                        <div className={styles.stepContent}>
                            <strong>Add Sequences</strong>
                            <span>Search for genes by ID or symbol, or paste FASTA sequences</span>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNumber}>2</span>
                        <div className={styles.stepContent}>
                            <strong>Select Transcripts</strong>
                            <span>Choose which transcript variants to include in the alignment</span>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNumber}>3</span>
                        <div className={styles.stepContent}>
                            <strong>Submit &amp; View Results</strong>
                            <span>Run the alignment and explore the interactive results</span>
                        </div>
                    </div>
                </div>

            </div>

            <div className={styles.illustration} aria-hidden="true">
                <svg
                    viewBox="0 0 200 120"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.alignmentIcon}
                >
                    {/* Stylized alignment visualization */}
                    <rect x="10" y="20" width="180" height="16" rx="2" fill="var(--agr-gray-100)" />
                    <rect x="10" y="20" width="160" height="16" rx="2" fill="var(--agr-primary)" opacity="0.3" />
                    <rect x="30" y="20" width="40" height="16" fill="var(--agr-primary)" opacity="0.6" />
                    <rect x="100" y="20" width="30" height="16" fill="var(--agr-primary)" opacity="0.6" />

                    <rect x="10" y="44" width="180" height="16" rx="2" fill="var(--agr-gray-100)" />
                    <rect x="10" y="44" width="150" height="16" rx="2" fill="var(--agr-secondary)" opacity="0.3" />
                    <rect x="30" y="44" width="40" height="16" fill="var(--agr-secondary)" opacity="0.6" />
                    <rect x="100" y="44" width="30" height="16" fill="var(--agr-secondary)" opacity="0.6" />

                    <rect x="10" y="68" width="180" height="16" rx="2" fill="var(--agr-gray-100)" />
                    <rect x="10" y="68" width="170" height="16" rx="2" fill="var(--agr-accent)" opacity="0.3" />
                    <rect x="30" y="68" width="40" height="16" fill="var(--agr-accent)" opacity="0.6" />
                    <rect x="100" y="68" width="30" height="16" fill="var(--agr-accent)" opacity="0.6" />

                    {/* Conservation indicator */}
                    <rect x="30" y="92" width="40" height="8" rx="2" fill="var(--agr-success)" opacity="0.8" />
                    <rect x="100" y="92" width="30" height="8" rx="2" fill="var(--agr-success)" opacity="0.8" />
                    <text x="50" y="115" fontSize="8" fill="var(--agr-gray-600)" textAnchor="middle">Conserved</text>
                    <text x="115" y="115" fontSize="8" fill="var(--agr-gray-600)" textAnchor="middle">Conserved</text>
                </svg>
            </div>
        </div>
    );
};
