'use client';

import { Button } from 'primereact/button';
import React, { FunctionComponent, useCallback, useEffect, useReducer, useState } from 'react';
import { submitNewPipelineJob } from './serverActions';

import { AlignmentEntryList } from '../AlignmentEntryList/AlignmentEntryList';
import { AlignmentEntryStatus } from '../AlignmentEntry/types';

import { JobType, JobSumbissionPayloadRecord, InputPayloadPart, InputPayloadDispatchAction } from './types';

interface JobSumbitProps {
    readonly agrjBrowseDataRelease: string
}
export const JobSubmitForm: FunctionComponent<JobSumbitProps> = (props: JobSumbitProps) => {
    console.info(`agrjBrowseDataRelease: ${props.agrjBrowseDataRelease}`)

    //TODO: update inputPayloadParts to be indexed hashes to prevent race conditions and mixups on entry removal
    const inputPayloadReducer = (prevState: InputPayloadPart[], action: InputPayloadDispatchAction) => {
        let newState = [...prevState]
        const entityIndex = newState.findIndex(e => e.index === action.value.index)

        switch (action.type) {
            case 'ADD': {
                console.log('inputPayloadReducer ADD action called.')
                if (entityIndex === -1){
                    console.log(`inputPayloadReducer: adding new value at index ${action.value.index} `)
                    newState.push(action.value)
                }

                return newState
            }
            case 'UPDATE': {
                if( entityIndex !== -1 ){
                    newState[entityIndex] = action.value
                }

                return newState
            }
            default: {
                return newState
            }

        }
    }
    const [inputPayloadParts, dispatchInputPayloadPart] = useReducer(inputPayloadReducer, [] as InputPayloadPart[])

    function generate_complete_payload() {
        let payload = [] as JobSumbissionPayloadRecord[]

        inputPayloadParts.forEach((part) => {
            if(part.payloadPart){
                payload = payload.concat(part.payloadPart)
            }
        })
        if(payload.length === 0){
            console.warn('empty payload generated')
            return undefined
        }
        else{
            console.log('returning payload :', payload)
            return payload
        }
    }

    const submitDisabled = () => {
        const non_ready_record = inputPayloadParts.find((record) => record.status !== AlignmentEntryStatus.READY)
        if(non_ready_record){
            return true
        }
        else{
            return false
        }
    }

    const initJob: JobType = {
        'uuid': undefined,
        'status': 'expected',
    }
    const [job, setJob] = useState(initJob)
    const [displayMsg, setDisplayMsg] = useState('')

    const jobDisplayMsg = useCallback( () => {
        if (job['status'] === 'expected' || job['status'] === 'submitting') {
            return ''
        }
        else if (job['status'] === 'failed to submit') {
            let msg = 'Job failed to submit.'
            if (job['inputValidationPassed'] === false ){
                msg += ' Correct the input and try again.'
            }
            else{
                msg += ' Try again and contact the developers if this error persists.'
            }

            return msg
        } else {
            return `job ${job['uuid']||''} is now ${job['status']}.`
        }
    }, [job])

    const handleSubmit = async() => {
        console.log('Generating payload:')

        setJob({
            uuid: undefined,
            status: 'submitting',
        });

        const payload = generate_complete_payload()

        if( payload && payload.length > 1 ){

            console.log('Sending submit request to server action.')
            const submitResponse: JobType = await submitNewPipelineJob(payload)

            console.log('Submit response received, updating Job.')
            setJob(submitResponse)
        }
        else{
            console.warn('No payload to submit.')

            setJob({
                uuid: undefined,
                status: 'failed to submit',
                inputValidationPassed: false
            })
        }
    }

    useEffect(() => {
        console.log('New inputPayloadParts: ', inputPayloadParts)
    }, [inputPayloadParts])

    // Update displayMsg on every job update
    useEffect(
        () => {
            setDisplayMsg(jobDisplayMsg())
        },
        [job, jobDisplayMsg]
    );

    return (
        <div>
            <AlignmentEntryList agrjBrowseDataRelease={props.agrjBrowseDataRelease}
                                dispatchInputPayloadPart={dispatchInputPayloadPart} />
            <Button label='Submit' onClick={handleSubmit} icon="pi pi-check"
                    loading={job['status'] === 'submitting'}
                    disabled={submitDisabled()}
                    /><br />
            <div>{displayMsg}</div>
        </div>
    );
}
