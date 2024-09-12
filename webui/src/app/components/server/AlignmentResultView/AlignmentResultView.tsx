'use server;'

import React, { FunctionComponent } from 'react';

import { validate as uuid_validate } from 'uuid';

export interface AlignmentResultViewProps {
    readonly uuidStr: string
}
export const AlignmentResultView: FunctionComponent<AlignmentResultViewProps> = async(props: AlignmentResultViewProps) => {

    async function fetchAlignmentResults (jobId: string ): Promise<string|undefined> {

        if( !uuid_validate(jobId) ){
            console.error('Not a valid UUID.')

            return Promise.resolve(undefined)
        }

        console.log(`AlignmentResultView process.env.PAVI_API_BASE_URL: ${process.env.PAVI_API_BASE_URL}`)
        const jobResponse = fetch(`${process.env.PAVI_API_BASE_URL}/api/pipeline-job/${jobId}/alignment-result`, {
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
                const errMsg = 'Failure response received from alignment-result retrieval API.'
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
            console.error('Error caught while requesting job alignment-result:', e)
            return undefined;
        });

        return jobResponse

    }
    async function getAlignmentResults(){
        const result = await fetchAlignmentResults(props.uuidStr)
        if(result){
            return result
        }
        else{
            console.log('Failed to retrieve alignment results.')
        }
    }

    const alignmentResult = await getAlignmentResults()

    return (
        <div><textarea id='alignment-result-text' value={alignmentResult} readOnly={true} style={{width: "700px", height: "500px"}} /></div>
    )
}