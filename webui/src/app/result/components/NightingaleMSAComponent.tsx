'use client';

import { EventName, createComponent } from '@lit/react';
import React, { FunctionComponent, useEffect, useMemo, useRef } from 'react';

import NightingaleMSA from '@nightingale-elements/nightingale-msa';
import NightingaleManager from '@nightingale-elements/nightingale-manager';
import NightingaleNavigation from '@nightingale-elements/nightingale-navigation';

export type OnFeatureClick = CustomEvent<{ id: string; event: MouseEvent }>;

const NightingaleMSAComponent: FunctionComponent<{}> = () => {

    const NightingaleManagerReactComponent = createComponent({
        tagName: 'nightingale-manager',
        elementClass: NightingaleManager,
        react: React,
    });
    const NightingaleMSAReactComponent = createComponent({
        tagName: 'nightingale-msa',
        elementClass: NightingaleMSA,
        react: React,
        events: {
            onFeatureClick: 'onFeatureClick' as EventName<OnFeatureClick>,
        },
    });
    const NightingaleNavigationReactComponent = createComponent({
        tagName: 'nightingale-navigation',
        elementClass: NightingaleNavigation,
        react: React,
    });

    const nightingaleMSARef = useRef<NightingaleMSA>(null);

    const labelWidth = 200;
    const seqLength = 60;
    const alignmentData = useMemo( () => [
        {sequence: "-MCAALRRNLLLRSL-WVVLAIGTAQVQAASPRWEPQIAVLCEAGQIYQPQYLSEEGRWV", name: "Appl_Appl-RA"},
        {sequence: "-MCAALRRNLLLRSL-WVVLAIGTAQVQAASPRWEPQIAVLCEAGQIYQPQYLSEEGRWV", name: "Appl_Appl-RB"},
        {sequence: "MTVGKLMIGLLIPILVATVYAEGSPAGSKRHEKFIPMVAFSC----GYRNQYMTEEGSWK", name: "apl-1_C42D8.8a.1"},
        {sequence: "MTVGKLMIGLLIPILVATVYAEGSPAGSKRHEKFIPMVAFSC----GYRNQYMTEEGSWK", name: "apl-1_C42D8.8b.1"},
        {sequence: "------------------------------------------------------------", name: "mgl-1_ZC506.4a.1"}
    ],[])

    useEffect(()=> {
        console.log('NightingaleMSAComponent rendered.')
        if(nightingaleMSARef.current){
            console.log('nightingaleMSARef.current defined, loading data...')
            nightingaleMSARef.current.data = alignmentData;
            console.log('NightingaleMSAReactComponent data loaded.')
        }
        else{
            console.log('nightingaleMSARef.current is not set, nothing to do.')
        }
    }, [alignmentData]);

    // TODO: Receive alignment data (or file?) through props from AlignmentResultView
    return (
        <NightingaleManagerReactComponent>
            <div style={{paddingLeft: labelWidth.toString()+'px'}}>
                <NightingaleNavigationReactComponent
                    height={40}
                    length={seqLength}
                />
            </div>
            <NightingaleMSAReactComponent
                ref={nightingaleMSARef}
                label-width={labelWidth}
                width={800}
                height={300}
                length={seqLength}
                colorScheme='conservation'
            />
        </NightingaleManagerReactComponent>
    );
}

export default NightingaleMSAComponent
