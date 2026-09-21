'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GlossaryTerm } from '../helpContent';
import styles from '../help.module.css';

interface GlossaryProps {
    terms: GlossaryTerm[];
    highlightTerm?: string;
}

export function Glossary({ terms, highlightTerm }: GlossaryProps) {
    const [activeLetter, setActiveLetter] = useState<string>('A');
    const termRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Group terms by first letter
    const groupedTerms = useMemo(() => {
        const groups: Record<string, GlossaryTerm[]> = {};
        const sortedTerms = [...terms].sort((a, b) => a.term.localeCompare(b.term));

        sortedTerms.forEach(term => {
            const firstLetter = term.term[0].toUpperCase();
            if (!groups[firstLetter]) {
                groups[firstLetter] = [];
            }
            groups[firstLetter].push(term);
        });

        return groups;
    }, [terms]);

    const availableLetters = Object.keys(groupedTerms).sort();

    // Scroll to highlighted term
    useEffect(() => {
        if (highlightTerm) {
            const normalizedTerm = highlightTerm.toLowerCase();
            const matchingTerm = terms.find(t => t.term.toLowerCase() === normalizedTerm);
            if (matchingTerm) {
                setActiveLetter(matchingTerm.term[0].toUpperCase());
                setTimeout(() => {
                    termRefs.current[matchingTerm.term]?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }, 100);
            }
        }
    }, [highlightTerm, terms]);

    return (
        <div className={styles.glossaryContainer}>
            {/* Alphabet navigation */}
            <nav className={styles.glossaryNav} aria-label="Glossary alphabet navigation">
                {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(letter => {
                    const isAvailable = availableLetters.includes(letter);
                    const isActive = activeLetter === letter;

                    return (
                        <button
                            key={letter}
                            className={`${styles.glossaryLetter} ${isActive ? styles.active : ''} ${!isAvailable ? styles.disabled : ''}`}
                            onClick={() => isAvailable && setActiveLetter(letter)}
                            disabled={!isAvailable}
                            aria-label={`Jump to terms starting with ${letter}`}
                            aria-pressed={isActive}
                        >
                            {letter}
                        </button>
                    );
                })}
            </nav>

            {/* Terms list */}
            <div className={styles.glossaryTerms}>
                {groupedTerms[activeLetter]?.map(term => (
                    <div
                        key={term.term}
                        ref={(el) => { termRefs.current[term.term] = el; }}
                        className={`${styles.glossaryTerm} ${highlightTerm?.toLowerCase() === term.term.toLowerCase() ? styles.highlighted : ''}`}
                        id={`glossary-${term.term.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                        <dt className={styles.termTitle}>{term.term}</dt>
                        <dd className={styles.termDefinition}>
                            {term.definition}
                            {term.relatedTerms && term.relatedTerms.length > 0 && (
                                <div className={styles.relatedTerms}>
                                    <span className={styles.relatedLabel}>Related: </span>
                                    {term.relatedTerms.map((related, index) => (
                                        <React.Fragment key={related}>
                                            <button
                                                className={styles.relatedLink}
                                                onClick={() => {
                                                    const matchingTerm = terms.find(t => t.term === related);
                                                    if (matchingTerm) {
                                                        setActiveLetter(matchingTerm.term[0].toUpperCase());
                                                        setTimeout(() => {
                                                            termRefs.current[related]?.scrollIntoView({
                                                                behavior: 'smooth',
                                                                block: 'center',
                                                            });
                                                        }, 100);
                                                    }
                                                }}
                                            >
                                                {related}
                                            </button>
                                            {index < term.relatedTerms!.length - 1 && ', '}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </dd>
                    </div>
                ))}

                {!groupedTerms[activeLetter] && (
                    <p className={styles.noTerms}>No terms starting with &quot;{activeLetter}&quot;</p>
                )}
            </div>
        </div>
    );
}
