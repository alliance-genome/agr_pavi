'use server';

import { GeneInfo } from "./types";

export async function fetchGeneInfo (geneId: string): Promise<GeneInfo|undefined> {

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
            return body as GeneInfo;
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
        return undefined;
    });

    return jobResponse
}
