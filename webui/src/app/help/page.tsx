'use client';

import React, { useState, useCallback } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { HelpSearch } from './components/HelpSearch';
import { FAQ } from './components/FAQ';
import { Glossary } from './components/Glossary';
import {
    helpArticles,
    faqItems,
    glossaryTerms,
    categoryInfo,
    HelpArticle,
    HelpCategory,
} from './helpContent';
import styles from './help.module.css';

type ViewMode = 'categories' | 'article' | 'search-result';

interface SearchResult {
    type: 'article' | 'faq' | 'glossary';
    id: string;
    title: string;
    summary: string;
}

export default function HelpPage() {
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>('categories');
    const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
    const [highlightedFaqId, setHighlightedFaqId] = useState<string | undefined>();
    const [highlightedGlossaryTerm, setHighlightedGlossaryTerm] = useState<string | undefined>();

    const handleCategoryClick = useCallback((category: HelpCategory) => {
        setSelectedCategory(category);
        if (category === 'faq') {
            setActiveTabIndex(1);
        } else {
            setViewMode('categories');
        }
    }, []);

    const handleArticleClick = useCallback((article: HelpArticle) => {
        setSelectedArticle(article);
        setViewMode('article');
    }, []);

    const handleSearchResultClick = useCallback((result: SearchResult) => {
        if (result.type === 'article') {
            const article = helpArticles.find(a => a.id === result.id);
            if (article) {
                setSelectedArticle(article);
                setViewMode('article');
                setActiveTabIndex(0);
            }
        } else if (result.type === 'faq') {
            setHighlightedFaqId(result.id);
            setActiveTabIndex(1);
        } else if (result.type === 'glossary') {
            setHighlightedGlossaryTerm(result.id);
            setActiveTabIndex(2);
        }
    }, []);

    const handleBack = useCallback(() => {
        setSelectedArticle(null);
        setViewMode('categories');
    }, []);

    const categoryKeys = Object.keys(categoryInfo) as HelpCategory[];
    const filteredArticles = selectedCategory
        ? helpArticles.filter(a => a.category === selectedCategory)
        : helpArticles;

    return (
        <article className={styles.helpContainer}>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'Help' },
                ]}
            />

            <header className={styles.helpHeader}>
                <h1 className={styles.helpTitle}>Help Center</h1>
                <p className={styles.helpSubtitle}>
                    Find answers, learn about features, and get started with PAVI
                </p>
            </header>

            <HelpSearch
                articles={helpArticles}
                faqItems={faqItems}
                glossaryTerms={glossaryTerms}
                onResultClick={handleSearchResultClick}
            />

            <TabView
                activeIndex={activeTabIndex}
                onTabChange={(e) => {
                    setActiveTabIndex(e.index);
                    setViewMode('categories');
                    setSelectedArticle(null);
                    setHighlightedFaqId(undefined);
                    setHighlightedGlossaryTerm(undefined);
                }}
                className={styles.tabsContainer}
            >
                <TabPanel header="Documentation" leftIcon="pi pi-book mr-2">
                    <div className={styles.contentArea}>
                        {viewMode === 'article' && selectedArticle ? (
                            <>
                                <Button
                                    label="Back to Articles"
                                    icon="pi pi-arrow-left"
                                    className={`p-button-text ${styles.backButton}`}
                                    onClick={handleBack}
                                />
                                <h2 className={styles.sectionTitle}>{selectedArticle.title}</h2>
                                <div className={styles.articleContent}>
                                    {selectedArticle.content}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Category cards */}
                                <div className={styles.categoriesGrid}>
                                    {categoryKeys.filter(k => k !== 'faq').map(category => (
                                        <div
                                            key={category}
                                            className={`${styles.categoryCard} ${selectedCategory === category ? styles.active : ''}`}
                                            onClick={() => handleCategoryClick(category)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleCategoryClick(category);
                                            }}
                                        >
                                            <i className={`${categoryInfo[category].icon} ${styles.categoryIcon}`} />
                                            <h3 className={styles.categoryTitle}>
                                                {categoryInfo[category].title}
                                            </h3>
                                            <p className={styles.categoryDescription}>
                                                {categoryInfo[category].description}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Article list */}
                                <h2 className={styles.sectionTitle}>
                                    {selectedCategory
                                        ? categoryInfo[selectedCategory].title
                                        : 'All Articles'}
                                </h2>
                                <div className={styles.articleList}>
                                    {filteredArticles.map(article => (
                                        <div
                                            key={article.id}
                                            className={styles.articleItem}
                                            onClick={() => handleArticleClick(article)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleArticleClick(article);
                                            }}
                                        >
                                            <div className={styles.articleTitle}>{article.title}</div>
                                            <div className={styles.articleSummary}>{article.summary}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </TabPanel>

                <TabPanel header="FAQ" leftIcon="pi pi-question-circle mr-2">
                    <div className={styles.contentArea}>
                        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
                        <FAQ items={faqItems} expandedId={highlightedFaqId} />
                    </div>
                </TabPanel>

                <TabPanel header="Glossary" leftIcon="pi pi-book mr-2">
                    <div className={styles.contentArea}>
                        <h2 className={styles.sectionTitle}>Bioinformatics Glossary</h2>
                        <Glossary terms={glossaryTerms} highlightTerm={highlightedGlossaryTerm} />
                    </div>
                </TabPanel>
            </TabView>
        </article>
    );
}
