'use client';

import React, {
    FunctionComponent,
    useEffect,
    useState,
    useCallback,
    useMemo,
    useRef
} from 'react';

import { parse } from 'clustal-js';

import NightingaleMSAComponent, {
    dataPropType as MSADataProp,
    featuresPropType as MSAFeaturesProp
} from './nightingale/MSA';
import NightingaleManagerComponent from './nightingale/Manager';
import NightingaleNavigationComponent from './nightingale/Navigation';
import NightingaleTrack, {
    dataPropType as TrackDataProp,
    FeatureShapes
} from './nightingale/Track';
import NightingaleLinegraphTrack, { LineData } from './nightingale/LinegraphTrack';

import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';

import { SeqInfoDict } from './types';

// Constants for virtualization and display
const SEQUENCE_HEIGHT = 36; // Height per sequence in pixels (larger for readability)
const TILE_HEIGHT = 32; // Height of each amino acid tile (default is 20)
const TILE_WIDTH = 22; // Width of each amino acid tile (default is 20)
const OVERSCAN = 10; // Number of extra sequences to render above/below viewport
const MIN_VISIBLE_SEQUENCES = 30; // Minimum sequences to show at once

interface ColorSchemeSelectItem {
    label: string;
    value: string;
}

interface ColorSchemeSelectGroup {
    groupLabel: string;
    items: ColorSchemeSelectItem[];
}

export interface VirtualizedAlignmentProps {
    readonly alignmentResult: string;
    readonly seqInfoDict: SeqInfoDict;
    readonly jobUuid?: string;
}

const VirtualizedAlignment: FunctionComponent<VirtualizedAlignmentProps> = (
    props: VirtualizedAlignmentProps
) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [alignmentColorScheme, setAlignmentColorScheme] = useState<string>('clustal2');
    const [showConservation, setShowConservation] = useState<boolean>(false);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600);

    // Parse alignment data once
    const fullAlignmentData = useMemo<MSADataProp>(() => {
        if (!props.alignmentResult) return [];
        const parsedAlignment = parse(props.alignmentResult);
        return parsedAlignment['alns'].map((aln: { id: string; seq: string }) => ({
            sequence: aln.seq,
            name: aln.id
        }));
    }, [props.alignmentResult]);

    // Calculate sequence length
    const seqLength = useMemo(() => {
        return fullAlignmentData.reduce((maxLength, alignment) => {
            return Math.max(maxLength, alignment.sequence.length);
        }, 0);
    }, [fullAlignmentData]);

    // Calculate visible range based on scroll position
    const { visibleData, virtualOffset } = useMemo(() => {
        const totalSequences = fullAlignmentData.length;
        const viewportSequences = Math.ceil(containerHeight / SEQUENCE_HEIGHT);
        const visibleCount = Math.max(MIN_VISIBLE_SEQUENCES, viewportSequences + OVERSCAN * 2);

        // Calculate start index based on scroll
        let startIdx = Math.floor(scrollTop / SEQUENCE_HEIGHT) - OVERSCAN;
        startIdx = Math.max(0, startIdx);

        // Don't virtualize if we have fewer sequences than would fill the container
        if (totalSequences <= visibleCount) {
            return {
                visibleData: fullAlignmentData,
                virtualOffset: 0
            };
        }

        let endIdx = startIdx + visibleCount;
        endIdx = Math.min(totalSequences, endIdx);

        return {
            visibleData: fullAlignmentData.slice(startIdx, endIdx),
            virtualOffset: startIdx * SEQUENCE_HEIGHT
        };
    }, [fullAlignmentData, scrollTop, containerHeight]);

    // Update alignment features for visible sequences only
    const { alignmentFeatures, variantTrackData, variantTrackHeight } = useMemo(() => {
        const features: MSAFeaturesProp = [];
        const trackData: TrackDataProp = [];
        const positionalFeatureCount: Map<number, number> = new Map([]);

        for (let i = 0; i < visibleData.length; i++) {
            const alignment_seq_name = visibleData[i].name;
            if (
                alignment_seq_name in props.seqInfoDict &&
                'embedded_variants' in props.seqInfoDict[alignment_seq_name]
            ) {
                for (const embedded_variant of props.seqInfoDict[alignment_seq_name][
                    'embedded_variants'
                ] || []) {
                    // Add variant to positional feature count
                    for (
                        let j = embedded_variant.alignment_start_pos;
                        j <= embedded_variant.alignment_end_pos;
                        j++
                    ) {
                        positionalFeatureCount.set(j, (positionalFeatureCount.get(j) || 0) + 1);
                    }
                    // Add variant to alignment features (relative to visible window)
                    features.push({
                        residues: {
                            from: embedded_variant.alignment_start_pos,
                            to: embedded_variant.alignment_end_pos
                        },
                        sequences: {
                            from: i,
                            to: i
                        },
                        id: `feature_${alignment_seq_name}_${embedded_variant.variant_id}`,
                        borderColor: 'black',
                        fillColor: 'black',
                        mouseOverBorderColor: 'black',
                        mouseOverFillColor: 'transparent'
                    });

                    // Add variant to variant track
                    let variantShape: FeatureShapes = 'diamond';
                    if (embedded_variant.seq_substitution_type === 'deletion') {
                        variantShape = 'triangle';
                    }
                    if (embedded_variant.seq_substitution_type === 'insertion') {
                        variantShape = 'chevron';
                    }
                    trackData.push({
                        accession: embedded_variant.variant_id,
                        start: embedded_variant.alignment_start_pos,
                        end: embedded_variant.alignment_end_pos,
                        color: 'gray',
                        shape: variantShape
                    });
                }
            }
        }

        const height = Math.max(...positionalFeatureCount.values()) * 15 || 15;

        return {
            alignmentFeatures: features,
            variantTrackData: trackData,
            variantTrackHeight: height
        };
    }, [visibleData, props.seqInfoDict]);

    // Calculate label width based on max name length
    const labelWidth = useMemo(() => {
        const maxLabelLength = fullAlignmentData.reduce((maxLength, alignment) => {
            return Math.max(maxLength, alignment.name.length);
        }, 0);
        return maxLabelLength * 9;
    }, [fullAlignmentData]);

    // Extract allele information for display
    const alleleInfo = useMemo(() => {
        const alleles: Array<{
            seqName: string;
            variantId: string;
            refSeq: string;
            altSeq: string;
            position: string;
            type: string;
        }> = [];

        for (const [seqName, seqInfo] of Object.entries(props.seqInfoDict)) {
            if (seqInfo.embedded_variants) {
                for (const variant of seqInfo.embedded_variants) {
                    alleles.push({
                        seqName,
                        variantId: variant.variant_id,
                        refSeq: variant.genomic_ref_seq || '-',
                        altSeq: variant.genomic_alt_seq || '-',
                        position: `${variant.genomic_seq_id}:${variant.genomic_start_pos}-${variant.genomic_end_pos}`,
                        type: variant.seq_substitution_type
                    });
                }
            }
        }
        return alleles;
    }, [props.seqInfoDict]);

    // Calculate conservation scores for each position
    const conservationData = useMemo<LineData[]>(() => {
        if (fullAlignmentData.length < 2 || seqLength === 0) return [];

        const values: Array<{ position: number; value: number }> = [];

        for (let pos = 0; pos < seqLength; pos++) {
            // Count residues at this position
            const residueCounts: Map<string, number> = new Map();
            let totalNonGap = 0;

            for (const seq of fullAlignmentData) {
                const residue = seq.sequence[pos];
                if (residue && residue !== '-' && residue !== '.') {
                    residueCounts.set(residue, (residueCounts.get(residue) || 0) + 1);
                    totalNonGap++;
                }
            }

            // Calculate conservation as percentage of most common residue
            let maxCount = 0;
            residueCounts.forEach(count => {
                if (count > maxCount) maxCount = count;
            });

            // Conservation score: percentage of sequences with the most common residue
            const score = totalNonGap > 0 ? (maxCount / fullAlignmentData.length) * 100 : 0;

            values.push({
                position: pos + 1, // 1-based position
                value: score
            });
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

    // Display range state
    const [displayStart, setDisplayStart] = useState<number>(1);
    const [displayEnd, setDisplayEnd] = useState<number>(100); // Default to reasonable value

    type updateRangeArgs = {
        displayStart?: number;
        displayEnd?: number;
    };
    const updateDisplayRange = useCallback((args: updateRangeArgs) => {
        if (args.displayStart !== undefined) {
            setDisplayStart(args.displayStart);
        }
        if (args.displayEnd !== undefined) {
            setDisplayEnd(args.displayEnd);
        }
    }, []);

    const updateAlignmentColorScheme = useCallback((newColorScheme: string) => {
        setAlignmentColorScheme(newColorScheme);
    }, []);

    // Color scheme options
    const aminoAcidcolorSchemeOptions: ColorSchemeSelectGroup[] = [
        {
            groupLabel: 'Common options',
            items: [
                { label: 'Similarity', value: 'conservation' },
                { label: 'Clustal2', value: 'clustal2' }
            ]
        },
        {
            groupLabel: 'Physical properties',
            items: [
                { label: 'Aliphatic', value: 'aliphatic' },
                { label: 'Aromatic', value: 'aromatic' },
                { label: 'Charged', value: 'charged' },
                { label: 'Positive', value: 'positive' },
                { label: 'Negative', value: 'negative' },
                { label: 'Hydrophobicity', value: 'hydro' },
                { label: 'Polar', value: 'polar' }
            ]
        },
        {
            groupLabel: 'Structural properties',
            items: [
                { label: 'Buried index', value: 'buried_index' },
                { label: 'Helix propensity', value: 'helix_propensity' },
                { label: 'Strand propensity', value: 'strand_propensity' },
                { label: 'Turn propensity', value: 'turn_propensity' }
            ]
        },
        {
            groupLabel: 'Other color schemes',
            items: [
                { label: 'Cinema', value: 'cinema' },
                { label: 'Lesk', value: 'lesk' },
                { label: 'Mae', value: 'mae' },
                { label: 'Taylor', value: 'taylor' },
                { label: 'Zappo', value: 'zappo' }
            ]
        }
    ];

    const itemGroupTemplate = (option: ColorSchemeSelectGroup) => {
        return (
            <div>
                <b>{option.groupLabel}</b>
            </div>
        );
    };

    // Handle scroll
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Keyboard navigation handler
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const visibleRange = displayEnd - displayStart;
        const panStep = Math.max(1, Math.floor(visibleRange * 0.1)); // 10% of visible range
        const zoomStep = Math.max(1, Math.floor(visibleRange * 0.2)); // 20% zoom per step

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
            case 'ArrowUp':
                // Scroll up in virtualized list
                e.preventDefault();
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = Math.max(0, scrollTop - SEQUENCE_HEIGHT * 3);
                }
                break;
            case 'ArrowDown':
                // Scroll down in virtualized list
                e.preventDefault();
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = scrollTop + SEQUENCE_HEIGHT * 3;
                }
                break;
            case '+':
            case '=':
                // Zoom in (show fewer residues)
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
                // Zoom out (show more residues)
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
        }
    }, [displayStart, displayEnd, seqLength, scrollTop]);

    // Update container height on mount and resize
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.clientHeight);
            }
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Update zoom to show readable sequence at centre of alignment
    useEffect(() => {
        if (seqLength === 0) return;

        const initDisplayCenter = Math.round(seqLength / 2);
        // Show fewer positions initially for better readability (50 instead of 150)
        const halfWindow = 25;
        const newDisplayStart = seqLength <= halfWindow * 2 ? 1 : initDisplayCenter - halfWindow;
        const newDisplayEnd = seqLength <= halfWindow * 2 ? seqLength : initDisplayCenter + halfWindow;

        setDisplayStart(newDisplayStart);
        setDisplayEnd(newDisplayEnd);
    }, [seqLength]);

    // Total height for scroll container
    const totalHeight = fullAlignmentData.length * SEQUENCE_HEIGHT;

    // Height of visible MSA component
    const visibleMsaHeight = visibleData.length * SEQUENCE_HEIGHT;

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            role="application"
            aria-label="Alignment viewer. Use arrow keys to pan, +/- to zoom, Home/End to jump to start/end"
            style={{ outline: 'none' }}
        >
            {/* Allele Information Panel - shown when variants exist */}
            {alleleInfo.length > 0 && (
                <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--agr-gray-50, #f8f9fa)',
                    borderRadius: '6px',
                    border: '1px solid var(--agr-gray-200, #e9ecef)'
                }}>
                    <div style={{
                        fontWeight: 600,
                        marginBottom: '0.5rem',
                        fontSize: '0.9rem',
                        color: 'var(--agr-gray-700, #495057)'
                    }}>
                        Variant Information ({alleleInfo.length} variant{alleleInfo.length !== 1 ? 's' : ''})
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '0.5rem',
                        maxHeight: '150px',
                        overflowY: 'auto'
                    }}>
                        {alleleInfo.map((allele, idx) => (
                            <div key={idx} style={{
                                padding: '0.5rem',
                                backgroundColor: 'white',
                                borderRadius: '4px',
                                border: '1px solid var(--agr-gray-200, #dee2e6)',
                                fontSize: '0.8rem'
                            }}>
                                <div style={{ fontWeight: 500, color: 'var(--agr-primary, #0066cc)' }}>
                                    {allele.variantId}
                                </div>
                                <div style={{ color: '#666', marginTop: '2px' }}>
                                    <span style={{ fontFamily: 'monospace' }}>
                                        {allele.refSeq} → {allele.altSeq}
                                    </span>
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        padding: '0 4px',
                                        backgroundColor: allele.type === 'deletion' ? '#fee2e2' :
                                                        allele.type === 'insertion' ? '#dcfce7' : '#fef3c7',
                                        borderRadius: '3px',
                                        fontSize: '0.7rem',
                                        textTransform: 'uppercase'
                                    }}>
                                        {allele.type}
                                    </span>
                                </div>
                                <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '2px' }}>
                                    {allele.position}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Controls Row */}
            <div style={{
                paddingBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label htmlFor="dd-colorscheme">Color scheme: </label>
                    <Dropdown
                        id="dd-colorscheme"
                        placeholder="Select an alignment color scheme"
                        value={alignmentColorScheme}
                        onChange={(e) => updateAlignmentColorScheme(e.value)}
                        options={aminoAcidcolorSchemeOptions}
                        optionGroupChildren="items"
                        optionGroupLabel="groupLabel"
                        optionGroupTemplate={itemGroupTemplate}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        id="conservation-overlay"
                        checked={showConservation}
                        onChange={(e) => setShowConservation(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="conservation-overlay" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                        Show conservation
                    </label>
                </div>

                <span
                    style={{
                        fontSize: '12px',
                        color: '#666'
                    }}
                >
                    {visibleData.length} of {fullAlignmentData.length} sequences
                </span>
                <span
                    style={{
                        fontSize: '11px',
                        color: '#888',
                        marginLeft: 'auto'
                    }}
                    aria-hidden="true"
                >
                    Keys: ←→ pan | ↑↓ scroll | +/- zoom | Home/End jump
                </span>

                {props.jobUuid && (
                    <Button
                        icon="pi pi-external-link"
                        label="Full Screen"
                        className="p-button-sm p-button-outlined"
                        onClick={() => {
                            const params = new URLSearchParams();
                            params.set('uuid', props.jobUuid!);
                            window.open(`/alignment?${params.toString()}`, '_blank');
                        }}
                        style={{ marginLeft: '1rem' }}
                    />
                )}
            </div>
            <div id="alignment-view-container">
                {/* Variant overview track - only show if there are variants */}
                {variantTrackData.length > 0 && (
                    <div style={{ paddingLeft: labelWidth.toString() + 'px' }}>
                        <NightingaleTrack
                            id="variant-overview-track"
                            data={variantTrackData}
                            display-start={1}
                            display-end={seqLength}
                            length={seqLength}
                            height={variantTrackHeight}
                            layout="non-overlapping"
                            margin-left={0}
                            margin-right={5}
                        />
                    </div>
                )}

                <NightingaleManagerComponent reflected-attributes="display-start,display-end">
                    <div style={{ paddingLeft: labelWidth.toString() + 'px' }}>
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

                    {/* Conservation track - shows sequence conservation as a line graph */}
                    {showConservation && conservationData.length > 0 && (
                        <div style={{ paddingLeft: labelWidth.toString() + 'px' }}>
                            <div style={{
                                fontSize: '11px',
                                color: '#666',
                                marginBottom: '2px',
                                paddingLeft: '2px'
                            }}>
                                Conservation (%)
                            </div>
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

                    {/* Variant zoom track - only show if there are variants */}
                    {variantTrackData.length > 0 && (
                        <div style={{ paddingLeft: labelWidth.toString() + 'px' }}>
                            <NightingaleTrack
                                id="variant-zoom-track"
                                data={variantTrackData}
                                display-start={displayStart}
                                display-end={displayEnd}
                                length={seqLength}
                                margin-left={0}
                                margin-right={5}
                                height={variantTrackHeight}
                                layout="non-overlapping"
                            />
                        </div>
                    )}

                    {/* MSA container - simple for small alignments, virtualized for large */}
                    {fullAlignmentData.length === 0 || seqLength === 0 ? (
                        <div style={{ padding: '20px', color: '#666' }}>Loading alignment...</div>
                    ) : fullAlignmentData.length <= MIN_VISIBLE_SEQUENCES ? (
                        <NightingaleMSAComponent
                            label-width={labelWidth}
                            data={fullAlignmentData}
                            features={alignmentFeatures}
                            height={fullAlignmentData.length * SEQUENCE_HEIGHT}
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
                    ) : (
                        <div
                            ref={scrollContainerRef}
                            onScroll={handleScroll}
                            style={{
                                height: `${Math.min(containerHeight - 100, totalHeight)}px`,
                                maxHeight: '500px',
                                overflow: 'auto',
                                position: 'relative'
                            }}
                        >
                            {/* Total height spacer for scrollbar */}
                            <div style={{ height: `${totalHeight}px`, position: 'absolute', width: '1px' }} />

                            {/* Positioned MSA content */}
                            <div
                                style={{
                                    position: 'relative',
                                    top: `${virtualOffset}px`,
                                    willChange: 'transform'
                                }}
                            >
                                <NightingaleMSAComponent
                                    label-width={labelWidth}
                                    data={visibleData}
                                    features={alignmentFeatures}
                                    height={visibleMsaHeight}
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
                            </div>
                        </div>
                    )}
                </NightingaleManagerComponent>
            </div>
        </div>
    );
};

export default VirtualizedAlignment;
