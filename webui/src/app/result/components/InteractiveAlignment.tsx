'use client';

import React, { FunctionComponent, useEffect, useState } from 'react';

import {parse} from 'clustal-js';

import NightingaleMSAComponent from './nightingale/MSA';
import NightingaleManagerComponent from './nightingale/Manager';
import NightingaleNavigationComponent from './nightingale/Navigation';
import { Dropdown } from 'primereact/dropdown';
import { FloatLabel } from 'primereact/floatlabel';


export interface InteractiveAlignmentProps {
    readonly alignmentResult: string
}
const InteractiveAlignment: FunctionComponent<InteractiveAlignmentProps> = (props: InteractiveAlignmentProps) => {

    const [alignmentColorScheme, setAlignmentColorScheme] = useState<string>('clustal2');
    const colorSchemeOptions = [
        {label: 'Conservation', value: 'conservation'},
        {label: 'Clustal2', value: 'clustal2'},
        // {label: 'Charged', value: 'charged'},
        // {label: 'Aliphatic', value: 'aliphatic'},
        // {label: 'Purine', value: 'purine'},
        // {label: 'Purin_pyrimidine', value: 'purin_pyrimidine'},
        // {label: 'Aromatic', value: 'aromatic'},
        // {label: 'Buried', value: 'buried'},
        // {label: 'Buried_index', value: 'buried_index'},
        // {label: 'Cinema', value: 'cinema'},
        // {label: 'Helix_propensity', value: 'helix_propensity'},
        // {label: 'Helix', value: 'helix'},
        // {label: 'Hydrophobicity', value: 'hydro'},
        // {label: 'Lesk', value: 'lesk'},
        // {label: 'Mae', value: 'mae'},
        // {label: 'Polar', value: 'polar'},
        // {label: 'Positive', value: 'positive'},
        // {label: 'Serine_threonine', value: 'serine_threonine'},
        // {label: 'Strand', value: 'strand'},
        // {label: 'Strand_propensity', value: 'strand_propensity'},
        // {label: 'Taylor', value: 'taylor'},
        // {label: 'Turn', value: 'turn'},
        // {label: 'Turn_propensity', value: 'turn_propensity'},
        // {label: 'Zappo', value: 'zappo'},
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

    let displayStart: number
    let displayEnd: number
    let displayCenter: number

    if(seqLength <= 150){
        displayStart = 1;
        displayEnd = seqLength;
    }
    else {
        displayCenter = Math.round(seqLength/2)
        displayStart = displayCenter - 75;
        displayEnd = displayCenter + 75;
    }

    useEffect(()=> {
        console.log('InteractiveAlignment rendered.')
    }, []);

    return (
        <div>
            <FloatLabel>
                <label htmlFor="dd-colorscheme">Color scheme</label>
                <Dropdown id="dd-colorscheme" placeholder='Select an alignment color scheme'
                    value={alignmentColorScheme} onChange={(e) => setAlignmentColorScheme(e.value)}
                    options={colorSchemeOptions}
                />
            </FloatLabel>
            <NightingaleManagerComponent
                reflected-attributes='display-start,display-end'
            >
                <div style={{paddingLeft: labelWidth.toString()+'px'}}>
                    <NightingaleNavigationComponent
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
