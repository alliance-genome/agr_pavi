'use client';

import { Button } from 'primereact/button';
import React, { FunctionComponent, useCallback, useEffect, useReducer, useState } from 'react';
import { submitNewPipelineJob } from './serverActions';

import { AlignmentEntryList } from '../AlignmentEntryList/AlignmentEntryList';
import { AlignmentEntryStatus } from '../AlignmentEntry/types';

import { JobType, JobSumbissionPayloadRecord, InputPayloadDispatchAction, InputPayloadPartMap } from './types';

interface JobSumbitProps {
    readonly agrjBrowseDataRelease: string
}
export const JobSubmitForm: FunctionComponent<JobSumbitProps> = (props: JobSumbitProps) => {
    console.info(`agrjBrowseDataRelease: ${props.agrjBrowseDataRelease}`)

    const inputPayloadReducer = (prevState: InputPayloadPartMap, action: InputPayloadDispatchAction) => {
        let newState = new Map(prevState)
        const entityIndex = action.value.index

        switch (action.type) {
            case 'ADD': {
                console.log('inputPayloadReducer ADD action called.')
                if ( prevState.get(entityIndex) === undefined ){
                    console.log(`inputPayloadReducer: adding new value at index ${action.value.index} `)
                    newState.set(entityIndex, action.value)
                }
                else {
                    console.warn(`inputPayloadReducer: addition requested but index ${action.value.index} already has existing value.`)
                }

                return newState
            }
            case 'UPDATE': {
                if ( prevState.get(entityIndex) !== undefined ){
                    newState.set(entityIndex, action.value)
                }
                else{
                    console.warn(`inputPayloadReducer: Update requested to non-existing inputPayload at index ${entityIndex}.`)
                }

                return newState
            }
            default: {
                return newState
            }

        }
    }
    const [inputPayloadParts, dispatchInputPayloadPart] = useReducer(inputPayloadReducer, new Map() as InputPayloadPartMap)

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
        const non_ready = [...inputPayloadParts.values()].some(
            (record) => record.status !== AlignmentEntryStatus.READY
        )

        return non_ready
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
