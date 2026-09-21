'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { InputText } from 'primereact/inputtext';
import { HelpArticle, FAQItem, GlossaryTerm } from '../helpContent';
import styles from '../help.module.css';

interface SearchResult {
    type: 'article' | 'faq' | 'glossary';
    id: string;
    title: string;
    summary: string;
    matchText?: string;
}

interface HelpSearchProps {
    articles: HelpArticle[];
    faqItems: FAQItem[];
    glossaryTerms: GlossaryTerm[];
    onResultClick: (_result: SearchResult) => void;
}

export function HelpSearch({ articles, faqItems, glossaryTerms, onResultClick }: HelpSearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const searchResults = useMemo<SearchResult[]>(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) return [];

        const query = searchQuery.toLowerCase();
        const results: SearchResult[] = [];

        // Search articles
        articles.forEach(article => {
            const titleMatch = article.title.toLowerCase().includes(query);
            const contentMatch = article.content.toLowerCase().includes(query);
            const keywordMatch = article.keywords.some(k => k.includes(query));

            if (titleMatch || contentMatch || keywordMatch) {
                results.push({
                    type: 'article',
                    id: article.id,
                    title: article.title,
                    summary: article.summary,
                    matchText: contentMatch ? getMatchContext(article.content, query) : undefined,
                });
            }
        });

        // Search FAQ
        faqItems.forEach(faq => {
            const questionMatch = faq.question.toLowerCase().includes(query);
            const answerMatch = faq.answer.toLowerCase().includes(query);

            if (questionMatch || answerMatch) {
                results.push({
                    type: 'faq',
                    id: faq.id,
                    title: faq.question,
                    summary: faq.answer.substring(0, 100) + '...',
                });
            }
        });

        // Search glossary
        glossaryTerms.forEach(term => {
            const termMatch = term.term.toLowerCase().includes(query);
            const defMatch = term.definition.toLowerCase().includes(query);

            if (termMatch || defMatch) {
                results.push({
                    type: 'glossary',
                    id: term.term,
                    title: term.term,
                    summary: term.definition.substring(0, 100) + '...',
                });
            }
        });

        return results.slice(0, 10); // Limit to 10 results
    }, [searchQuery, articles, faqItems, glossaryTerms]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearchQuery('');
            (e.target as HTMLInputElement).blur();
        }
    }, []);

    return (
        <div className={styles.searchContainer}>
            <span className="p-input-icon-left p-input-icon-right" style={{ width: '100%' }}>
                <i className="pi pi-search" />
                <InputText
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search help articles, FAQ, and glossary..."
                    className={styles.searchInput}
                    aria-label="Search help content"
                />
                {searchQuery && (
                    <i
                        className="pi pi-times"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSearchQuery('')}
                        role="button"
                        aria-label="Clear search"
                    />
                )}
            </span>

            {isFocused && searchResults.length > 0 && (
                <div className={styles.searchResults} role="listbox" aria-label="Search results">
                    {searchResults.map((result) => (
                        <div
                            key={`${result.type}-${result.id}`}
                            className={styles.searchResultItem}
                            onClick={() => onResultClick(result)}
                            role="option"
                            aria-selected={false}
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onResultClick(result);
                            }}
                        >
                            <div className={styles.resultType}>
                                <span className={`pi ${getTypeIcon(result.type)}`} />
                                <span className={styles.resultTypeLabel}>{getTypeLabel(result.type)}</span>
                            </div>
                            <div className={styles.resultTitle}>{result.title}</div>
                            <div className={styles.resultSummary}>{result.summary}</div>
                        </div>
                    ))}
                </div>
            )}

            {isFocused && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className={styles.searchResults}>
                    <div className={styles.noResults}>
                        <i className="pi pi-info-circle" />
                        <span>No results found for &quot;{searchQuery}&quot;</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function getMatchContext(content: string, query: string): string {
    const index = content.toLowerCase().indexOf(query);
    if (index === -1) return '';

    const start = Math.max(0, index - 30);
    const end = Math.min(content.length, index + query.length + 30);
    let context = content.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';

    return context;
}

function getTypeIcon(type: string): string {
    switch (type) {
        case 'article': return 'pi-file';
        case 'faq': return 'pi-question-circle';
        case 'glossary': return 'pi-book';
        default: return 'pi-file';
    }
}

function getTypeLabel(type: string): string {
    switch (type) {
        case 'article': return 'Article';
        case 'faq': return 'FAQ';
        case 'glossary': return 'Glossary';
        default: return 'Article';
    }
}
