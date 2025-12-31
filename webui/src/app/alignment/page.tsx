'use client';

import { useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { parse } from 'clustal-js';

import { fetchAlignmentResults, fetchAlignmentSeqInfo } from '../result/components/AlignmentResultView/serverActions';
import { SeqInfoDict } from '../result/components/InteractiveAlignment/types';

import NightingaleNavigationComponent from '../result/components/InteractiveAlignment/nightingale/Navigation';
import NightingaleLinegraphTrack, { LineData } from '../result/components/InteractiveAlignment/nightingale/LinegraphTrack';

import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';

// Dynamic import for MSA component (requires DOM)
const NightingaleMSAComponent = dynamic(
    () => import('../result/components/InteractiveAlignment/nightingale/MSA').then(mod => ({ default: mod.default })),
    { ssr: false }
);

const NightingaleManagerComponent = dynamic(
    () => import('../result/components/InteractiveAlignment/nightingale/Manager'),
    { ssr: false }
);

// Tile sizes for fullscreen view
const TILE_HEIGHT = 30;
const TILE_WIDTH = 20;

interface ColorSchemeOption {
    label: string;
    value: string;
}

interface ColorSchemeGroup {
    groupLabel: string;
    items: ColorSchemeOption[];
}

type MSADataItem = {
    sequence: string;
    name: string;
};

function FullscreenAlignmentContent() {
    const searchParams = useSearchParams();
    const uuid = searchParams.get('uuid');
    const containerRef = useRef<HTMLDivElement>(null);

    const [alignmentResult, setAlignmentResult] = useState<string>('');
    const [seqInfoDict, setSeqInfoDict] = useState<SeqInfoDict>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [alignmentColorScheme, setAlignmentColorScheme] = useState<string>('clustal2');
    const [showConservation, setShowConservation] = useState<boolean>(false);
    const [displayStart, setDisplayStart] = useState<number>(1);
    const [displayEnd, setDisplayEnd] = useState<number>(100);

    // Fetch data
    useEffect(() => {
        if (!uuid) {
            setError('No job UUID provided');
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const [alignment, seqInfo] = await Promise.all([
                    fetchAlignmentResults(uuid),
                    fetchAlignmentSeqInfo(uuid)
                ]);

                if (!alignment) {
                    setError('Failed to fetch alignment data');
                    return;
                }

                setAlignmentResult(alignment);
                setSeqInfoDict(seqInfo || {});
            } catch (err) {
                setError('Error loading alignment data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [uuid]);

    // Parse alignment data
    const fullAlignmentData = useMemo<MSADataItem[]>(() => {
        if (!alignmentResult) return [];
        const parsedAlignment = parse(alignmentResult);
        return parsedAlignment['alns'].map((aln: { id: string; seq: string }) => ({
            sequence: aln.seq,
            name: aln.id
        }));
    }, [alignmentResult]);

    const seqLength = useMemo(() => {
        return fullAlignmentData.reduce((maxLength, alignment) => {
            return Math.max(maxLength, alignment.sequence.length);
        }, 0);
    }, [fullAlignmentData]);

    // Calculate features for variant highlighting
    const alignmentFeatures = useMemo(() => {
        const features: Array<{
            residues: { from: number; to: number };
            sequences: { from: number; to: number };
            id: string;
            borderColor: string;
            fillColor: string;
            mouseOverBorderColor: string;
            mouseOverFillColor: string;
        }> = [];

        for (let i = 0; i < fullAlignmentData.length; i++) {
            const alignment_seq_name = fullAlignmentData[i].name;
            if (
                alignment_seq_name in seqInfoDict &&
                'embedded_variants' in seqInfoDict[alignment_seq_name]
            ) {
                for (const embedded_variant of seqInfoDict[alignment_seq_name]['embedded_variants'] || []) {
                    features.push({
                        residues: {
                            from: embedded_variant.alignment_start_pos,
                            to: embedded_variant.alignment_end_pos
                        },
                        sequences: { from: i, to: i },
                        id: `feature_${alignment_seq_name}_${embedded_variant.variant_id}`,
                        borderColor: 'black',
                        fillColor: 'black',
                        mouseOverBorderColor: 'black',
                        mouseOverFillColor: 'transparent'
                    });
                }
            }
        }
        return features;
    }, [fullAlignmentData, seqInfoDict]);

    // Calculate label width
    const labelWidth = useMemo(() => {
        const maxLabelLength = fullAlignmentData.reduce((maxLength, alignment) => {
            return Math.max(maxLength, alignment.name.length);
        }, 0);
        return maxLabelLength * 9;
    }, [fullAlignmentData]);

    // Conservation data for line graph
    const conservationData = useMemo<LineData[]>(() => {
        if (fullAlignmentData.length < 2 || seqLength === 0) return [];

        const values: Array<{ position: number; value: number }> = [];

        for (let pos = 0; pos < seqLength; pos++) {
            const residueCounts: Map<string, number> = new Map();
            let totalNonGap = 0;

            for (const seq of fullAlignmentData) {
                const residue = seq.sequence[pos];
                if (residue && residue !== '-' && residue !== '.') {
                    residueCounts.set(residue, (residueCounts.get(residue) || 0) + 1);
                    totalNonGap++;
                }
            }

            let maxCount = 0;
            residueCounts.forEach(count => {
                if (count > maxCount) maxCount = count;
            });

            const score = totalNonGap > 0 ? (maxCount / fullAlignmentData.length) * 100 : 0;
            values.push({ position: pos + 1, value: score });
        }

        return [{
            name: 'Conservation',
            range: [0, 100],
            color: '#2563eb',
            fill: 'rgba(37, 99, 235, 0.2)',
            lineCurve: 'curveMonotoneX',
            values
        }];
    }, [fullAlignmentData, seqLength]);

    const updateDisplayRange = useCallback((args: { displayStart?: number; displayEnd?: number }) => {
        if (args.displayStart !== undefined) setDisplayStart(args.displayStart);
        if (args.displayEnd !== undefined) setDisplayEnd(args.displayEnd);
    }, []);

    // Initialize display range
    useEffect(() => {
        if (seqLength === 0) return;
        const initDisplayCenter = Math.round(seqLength / 2);
        const halfWindow = 50;
        setDisplayStart(seqLength <= halfWindow * 2 ? 1 : initDisplayCenter - halfWindow);
        setDisplayEnd(seqLength <= halfWindow * 2 ? seqLength : initDisplayCenter + halfWindow);
    }, [seqLength]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const visibleRange = displayEnd - displayStart;
        const panStep = Math.max(1, Math.floor(visibleRange * 0.1));
        const zoomStep = Math.max(1, Math.floor(visibleRange * 0.2));

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                setDisplayStart(prev => Math.max(1, prev - panStep));
                setDisplayEnd(prev => Math.max(visibleRange + 1, prev - panStep));
                break;
            case 'ArrowRight':
                e.preventDefault();
                setDisplayStart(prev => Math.min(seqLength - visibleRange, prev + panStep));
                setDisplayEnd(prev => Math.min(seqLength, prev + panStep));
                break;
            case '+':
            case '=':
                e.preventDefault();
                if (visibleRange > 10) {
                    const center = Math.floor((displayStart + displayEnd) / 2);
                    const newRange = Math.max(10, visibleRange - zoomStep);
                    const halfRange = Math.floor(newRange / 2);
                    setDisplayStart(Math.max(1, center - halfRange));
                    setDisplayEnd(Math.min(seqLength, center + halfRange));
                }
                break;
            case '-':
            case '_':
                e.preventDefault();
                {
                    const center = Math.floor((displayStart + displayEnd) / 2);
                    const newRange = Math.min(seqLength, visibleRange + zoomStep);
                    const halfRange = Math.floor(newRange / 2);
                    setDisplayStart(Math.max(1, center - halfRange));
                    setDisplayEnd(Math.min(seqLength, center + halfRange));
                }
                break;
            case 'Home':
                e.preventDefault();
                setDisplayStart(1);
                setDisplayEnd(Math.min(seqLength, 1 + visibleRange));
                break;
            case 'End':
                e.preventDefault();
                setDisplayEnd(seqLength);
                setDisplayStart(Math.max(1, seqLength - visibleRange));
                break;
            case 'Escape':
                window.close();
                break;
        }
    }, [displayStart, displayEnd, seqLength]);

    const colorSchemeOptions: ColorSchemeGroup[] = [
        {
            groupLabel: 'Common',
            items: [
                { label: 'Clustal2', value: 'clustal2' },
                { label: 'Similarity', value: 'conservation' }
            ]
        },
        {
            groupLabel: 'Properties',
            items: [
                { label: 'Hydrophobicity', value: 'hydro' },
                { label: 'Charged', value: 'charged' },
                { label: 'Polar', value: 'polar' }
            ]
        },
        {
            groupLabel: 'Other',
            items: [
                { label: 'Taylor', value: 'taylor' },
                { label: 'Zappo', value: 'zappo' }
            ]
        }
    ];

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#f8f9fa'
            }}>
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', marginRight: '1rem' }} />
                Loading alignment...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#f8f9fa',
                gap: '1rem'
            }}>
                <i className="pi pi-exclamation-triangle" style={{ fontSize: '3rem', color: '#dc3545' }} />
                <div style={{ color: '#dc3545', fontSize: '1.2rem' }}>{error}</div>
                <Button label="Close" icon="pi pi-times" onClick={() => window.close()} />
            </div>
        );
    }

    const msaHeight = Math.max(200, fullAlignmentData.length * 32);

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                outline: 'none',
                backgroundColor: '#fff',
                overflow: 'hidden'
            }}
        >
            {/* Compact header bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #dee2e6',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <span style={{ fontWeight: 600, color: '#333' }}>
                        {fullAlignmentData.length} sequences &middot; {seqLength} positions
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label htmlFor="colorscheme" style={{ fontSize: '0.9rem', color: '#666' }}>Color:</label>
                        <Dropdown
                            id="colorscheme"
                            value={alignmentColorScheme}
                            onChange={(e) => setAlignmentColorScheme(e.value)}
                            options={colorSchemeOptions}
                            optionGroupChildren="items"
                            optionGroupLabel="groupLabel"
                            style={{ minWidth: '140px' }}
                            className="p-inputtext-sm"
                        />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input
                            type="checkbox"
                            checked={showConservation}
                            onChange={(e) => setShowConservation(e.target.checked)}
                        />
                        Conservation graph
                    </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>
                        ←→ pan &middot; +/- zoom &middot; Home/End &middot; Esc close
                    </span>
                    <Button
                        icon="pi pi-times"
                        className="p-button-sm p-button-text"
                        onClick={() => window.close()}
                        tooltip="Close (Esc)"
                        tooltipOptions={{ position: 'bottom' }}
                    />
                </div>
            </div>

            {/* Alignment content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem 1rem' }}>
                <NightingaleManagerComponent reflected-attributes="display-start,display-end">
                    {/* Navigation ruler */}
                    <div style={{ paddingLeft: labelWidth + 'px', marginBottom: '0.5rem' }}>
                        <NightingaleNavigationComponent
                            ruler-padding={0}
                            margin-left={0}
                            margin-right={5}
                            height={40}
                            length={seqLength}
                            display-start={displayStart}
                            display-end={displayEnd}
                            onChange={(e) =>
                                updateDisplayRange({
                                    displayStart: e.detail['display-start'],
                                    displayEnd: e.detail['display-end']
                                })
                            }
                        />
                    </div>

                    {/* Conservation graph */}
                    {showConservation && conservationData.length > 0 && (
                        <div style={{ paddingLeft: labelWidth + 'px', marginBottom: '0.5rem' }}>
                            <NightingaleLinegraphTrack
                                data={conservationData}
                                display-start={displayStart}
                                display-end={displayEnd}
                                length={seqLength}
                                height={60}
                                margin-left={0}
                                margin-right={5}
                            />
                        </div>
                    )}

                    {/* MSA alignment */}
                    <NightingaleMSAComponent
                        label-width={labelWidth}
                        data={fullAlignmentData}
                        features={alignmentFeatures}
                        height={msaHeight}
                        tile-height={TILE_HEIGHT}
                        tile-width={TILE_WIDTH}
                        margin-left={0}
                        margin-right={5}
                        display-start={displayStart}
                        display-end={displayEnd}
                        length={seqLength}
                        colorScheme={alignmentColorScheme}
                        overlay-conservation={showConservation}
                        onChange={(e) =>
                            updateDisplayRange({
                                displayStart: e.detail['display-start'],
                                displayEnd: e.detail['display-end']
                            })
                        }
                    />
                </NightingaleManagerComponent>
            </div>
        </div>
    );
}

export default function FullscreenAlignmentPage() {
    return (
        <Suspense fallback={
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#f8f9fa'
            }}>
                Loading...
            </div>
        }>
            <FullscreenAlignmentContent />
        </Suspense>
    );
}
