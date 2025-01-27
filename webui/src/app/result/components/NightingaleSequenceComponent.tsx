'use client';

import { EventName, createComponent } from '@lit/react';
import React, { FunctionComponent, useEffect } from 'react';

import NightingaleSequence from '@nightingale-elements/nightingale-sequence';

export type OnFeatureClick = CustomEvent<{ id: string; event: MouseEvent }>;

const NightingaleSequenceComponent: FunctionComponent<{}> = () => {

    const seq = "SEQUENCESEQUENCESEQUENCESEQUENCE";
    const NightingaleSequenceReactComponent = createComponent({
        tagName: 'nightingale-sequence',
        elementClass: NightingaleSequence,
        react: React,
        events: {
          onFeatureClick: 'onFeatureClick' as EventName<OnFeatureClick>,
        },
    });
    
    useEffect(()=> {
        console.log('NightingaleSequenceComponent effect triggered. seq:', seq)
        console.log('customElement found: ', customElements.get("nightingale-sequence"))
        // if(seqContainer && customElements.whenDefined("nightingale-sequence")) {
        //     seqContainer.current.data = seq;
        // }
    }, [seq]);
    
    return (
        <NightingaleSequenceReactComponent
        width={800}
        height={40}
        length={32}
        display-start={10}
        display-end={20}
        highlight="3:15"
        sequence={seq}
        />
    );
}

export default NightingaleSequenceComponent
