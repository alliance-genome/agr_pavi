'use client';

import React, { FunctionComponent, useEffect } from 'react';

import "@nightingale-elements/nightingale-sequence";
import NightingaleSequence from '@nightingale-elements/nightingale-sequence';

type CustomElement<T> = Partial<T & React.DOMAttributes<T> & { children: any }>;

declare global {
    // eslint-disable-next-line no-unused-vars
    namespace JSX {
        // eslint-disable-next-line no-unused-vars
        interface IntrinsicElements {
            ["nightingale-sequence"]: CustomElement<NightingaleSequence>;
        }
    }
}

const NightingaleSequenceComponent: FunctionComponent<{}> = () => {

    const seq = "SEQUENCESEQUENCESEQUENCESEQUENCE";
    
    useEffect(()=> {
        console.log('NightingaleSequenceComponent effect triggered. seq:', seq)
        console.log('customElement found: ', customElements.get("nightingale-sequence"))
        // if(seqContainer && customElements.whenDefined("nightingale-sequence")) {
        //     seqContainer.current.data = seq;
        // }
    }, [seq]);
    
    return (
        <nightingale-sequence
        width={800}
        height={40}
        length={32}
        display-start={10}
        display-end={20}
        highlight="3:15"
        sequence={seq}
        ></nightingale-sequence>
    );
}

export default NightingaleSequenceComponent
