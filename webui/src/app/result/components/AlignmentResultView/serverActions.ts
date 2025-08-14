'use server';

import { validate as uuid_validate } from 'uuid';

export async function fetchAlignmentResults (jobId: string ): Promise<string|undefined> {

    if( !uuid_validate(jobId) ){
        console.error('Not a valid UUID.')

        return Promise.resolve(undefined)
    }

    const jobResponse = fetch(`${process.env.PAVI_API_BASE_URL}/api/pipeline-job/${jobId}/result/alignment`, {
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

        return Promise.all([Promise.resolve(response), response.text()]);
    })
    .then(([response, body]) => {
        if (response.ok) {
            console.log(`Alignment results for job ${jobId} received successfully.`)
            return body;
        } else {
            const errMsg = 'Failure response received from result/alignment retrieval API.'
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
        console.error('Error caught while requesting job result/alignment:', e)
        return undefined;
    });

    return jobResponse

}
