'use client';

import React, { FunctionComponent, useEffect, useRef } from 'react';

import {parse} from 'clustal-js';

import NightingaleMSAComponent, { NightingaleMSAType } from './nightingale/MSA';
import NightingaleManagerComponent from './nightingale/Manager';
import NightingaleNavigationComponent from './nightingale/Navigation';


export interface InteractiveAlignmentProps {
    readonly alignmentResult: string
}
const InteractiveAlignment: FunctionComponent<InteractiveAlignmentProps> = (props: InteractiveAlignmentProps) => {

    const nightingaleMSARef = useRef<NightingaleMSAType>(null);

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
                ref={nightingaleMSARef}
                label-width={labelWidth}
                data={alignmentData}
                width={800}
                height={300}
                display-start={displayStart}
                display-end={displayEnd}
                length={seqLength}
                colorScheme='conservation'
            />
        </NightingaleManagerComponent>
    );
}

export default InteractiveAlignment
