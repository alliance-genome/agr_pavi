'use client';

import { Button } from 'primereact/button';
import React, { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { submitNewPipelineJob } from './serverActions';

import { jobType, jobSumbissionPayloadRecord } from './types';
import { AlignmentEntryList } from '../AlignmentEntryList';

interface jobSumbitProps {
    readonly agrjBrowseDataRelease: string
}
export const JobSubmitForm: FunctionComponent<jobSumbitProps> = (props: jobSumbitProps) => {
    console.info(`agrjBrowseDataRelease: ${props.agrjBrowseDataRelease}`)

    const [payloadParts, setPayloadParts] = useState<Array<Array<jobSumbissionPayloadRecord>|undefined>>([undefined])

    function addPayloadPart(){
        console.log('adding payloadPart.')
        setPayloadParts([...payloadParts, undefined])
    }

    function updatePayloadPart(index: number, newPayloadPart?: jobSumbissionPayloadRecord[]){
        console.log(`updating payloadPart at index ${index} to:`, newPayloadPart)
        setPayloadParts((prevState) => {
            const newState = prevState
            newState[index] = newPayloadPart
            return newState
        })
    }

    function generate_payload() {
        let payload: jobSumbissionPayloadRecord[] | undefined
        if(payloadParts){
            payload = []
            payloadParts.forEach((part) => {
                if(part){
                    payload = payload!.concat(part)
                }
            })
        }
        else {
            payload = undefined
        }

        console.log('returning payload :', payload)
        return payload
    }

    const initJob: jobType = {
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

        const payload = generate_payload()

        if( payload && payload.length > 1 ){

            console.log('Sending submit request to server action.')
            const submitResponse: jobType = await submitNewPipelineJob(payload)

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
                                updatePayloadPart={updatePayloadPart} addPayloadPart={addPayloadPart} />
            {
            //TODO: block submit button when undefined payloadparts are present?
            }
            <Button label='Submit' onClick={handleSubmit} icon="pi pi-check"
                    loading={job['status'] === 'submitting'} /><br />
            <div>{displayMsg}</div>
        </div>
    );
}