'use client';

import { FunctionComponent, useEffect, useState, useMemo, useCallback } from 'react';

import {parse} from 'clustal-js';

import NightingaleMSAComponent, {dataPropType as MSADataProp, featuresPropType as MSAFeaturesProp} from './nightingale/MSA';
import NightingaleManagerComponent from './nightingale/Manager';
import NightingaleNavigationComponent from './nightingale/Navigation';
import NightingaleTrack, {dataPropType as TrackDataProp, FeatureShapes} from './nightingale/Track';

import { Dropdown } from 'primereact/dropdown';

import { SeqInfoDict } from './types';

interface ColorSchemeSelectItem {
    label: string;
    value: string;
}

interface ColorSchemeSelectGroup {
    groupLabel: string;
    items: ColorSchemeSelectItem[];
}

export interface InteractiveAlignmentProps {
    readonly alignmentResult: string,
    readonly seqInfoDict: SeqInfoDict
}
const InteractiveAlignment: FunctionComponent<InteractiveAlignmentProps> = (props: InteractiveAlignmentProps) => {

    const [alignmentColorScheme, setAlignmentColorScheme] = useState<string>('clustal2');

    type updateRangeArgs = {
        displayStart?: number
        displayEnd?: number
    }
    const updateDisplayRange = useCallback((args: updateRangeArgs) => {
        if(args.displayStart !== undefined){
            setDisplayStart(args.displayStart)
        }
        if(args.displayEnd !== undefined){
            setDisplayEnd(args.displayEnd)
        }
    }, []);

    const updateAlignmentColorScheme = useCallback((newColorScheme: string) => {
        setAlignmentColorScheme(newColorScheme)
    }, []);
    //TODO: update groups and group labels to match Uniprot grouping
    const aminoAcidcolorSchemeOptions: ColorSchemeSelectGroup[] = [
        {
            groupLabel: 'Common options',
            items: [
                {label: 'Similarity', value: 'conservation'},
                {label: 'Clustal2', value: 'clustal2'},
            ]
        },
        {
            groupLabel: 'Physical properties',
            items: [
                {label: 'Aliphatic', value: 'aliphatic'},
                {label: 'Aromatic', value: 'aromatic'},
                {label: 'Charged', value: 'charged'},
                {label: 'Positive', value: 'positive'},
                {label: 'Negative', value: 'negative'},
                {label: 'Hydrophobicity', value: 'hydro'},
                {label: 'Polar', value: 'polar'},
            ]
        },
        {
            groupLabel: 'Structural properties',
            items: [
                {label: 'Buried index', value: 'buried_index'},
                {label: 'Helix propensity', value: 'helix_propensity'},
                {label: 'Strand propensity', value: 'strand_propensity'},
                {label: 'Turn propensity', value: 'turn_propensity'},
            ]
        },
        {
            groupLabel: 'Other color schemes',
            items: [
                {label: 'Cinema', value: 'cinema'},
                {label: 'Lesk', value: 'lesk'},
                {label: 'Mae', value: 'mae'},
                {label: 'Taylor', value: 'taylor'},
                {label: 'Zappo', value: 'zappo'},
            ]
        }
    ]

    // const nucleicAcidcolorSchemeOptions: ColorSchemeSelectGroup[] = [
    //     {label: 'Purine', value: 'purine'},
    //     {label: 'Purin_pyrimidine', value: 'purin_pyrimidine'},
    //     {label: 'Helix_propensity', value: 'helix_propensity'},
    //     {label: 'Helix', value: 'helix'},
    //     {label: 'Serine_threonine', value: 'serine_threonine'},
    // ]

    const itemGroupTemplate = (option: ColorSchemeSelectGroup) => {
        return (
            <div><b>{option.groupLabel}</b></div>
        );
    };

    // Memoize alignment data parsing - only recompute when alignmentResult changes
    const alignmentData = useMemo<MSADataProp>(() => {
        console.log('Parsing received alignmentResult.')
        if (!props.alignmentResult) return [];
        const parsedAlignment = parse(props.alignmentResult);
        return parsedAlignment['alns'].map((aln: {id: string, seq: string}) => ({
            sequence: aln.seq,
            name: aln.id
        }));
    }, [props.alignmentResult]);

    // Memoize sequence length calculation
    const seqLength = useMemo(() => {
        return alignmentData.reduce((maxLength, alignment) => {
            return Math.max(maxLength, alignment.sequence.length);
        }, 0) || 100;
    }, [alignmentData]);

    // Memoize alignment features and variant track data
    const { alignmentFeatures, variantTrackData, variantTrackHeight } = useMemo(() => {
        console.log('Computing alignment features.')
        const features: MSAFeaturesProp = [];
        const trackData: TrackDataProp = [];
        const positionalFeatureCount: Map<number, number> = new Map([]);

        for (let i = 0; i < alignmentData.length; i++) {
            const alignment_seq_name = alignmentData[i].name;
            if (alignment_seq_name in props.seqInfoDict && 'embedded_variants' in props.seqInfoDict[alignment_seq_name]) {
                for (const embedded_variant of (props.seqInfoDict[alignment_seq_name]['embedded_variants'] || [])) {
                    // Add variant to positional feature count
                    for (let j = embedded_variant.alignment_start_pos; j <= embedded_variant.alignment_end_pos; j++) {
                        positionalFeatureCount.set(j, (positionalFeatureCount.get(j) || 0) + 1);
                    }
                    // Add variant to alignment features
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

        const height = Math.max(...Array.from(positionalFeatureCount.values())) * 15 || 15;

        return {
            alignmentFeatures: features,
            variantTrackData: trackData,
            variantTrackHeight: height
        };
    }, [alignmentData, props.seqInfoDict]);

    const maxLabelLength = alignmentData.reduce((maxLength, alignment) => {
        return Math.max(maxLength, alignment.name.length);
    }, 0);
    const labelWidth = maxLabelLength * 9;

    const [displayStart, setDisplayStart] = useState<number>(1);
    const [displayEnd, setDisplayEnd] = useState<number>(100);

    // Initialize display range to show readable sequence at center of alignment
    useEffect(() => {
        if (seqLength > 0) {
            const initDisplayCenter = Math.round(seqLength / 2);
            const newDisplayStart = seqLength <= 150 ? 1 : initDisplayCenter - 75;
            const newDisplayEnd = seqLength <= 150 ? seqLength : initDisplayCenter + 75;
            setDisplayStart(newDisplayStart);
            setDisplayEnd(newDisplayEnd);
        }
    }, [seqLength]);

    return (
        <div>
            <div style={{paddingBottom: '10px'}}>
                <label htmlFor="dd-colorscheme">Color scheme: </label>
                <Dropdown id="dd-colorscheme" placeholder='Select an alignment color scheme'
                    value={alignmentColorScheme} onChange={(e) => updateAlignmentColorScheme(e.value)}
                    options={aminoAcidcolorSchemeOptions}
                    optionGroupChildren='items' optionGroupLabel='groupLabel' optionGroupTemplate={itemGroupTemplate}
                />
            </div>
            <div id='alignment-view-container'>
                {/* Variant overview track - only show if there are variants */}
                {variantTrackData.length > 0 && (
                    <div style={{paddingLeft: labelWidth.toString()+'px'}}>
                        <NightingaleTrack
                            id='variant-overview-track'
                            data={variantTrackData}
                            display-start={1}
                            display-end={seqLength}
                            length={seqLength}
                            height={variantTrackHeight}
                            layout='non-overlapping'
                            margin-left={0}
                            margin-right={5}
                        />
                    </div>
                )}
                <NightingaleManagerComponent
                    reflected-attributes='display-start,display-end'
                >
                    <div style={{paddingLeft: labelWidth.toString()+'px'}}>
                        <NightingaleNavigationComponent
                            ruler-padding={0}
                            margin-left={0}
                            margin-right={5}
                            height={40}
                            length={seqLength}
                            display-start={displayStart}
                            display-end={displayEnd}
                            onChange={(e) => updateDisplayRange({displayStart: e.detail['display-start'], displayEnd: e.detail['display-end']})}
                        />
                    </div>
                    {/* Variant zoom track - only show if there are variants */}
                    {variantTrackData.length > 0 && (
                        <div style={{paddingLeft: labelWidth.toString()+'px'}}>
                            <NightingaleTrack
                                id='variant-zoom-track'
                                data={variantTrackData}
                                display-start={displayStart}
                                display-end={displayEnd}
                                length={seqLength}
                                margin-left={0}
                                margin-right={5}
                                height={variantTrackHeight}
                                layout='non-overlapping'
                            />
                        </div>
                    )}
                    {alignmentData.length === 0 || seqLength === 0 ? (
                        <div style={{ padding: '20px', color: '#666' }}>Loading alignment...</div>
                    ) : (
                        <NightingaleMSAComponent
                            label-width={labelWidth}
                            data={alignmentData}
                            features={alignmentFeatures}
                            height={alignmentData.length * 20}
                            margin-left={0}
                            margin-right={5}
                            display-start={displayStart}
                            display-end={displayEnd}
                            length={seqLength}
                            colorScheme={alignmentColorScheme}
                            onChange={(e) => updateDisplayRange({displayStart: e.detail['display-start'], displayEnd: e.detail['display-end']})}
                        />
                    )}
                </NightingaleManagerComponent>
            </div>
        </div>
    );
}

export default InteractiveAlignment
