'use client';

import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import styles from './ExampleDataLoader.module.css';
import { exampleCatalog, CatalogExample, CatalogGene } from '@examples/index';

export interface ExampleData {
    id: string;
    name: string;
    description: string;
    genes: ExampleGene[];
    category: 'basic' | 'advanced' | 'cross-species';
}

export interface ExampleGene {
    geneId: string;
    geneName: string;
    species: string;
    alleleIds?: string[];
    transcriptNames?: string[];
}

// Pre-defined example datasets are sourced from `tests/examples/catalog.json`,
// the same file the CLI test harness and Playwright suite consume. Editing an
// example here used to require parallel updates in those other places; now a
// single edit to catalog.json propagates everywhere.
const fromCatalogGene = (g: CatalogGene): ExampleGene => ({
    geneId: g.geneId,
    geneName: g.geneName,
    species: g.species,
    alleleIds: g.alleleIds ? [...g.alleleIds] : undefined,
});

const fromCatalogExample = (ex: CatalogExample): ExampleData => ({
    id: ex.id,
    name: ex.name,
    description: ex.description,
    category: ex.category,
    genes: ex.genes.map(fromCatalogGene),
});

export const EXAMPLE_DATASETS: ExampleData[] = exampleCatalog.examples.map(fromCatalogExample);

interface ExampleDataLoaderProps {
    // eslint-disable-next-line no-unused-vars
    onLoadExample: (example: ExampleData) => void;
    buttonLabel?: string;
    buttonIcon?: string;
    buttonClassName?: string;
}

export const ExampleDataLoader: React.FC<ExampleDataLoaderProps> = ({
    onLoadExample,
    buttonLabel = 'Load Example',
    buttonIcon = 'pi pi-database',
    buttonClassName = '',
}) => {
    const [dialogVisible, setDialogVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const categories = [
        { id: 'basic', label: 'Basic', description: 'Simple two-species comparisons' },
        { id: 'cross-species', label: 'Cross-Species', description: 'Multi-organism alignments' },
        { id: 'advanced', label: 'Advanced', description: 'Complex evolutionary analyses' },
    ];

    const filteredExamples = selectedCategory
        ? EXAMPLE_DATASETS.filter((ex) => ex.category === selectedCategory)
        : EXAMPLE_DATASETS;

    const handleSelectExample = (example: ExampleData) => {
        onLoadExample(example);
        setDialogVisible(false);
        setSelectedCategory(null);
    };

    const dialogHeader = (
        <div className={styles.dialogHeader}>
            <span>Choose an Example Dataset</span>
        </div>
    );

    return (
        <>
            <Button
                label={buttonLabel}
                icon={buttonIcon}
                className={`p-button-outlined ${buttonClassName}`}
                onClick={() => setDialogVisible(true)}
                aria-label="Open example dataset selector"
            />

            <Dialog
                visible={dialogVisible}
                onHide={() => {
                    setDialogVisible(false);
                    setSelectedCategory(null);
                }}
                header={dialogHeader}
                className={styles.dialog}
                modal
                dismissableMask
                style={{ width: '600px', maxWidth: '90vw' }}
            >
                <div className={styles.dialogContent}>
                    <p className={styles.intro}>
                        Select an example to quickly see how PAVI works. These examples
                        use real gene data from the Alliance database.
                    </p>

                    <div className={styles.categoryFilter}>
                        <span className={styles.filterLabel}>Filter by type:</span>
                        <div className={styles.categoryButtons}>
                            <button
                                type="button"
                                className={`${styles.categoryBtn} ${!selectedCategory ? styles.active : ''}`}
                                onClick={() => setSelectedCategory(null)}
                            >
                                All
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`${styles.categoryBtn} ${selectedCategory === cat.id ? styles.active : ''}`}
                                    onClick={() => setSelectedCategory(cat.id)}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.exampleGrid}>
                        {filteredExamples.map((example) => (
                            <button
                                key={example.id}
                                type="button"
                                className={styles.exampleCard}
                                onClick={() => handleSelectExample(example)}
                            >
                                <div className={styles.exampleHeader}>
                                    <h4 className={styles.exampleName}>{example.name}</h4>
                                    <span className={`${styles.categoryBadge} ${styles[example.category]}`}>
                                        {example.category.replace('-', ' ')}
                                    </span>
                                </div>
                                <p className={styles.exampleDescription}>{example.description}</p>
                                <div className={styles.geneList}>
                                    {example.genes.map((gene) => (
                                        <span key={gene.geneId} className={styles.geneBadge}>
                                            {gene.geneName}
                                            <span className={styles.species}>
                                                ({gene.species.split(' ')[0][0]}. {gene.species.split(' ')[1]})
                                            </span>
                                            {gene.alleleIds && gene.alleleIds.length > 0 && (
                                                <span className={styles.alleleBadge} title={`${gene.alleleIds.length} allele(s)`}>
                                                    +{gene.alleleIds.length}
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </Dialog>
        </>
    );
};
