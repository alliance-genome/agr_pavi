'use client';

import React, { FunctionComponent, useEffect, useState } from 'react';

import dynamic from 'next/dynamic';
import { Dropdown } from 'primereact/dropdown';

import { fetchAlignmentResults, fetchAlignmentSeqInfo } from './serverActions';
import { displayModeType } from './types';
import { TextAlignment } from '../TextAlignment/TextAlignment';
import { SeqInfoDict } from '../InteractiveAlignment/types';
import { FailureDisplay } from '../FailureDisplay/FailureDisplay';
import { ResultsSummary } from '../ResultsSummary';

const InteractiveAlignment = dynamic(() => import('../InteractiveAlignment/InteractiveAlignment'), { ssr: false })
const VirtualizedAlignment = dynamic(() => import('../InteractiveAlignment/VirtualizedAlignment'), { ssr: false })

export interface AlignmentResultViewProps {
    readonly uuidStr: string
}
export const AlignmentResultView: FunctionComponent<AlignmentResultViewProps> = (props: AlignmentResultViewProps) => {

    const [displayMode, setDisplayMode] = useState('virtualized' as displayModeType)
    type displayModeOptionsType = {
        label: string,
        value: displayModeType
    }
    const displayModeOptions: displayModeOptionsType[] = [
        {label: 'Interactive (Virtualized)', value: 'virtualized'},
        {label: 'Interactive (Legacy)', value: 'interactive'},
        {label: 'Text', value: 'text'}
    ]

    const [alignmentResult, setAlignmentResult] = useState<string>('')
    const [alignmentSeqInfo, setAlignmentSeqInfo] = useState<SeqInfoDict>({})
    const [seqFailures, setSeqFailures] = useState<Map<string, string>>(new Map<string, string>())
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [loadedAt, setLoadedAt] = useState<Date | undefined>(undefined)
    function changeDisplayMode(displayMode: displayModeType) {
        console.log(`Changing display mode to ${displayMode}.`)
        setDisplayMode(displayMode)
    }


    async function getAlignmentResult(){
        setIsLoading(true)

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

        // Store failures
        if(seq_info_dict !== undefined && Object.keys(seq_info_dict).length > 0 ){
            const failures: Map<string, string> = new Map<string, string>()
            for (const [seq_name, seq_info] of Object.entries(seq_info_dict)){
                if (seq_info.error){
                    failures.set(seq_name, seq_info.error)
                }
            }

            setSeqFailures(failures)
        }
        else{
            setSeqFailures(new Map<string, string>())
        }

        setLoadedAt(new Date())
        setIsLoading(false)
    }

    const handleDownload = () => {
        if (!alignmentResult) return

        const blob = new Blob([alignmentResult], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `alignment-${props.uuidStr.slice(0, 8)}.fasta`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleShare = () => {
        const url = `${window.location.origin}/result?uuid=${props.uuidStr}`
        navigator.clipboard.writeText(url).then(() => {
            // Could add a toast notification here
            console.log('Result URL copied to clipboard')
        })
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
        <div className="agr-page-section">
            <div className="agr-page-header">
                <h1>Alignment Results</h1>
            </div>

            {/* Results Summary Panel */}
            <ResultsSummary
                jobId={props.uuidStr}
                alignmentResult={alignmentResult}
                seqInfoDict={alignmentSeqInfo}
                isLoading={isLoading}
                completedAt={loadedAt}
                onDownload={alignmentResult ? handleDownload : undefined}
                onShare={handleShare}
            />

            {seqFailures && seqFailures.size > 0 && (
                <div className="agr-card agr-card-warning">
                    <FailureDisplay failureList={seqFailures} />
                </div>
            )}

            <div className="agr-card">
                <div className="agr-card-header">
                    <div className="agr-result-header">
                        <h2>Protein Sequence Alignment</h2>
                        <div className="agr-display-mode-selector">
                            <label htmlFor="display-mode">Display mode: </label>
                            <Dropdown id="display-mode"
                                value={displayMode} onChange={(e) => changeDisplayMode(e.value)}
                                options={displayModeOptions}
                                optionLabel='label'
                                className="agr-dropdown-sm"/>
                        </div>
                    </div>
                </div>
                <div className="agr-card-body">
                    <div className="agr-alignment-viewer">
                        {alignmentResult ?
                            (
                                <>
                                    {displayMode === 'virtualized' && <VirtualizedAlignment alignmentResult={alignmentResult} seqInfoDict={alignmentSeqInfo} />}
                                    {displayMode === 'interactive' && <InteractiveAlignment alignmentResult={alignmentResult} seqInfoDict={alignmentSeqInfo} />}
                                    {displayMode === 'text' && <TextAlignment alignmentResult={alignmentResult} />}
                                </>
                            )
                         :
                            (
                                <div className="agr-loading-state">
                                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                                    <p>Fetching alignment results...</p>
                                </div>
                            )}
                    </div>
                </div>
            </div>
        </div>
    )
}
