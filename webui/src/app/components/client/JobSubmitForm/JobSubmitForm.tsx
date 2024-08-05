'use client';

import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import React, { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { submitNewPipelineJob } from './serverActions';

import { jobType } from './types';
import { AlignmentEntryList } from '../AlignmentEntryList';

interface jobSumbitProps {
    readonly agrjBrowseDataRelease: string
}
export const JobSubmitForm: FunctionComponent<jobSumbitProps> = (props: jobSumbitProps) => {
    console.info(`agrjBrowseDataRelease: ${props.agrjBrowseDataRelease}`)
    const [payload, setPayload] = useState("")

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
        setJob({
            uuid: undefined,
            status: 'submitting',
        });

        console.log('Sending submit request to server action.')
        const submitResponse: jobType = await submitNewPipelineJob(payload)

        console.log('Submit response received, updating Job.')
        setJob(submitResponse)
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
            <AlignmentEntryList agrjBrowseDataRelease={props.agrjBrowseDataRelease} />
            <InputTextarea onChange={ (e) => setPayload(e.currentTarget.value) } /><br />
            <Button label='Submit' onClick={handleSubmit} icon="pi pi-check"
                    loading={job['status'] === 'submitting'} /><br />
            <div>{displayMsg}</div>
        </div>
    );
}