'use client';

import React, { FunctionComponent, useEffect, useMemo, useRef } from 'react';

import NightingaleMSAComponent, { NightingaleMSAType } from './nightingale/MSA';
import NightingaleManagerComponent from './nightingale/Manager';
import NightingaleNavigationComponent from './nightingale/Navigation';


const InteractiveAlignmentComponent: FunctionComponent<{}> = () => {

    const nightingaleMSARef = useRef<NightingaleMSAType>(null);

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
        console.log('InteractiveAlignmentComponent rendered.')
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
        <NightingaleManagerComponent>
            <div style={{paddingLeft: labelWidth.toString()+'px'}}>
                <NightingaleNavigationComponent
                    height={40}
                    length={seqLength}
                />
            </div>
            <NightingaleMSAComponent
                ref={nightingaleMSARef}
                label-width={labelWidth}
                width={800}
                height={300}
                length={seqLength}
                colorScheme='conservation'
            />
        </NightingaleManagerComponent>
    );
}

export default InteractiveAlignmentComponent
