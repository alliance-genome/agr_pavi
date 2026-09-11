'use client';

import React, { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { parse } from 'clustal-js';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

import { SeqInfoDict } from '../InteractiveAlignment/types';
import {
    buildPublicationSvg,
    defaultPublicationSvgOptions,
    PublicationBackground,
    PublicationColorScheme,
    PublicationSequence,
    PublicationSvgOptions,
} from '../../utils/publicationSvg';

export interface PublicationFigureDialogProps {
    readonly visible: boolean;
    readonly onHide: () => void;
    readonly alignmentResult: string;
    readonly seqInfo: SeqInfoDict;
    readonly jobId?: string;
}

interface SelectOption<T> {
    label: string;
    value: T;
}

const colorSchemeOptions: SelectOption<PublicationColorScheme>[] = [
    { label: 'Clustal', value: 'clustal' },
    { label: 'Hydrophobicity', value: 'hydrophobicity' },
    { label: 'Conservation', value: 'conservation' },
    { label: 'Monochrome', value: 'mono' },
];

const backgroundOptions: SelectOption<PublicationBackground>[] = [
    { label: 'White', value: 'white' },
    { label: 'Transparent', value: 'transparent' },
];

const sizeOptions: SelectOption<number>[] = [
    { label: 'Small', value: 14 },
    { label: 'Medium', value: 18 },
    { label: 'Large', value: 24 },
];

export const PublicationFigureDialog: FunctionComponent<PublicationFigureDialogProps> = (props) => {
    const [options, setOptions] = useState<PublicationSvgOptions>(() => defaultPublicationSvgOptions());

    // Parse the alignment once per alignmentResult change.
    const sequences = useMemo<PublicationSequence[]>(() => {
        if (!props.alignmentResult) return [];
        try {
            const parsed = parse(props.alignmentResult);
            const alns: { id?: string; seq: string }[] = parsed.alns ?? [];
            return alns.map((aln) => ({
                name: aln.id ?? '',
                sequence: aln.seq,
            }));
        } catch (err) {
            console.error('Failed to parse alignment for publication figure:', err);
            return [];
        }
    }, [props.alignmentResult]);

    const alignmentLength = useMemo(() => {
        return sequences.reduce((max, s) => Math.max(max, s.sequence.length), 0);
    }, [sequences]);

    const svg = useMemo(() => {
        if (sequences.length === 0) return '';
        return buildPublicationSvg(sequences, props.seqInfo, options);
    }, [sequences, props.seqInfo, options]);

    const updateOption = useCallback(
        <K extends keyof PublicationSvgOptions>(key: K, value: PublicationSvgOptions[K]) => {
            setOptions((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    const handleExport = useCallback(() => {
        if (!svg) return;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pavi-figure-${props.jobId ?? 'alignment'}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [svg, props.jobId]);

    const controlRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
    };
    const checkboxRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    };
    const fieldLabelStyle: React.CSSProperties = {
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: 'var(--agr-gray-700, #374151)',
    };

    const footer = (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button label="Close" icon="pi pi-times" outlined size="small" onClick={props.onHide} />
            <Button
                label="Export SVG"
                icon="pi pi-download"
                size="small"
                onClick={handleExport}
                disabled={!svg}
            />
        </div>
    );

    return (
        <Dialog
            header="Publication figure"
            visible={props.visible}
            onHide={props.onHide}
            footer={footer}
            style={{ width: '90vw', maxWidth: '1200px' }}
            maximizable
            dismissableMask
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 300px) 1fr',
                    gap: '1.25rem',
                    alignItems: 'start',
                }}
            >
                {/* Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label htmlFor="pub-color-scheme" style={fieldLabelStyle}>Color scheme</label>
                        <Dropdown
                            inputId="pub-color-scheme"
                            value={options.colorScheme}
                            options={colorSchemeOptions}
                            onChange={(e) => updateOption('colorScheme', e.value as PublicationColorScheme)}
                            className="agr-dropdown-sm"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label htmlFor="pub-size" style={fieldLabelStyle}>Size</label>
                        <Dropdown
                            inputId="pub-size"
                            value={options.cellSize}
                            options={sizeOptions}
                            onChange={(e) => updateOption('cellSize', e.value as number)}
                            className="agr-dropdown-sm"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label htmlFor="pub-background" style={fieldLabelStyle}>Background</label>
                        <Dropdown
                            inputId="pub-background"
                            value={options.background}
                            options={backgroundOptions}
                            onChange={(e) => updateOption('background', e.value as PublicationBackground)}
                            className="agr-dropdown-sm"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label htmlFor="pub-title" style={fieldLabelStyle}>Title</label>
                        <InputText
                            id="pub-title"
                            value={options.title ?? ''}
                            onChange={(e) => updateOption('title', e.target.value)}
                            placeholder="Optional figure title"
                        />
                    </div>

                    <div style={controlRowStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                            <label htmlFor="pub-region-start" style={fieldLabelStyle}>Region start</label>
                            <InputNumber
                                inputId="pub-region-start"
                                value={options.regionStart ?? 1}
                                onValueChange={(e) => updateOption('regionStart', e.value ?? 1)}
                                min={1}
                                max={Math.max(1, alignmentLength)}
                                showButtons
                                inputStyle={{ width: '5rem' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                            <label htmlFor="pub-region-end" style={fieldLabelStyle}>Region end</label>
                            <InputNumber
                                inputId="pub-region-end"
                                value={options.regionEnd ?? alignmentLength}
                                onValueChange={(e) => updateOption('regionEnd', e.value ?? alignmentLength)}
                                min={1}
                                max={Math.max(1, alignmentLength)}
                                showButtons
                                inputStyle={{ width: '5rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <div style={checkboxRowStyle}>
                            <Checkbox
                                inputId="pub-labels"
                                checked={options.showLabels}
                                onChange={(e) => updateOption('showLabels', !!e.checked)}
                            />
                            <label htmlFor="pub-labels">Sequence labels</label>
                        </div>
                        <div style={checkboxRowStyle}>
                            <Checkbox
                                inputId="pub-ruler"
                                checked={options.showRuler}
                                onChange={(e) => updateOption('showRuler', !!e.checked)}
                            />
                            <label htmlFor="pub-ruler">Position ruler</label>
                        </div>
                        <div style={checkboxRowStyle}>
                            <Checkbox
                                inputId="pub-conservation"
                                checked={options.showConservation}
                                onChange={(e) => updateOption('showConservation', !!e.checked)}
                            />
                            <label htmlFor="pub-conservation">Conservation row</label>
                        </div>
                        <div style={checkboxRowStyle}>
                            <Checkbox
                                inputId="pub-variants"
                                checked={options.showVariants}
                                onChange={(e) => updateOption('showVariants', !!e.checked)}
                            />
                            <label htmlFor="pub-variants">Variant markers</label>
                        </div>
                        <div style={checkboxRowStyle}>
                            <Checkbox
                                inputId="pub-legend"
                                checked={options.showLegend}
                                onChange={(e) => updateOption('showLegend', !!e.checked)}
                            />
                            <label htmlFor="pub-legend">Color legend</label>
                        </div>
                    </div>
                </div>

                {/* Live preview */}
                <div
                    style={{
                        border: '1px solid var(--agr-gray-200, #e5e7eb)',
                        borderRadius: '8px',
                        background: '#fafafa',
                        padding: '0.75rem',
                        overflow: 'auto',
                        maxHeight: '70vh',
                    }}
                >
                    {svg ? (
                        <div dangerouslySetInnerHTML={{ __html: svg }} />
                    ) : (
                        <div style={{ padding: '2rem', color: 'var(--agr-gray-500, #6b7280)' }}>
                            No alignment data to preview.
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    );
};
