'use client';

import { Button } from 'primereact/button';
import React, { FunctionComponent, useEffect, useState } from 'react';

import { jobSumbissionPayloadRecord } from '../../types';
import { AlignmentEntry, alignmentEntryProps } from './AlignmentEntry'

interface alignmentEntryListProps {
    readonly geneInfoFn: Function,
    readonly agrjBrowseDataRelease: string
}
export const AlignmentEntryList: FunctionComponent<alignmentEntryListProps> = (props: alignmentEntryListProps) => {
    //TODO: generate complete payload from all payloadParts
    //TODO: enable passthrough of payload value to jobSumbitForm for submission
    // const [payload, setPayload] = useState<object[]>([])

    //TODO: update alignmentEntries and payloadParts to be indexed hashes to prevent race conditions and mixups on entry removal

    const [alignmentEntries, setAlignmentEntries] = useState<alignmentEntryProps[]>([])
    const [payloadParts, setPayloadParts] = useState<Array<Array<jobSumbissionPayloadRecord>|undefined>>([])

    function updateAlignmentEntries(index: number, newPayloadPart?: jobSumbissionPayloadRecord[]){
        setPayloadParts((prevState) => {
            const newState = prevState
            newState[index] = newPayloadPart
            return newState
        })
    }

    const alignmentEntryBaseProps = {
        geneInfoFn: props.geneInfoFn,
        agrjBrowseDataRelease: props.agrjBrowseDataRelease,
        updatePayloadPart: updateAlignmentEntries
    }
    function addAlignmentEntry(){
        setAlignmentEntries((prevState) => {
            const newEntryIndex = prevState.length
            console.log(`Adding new alignmentEntry at index ${newEntryIndex}`)

            setPayloadParts([...payloadParts, undefined])
            return([...prevState, {...alignmentEntryBaseProps, index: newEntryIndex}])
        })
    }
    useEffect(
        () => {
            addAlignmentEntry()
        },[]
    )


    //TODO: enable removal of entries

    return (
        <table>
            <tbody>
                {alignmentEntries.map((entryProps, index) => (<tr key={index}><td>< AlignmentEntry {...entryProps} index={index} /></td></tr>))}
                <tr><td>
                    <Button text icon="pi pi-plus" onClick={() => addAlignmentEntry()} />
                </td></tr>
            </tbody>
        </table>
    )
}