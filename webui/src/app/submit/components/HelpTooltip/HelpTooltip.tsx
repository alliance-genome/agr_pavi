'use client';

import React, { useId } from 'react';
import { Tooltip } from 'primereact/tooltip';
import styles from './HelpTooltip.module.css';

interface HelpTooltipProps {
    content: string | React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    iconSize?: 'small' | 'medium' | 'large';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
    content,
    position = 'right',
    className = '',
    iconSize = 'medium',
}) => {
    const uniqueId = useId();
    const targetClassName = `help-tooltip-target-${uniqueId.replace(/:/g, '')}`;

    const sizeClass = styles[`icon${iconSize.charAt(0).toUpperCase() + iconSize.slice(1)}`];

    return (
        <>
            <button
                type="button"
                className={`${styles.helpButton} ${sizeClass} ${className} ${targetClassName}`}
                aria-label="Help information"
                data-pr-tooltip=""
                data-pr-position={position}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            </button>
            <Tooltip
                target={`.${targetClassName}`}
                position={position}
                className={styles.tooltip}
                showDelay={200}
                hideDelay={100}
            >
                <div className={styles.tooltipContent}>
                    {content}
                </div>
            </Tooltip>
        </>
    );
};

// Pre-defined help content for common fields
export const HELP_CONTENT = {
    geneSearch: (
        <div>
            <strong>Gene Search</strong>
            <p>Enter a gene identifier (e.g., HGNC:5, MGI:87866) or gene symbol (e.g., TP53, BRCA1).</p>
            <p>Start typing to see autocomplete suggestions from the Alliance database.</p>
        </div>
    ),
    transcriptSelect: (
        <div>
            <strong>Transcript Selection</strong>
            <p>Choose which transcript variants to include in the alignment.</p>
            <p>Multiple transcripts can be selected to compare different isoforms.</p>
        </div>
    ),
    alleleSelect: (
        <div>
            <strong>Allele Selection</strong>
            <p>Optionally include specific alleles/variants in the alignment.</p>
            <p>This allows comparison of mutant sequences against wild-type.</p>
        </div>
    ),
    fastaInput: (
        <div>
            <strong>FASTA Sequence</strong>
            <p>Paste a protein sequence in FASTA format:</p>
            <code style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                &gt;sequence_name<br />
                MTEYKLVVVGAGGVGKSALT...
            </code>
        </div>
    ),
    alignmentName: (
        <div>
            <strong>Alignment Name</strong>
            <p>Give your alignment a descriptive name to help identify it later.</p>
            <p>This is optional but recommended for complex analyses.</p>
        </div>
    ),
};
