/* istanbul ignore file */

export async function fetchAllPages({
    url,
    urlSearchParams = new URLSearchParams(),
    maxResults
}: {
    url: string,
    urlSearchParams: URLSearchParams,
    maxResults?: number
}): Promise<any[]> {
    let results: any[] = [];
    let page = 1;
    const pageSize = Math.min(1000, maxResults || 1000);
    let hasMorePages = true;

    while (hasMorePages) {
        const queryParams = new URLSearchParams(urlSearchParams)
        console.log(`Fetching page ${page} of ${url} with query params: ${(queryParams.toString())}`);

        queryParams.append('page', page.toString())
        queryParams.append('limit', pageSize.toString())

        const response = await fetch(`${url}?${queryParams.toString()}`);
        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.statusText}`);
        }

        type apiResponse = {
            returnedRecords: number
            results: any[]
        }
        const data: apiResponse = await response.json();
        results = results.concat(data.results);

        // Stop if we've reached maxResults
        if (maxResults && results.length >= maxResults) {
            results = results.slice(0, maxResults);
            hasMorePages = false;
        } else if (data.returnedRecords === pageSize) {
            page++;
        } else {
            hasMorePages = false;
        }
    }

    return Promise.resolve(results);
}
