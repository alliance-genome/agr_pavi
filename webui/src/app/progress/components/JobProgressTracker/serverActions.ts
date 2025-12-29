'use server';

import { JobProgressStatus, JobStatusResponse } from './types';

import { validate as uuid_validate } from 'uuid'

export async function fetchJobStatus (jobId: string ): Promise<JobProgressStatus|undefined> {

    if( !uuid_validate(jobId) ){
        console.error('Not a valid UUID.')

        return Promise.resolve(undefined)
    }

    const jobResponse = fetch(`${process.env.PAVI_API_BASE_URL}/api/pipeline-job/${jobId}`, {
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
            console.log(`Job status for job ${jobId} received successfully: ${JSON.stringify(body)}`)
            const statusStr = body.status as string
            return JobProgressStatus[statusStr as keyof typeof JobProgressStatus];
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
        console.error('Error caught while requesting job status:', e)
        return undefined;
    });

    return jobResponse

}

export async function fetchJobStatusFull(jobId: string): Promise<JobStatusResponse | undefined> {
    if (!uuid_validate(jobId)) {
        console.error('Not a valid UUID.')
        return undefined
    }

    try {
        const response = await fetch(`${process.env.PAVI_API_BASE_URL}/api/pipeline-job/${jobId}`, {
            method: 'GET',
            headers: {
                'accept': 'application/json'
            }
        })

        if (!response.ok) {
            console.error(`Failed to fetch job status: ${response.status}`)
            return undefined
        }

        const body = await response.json()
        console.log(`Job status for job ${jobId} received: ${JSON.stringify(body)}`)
        return body as JobStatusResponse

    } catch (e) {
        console.error('Error caught while requesting job status:', e)
        return undefined
    }
}
