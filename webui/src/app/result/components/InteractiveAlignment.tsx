'use client';

import React, { FunctionComponent, useEffect, useState, useRef } from 'react';

import {parse} from 'clustal-js';

import NightingaleMSAComponent from './nightingale/MSA';
import NightingaleManagerComponent from './nightingale/Manager';
import NightingaleNavigationComponent, {NightingaleNavigationType} from './nightingale/Navigation';
import { Dropdown } from 'primereact/dropdown';
import { FloatLabel } from 'primereact/floatlabel';


export interface InteractiveAlignmentProps {
    readonly alignmentResult: string
}
const InteractiveAlignment: FunctionComponent<InteractiveAlignmentProps> = (props: InteractiveAlignmentProps) => {

    const [alignmentColorScheme, setAlignmentColorScheme] = useState<string>('clustal2');
    const updateAlignmentColorScheme = (newColorScheme: string) => {
        if(nightingaleNavigationRef.current){
            console.log('Saving display-start and display-end before rerender.')
            if(nightingaleNavigationRef.current['display-start']) setDisplayStart(nightingaleNavigationRef.current['display-start'])
            if(nightingaleNavigationRef.current['display-end']) setDisplayEnd(nightingaleNavigationRef.current['display-end'])
        }
        setAlignmentColorScheme(newColorScheme)
        console.log('Alignment color scheme updated to:', newColorScheme)
    }
    const colorSchemeOptions = [
        // Amino-acid color schemes
        {label: 'Conservation', value: 'conservation'},
        {label: 'Clustal2', value: 'clustal2'},
        // {label: 'Charged', value: 'charged'},
        // {label: 'Aliphatic', value: 'aliphatic'},
        // {label: 'Aromatic', value: 'aromatic'},
        // {label: 'Buried', value: 'buried'},
        // {label: 'Buried_index', value: 'buried_index'},
        // {label: 'Cinema', value: 'cinema'},
        // {label: 'Hydrophobicity', value: 'hydro'},
        // {label: 'Lesk', value: 'lesk'},
        // {label: 'Mae', value: 'mae'},
        // {label: 'Polar', value: 'polar'},
        // {label: 'Positive', value: 'positive'},
        // {label: 'Strand', value: 'strand'},
        // {label: 'Strand_propensity', value: 'strand_propensity'},
        // {label: 'Taylor', value: 'taylor'},
        // {label: 'Turn', value: 'turn'},
        // {label: 'Turn_propensity', value: 'turn_propensity'},
        // {label: 'Zappo', value: 'zappo'},

        // Nucleic-acid color schemes
        // {label: 'Purine', value: 'purine'},
        // {label: 'Purin_pyrimidine', value: 'purin_pyrimidine'},
        // {label: 'Helix_propensity', value: 'helix_propensity'},
        // {label: 'Helix', value: 'helix'},
        // {label: 'Serine_threonine', value: 'serine_threonine'},
    ]

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
    }, []);

    return (
        <div>
            <FloatLabel>
                <label htmlFor="dd-colorscheme">Color scheme</label>
                <Dropdown id="dd-colorscheme" placeholder='Select an alignment color scheme'
                    value={alignmentColorScheme} onChange={(e) => updateAlignmentColorScheme(e.value)}
                    options={colorSchemeOptions}
                />
            </FloatLabel>
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
                    height={300}
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
