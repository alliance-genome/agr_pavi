'use client';

import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import styles from './ExampleDataLoader.module.css';

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
}

// Pre-defined example datasets
export const EXAMPLE_DATASETS: ExampleData[] = [
    {
        id: 'tp53-orthologs',
        name: 'TP53 Orthologs',
        description: 'Compare the tumor suppressor protein p53 across human, mouse, and zebrafish',
        category: 'cross-species',
        genes: [
            { geneId: 'HGNC:11998', geneName: 'TP53', species: 'Homo sapiens' },
            { geneId: 'MGI:98834', geneName: 'Trp53', species: 'Mus musculus' },
            { geneId: 'ZFIN:ZDB-GENE-990415-270', geneName: 'tp53', species: 'Danio rerio' },
        ],
    },
    {
        id: 'brca1-comparison',
        name: 'BRCA1 Human-Mouse',
        description: 'Align BRCA1 DNA repair protein between human and mouse',
        category: 'basic',
        genes: [
            { geneId: 'HGNC:1100', geneName: 'BRCA1', species: 'Homo sapiens' },
            { geneId: 'MGI:104537', geneName: 'Brca1', species: 'Mus musculus' },
        ],
    },
    {
        id: 'insulin-family',
        name: 'Insulin Family',
        description: 'Multi-species comparison of insulin proteins',
        category: 'cross-species',
        genes: [
            { geneId: 'HGNC:6081', geneName: 'INS', species: 'Homo sapiens' },
            { geneId: 'MGI:96573', geneName: 'Ins2', species: 'Mus musculus' },
            { geneId: 'RGD:2917', geneName: 'Ins2', species: 'Rattus norvegicus' },
        ],
    },
    {
        id: 'pax6-evolution',
        name: 'PAX6 Eye Development',
        description: 'Highly conserved eye development transcription factor',
        category: 'advanced',
        genes: [
            { geneId: 'HGNC:8620', geneName: 'PAX6', species: 'Homo sapiens' },
            { geneId: 'MGI:97490', geneName: 'Pax6', species: 'Mus musculus' },
            { geneId: 'FB:FBgn0004170', geneName: 'ey', species: 'Drosophila melanogaster' },
            { geneId: 'WB:WBGene00003927', geneName: 'pax-6', species: 'Caenorhabditis elegans' },
        ],
    },
];

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
