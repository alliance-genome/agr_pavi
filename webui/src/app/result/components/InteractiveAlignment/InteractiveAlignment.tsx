'use client';

import React, { FunctionComponent, useEffect, useState, useRef } from 'react';

import {parse} from 'clustal-js';

import NightingaleMSAComponent from './nightingale/MSA';
import NightingaleManagerComponent from './nightingale/Manager';
import NightingaleNavigationComponent, {NightingaleNavigationType} from './nightingale/Navigation';
import { Dropdown } from 'primereact/dropdown';

interface ColorSchemeSelectItem {
    label: string;
    value: string;
}

interface ColorSchemeSelectGroup {
    groupLabel: string;
    items: ColorSchemeSelectItem[];
}

export interface InteractiveAlignmentProps {
    readonly alignmentResult: string
}
const InteractiveAlignment: FunctionComponent<InteractiveAlignmentProps> = (props: InteractiveAlignmentProps) => {

    const [alignmentColorScheme, setAlignmentColorScheme] = useState<string>('clustal2');

    type updateRangeArgs = {
        displayStart?: number
        displayEnd?: number
    }
    function updateDisplayRange(args: updateRangeArgs){
        if(args.displayStart !== undefined){
            console.log(`Updating dipslayStart to ${args.displayStart}`)
            setDisplayStart(args.displayStart)
        }
        if(args.displayEnd !== undefined){
            console.log(`Updating dipslayEnd to ${args.displayEnd}`)
            setDisplayEnd(args.displayEnd)
        }
    }

    const updateAlignmentColorScheme = (newColorScheme: string) => {
        setAlignmentColorScheme(newColorScheme)
        console.log('Alignment color scheme updated to:', newColorScheme)
    }
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

    const parsedAlignment = parse(props.alignmentResult)

    type alignmentDataType = {sequence: string, name: string}[]
    const alignmentData: alignmentDataType = parsedAlignment['alns'].map((aln: {id: string, seq: string}) => {
        return {sequence: aln.seq, name: aln.id}
    })

    const maxLabelLength = alignmentData.reduce((maxLength, alignment) => {
        return Math.max(maxLength, alignment.name.length);
    }, 0);
    const labelWidth = maxLabelLength * 8;
    const seqLength = alignmentData.reduce((maxLength, alignment) => {
        return Math.max(maxLength, alignment.sequence.length);
    }, 0);

    const [displayStart, setDisplayStart] = useState<number>(1);
    const [displayEnd, setDisplayEnd] = useState<number>(-1);

    const nightingaleNavigationRef = useRef<NightingaleNavigationType>(null);

    useEffect(() => {
        console.log('InteractiveAlignment rendered.')

        return () => {
            console.log('InteractiveAlignment unmounted.')
        }
    }, []);

    useEffect(() => {
        // Update zoom to show readable sequence at centre of alignment
        console.log('Updating navigation to readable centre.')
        const initDisplayCenter = Math.round(seqLength/2)
        const newDisplayStart = seqLength <= 150 ? 1 : initDisplayCenter - 75
        const newDisplayEnd = seqLength <= 150 ? seqLength : initDisplayCenter + 75
        if( newDisplayStart != displayStart ){
            updateDisplayRange({displayStart: newDisplayStart})
        }
        if( newDisplayEnd != displayEnd ){
            updateDisplayRange({displayEnd: newDisplayEnd})
        }
    }, [seqLength]);  // eslint-disable-line react-hooks/exhaustive-deps

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
            <div>
                <NightingaleManagerComponent
                    reflected-attributes='display-start,display-end'
                >
                    <div style={{paddingLeft: labelWidth.toString()+'px'}}>
                        <NightingaleNavigationComponent
                            ref={nightingaleNavigationRef}
                            height={40}
                            length={seqLength}
                            display-start={displayStart}
                            display-end={displayEnd}
                            onChange={(e) => updateDisplayRange({displayStart: e.detail['display-start'], displayEnd: e.detail['display-end']})}
                        />
                    </div>
                    <NightingaleMSAComponent
                        label-width={labelWidth}
                        data={alignmentData}
                        height={alignmentData.length * 20}
                        display-start={displayStart}
                        display-end={displayEnd}
                        length={seqLength}
                        colorScheme={alignmentColorScheme}
                        onChange={(e) => updateDisplayRange({displayStart: e.detail['display-start'], displayEnd: e.detail['display-end']})}
                    />
                </NightingaleManagerComponent>
            </div>
        </div>
    );
}

export default InteractiveAlignment
