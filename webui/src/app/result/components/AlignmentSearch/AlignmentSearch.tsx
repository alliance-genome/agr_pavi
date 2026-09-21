'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { OverlayPanel } from 'primereact/overlaypanel';
import styles from './AlignmentSearch.module.css';

export interface SearchMatch {
    sequenceId: string;
    sequenceName?: string;
    startPosition: number;
    endPosition: number;
    matchedText: string;
    context?: string; // surrounding sequence
}

export type SearchType = 'sequence' | 'pattern' | 'position' | 'variant';

export interface AlignmentSearchProps {
    sequences: Array<{
        id: string;
        name?: string;
        sequence: string;
    }>;
    variants?: Array<{
        id: string;
        position: number;
        hgvs?: string;
    }>;
    onSearchResults?: (_matches: SearchMatch[]) => void;
    onNavigateToMatch?: (_match: SearchMatch) => void;
    onHighlightMatches?: (_matches: SearchMatch[]) => void;
    placeholder?: string;
    className?: string;
}

const SEARCH_TYPES = [
    { value: 'sequence', label: 'Sequence', icon: 'pi pi-align-left' },
    { value: 'pattern', label: 'Pattern (Regex)', icon: 'pi pi-code' },
    { value: 'position', label: 'Position', icon: 'pi pi-hashtag' },
    { value: 'variant', label: 'Variant', icon: 'pi pi-bolt' },
];

export function AlignmentSearch({
    sequences,
    variants = [],
    onSearchResults,
    onNavigateToMatch,
    onHighlightMatches,
    placeholder = 'Search alignment...',
    className = '',
}: AlignmentSearchProps) {
    const [query, setQuery] = useState('');
    const [searchType, setSearchType] = useState<SearchType>('sequence');
    const [matches, setMatches] = useState<SearchMatch[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const resultsRef = useRef<OverlayPanel>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const performSearch = useCallback(() => {
        if (!query.trim()) {
            setMatches([]);
            setError(null);
            onSearchResults?.([]);
            onHighlightMatches?.([]);
            return;
        }

        setError(null);

        try {
            const newMatches: SearchMatch[] = [];

            switch (searchType) {
                case 'sequence': {
                    const searchTerm = query.toUpperCase();
                    for (const seq of sequences) {
                        const upperSeq = seq.sequence.toUpperCase();
                        let startIdx = 0;
                        let foundIdx: number;

                        while ((foundIdx = upperSeq.indexOf(searchTerm, startIdx)) !== -1) {
                            const contextStart = Math.max(0, foundIdx - 5);
                            const contextEnd = Math.min(seq.sequence.length, foundIdx + searchTerm.length + 5);

                            newMatches.push({
                                sequenceId: seq.id,
                                sequenceName: seq.name,
                                startPosition: foundIdx + 1, // 1-based
                                endPosition: foundIdx + searchTerm.length,
                                matchedText: seq.sequence.substring(foundIdx, foundIdx + searchTerm.length),
                                context: seq.sequence.substring(contextStart, contextEnd),
                            });
                            startIdx = foundIdx + 1;
                        }
                    }
                    break;
                }

                case 'pattern': {
                    try {
                        const regex = new RegExp(query, 'gi');
                        for (const seq of sequences) {
                            let match: RegExpExecArray | null;
                            while ((match = regex.exec(seq.sequence)) !== null) {
                                const contextStart = Math.max(0, match.index - 5);
                                const contextEnd = Math.min(seq.sequence.length, match.index + match[0].length + 5);

                                newMatches.push({
                                    sequenceId: seq.id,
                                    sequenceName: seq.name,
                                    startPosition: match.index + 1,
                                    endPosition: match.index + match[0].length,
                                    matchedText: match[0],
                                    context: seq.sequence.substring(contextStart, contextEnd),
                                });
                            }
                        }
                    } catch {
                        setError('Invalid regular expression pattern');
                    }
                    break;
                }

                case 'position': {
                    const position = parseInt(query, 10);
                    if (isNaN(position) || position < 1) {
                        setError('Please enter a valid position number');
                    } else {
                        for (const seq of sequences) {
                            if (position <= seq.sequence.length) {
                                const contextStart = Math.max(0, position - 6);
                                const contextEnd = Math.min(seq.sequence.length, position + 5);

                                newMatches.push({
                                    sequenceId: seq.id,
                                    sequenceName: seq.name,
                                    startPosition: position,
                                    endPosition: position,
                                    matchedText: seq.sequence[position - 1],
                                    context: seq.sequence.substring(contextStart, contextEnd),
                                });
                            }
                        }
                    }
                    break;
                }

                case 'variant': {
                    const searchTerm = query.toLowerCase();
                    const matchingVariants = variants.filter(v =>
                        v.id.toLowerCase().includes(searchTerm) ||
                        v.hgvs?.toLowerCase().includes(searchTerm)
                    );

                    for (const variant of matchingVariants) {
                        for (const seq of sequences) {
                            if (variant.position <= seq.sequence.length) {
                                const contextStart = Math.max(0, variant.position - 6);
                                const contextEnd = Math.min(seq.sequence.length, variant.position + 5);

                                newMatches.push({
                                    sequenceId: seq.id,
                                    sequenceName: seq.name,
                                    startPosition: variant.position,
                                    endPosition: variant.position,
                                    matchedText: seq.sequence[variant.position - 1],
                                    context: seq.sequence.substring(contextStart, contextEnd),
                                });
                            }
                        }
                    }
                    break;
                }
            }

            setMatches(newMatches);
            setCurrentMatchIndex(0);
            onSearchResults?.(newMatches);
            onHighlightMatches?.(newMatches);
        } catch {
            // Error handled within switch cases
        }
    }, [query, searchType, sequences, variants, onSearchResults, onHighlightMatches]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(performSearch, 300);
        return () => clearTimeout(timer);
    }, [performSearch]);

    const navigateToMatch = useCallback((direction: 'next' | 'prev') => {
        if (matches.length === 0) return;

        let newIndex: number;
        if (direction === 'next') {
            newIndex = (currentMatchIndex + 1) % matches.length;
        } else {
            newIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1;
        }

        setCurrentMatchIndex(newIndex);
        onNavigateToMatch?.(matches[newIndex]);
    }, [matches, currentMatchIndex, onNavigateToMatch]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                navigateToMatch('prev');
            } else {
                navigateToMatch('next');
            }
        } else if (e.key === 'Escape') {
            setQuery('');
            setMatches([]);
            onHighlightMatches?.([]);
        }
    }, [navigateToMatch, onHighlightMatches]);

    const clearSearch = useCallback(() => {
        setQuery('');
        setMatches([]);
        setError(null);
        onSearchResults?.([]);
        onHighlightMatches?.([]);
        inputRef.current?.focus();
    }, [onSearchResults, onHighlightMatches]);

    const currentMatch = matches[currentMatchIndex];

    const searchTypeOption = useMemo(() =>
        SEARCH_TYPES.find(t => t.value === searchType),
        [searchType]
    );

    return (
        <div className={`${styles.container} ${className}`}>
            <div className={styles.searchBar}>
                {/* Search Type Selector */}
                <Dropdown
                    value={searchType}
                    options={SEARCH_TYPES}
                    onChange={(e) => setSearchType(e.value)}
                    optionLabel="label"
                    optionValue="value"
                    className={styles.typeSelector}
                    tooltip="Search type"
                    tooltipOptions={{ position: 'bottom' }}
                    itemTemplate={(option) => (
                        <div className={styles.typeOption}>
                            <i className={option.icon} />
                            <span>{option.label}</span>
                        </div>
                    )}
                    valueTemplate={() => (
                        <div className={styles.typeValue}>
                            <i className={searchTypeOption?.icon} />
                        </div>
                    )}
                />

                {/* Search Input */}
                <div className={styles.inputWrapper}>
                    <span className={`p-input-icon-left p-input-icon-right ${styles.inputContainer}`}>
                        <i className="pi pi-search" />
                        <InputText
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className={`${styles.input} ${error ? styles.inputError : ''}`}
                            aria-label="Search alignment"
                        />
                        {query && (
                            <i
                                className={`pi pi-times ${styles.clearIcon}`}
                                onClick={clearSearch}
                                role="button"
                                aria-label="Clear search"
                            />
                        )}
                    </span>
                </div>

                {/* Navigation Buttons */}
                {matches.length > 0 && (
                    <div className={styles.navigation}>
                        <Button
                            icon="pi pi-chevron-up"
                            className="p-button-text p-button-sm"
                            onClick={() => navigateToMatch('prev')}
                            disabled={matches.length <= 1}
                            tooltip="Previous match (Shift+Enter)"
                            tooltipOptions={{ position: 'bottom' }}
                            aria-label="Previous match"
                        />
                        <span className={styles.matchCount}>
                            {currentMatchIndex + 1} / {matches.length}
                        </span>
                        <Button
                            icon="pi pi-chevron-down"
                            className="p-button-text p-button-sm"
                            onClick={() => navigateToMatch('next')}
                            disabled={matches.length <= 1}
                            tooltip="Next match (Enter)"
                            tooltipOptions={{ position: 'bottom' }}
                            aria-label="Next match"
                        />
                    </div>
                )}

                {/* Results Toggle */}
                {matches.length > 0 && (
                    <Button
                        icon="pi pi-list"
                        className="p-button-text p-button-sm"
                        onClick={(e) => resultsRef.current?.toggle(e)}
                        tooltip="View all matches"
                        tooltipOptions={{ position: 'bottom' }}
                        aria-label="View all matches"
                    />
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className={styles.error}>
                    <i className="pi pi-exclamation-circle" />
                    {error}
                </div>
            )}

            {/* Current Match Info */}
            {currentMatch && (
                <div className={styles.currentMatch}>
                    <Tag
                        value={currentMatch.sequenceName || currentMatch.sequenceId}
                        severity="info"
                    />
                    <span className={styles.matchPosition}>
                        Position {currentMatch.startPosition}
                        {currentMatch.endPosition !== currentMatch.startPosition &&
                            `-${currentMatch.endPosition}`
                        }
                    </span>
                    <code className={styles.matchContext}>
                        {currentMatch.context?.substring(0, currentMatch.startPosition - Math.max(0, currentMatch.startPosition - 5) - 1)}
                        <mark>{currentMatch.matchedText}</mark>
                        {currentMatch.context?.substring(
                            currentMatch.startPosition - Math.max(0, currentMatch.startPosition - 5) - 1 + currentMatch.matchedText.length
                        )}
                    </code>
                </div>
            )}

            {/* Results Panel */}
            <OverlayPanel ref={resultsRef} className={styles.resultsPanel}>
                <div className={styles.resultsList}>
                    <div className={styles.resultsHeader}>
                        <h4>Search Results</h4>
                        <span>{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
                    </div>
                    <div className={styles.resultsScroll}>
                        {matches.map((match, index) => (
                            <button
                                key={`${match.sequenceId}-${match.startPosition}-${index}`}
                                className={`${styles.resultItem} ${index === currentMatchIndex ? styles.active : ''}`}
                                onClick={() => {
                                    setCurrentMatchIndex(index);
                                    onNavigateToMatch?.(match);
                                    resultsRef.current?.hide();
                                }}
                            >
                                <div className={styles.resultHeader}>
                                    <span className={styles.resultSequence}>
                                        {match.sequenceName || match.sequenceId}
                                    </span>
                                    <span className={styles.resultPosition}>
                                        pos {match.startPosition}
                                    </span>
                                </div>
                                <code className={styles.resultContext}>
                                    {match.context}
                                </code>
                            </button>
                        ))}
                    </div>
                </div>
            </OverlayPanel>
        </div>
    );
}

export default AlignmentSearch;
