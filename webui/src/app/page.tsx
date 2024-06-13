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
            return 'Job failed to submit. Correct input and try again.'
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
            .then((response) => {
                console.log(`API job submission response received, parsing response.`)
                return Promise.all([response, response.json()]);
            })
            .then(([response, body]) => {
                if (response.ok) {
                    console.log(`Job with uuid ${body['uuid']} submitted successfully.`)
                    setJob({
                        uuid: body['uuid'],
                        status: body['status'],
                    });
                } else {
                    console.log(`Failure response received from API job submission.`)
                    setJob({
                        status: 'failed to submit',
                    });
                }
            })
            .catch((e) => console.log('error', e));
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
