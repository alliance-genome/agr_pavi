'use client';

import React, { useRef, useCallback, useState } from 'react';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Toast } from 'primereact/toast';
import styles from './ExportMenu.module.css';

export type ExportFormat = 'fasta' | 'clustal' | 'phylip' | 'png' | 'svg' | 'pdf' | 'json';

export interface ExportOption {
    format: ExportFormat;
    label: string;
    description: string;
    icon: string;
    iconClass?: string;
    category: 'sequence' | 'image' | 'data';
    extension: string;
    disabled?: boolean;
}

export interface ExportMenuProps {
    alignmentResult?: string;
    jobId: string;
    // eslint-disable-next-line no-unused-vars
    onExport?: (format: ExportFormat) => Promise<void>;
    customFormats?: ExportOption[];
    disabled?: boolean;
    buttonLabel?: string;
    buttonIcon?: string;
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_EXPORT_OPTIONS: ExportOption[] = [
    {
        format: 'fasta',
        label: 'FASTA',
        description: 'Standard sequence format',
        icon: 'pi pi-file',
        iconClass: styles.fasta,
        category: 'sequence',
        extension: '.fasta',
    },
    {
        format: 'clustal',
        label: 'Clustal',
        description: 'Clustal alignment format',
        icon: 'pi pi-align-left',
        iconClass: styles.clustal,
        category: 'sequence',
        extension: '.aln',
    },
    {
        format: 'phylip',
        label: 'PHYLIP',
        description: 'Phylogenetic analysis format',
        icon: 'pi pi-sitemap',
        iconClass: styles.phylip,
        category: 'sequence',
        extension: '.phy',
    },
    {
        format: 'png',
        label: 'PNG Image',
        description: 'High-quality raster image',
        icon: 'pi pi-image',
        iconClass: styles.image,
        category: 'image',
        extension: '.png',
    },
    {
        format: 'svg',
        label: 'SVG Image',
        description: 'Scalable vector graphic',
        icon: 'pi pi-image',
        iconClass: styles.image,
        category: 'image',
        extension: '.svg',
        disabled: true, // Not yet implemented
    },
    {
        format: 'pdf',
        label: 'PDF Document',
        description: 'Portable document format',
        icon: 'pi pi-file-pdf',
        iconClass: styles.pdf,
        category: 'image',
        extension: '.pdf',
        disabled: true, // Not yet implemented
    },
    {
        format: 'json',
        label: 'JSON Data',
        description: 'Machine-readable format',
        icon: 'pi pi-code',
        iconClass: styles.json,
        category: 'data',
        extension: '.json',
    },
];

export function ExportMenu({
    alignmentResult,
    jobId,
    onExport,
    customFormats,
    disabled = false,
    buttonLabel = 'Export',
    buttonIcon = 'pi pi-download',
    containerRef,
}: ExportMenuProps) {
    const overlayRef = useRef<OverlayPanel>(null);
    const toastRef = useRef<Toast>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

    const exportOptions = customFormats || DEFAULT_EXPORT_OPTIONS;

    const sequenceFormats = exportOptions.filter(opt => opt.category === 'sequence');
    const imageFormats = exportOptions.filter(opt => opt.category === 'image');
    const dataFormats = exportOptions.filter(opt => opt.category === 'data');

    const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    const convertToFormat = useCallback((format: ExportFormat): string => {
        if (!alignmentResult) return '';

        switch (format) {
            case 'fasta':
                return alignmentResult;

            case 'clustal': {
                const lines = alignmentResult.split('\n');
                const sequences: { name: string; seq: string }[] = [];
                let currentName = '';
                let currentSeq = '';

                for (const line of lines) {
                    if (line.startsWith('>')) {
                        if (currentName && currentSeq) {
                            sequences.push({ name: currentName, seq: currentSeq });
                        }
                        currentName = line.substring(1).split(' ')[0];
                        currentSeq = '';
                    } else {
                        currentSeq += line.trim();
                    }
                }
                if (currentName && currentSeq) {
                    sequences.push({ name: currentName, seq: currentSeq });
                }

                let output = 'CLUSTAL W (1.83) multiple sequence alignment\n\n';
                const maxNameLen = Math.max(...sequences.map(s => s.name.length), 10);
                const blockSize = 60;
                const seqLen = sequences[0]?.seq.length || 0;

                for (let i = 0; i < seqLen; i += blockSize) {
                    for (const seq of sequences) {
                        const block = seq.seq.substring(i, i + blockSize);
                        output += `${seq.name.padEnd(maxNameLen + 4)}${block}\n`;
                    }
                    output += '\n';
                }

                return output;
            }

            case 'phylip': {
                const lines = alignmentResult.split('\n');
                const sequences: { name: string; seq: string }[] = [];
                let currentName = '';
                let currentSeq = '';

                for (const line of lines) {
                    if (line.startsWith('>')) {
                        if (currentName && currentSeq) {
                            sequences.push({ name: currentName, seq: currentSeq });
                        }
                        currentName = line.substring(1).split(' ')[0].substring(0, 10);
                        currentSeq = '';
                    } else {
                        currentSeq += line.trim();
                    }
                }
                if (currentName && currentSeq) {
                    sequences.push({ name: currentName, seq: currentSeq });
                }

                const seqLen = sequences[0]?.seq.length || 0;
                let output = ` ${sequences.length} ${seqLen}\n`;

                for (const seq of sequences) {
                    output += `${seq.name.padEnd(10)} ${seq.seq}\n`;
                }

                return output;
            }

            case 'json': {
                const lines = alignmentResult.split('\n');
                const sequences: { id: string; description: string; sequence: string }[] = [];
                let currentId = '';
                let currentDesc = '';
                let currentSeq = '';

                for (const line of lines) {
                    if (line.startsWith('>')) {
                        if (currentId && currentSeq) {
                            sequences.push({
                                id: currentId,
                                description: currentDesc,
                                sequence: currentSeq,
                            });
                        }
                        const header = line.substring(1);
                        const parts = header.split(' ');
                        currentId = parts[0];
                        currentDesc = parts.slice(1).join(' ');
                        currentSeq = '';
                    } else {
                        currentSeq += line.trim();
                    }
                }
                if (currentId && currentSeq) {
                    sequences.push({
                        id: currentId,
                        description: currentDesc,
                        sequence: currentSeq,
                    });
                }

                return JSON.stringify({
                    jobId,
                    exportedAt: new Date().toISOString(),
                    sequenceCount: sequences.length,
                    alignmentLength: sequences[0]?.sequence.length || 0,
                    sequences,
                }, null, 2);
            }

            default:
                return alignmentResult;
        }
    }, [alignmentResult, jobId]);

    const captureVisualization = useCallback(async (): Promise<string | null> => {
        if (!containerRef?.current) return null;

        try {
            // Dynamic import of html2canvas - may not be available
            const html2canvasModule = await import(/* webpackIgnore: true */ 'html2canvas').catch(() => null);
            if (!html2canvasModule) {
                console.warn('html2canvas not available for PNG export');
                return null;
            }
            const html2canvas = html2canvasModule.default;
            const canvas = await html2canvas(containerRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
            });
            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('Failed to capture visualization:', error);
            return null;
        }
    }, [containerRef]);

    const handleExport = useCallback(async (option: ExportOption) => {
        if (option.disabled || isExporting) return;

        setIsExporting(true);
        setExportingFormat(option.format);

        try {
            if (onExport) {
                await onExport(option.format);
            } else {
                const filename = `alignment-${jobId.slice(0, 8)}${option.extension}`;

                if (option.format === 'png') {
                    const dataUrl = await captureVisualization();
                    if (dataUrl) {
                        const link = document.createElement('a');
                        link.href = dataUrl;
                        link.download = filename;
                        link.click();
                    } else {
                        throw new Error('Could not capture visualization');
                    }
                } else {
                    const content = convertToFormat(option.format);
                    const mimeType = option.format === 'json' ? 'application/json' : 'text/plain';
                    downloadFile(content, filename, mimeType);
                }
            }

            toastRef.current?.show({
                severity: 'success',
                summary: 'Export Complete',
                detail: `Exported as ${option.label}`,
                life: 3000,
            });

            overlayRef.current?.hide();
        } catch (error) {
            console.error('Export failed:', error);
            toastRef.current?.show({
                severity: 'error',
                summary: 'Export Failed',
                detail: 'An error occurred during export',
                life: 5000,
            });
        } finally {
            setIsExporting(false);
            setExportingFormat(null);
        }
    }, [onExport, jobId, convertToFormat, downloadFile, captureVisualization, isExporting]);

    const renderMenuItem = (option: ExportOption) => {
        const isCurrentlyExporting = exportingFormat === option.format;

        return (
            <button
                key={option.format}
                className={styles.menuItem}
                onClick={() => handleExport(option)}
                disabled={option.disabled || isExporting}
                aria-label={`Export as ${option.label}`}
            >
                <div className={`${styles.menuItemIcon} ${option.iconClass || ''}`}>
                    {isCurrentlyExporting ? (
                        <i className="pi pi-spin pi-spinner" />
                    ) : (
                        <i className={option.icon} />
                    )}
                </div>
                <div className={styles.menuItemContent}>
                    <span className={styles.menuItemLabel}>{option.label}</span>
                    <span className={styles.menuItemDescription}>{option.description}</span>
                </div>
                {option.disabled && (
                    <span className={styles.menuItemBadge}>Soon</span>
                )}
            </button>
        );
    };

    return (
        <div className={styles.container}>
            <Toast ref={toastRef} />
            <Button
                label={buttonLabel}
                icon={buttonIcon}
                onClick={(e) => overlayRef.current?.toggle(e)}
                disabled={disabled || !alignmentResult}
                className="p-button-outlined"
                aria-haspopup="true"
            />
            <OverlayPanel
                ref={overlayRef}
                className={styles.menuPanel}
                dismissable
                showCloseIcon={false}
            >
                <div className={styles.menuHeader}>
                    <h4>Export Alignment</h4>
                </div>

                <div className={styles.menuContent}>
                    {sequenceFormats.length > 0 && (
                        <div className={styles.menuSection}>
                            <div className={styles.sectionLabel}>Sequence Formats</div>
                            {sequenceFormats.map(renderMenuItem)}
                        </div>
                    )}

                    {imageFormats.length > 0 && (
                        <div className={styles.menuSection}>
                            <div className={styles.sectionLabel}>Images & Documents</div>
                            {imageFormats.map(renderMenuItem)}
                        </div>
                    )}

                    {dataFormats.length > 0 && (
                        <div className={styles.menuSection}>
                            <div className={styles.sectionLabel}>Data Formats</div>
                            {dataFormats.map(renderMenuItem)}
                        </div>
                    )}
                </div>

                <div className={styles.menuFooter}>
                    Export includes all sequences in the alignment
                </div>
            </OverlayPanel>
        </div>
    );
}

export default ExportMenu;
