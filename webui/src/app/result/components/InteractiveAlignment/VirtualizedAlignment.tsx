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

import { Dropdown } from 'primereact/dropdown';

import { SeqInfoDict } from './types';

// Constants for virtualization
const SEQUENCE_HEIGHT = 26; // Height per sequence in pixels
const TILE_HEIGHT = 24; // Height of each amino acid tile
const TILE_WIDTH = 16; // Width of each amino acid tile
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
}

const VirtualizedAlignment: FunctionComponent<VirtualizedAlignmentProps> = (
    props: VirtualizedAlignmentProps
) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [alignmentColorScheme, setAlignmentColorScheme] = useState<string>('clustal2');
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
        <div ref={containerRef}>
            <div style={{ paddingBottom: '10px' }}>
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
                <span
                    style={{
                        marginLeft: '20px',
                        fontSize: '12px',
                        color: '#666'
                    }}
                >
                    Showing {visibleData.length} of {fullAlignmentData.length} sequences
                    (virtualized)
                </span>
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
