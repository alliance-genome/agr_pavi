'use server';

import { GeneInfo, AlleleInfo, GeneSuggestion, GeneAutocompleteApiResponse } from "./types";
import { fetchAllPages } from "@/app/helper_fns";

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

export async function fetchGeneSuggestionsAutocomplete (query: string): Promise<GeneSuggestion[]> {

    console.log(`New gene suggestion search request received.`)

    const endpointUrl = `https://www.alliancegenome.org/api/search_autocomplete/`
    const jobResponse = fetch(`${endpointUrl}?category=gene&q=${query}`, {
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
            console.log(`Gene suggestions for query '${query}' received successfully: ${JSON.stringify(body)}`)
            return body['results'] as GeneAutocompleteApiResponse[];
        } else {
            const errMsg = 'Failure response received from gene autocomplete API.'
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
        console.error('Error caught while requesting gene autocomplete:', e)
        throw e;
    });

    const suggestions: GeneSuggestion[] = (await jobResponse)?.map(autocompleteResponse => {
        return {
            id: autocompleteResponse.primaryKey,
            displayName: autocompleteResponse.name_key
        }
    })

    return suggestions
}

export async function fetchAlleles (geneId: string): Promise<AlleleInfo[]> {
    console.log(`Fetching alleles for gene: ${geneId}`)

    const endpointUrl = `https://www.alliancegenome.org/api/gene/${geneId}/allele-variant-detail`

    try {
        // Retrieve all alleleCategory filter values
        const categoriesResponse = await fetch(`${endpointUrl}?filter.alleleCategory=findCategories`, {
            method: 'GET',
            headers: {
                'accept': 'application/json'
            },
        });

        if (!categoriesResponse.ok) {
            console.warn(`Allele API returned ${categoriesResponse.status} for gene ${geneId}`)
            return [];
        }

        const categoriesBody = await categoriesResponse.json();

        // Check if we got valid data
        if (!categoriesBody['supplementalData']?.['distinctFieldValues']?.['filter.alleleCategory']) {
            console.warn(`No allele categories found for gene ${geneId}`)
            return [];
        }

        const alleleCategories = Array.from(categoriesBody['supplementalData']['distinctFieldValues']['filter.alleleCategory']);
        console.log(`Allele category query filters received: ${JSON.stringify(alleleCategories)}`)

        // Remove the "allele" option from alleleCategories (we want alleles WITH variants)
        const searchAlleleCategories = alleleCategories.filter(category => category !== 'allele')

        if (searchAlleleCategories.length === 0) {
            console.log(`No alleles with variants found for gene ${geneId}`)
            return [];
        }

        const queryParams = new URLSearchParams()
        queryParams.append('filter.alleleCategory', searchAlleleCategories.join('|'))

        // Limit to 500 allele records to prevent browser freeze on genes with thousands of variants
        const MAX_ALLELE_RESULTS = 500;
        console.log(`Fetching allele info for gene ${geneId} (max ${MAX_ALLELE_RESULTS} results)`)

        const results = await fetchAllPages({url: endpointUrl, urlSearchParams: queryParams, maxResults: MAX_ALLELE_RESULTS});
        console.log(`Allele info for gene ${geneId} received successfully.`)

        const allelesMap = new Map<string, AlleleInfo>()

        results.forEach((result: any) => {
            const allele = allelesMap.get(result['allele']['id'])
            if (result['variant'] === undefined) {
                console.error('Error: allele with undefined variant:', result)
                return;
            }
            const variant = {
                id: result['variant']['id'],
                displayName: result['variant']['displayName']
            }

            if (allele === undefined) {
                allelesMap.set(result['allele']['id'], {
                    id: result['allele']['id'],
                    displayName: result['allele']['symbol'],
                    variants: new Map([[variant['id'], variant]])
                })
            } else {
                if (!allele.variants.get(variant['id'])) {
                    allele.variants.set(variant['id'], variant)
                }
            }
        })

        return Array.from(allelesMap.values());
    } catch (error) {
        console.error(`Error fetching alleles for gene ${geneId}:`, error)
        return [];
    }
}
