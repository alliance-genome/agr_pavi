'use client';

import { Button } from 'primereact/button';
import React, { FunctionComponent, useEffect, useState } from 'react';

import { AlignmentEntry, AlignmentEntryProps } from '../AlignmentEntry/AlignmentEntry'
import { InputPayloadDispatchAction } from '../JobSubmitForm/types';

interface AlignmentEntryListProps {
    readonly agrjBrowseDataRelease: string
    readonly dispatchInputPayloadPart: React.Dispatch<InputPayloadDispatchAction>
    readonly initialGeneIds?: string[]
}
export const AlignmentEntryList: FunctionComponent<AlignmentEntryListProps> = (props: AlignmentEntryListProps) => {

    interface AlignmentEntryListItem {
        props: AlignmentEntryProps
    }
    const alignmentEntryBaseProps = {
        agrjBrowseDataRelease: props.agrjBrowseDataRelease,
        dispatchInputPayloadPart: props.dispatchInputPayloadPart
    }
    const initListItem = (index: number, initialGeneId?: string) => {
        console.log(`Initiating list item for index ${index}${initialGeneId ? ` with initialGeneId: ${initialGeneId}` : ''}`)
        return(
            {props: {
                ...alignmentEntryBaseProps,
                index: index,
                initialGeneId: initialGeneId
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

            /* istanbul ignore else */
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

    // Handle loading initial gene IDs (e.g., from example data)
    useEffect(() => {
        if (props.initialGeneIds && props.initialGeneIds.length > 0) {
            console.log(`Loading ${props.initialGeneIds.length} initial gene IDs:`, props.initialGeneIds)
            setAlignmentEntries(() => {
                const newState = new Map<number, AlignmentEntryListItem>()
                props.initialGeneIds!.forEach((geneId, index) => {
                    newState.set(index, initListItem(index, geneId))
                })
                return newState
            })
        }
    }, [props.initialGeneIds]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="agr-alignment-list">
            {Array.from(alignmentEntries.values()).map((listEntry) => (
                <div key={listEntry.props.index} className="agr-alignment-entry">
                    {alignmentEntries.size > 1 && (
                        <div className="agr-alignment-entry-controls">
                            <Button
                                text
                                severity="danger"
                                id="remove-record"
                                icon="pi pi-trash"
                                onClick={() => removeAlignmentEntry(listEntry.props.index)}
                                tooltip="Remove this entry"
                                tooltipOptions={{ position: 'top' }}
                            />
                        </div>
                    )}
                    <div className="agr-alignment-entry-fields">
                        <AlignmentEntry {...listEntry.props} />
                    </div>
                </div>
            ))}
            <div className="agr-alignment-add">
                <Button
                    text
                    id="add-record"
                    icon="pi pi-plus"
                    label="Add Another Gene"
                    onClick={() => addAlignmentEntry()}
                    className="p-button-outlined"
                />
            </div>
        </div>
    )
}
