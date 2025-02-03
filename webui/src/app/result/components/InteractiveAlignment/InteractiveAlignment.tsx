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
    readonly hidden: boolean
}
const InteractiveAlignment: FunctionComponent<InteractiveAlignmentProps> = (props: InteractiveAlignmentProps) => {

    const [alignmentColorScheme, setAlignmentColorScheme] = useState<string>('clustal2');

    const saveDisplayRange = () => {
        if(nightingaleNavigationRef.current){
            console.log('Saving nightingale navigation display-start and display-end.')
            console.log(`nightingaleNavigationRef.current['display-start']: ${nightingaleNavigationRef.current['display-start']}`)
            console.log(`nightingaleNavigationRef.current['display-end']: ${nightingaleNavigationRef.current['display-end']}`)
            if(nightingaleNavigationRef.current['display-start']) setDisplayStart(nightingaleNavigationRef.current['display-start'])
            if(nightingaleNavigationRef.current['display-end']) setDisplayEnd(nightingaleNavigationRef.current['display-end'])
        }
    }

    const updateAlignmentColorScheme = (newColorScheme: string) => {
        saveDisplayRange()
        setAlignmentColorScheme(newColorScheme)
        console.log('Alignment color scheme updated to:', newColorScheme)
    }
    const aminoAcidcolorSchemeOptions: ColorSchemeSelectGroup[] = [
        {
            groupLabel: 'Common options',
            items: [
                {label: 'Conservation', value: 'conservation'},
                {label: 'Clustal2', value: 'clustal2'},
            ]
        },
        {
            groupLabel: 'Chemical properties',
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
            groupLabel: 'Alternative color schemes',
            items: [
                {label: 'Cinema', value: 'cinema'},
                {label: 'Lesk', value: 'lesk'},
                {label: 'Mae', value: 'mae'},
                {label: 'Taylor', value: 'taylor'},
                {label: 'Zappo', value: 'zappo'},
            ]
        },
        {
            groupLabel: 'Other options',
            items: [
                {label: 'Buried', value: 'buried'},
                // {label: 'Strand', value: 'strand'},
                {label: 'Strand propensity', value: 'strand_propensity'},
                // {label: 'Turn', value: 'turn'},
                {label: 'Turn propensity', value: 'turn_propensity'},
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
    const alignmentData = parsedAlignment['alns'].map((aln: {id: string, seq: string}) => {
        return {sequence: aln.seq, name: aln.id}
    })

    const maxLabelLength = alignmentData.reduce((maxLength, alignment) => {
        return Math.max(maxLength, alignment.name.length);
    }, 0);
    const labelWidth = maxLabelLength * 12;
    const seqLength = alignmentData.reduce((maxLength, alignment) => {
        return Math.max(maxLength, alignment.sequence.length);
    }, 0);

    const initDisplayCenter = Math.round(seqLength/2)
    const [displayStart, setDisplayStart] = useState<number>(seqLength <= 150 ? 1 : initDisplayCenter - 75);
    const [displayEnd, setDisplayEnd] = useState<number>(seqLength <= 150 ? seqLength : initDisplayCenter + 75);

    const nightingaleNavigationRef = useRef<NightingaleNavigationType>(null);

    useEffect(()=> {
        console.log('InteractiveAlignment rendered.')

        return () => {
            console.log('InteractiveAlignment unmounted.')
        }
    }, []);

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
                    />
                </div>
                <NightingaleMSAComponent
                    label-width={labelWidth}
                    data={alignmentData}
                    //TODO: adjust height according to number of sequences to be displayed
                    height={150}
                    display-start={displayStart}
                    display-end={displayEnd}
                    length={seqLength}
                    colorScheme={alignmentColorScheme}
                />
            </NightingaleManagerComponent>
        </div>
    );
}

export default InteractiveAlignment
