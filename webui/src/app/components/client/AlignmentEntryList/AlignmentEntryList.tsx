'use client';

import { Button } from 'primereact/button';
import React, { FunctionComponent, useState } from 'react';

import { AlignmentEntry, alignmentEntryProps } from '../AlignmentEntry/AlignmentEntry'
import { payloadPartType } from '../JobSubmitForm/types';
import { updatePayloadPartType } from './types';

interface alignmentEntryListProps {
    readonly agrjBrowseDataRelease: string
    readonly payloadPartsRef: React.MutableRefObject<payloadPartType[]>
}
export const AlignmentEntryList: FunctionComponent<alignmentEntryListProps> = (props: alignmentEntryListProps) => {

    //TODO: update alignmentEntries and payloadParts to be indexed hashes to prevent race conditions and mixups on entry removal?
    const addPayloadPart = (value: payloadPartType = undefined) => {
        props.payloadPartsRef.current.push(value)
    }
    const updatePayloadPart: updatePayloadPartType = (index: number, value: payloadPartType) => {
        console.log(`AlignmentEntryList.updatePayloadPart payloadPartsRef.current:`, props.payloadPartsRef.current)
        console.log(`AlignmentEntryList: Updating payloadPartsRef.current at index ${index} to:`, value)
        props.payloadPartsRef.current[index] = value
    }

    interface AlignmentEntryListItem {
        props: alignmentEntryProps
    }
    const alignmentEntryBaseProps = {
        agrjBrowseDataRelease: props.agrjBrowseDataRelease,
        updatePayloadPart: updatePayloadPart
    }
    const initListItem = (index: number) => {
        addPayloadPart()
        return(
            {props: {
                ...alignmentEntryBaseProps,
                index: index
            }}
        ) as AlignmentEntryListItem
    }
    const [alignmentEntries, setAlignmentEntries] = useState<AlignmentEntryListItem[]>([initListItem(0)])
    function addAlignmentEntry(){
        setAlignmentEntries((prevState) => {
            const newEntryIndex = prevState.length
            const newEntry = initListItem(newEntryIndex)
            console.log(`Adding new alignmentEntry at index ${newEntryIndex}`)

            return([...prevState, newEntry])
        })
    }

    //TODO: enable removal of entries

    return (
        <table>
            <tbody>
                {alignmentEntries.map((listEntry) => (<tr key={listEntry.props.index}><td>< AlignmentEntry {...listEntry.props} /></td></tr>))}
                <tr><td>
                    <Button text icon="pi pi-plus" onClick={() => addAlignmentEntry()} />
                </td></tr>
            </tbody>
        </table>
    )
}