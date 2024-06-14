'use client';

import { PrimeReactProvider } from 'primereact/api';
import { Button } from 'primereact/button'
import { InputTextarea } from 'primereact/inputtextarea';
import { useCallback, useEffect, useState } from 'react';

export default function Home() {
    const [payload, setPayload] = useState("")

    interface jobType {
        uuid?: string,
        status: string,
        inputValidationPassed?: boolean
    }

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

    // Update displayMsg on every job update
    useEffect(
        () => {
            setDisplayMsg(jobDisplayMsg())
        },
        [job, jobDisplayMsg]
    );

    function isValidJSON (jsonString: string){
        try {
            var o = JSON.parse(jsonString);

            // Handle non-exception-throwing cases:
            // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
            // but... JSON.parse(null) returns null, and typeof null === "object",
            // so we must check for that, too. Thankfully, null is falsey, so this suffices:
            if (o && typeof o === "object") {
                return true;
            }
        }
        catch (e) {
            // Invalid JSON, nothing to do
        }

        return false;
    }

    const submitNewPipelineJob = async(inputStr: string) => {
        const validJSON: boolean = isValidJSON(inputStr)
        console.log(`Submit request received.`)
        if ( validJSON ) {
            console.log(`Valid JSON received, sending job submission request to API.`)

            setJob({
                uuid: undefined,
                status: 'submitting',
            });

            fetch('/api/pipeline-job/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: inputStr
            })
            .then((response: Response) => {
                console.log(`API job submission response received, processing response.`)

                if ( 500 <= response.status && response.status <= 599 ){
                    // No point in attempting to process the body, as no body is expected.
                    throw new Error('Server error received.', {cause: 'server error'})
                }

                return Promise.all([Promise.resolve(response), response.json()]);
            })
            .then(([response, body]) => {
                if (response.ok) {
                    console.log(`Job with uuid ${body['uuid']} submitted successfully.`)
                    setJob({
                        uuid: body['uuid'],
                        status: body['status'],
                        inputValidationPassed: true
                    });
                } else {
                    const errMsg = 'Failure response received from API job submission.'
                    console.error(errMsg)
                    if( 400 <= response.status && response.status <= 499 ){
                        throw new Error(errMsg, {cause: 'user error'})
                    }
                    else{
                        throw new Error(errMsg, {cause: 'unkown'})
                    }

                }
            })
            .catch((e: Error) => {
                console.error('Error caught while submitting job:', e)
                setJob({
                    uuid: undefined,
                    status: 'failed to submit',
                    inputValidationPassed: e.cause && e.cause === 'user error'? false: undefined
                });
            });
        }
        else{
            setDisplayMsg('Invalid json string. Enter a valid JSON string and try again.')
        }
    }

    return (
        <div>
            <PrimeReactProvider>
                <InputTextarea onChange={e => setPayload(e.target.value)} /><br />
                <Button label='Submit' onClick={() => submitNewPipelineJob(payload)} /><br />
                <div>{displayMsg}</div>
            </PrimeReactProvider>
        </div>
    );
}
