'use client';

import React, { FunctionComponent, useEffect, useRef } from 'react';
import "@nightingale-elements/nightingale-sequence";

// declare global {
//     namespace JSX {
//         interface IntrinsicElements {
//             'nightingale-sequence': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
//         }
//     }
// }

export const NightingaleSequenceComponent: FunctionComponent = () => {
    
    const seqContainer = useRef(null);
    
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
        ref={seqContainer}
        width="800"
        height="40"
        length="32"
        display-start="10"
        display-end="20"
        highlight="3:15"
        sequence={seq}
        ></nightingale-sequence>
    );
}