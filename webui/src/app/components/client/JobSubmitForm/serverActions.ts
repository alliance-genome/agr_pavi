'use server';

import { env } from 'process'

import { jobSumbissionPayloadRecord, jobType } from "./types";

const API_BASE = (env.PAVI_API_BASE_URL || 'http://localhost:8000')+'/api'


export async function submitNewPipelineJob (inputObj: jobSumbissionPayloadRecord[]): Promise<jobType> {

    console.log(`New job submision request received.`)

    const requestBodyString = JSON.stringify(inputObj)
    console.log(`request body string: ${requestBodyString}`)

    console.log(`Sending job submission request to pipeline API.`)

    const jobResponse = fetch(`${API_BASE}/pipeline-job/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json'
        },
        body: requestBodyString
    })
    .then((response: Response) => {
        if ( 500 <= response.status && response.status <= 599 ){
            // No point in attempting to process the body, as no body is expected.
            throw new Error('Server error received.', {cause: 'server error'})
        }

        return Promise.all([Promise.resolve(response), response.json()]);
    })
    .then((promises: Array<any>) => {
        const response: Response = promises[0]
        const body: jobType = promises[1]

        if (response.ok) {
            console.log(`Job with uuid ${body['uuid']} submitted successfully.`)
            return {
                uuid: body['uuid'],
                status: body['status'],
                inputValidationPassed: true
            };
        } else {
            const errMsg = 'Failure response received from API job submission.'
            console.error(errMsg)
            if( 400 <= response.status && response.status <= 499 ){
                throw new Error(errMsg, {cause: 'user error'})
            }
            else{
                console.log('Non user-error response received:', response)
                throw new Error(errMsg, {cause: 'unkown'})
            }

        }
    })
    .catch((e: Error) => {
        console.error('Error caught while submitting job:', e)
        return {
            uuid: undefined,
            status: 'failed to submit',
            inputValidationPassed: e.cause && e.cause === 'user error'? false: undefined
        };
    });

    return jobResponse
}
