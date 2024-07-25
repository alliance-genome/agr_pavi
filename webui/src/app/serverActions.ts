'use server';

import { env } from 'process'

import { jobType, geneInfo } from "./types";

const API_BASE = (env.PAVI_API_BASE_URL || 'http://localhost:8000')+'/api'

// Internal functions
async function isValidJSON (jsonString: string): Promise<boolean>{
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

// Exported functions
export async function submitNewPipelineJob (inputStr: string): Promise<jobType> {

    const validJSON: boolean = await isValidJSON(inputStr)
    console.log(`New job submision request received.`)
    if ( validJSON ) {
        console.log(`Valid JSON received, sending job submission request to pipeline API.`)

        const jobResponse = fetch(`${API_BASE}/pipeline-job/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'accept': 'application/json'
            },
            body: inputStr
        })
        .then((response: Response) => {
            if ( 500 <= response.status && response.status <= 599 ){
                // No point in attempting to process the body, as no body is expected.
                throw new Error('Server error received.', {cause: 'server error'})
            }

            return Promise.all([Promise.resolve(response), response.json()]);
        })
        .then(([response, body]) => {
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
    } else {
        return {
            uuid: undefined,
            status: 'failed to submit',
            inputValidationPassed: false
        }
    }
}

export async function fetchGeneInfo (geneId: string): Promise<geneInfo> {

    console.log(`New gene info request received.`)

    const jobResponse = fetch(`https://www.alliancegenome.org/api/gene/${geneId}`, {
        method: 'GET',
        headers: {
            'accept': 'application/json'
        }
    })
    .then((response: Response) => {
        if ( 500 <= response.status && response.status <= 599 ){
            // No point in attempting to process the body, as no body is expected.
            throw new Error('Server error received.', {cause: 'server error'})
        }

        return Promise.all([Promise.resolve(response), response.json()]);
    })
    .then(([response, body]) => {
        if (response.ok) {
            console.log(`Gene info for gene ${geneId} received successfully: ${JSON.stringify(body)}`)
            return body;
        } else {
            const errMsg = 'Failure response received from gene API.'
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
        console.error('Error caught while requesting gene info:', e)
        return {};
    });

    return jobResponse
}
