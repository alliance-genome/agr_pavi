'use client';

import React, { FunctionComponent, useEffect, useState } from 'react';

import dynamic from 'next/dynamic';
import { ToggleButton } from 'primereact/togglebutton';

import { fetchAlignmentResults } from './serverActions';
import { TextAlignment } from '../TextAlignment/TextAlignment';

const InteractiveAlignment = dynamic(() => import('../InteractiveAlignment/InteractiveAlignment'), { ssr: false })

export interface AlignmentResultViewProps {
    readonly uuidStr: string
}
export const AlignmentResultView: FunctionComponent<AlignmentResultViewProps> = (props: AlignmentResultViewProps) => {

    const [interactiveMode, setInteractiveMode] = useState(true)
    const [alignmentResult, setAlignmentResult] = useState(String)
    function toggleInteractiveMode(interactiveMode: boolean) {
        console.log(`Toggling interactive mode to ${interactiveMode?'enabled':'disabled'}.`)
        setInteractiveMode(interactiveMode)
    }

    const interactiveDisplayStyle = () => {
        return interactiveMode ? 'block' : 'none'
    }
    const textDisplayStyle = () => {
        return interactiveMode ? 'none' : 'block'
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

        }, [alignmentResult] // eslint-disable-line react-hooks/exhaustive-deps
    )

    return (
        <>
            <div style={{paddingBottom: '10px'}}>
                <ToggleButton onLabel="Interactive"
                            offLabel="Text"
                            tooltip='display mode'
                            checked={interactiveMode} onChange={(e) => toggleInteractiveMode(e.value)} />
            </div>
            <div>
                {alignmentResult ?
                    (
                        <>
                            <div style={{display: interactiveDisplayStyle()}}><InteractiveAlignment alignmentResult={alignmentResult} hidden={!interactiveMode} /></div>
                            <div style={{display: textDisplayStyle()}}><TextAlignment alignmentResult={alignmentResult} /></div>
                        </>
                    )
                 :
                    (<p>Fetching alignment results...</p>)}
            </div>
        </>
    )
}
