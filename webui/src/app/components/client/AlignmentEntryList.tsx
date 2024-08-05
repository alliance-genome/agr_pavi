'use client';

import { Button } from 'primereact/button';
import React, { FunctionComponent, useState } from 'react';

import { AlignmentEntry, alignmentEntryProps } from './AlignmentEntry/AlignmentEntry'

interface alignmentEntryListProps {
    readonly agrjBrowseDataRelease: string
    readonly addPayloadPart: Function
    readonly updatePayloadPart: Function
}
export const AlignmentEntryList: FunctionComponent<alignmentEntryListProps> = (props: alignmentEntryListProps) => {

    const alignmentEntryBaseProps = {
        agrjBrowseDataRelease: props.agrjBrowseDataRelease,
        updatePayloadPart: props.updatePayloadPart
    }
    //TODO: update alignmentEntries and payloadParts to be indexed hashes to prevent race conditions and mixups on entry removal?
    //TODO: create new "initatedAlignmentEntry" function that can be used for initial entity definition, which calls addPayloadPart accordingly?
    const [alignmentEntries, setAlignmentEntries] = useState<alignmentEntryProps[]>([{...alignmentEntryBaseProps, index: 0}])
    function addAlignmentEntry(){
        setAlignmentEntries((prevState) => {
            const newEntryIndex = prevState.length
            const newEntry: alignmentEntryProps = {...alignmentEntryBaseProps, index: newEntryIndex}
            console.log(`Adding new alignmentEntry at index ${newEntryIndex}`)

            props.addPayloadPart()
            return([...prevState, newEntry])
        })
    }

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