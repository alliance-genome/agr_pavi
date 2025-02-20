'use client';

import React, { FunctionComponent, useEffect, useState } from 'react';

import dynamic from 'next/dynamic';
import { Dropdown } from 'primereact/dropdown';

import { fetchAlignmentResults } from './serverActions';
import { displayModeType } from './types';
import { TextAlignment } from '../TextAlignment/TextAlignment';

const InteractiveAlignment = dynamic(() => import('../InteractiveAlignment/InteractiveAlignment'), { ssr: false })

export interface AlignmentResultViewProps {
    readonly uuidStr: string
}
export const AlignmentResultView: FunctionComponent<AlignmentResultViewProps> = (props: AlignmentResultViewProps) => {

    const [displayMode, setDisplayMode] = useState('interactive' as displayModeType)
    type displayModeOptionsType = {
        label: string,
        value: displayModeType
    }
    const displayModeOptions: displayModeOptionsType[] = [
        {label: 'Text', value: 'text'},
        {label: 'Interactive', value: 'interactive'}
    ]

    const [alignmentResult, setAlignmentResult] = useState(String)
    function changeDisplayMode(displayMode: displayModeType) {
        console.log(`Changing display mode to ${displayMode}.`)
        setDisplayMode(displayMode)
    }

    const interactiveDisplayStyle = () => {
        return displayMode == 'interactive' ? 'block' : 'none'
    }
    const textDisplayStyle = () => {
        return displayMode == 'text' ? 'block' : 'none'
    }

    async function getAlignmentResult(){
        const result = await fetchAlignmentResults(props.uuidStr)
        if(result){
            setAlignmentResult(result)
        }
        else{
            console.log('Failed to retrieve alignment results.')
        }
    }

    useEffect(
        () => {
            console.log(`Fetching alignmentResult.`)

            getAlignmentResult()

        }, [] // eslint-disable-line react-hooks/exhaustive-deps
    )

    useEffect(
        () => {
            console.log(`AlignmentResult updated.`)

            if(alignmentResult){
                console.log(`AlignmentResult updated to: ${alignmentResult}`)
            }

        }, [alignmentResult]
    )

    return (
        <>
            <div style={{paddingBottom: '10px'}}>
                <label htmlFor="display-mode">Display mode: </label>
                <Dropdown id="display-mode"
                    value={displayMode} onChange={(e) => changeDisplayMode(e.value)}
                    options={displayModeOptions}
                    optionLabel='label'/>
            </div>
            <div>
                {alignmentResult ?
                    (
                        <>
                            <div style={{display: interactiveDisplayStyle()}}><InteractiveAlignment alignmentResult={alignmentResult} /></div>
                            <div style={{display: textDisplayStyle()}}><TextAlignment alignmentResult={alignmentResult} /></div>
                        </>
                    )
                 :
                    (<p>Fetching alignment results...</p>)}
            </div>
        </>
    )
}
