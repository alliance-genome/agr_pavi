'use client';

import { Button } from 'primereact/button';
import React, { FunctionComponent, useEffect, useState } from 'react';

import { AlignmentEntry, AlignmentEntryProps } from '../AlignmentEntry/AlignmentEntry'
import { InputPayloadDispatchAction } from '../JobSubmitForm/types';

interface AlignmentEntryListProps {
    readonly agrjBrowseDataRelease: string
    readonly dispatchInputPayloadPart: React.Dispatch<InputPayloadDispatchAction>
}
export const AlignmentEntryList: FunctionComponent<AlignmentEntryListProps> = (props: AlignmentEntryListProps) => {

    interface AlignmentEntryListItem {
        props: AlignmentEntryProps
    }
    const alignmentEntryBaseProps = {
        agrjBrowseDataRelease: props.agrjBrowseDataRelease,
        dispatchInputPayloadPart: props.dispatchInputPayloadPart
    }
    const initListItem = (index: number) => {
        console.log(`Initiating list item for index ${index}`)
        return(
            {props: {
                ...alignmentEntryBaseProps,
                index: index
            }}
        ) as AlignmentEntryListItem
    }
    const [alignmentEntries, setAlignmentEntries] = useState<Map<number, AlignmentEntryListItem>>(new Map())
    function initiateFirstAlignmentEntry(){
        setAlignmentEntries((prevState) => {
            const newState = new Map(prevState)
            if(prevState.size === 0){
                console.log('Initiating first alignmentEntry.')
                const firstItemIndex = 0
                const newEntry = initListItem(firstItemIndex)
                newState.set(firstItemIndex, newEntry)
            }

            return(newState)
        })
    }
    function cleanupAlignmentEntries(){
        console.log('Cleaning up all alignmentEntries.')
        setAlignmentEntries(new Map())
    }
    function addAlignmentEntry(){
        setAlignmentEntries((prevState) => {
            const prevKeys: number[] = Array.from(prevState.keys())

            const newEntryKey = prevKeys.length > 0 ? Math.max( ...prevKeys ) + 1 : 0
            const newEntry = initListItem(newEntryKey)

            console.log(`Adding new alignmentEntry at index ${newEntryKey}`)
            const newState = new Map(prevState)
            newState.set(newEntryKey, newEntry)

            return(newState)
        })
    }
    function removeAlignmentEntry(deleteIndex: number){
        setAlignmentEntries((prevState) => {
            const newState = new Map(prevState)

            if( prevState.get(deleteIndex) ){
                console.log(`Deleting alignmentEntry at index ${deleteIndex} from list.`)
                newState.delete(deleteIndex)
            }
            else{
                console.warn(`Request received to delete AlignmentEntry with index ${deleteIndex}, but no such entry found.`)
            }

            return(newState)
        })
    }

    useEffect(() => {
        console.log('Initiating first entry.')
        initiateFirstAlignmentEntry()

        return cleanupAlignmentEntries
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <table>
            <tbody>
                {Array.from(alignmentEntries.values()).map((listEntry) => (
                    <tr key={listEntry.props.index}>
                        <td><Button text id="remove-record" icon="pi pi-trash" onClick={() => removeAlignmentEntry(listEntry.props.index)} /></td>
                        <td>< AlignmentEntry {...listEntry.props} /></td>
                    </tr>))
                }
                <tr><td>
                    <Button text id="add-record" icon="pi pi-plus" onClick={() => addAlignmentEntry()} />
                </td></tr>
            </tbody>
        </table>
    )
}
