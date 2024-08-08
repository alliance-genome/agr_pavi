'use client';

import { Button } from 'primereact/button';
import React, { FunctionComponent, useEffect, useState } from 'react';

import { AlignmentEntry, AlignmentEntryProps } from '../AlignmentEntry/AlignmentEntry'
import { InputPayloadPart, InputPayloadDispatchAction } from '../JobSubmitForm/types';
import { AlignmentEntryStatus } from '../AlignmentEntry/types';

interface AlignmentEntryListProps {
    readonly agrjBrowseDataRelease: string
    readonly dispatchInputPayloadPart: React.Dispatch<InputPayloadDispatchAction>
}
export const AlignmentEntryList: FunctionComponent<AlignmentEntryListProps> = (props: AlignmentEntryListProps) => {

    //TODO: update alignmentEntries to be indexed hashes to prevent race conditions and mixups on entry removal
    interface AlignmentEntryListItem {
        props: AlignmentEntryProps
    }
    const alignmentEntryBaseProps = {
        agrjBrowseDataRelease: props.agrjBrowseDataRelease,
        dispatchInputPayloadPart: props.dispatchInputPayloadPart
    }
    const initListItem = (index: number) => {
        console.log(`Initiating list item for index ${index}`)
        const inputPayloadPart: InputPayloadPart = {
            index: index,
            status: AlignmentEntryStatus.PENDING_INPUT,
            payloadPart: undefined
        }
        props.dispatchInputPayloadPart({type: 'ADD', value: inputPayloadPart})
        return(
            {props: {
                ...alignmentEntryBaseProps,
                index: index
            }}
        ) as AlignmentEntryListItem
    }
    const [alignmentEntries, setAlignmentEntries] = useState<AlignmentEntryListItem[]>([])
    function initiateFirstAlignmentEntry(){
        setAlignmentEntries((prevState) => {
            let newState = [...prevState]
            if(prevState.length === 0){
                console.log('Initiating first alignmentEntry.')
                const newEntry = initListItem(0)
                newState.push(newEntry)
            }

            return(newState)
        })
    }
    function addAlignmentEntry(){
        setAlignmentEntries((prevState) => {
            const newEntryIndex = prevState.length
            const newEntry = initListItem(newEntryIndex)
            console.log(`Adding new alignmentEntry at index ${newEntryIndex}`)

            return([...prevState, newEntry])
        })
    }

    useEffect(() => {
        console.log('Initiating first entry.')
        if(alignmentEntries.length === 0){
            initiateFirstAlignmentEntry()
        }
    }, [alignmentEntries])

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