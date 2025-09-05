'use client';

import React, { FunctionComponent, useEffect, useState } from 'react';

import dynamic from 'next/dynamic';
import { Dropdown } from 'primereact/dropdown';

import { fetchAlignmentResults, fetchAlignmentSeqInfo } from './serverActions';
import { displayModeType } from './types';
import { TextAlignment } from '../TextAlignment/TextAlignment';
import { SeqInfoDict } from '../InteractiveAlignment/types';

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

    const [alignmentResult, setAlignmentResult] = useState<string>('')
    const [alignmentSeqInfo, setAlignmentSeqInfo] = useState<SeqInfoDict>({})
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
        // Fetch alignment output
        const result = await fetchAlignmentResults(props.uuidStr)
        if(result){
            setAlignmentResult(result)
        }
        else{
            console.log('Failed to retrieve alignment results.')
        }

        // Fetch alignment seq-info
        const seq_info_dict = await fetchAlignmentSeqInfo(props.uuidStr)
        if(seq_info_dict){
            setAlignmentSeqInfo(seq_info_dict)
        }
        else{
            console.log('Failed to retrieve alignment seq-info.')
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
            console.log(`alignmentSeqInfo updated.`)

            if(alignmentSeqInfo){
                console.log(`alignmentSeqInfo updated to:`, alignmentSeqInfo)
            }

        }, [alignmentSeqInfo]
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
                            <div style={{display: interactiveDisplayStyle()}}><InteractiveAlignment alignmentResult={alignmentResult} seqInfoDict={alignmentSeqInfo} /></div>
                            <div style={{display: textDisplayStyle()}}><TextAlignment alignmentResult={alignmentResult} /></div>
                        </>
                    )
                 :
                    (<p>Fetching alignment results...</p>)}
            </div>
        </>
    )
}
