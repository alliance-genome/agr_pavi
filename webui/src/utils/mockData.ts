/**
 * Mock API data for visual testing and Vercel deployment without backend
 * Used when MOCK_API=true environment variable is set
 */

export const mockJobSubmissionResponse = {
    uuid: '12345678-1234-1234-1234-123456789abc',
    status: 'pending',
    inputValidationPassed: true,
};

export const mockJobStatusPending = {
    uuid: '12345678-1234-1234-1234-123456789abc',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

export const mockJobStatusRunning = {
    uuid: '12345678-1234-1234-1234-123456789abc',
    status: 'running',
    created_at: new Date(Date.now() - 60000).toISOString(),
    updated_at: new Date().toISOString(),
    progress: 45,
};

export const mockJobStatusCompleted = {
    uuid: '12345678-1234-1234-1234-123456789abc',
    status: 'completed',
    created_at: new Date(Date.now() - 120000).toISOString(),
    updated_at: new Date().toISOString(),
    progress: 100,
    completed_at: new Date().toISOString(),
};

export const mockJobStatusFailed = {
    uuid: '12345678-1234-1234-1234-123456789abc',
    status: 'failed',
    created_at: new Date(Date.now() - 90000).toISOString(),
    updated_at: new Date().toISOString(),
    error_message: 'Mock error: Sequence retrieval failed',
};

export const mockAlignmentResult = `CLUSTAL O(1.2.4) multiple sequence alignment


BRCA1_HUMAN         MDLSALRVEEVQNVINAMQKILECPICLELIKEPVSTKCDHIFCKFCMLKLLNQKKGPS 60
BRCA1_MOUSE         MDLSALRIEEVQNVVNAMQKILECPICLELIKEPVSTKCDHIFCKFCMLKLLNQKNGPN 60
                    ********:*****:*************************.************.*:*

BRCA1_HUMAN         QCPLCKNDITKRSLQESTRFSQLVEELLKIICAFQLDTGLEYANSYNFAKKENNSPEHL 120
BRCA1_MOUSE         QCPLCKNDITK-SLQESTRFSQIVEELLKIICAFQLDTGLEYANSYNFAKKENNNPEHL 119
                    ***********:********:*****************.

************:** :***

BRCA1_HUMAN         KDEVSIIQSMGYRNRAKRLLQSEPENPSLQETSLSVQLSNLGTVRTLRTKQRIQPQKTL 180
BRCA1_MOUSE         NDEVSIIQSMGYRNRAKRLLQSEPENPSLQETSQSVQLSNLGTVRTLRTKQRIQPQKTL 179
                    :**********************************:*************************
`;

export const mockAlignedSeqInfo = {
    sequences: [
        {
            id: 'BRCA1_HUMAN',
            geneId: 'HGNC:1100',
            geneName: 'BRCA1',
            species: 'Homo sapiens',
            transcript: 'ENST00000357654.8',
            sequenceLength: 1863,
            start: 1,
            end: 1863,
        },
        {
            id: 'BRCA1_MOUSE',
            geneId: 'MGI:104537',
            geneName: 'Brca1',
            species: 'Mus musculus',
            transcript: 'ENSMUST00000017290.13',
            sequenceLength: 1812,
            start: 1,
            end: 1812,
        },
    ],
    alignmentLength: 180,
    identityPercentage: 89.4,
};

export const mockJobLogs = `[2024-01-19 10:15:23] Job submitted with UUID: 12345678-1234-1234-1234-123456789abc
[2024-01-19 10:15:24] Validating input parameters...
[2024-01-19 10:15:24] Input validation passed
[2024-01-19 10:15:25] Starting sequence retrieval for HGNC:1100
[2024-01-19 10:15:26] Retrieved sequence for BRCA1 (Homo sapiens)
[2024-01-19 10:15:27] Starting sequence retrieval for MGI:104537
[2024-01-19 10:15:28] Retrieved sequence for Brca1 (Mus musculus)
[2024-01-19 10:15:29] Running Clustal Omega alignment...
[2024-01-19 10:15:32] Alignment completed successfully
[2024-01-19 10:15:33] Merging sequence metadata with alignment
[2024-01-19 10:15:33] Job completed successfully
`;

/**
 * Get mock response based on endpoint and method
 */
export function getMockResponse(endpoint: string, method: string = 'GET'): any {
    // Job submission
    if (endpoint.includes('/pipeline-job/') && method === 'POST') {
        return mockJobSubmissionResponse;
    }

    // Job status - vary based on query param for testing
    if (endpoint.match(/\/pipeline-job\/[^/]+\/?$/) && method === 'GET') {
        const url = new URL(endpoint, 'http://localhost');
        const status = url.searchParams.get('mockStatus');

        switch (status) {
            case 'running':
                return mockJobStatusRunning;
            case 'completed':
                return mockJobStatusCompleted;
            case 'failed':
                return mockJobStatusFailed;
            default:
                return mockJobStatusCompleted; // Default to completed for visual testing
        }
    }

    // Alignment result
    if (endpoint.includes('/result/alignment')) {
        return mockAlignmentResult;
    }

    // Sequence info
    if (endpoint.includes('/result/seq-info')) {
        return mockAlignedSeqInfo;
    }

    // Job logs
    if (endpoint.includes('/logs')) {
        return mockJobLogs;
    }

    // Default 404
    return { error: 'Mock endpoint not found' };
}
