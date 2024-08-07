'use client';

import { Button } from 'primereact/button';
import React, { FunctionComponent, useState } from 'react';

import { AlignmentEntry, AlignmentEntryProps } from '../AlignmentEntry/AlignmentEntry'
import { PayloadPart } from '../JobSubmitForm/types';
import { UpdatePayloadPartFn } from './types';

interface AlignmentEntryListProps {
    readonly agrjBrowseDataRelease: string
    readonly payloadPartsRef: React.MutableRefObject<PayloadPart[]>
}
export const AlignmentEntryList: FunctionComponent<AlignmentEntryListProps> = (props: AlignmentEntryListProps) => {

    //TODO: update alignmentEntries and payloadParts to be indexed hashes to prevent race conditions and mixups on entry removal?
    const addPayloadPart = (value: PayloadPart = undefined) => {
        props.payloadPartsRef.current.push(value)
    }
    const updatePayloadPart: UpdatePayloadPartFn = (index: number, value: PayloadPart) => {
        console.log(`AlignmentEntryList.updatePayloadPart payloadPartsRef.current:`, props.payloadPartsRef.current)
        console.log(`AlignmentEntryList: Updating payloadPartsRef.current at index ${index} to:`, value)
        props.payloadPartsRef.current[index] = value
    }

    interface AlignmentEntryListItem {
        props: AlignmentEntryProps
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