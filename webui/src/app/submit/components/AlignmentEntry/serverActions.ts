'use server';

import { GeneInfo, AlleleInfo } from "./types";

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

export async function fetchAlleles (geneId: string): Promise<AlleleInfo[]> {
    console.log(`New gene info request received.`)

    const queryParams = new URLSearchParams()
    queryParams.append('filter.alleleCategory', 'variant')

    //TODO: fetch all pages
    const jobResponse = fetch(`https://www.alliancegenome.org/api/gene/${geneId}/allele-variant-detail?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
            'accept': 'application/json'
        },

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
            console.log(`Allele info for gene ${geneId} received successfully: ${JSON.stringify(body['results'])}`)
            const allelesMap = new Map<string, AlleleInfo>()

            body['results'].forEach((result: any) => {
                const allele = allelesMap.get(result['allele']['id'])
                const variant = {
                    id: result['variant']['id'],
                    displayName: result['variant']['displayName']
                }

                if( allele === undefined ){
                    allelesMap.set(result['allele']['id'], {
                        id: result['allele']['id'],
                        displayName: result['allele']['symbol'],
                        variants: new Map([[variant['id'], variant]])
                    })
                }
                else{
                    if( !allele.variants.get(variant['id']) ){
                        allele.variants.set(variant['id'], variant)
                    }
                }
            })
            return Array.from(allelesMap.values());
        } else {
            const errMsg = 'Failure response received from gene/allele-variant-detail API.'
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

    return jobResponse
}
