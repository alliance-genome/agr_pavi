'use client';

import { PrimeReactProvider } from 'primereact/api';
import { Button } from 'primereact/button'
import { InputTextarea } from 'primereact/inputtextarea';
import { FC, useCallback, useEffect, useState } from 'react';

import { jobType } from './types';

interface props {
    submitFn: Function
}

const JobSubmitForm: FC<props> = ({submitFn}) => {
    const [payload, setPayload] = useState("")

    const initJob: jobType = {
        'uuid': undefined,
        'status': 'expected',
    }
    const [job, setJob] = useState(initJob)
    const [displayMsg, setDisplayMsg] = useState('')

    const jobDisplayMsg = useCallback( () => {
        if (job['status'] === 'expected') {
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
        const submitResponse: jobType = await submitFn(payload)

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
            <PrimeReactProvider>
                <InputTextarea onChange={e => setPayload(e.target.value)} /><br />
                <Button label='Submit' onClick={handleSubmit} /><br />
                <div>{displayMsg}</div>
            </PrimeReactProvider>
        </div>
    );
}

export default JobSubmitForm
