'use client';

import React, { useMemo } from 'react';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Tooltip } from 'primereact/tooltip';
import styles from './PositionInfoPanel.module.css';

export interface VariantInfo {
    id: string;
    hgvs?: string;
    consequence?: string;
    impact?: 'HIGH' | 'MODERATE' | 'LOW' | 'MODIFIER';
    frequency?: number;
    source?: string;
}

export interface ResidueInfo {
    position: number;
    residue: string;
    sequenceId: string;
    sequenceName?: string;
}

export interface PositionData {
    position: number;
    residues: ResidueInfo[];
    conservation: number; // 0-1
    gapCount: number;
    totalSequences: number;
    variants?: VariantInfo[];
    consensusResidue?: string;
}

export interface PositionInfoPanelProps {
    data: PositionData | null;
    isVisible: boolean;
    onClose: () => void;
    onNavigateToVariant?: (_variantId: string) => void;
    onCopyPosition?: () => void;
    className?: string;
}

const AMINO_ACID_PROPERTIES: Record<string, { name: string; property: string; color: string }> = {
    'A': { name: 'Alanine', property: 'Hydrophobic', color: '#8aa' },
    'R': { name: 'Arginine', property: 'Positive', color: '#e60' },
    'N': { name: 'Asparagine', property: 'Polar', color: '#0c0' },
    'D': { name: 'Aspartic Acid', property: 'Negative', color: '#e00' },
    'C': { name: 'Cysteine', property: 'Special', color: '#ee0' },
    'Q': { name: 'Glutamine', property: 'Polar', color: '#0c0' },
    'E': { name: 'Glutamic Acid', property: 'Negative', color: '#e00' },
    'G': { name: 'Glycine', property: 'Special', color: '#ee0' },
    'H': { name: 'Histidine', property: 'Positive', color: '#068' },
    'I': { name: 'Isoleucine', property: 'Hydrophobic', color: '#0a0' },
    'L': { name: 'Leucine', property: 'Hydrophobic', color: '#0a0' },
    'K': { name: 'Lysine', property: 'Positive', color: '#e60' },
    'M': { name: 'Methionine', property: 'Hydrophobic', color: '#ee0' },
    'F': { name: 'Phenylalanine', property: 'Hydrophobic', color: '#06c' },
    'P': { name: 'Proline', property: 'Special', color: '#cc0' },
    'S': { name: 'Serine', property: 'Polar', color: '#0c0' },
    'T': { name: 'Threonine', property: 'Polar', color: '#0c0' },
    'W': { name: 'Tryptophan', property: 'Hydrophobic', color: '#0ac' },
    'Y': { name: 'Tyrosine', property: 'Polar', color: '#0ac' },
    'V': { name: 'Valine', property: 'Hydrophobic', color: '#0a0' },
    '-': { name: 'Gap', property: 'Gap', color: '#ccc' },
    'X': { name: 'Unknown', property: 'Unknown', color: '#999' },
};

export function PositionInfoPanel({
    data,
    isVisible,
    onClose,
    onNavigateToVariant,
    onCopyPosition,
    className = '',
}: PositionInfoPanelProps) {
    const residueDistribution = useMemo(() => {
        if (!data) return [];

        const counts: Record<string, number> = {};
        for (const res of data.residues) {
            const char = res.residue.toUpperCase();
            counts[char] = (counts[char] || 0) + 1;
        }

        return Object.entries(counts)
            .map(([residue, count]) => ({
                residue,
                count,
                percentage: (count / data.totalSequences) * 100,
                info: AMINO_ACID_PROPERTIES[residue] || AMINO_ACID_PROPERTIES['X'],
            }))
            .sort((a, b) => b.count - a.count);
    }, [data]);

    const getConservationLevel = (score: number): { label: string; severity: 'success' | 'info' | 'warning' | 'danger' } => {
        if (score >= 0.9) return { label: 'Highly Conserved', severity: 'success' };
        if (score >= 0.7) return { label: 'Conserved', severity: 'info' };
        if (score >= 0.5) return { label: 'Moderately Conserved', severity: 'warning' };
        return { label: 'Variable', severity: 'danger' };
    };

    const getImpactSeverity = (impact?: string): 'danger' | 'warning' | 'info' | 'success' => {
        switch (impact) {
            case 'HIGH': return 'danger';
            case 'MODERATE': return 'warning';
            case 'LOW': return 'info';
            default: return 'success';
        }
    };

    if (!isVisible || !data) {
        return null;
    }

    const conservationInfo = getConservationLevel(data.conservation);

    return (
        <div className={`${styles.container} ${className}`}>
            <Tooltip target=".info-tooltip" />
            <Card className={styles.panel}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h3 className={styles.title}>Position {data.position}</h3>
                        <Tag
                            severity={conservationInfo.severity}
                            value={conservationInfo.label}
                            className={styles.conservationTag}
                        />
                    </div>
                    <div className={styles.headerActions}>
                        {onCopyPosition && (
                            <Button
                                icon="pi pi-copy"
                                className="p-button-text p-button-sm"
                                onClick={onCopyPosition}
                                tooltip="Copy position info"
                                tooltipOptions={{ position: 'left' }}
                            />
                        )}
                        <Button
                            icon="pi pi-times"
                            className="p-button-text p-button-sm"
                            onClick={onClose}
                            aria-label="Close panel"
                        />
                    </div>
                </div>

                {/* Conservation Score */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Conservation</div>
                    <div className={styles.conservationBar}>
                        <div
                            className={styles.conservationFill}
                            style={{
                                width: `${data.conservation * 100}%`,
                                backgroundColor: data.conservation >= 0.7 ? '#22c55e' :
                                    data.conservation >= 0.5 ? '#eab308' : '#ef4444'
                            }}
                        />
                    </div>
                    <div className={styles.conservationStats}>
                        <span>{(data.conservation * 100).toFixed(1)}% conserved</span>
                        <span className={styles.gapInfo}>
                            {data.gapCount} gap{data.gapCount !== 1 ? 's' : ''} ({((data.gapCount / data.totalSequences) * 100).toFixed(0)}%)
                        </span>
                    </div>
                </div>

                {/* Consensus Residue */}
                {data.consensusResidue && (
                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>Consensus</div>
                        <div className={styles.consensusResidue}>
                            <span
                                className={styles.residueCircle}
                                style={{ backgroundColor: AMINO_ACID_PROPERTIES[data.consensusResidue.toUpperCase()]?.color || '#999' }}
                            >
                                {data.consensusResidue}
                            </span>
                            <span className={styles.residueName}>
                                {AMINO_ACID_PROPERTIES[data.consensusResidue.toUpperCase()]?.name || 'Unknown'}
                            </span>
                            <span className={styles.residueProperty}>
                                ({AMINO_ACID_PROPERTIES[data.consensusResidue.toUpperCase()]?.property || 'Unknown'})
                            </span>
                        </div>
                    </div>
                )}

                {/* Residue Distribution */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>
                        Residue Distribution
                        <span className={styles.sectionSubtitle}>({data.totalSequences} sequences)</span>
                    </div>
                    <div className={styles.distributionList}>
                        {residueDistribution.slice(0, 5).map(({ residue, count, percentage, info }) => (
                            <div key={residue} className={styles.distributionItem}>
                                <span
                                    className={styles.residueCircle}
                                    style={{ backgroundColor: info.color }}
                                >
                                    {residue}
                                </span>
                                <div className={styles.distributionBar}>
                                    <div
                                        className={styles.distributionFill}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className={styles.distributionCount}>
                                    {count} ({percentage.toFixed(0)}%)
                                </span>
                            </div>
                        ))}
                        {residueDistribution.length > 5 && (
                            <div className={styles.moreResidues}>
                                +{residueDistribution.length - 5} more
                            </div>
                        )}
                    </div>
                </div>

                {/* Variants at Position */}
                {data.variants && data.variants.length > 0 && (
                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>
                            Variants
                            <Tag value={data.variants.length.toString()} severity="warning" className={styles.variantCount} />
                        </div>
                        <div className={styles.variantList}>
                            {data.variants.map((variant) => (
                                <div key={variant.id} className={styles.variantItem}>
                                    <div className={styles.variantHeader}>
                                        <code className={styles.variantId}>{variant.hgvs || variant.id}</code>
                                        {variant.impact && (
                                            <Tag
                                                value={variant.impact}
                                                severity={getImpactSeverity(variant.impact)}
                                                className={styles.impactTag}
                                            />
                                        )}
                                    </div>
                                    {variant.consequence && (
                                        <div className={styles.variantConsequence}>
                                            {variant.consequence}
                                        </div>
                                    )}
                                    {variant.frequency !== undefined && (
                                        <div className={styles.variantFrequency}>
                                            Frequency: {(variant.frequency * 100).toFixed(4)}%
                                        </div>
                                    )}
                                    {onNavigateToVariant && (
                                        <Button
                                            label="View Details"
                                            icon="pi pi-external-link"
                                            className="p-button-text p-button-sm"
                                            onClick={() => onNavigateToVariant(variant.id)}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sequences at Position */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>Sequences</div>
                    <div className={styles.sequenceList}>
                        {data.residues.slice(0, 10).map((res) => (
                            <div key={res.sequenceId} className={styles.sequenceItem}>
                                <span
                                    className={styles.residueSmall}
                                    style={{ backgroundColor: AMINO_ACID_PROPERTIES[res.residue.toUpperCase()]?.color || '#999' }}
                                >
                                    {res.residue}
                                </span>
                                <span className={styles.sequenceName}>
                                    {res.sequenceName || res.sequenceId}
                                </span>
                            </div>
                        ))}
                        {data.residues.length > 10 && (
                            <div className={styles.moreSequences}>
                                +{data.residues.length - 10} more sequences
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default PositionInfoPanel;
