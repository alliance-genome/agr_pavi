/**
 * Mock Service Worker for GitHub Pages Deployment
 * Intercepts API requests and returns mock data for Percy visual testing
 * Only active when MOCK_API mode is enabled
 */

const CACHE_NAME = 'pavi-mock-api-v1';

// Inline mock data (copied from src/utils/mockData.ts)
const mockData = {
    jobSubmission: {
        uuid: '12345678-1234-1234-1234-123456789abc',
        status: 'pending',
        inputValidationPassed: true,
    },
    jobStatus: {
        pending: {
            uuid: '12345678-1234-1234-1234-123456789abc',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        running: {
            uuid: '12345678-1234-1234-1234-123456789abc',
            status: 'running',
            created_at: new Date(Date.now() - 60000).toISOString(),
            updated_at: new Date().toISOString(),
            progress: 45,
        },
        completed: {
            uuid: '12345678-1234-1234-1234-123456789abc',
            status: 'completed',
            created_at: new Date(Date.now() - 120000).toISOString(),
            updated_at: new Date().toISOString(),
            progress: 100,
            completed_at: new Date().toISOString(),
        },
        failed: {
            uuid: '12345678-1234-1234-1234-123456789abc',
            status: 'failed',
            created_at: new Date(Date.now() - 90000).toISOString(),
            updated_at: new Date().toISOString(),
            error_message: 'Mock error: Sequence retrieval failed',
        },
    },
    alignmentResult: `CLUSTAL O(1.2.4) multiple sequence alignment

BRCA1_HUMAN         MDLSALRVEEVQNVINAMQKILECPICLELIKEPVSTKCDHIFCKFCMLKLLNQKKGPS 60
BRCA1_MOUSE         MDLSALRIEEVQNVVNAMQKILECPICLELIKEPVSTKCDHIFCKFCMLKLLNQKNGPN 60
                    ********:*****:*************************.************.*:*

BRCA1_HUMAN         QCPLCKNDITKRSLQESTRFSQLVEELLKIICAFQLDTGLEYANSYNFAKKENNSPEHL 120
BRCA1_MOUSE         QCPLCKNDITK-SLQESTRFSQIVEELLKIICAFQLDTGLEYANSYNFAKKENNNPEHL 119
                    ***********:********:*****************.************:** :***

BRCA1_HUMAN         KDEVSIIQSMGYRNRAKRLLQSEPENPSLQETSLSVQLSNLGTVRTLRTKQRIQPQKTL 180
BRCA1_MOUSE         NDEVSIIQSMGYRNRAKRLLQSEPENPSLQETSQSVQLSNLGTVRTLRTKQRIQPQKTL 179
                    :**********************************:*************************
`,
    alignedSeqInfo: {
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
    },
    jobLogs: `[2024-01-19 10:15:23] Job submitted with UUID: 12345678-1234-1234-1234-123456789abc
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
`,
};

function getMockResponse(endpoint, method = 'GET') {
    // Job submission
    if (endpoint.includes('/pipeline-job/') && method === 'POST') {
        return mockData.jobSubmission;
    }

    // Job status - vary based on query param
    if (endpoint.match(/\/pipeline-job\/[^/]+\/?$/) && method === 'GET') {
        const url = new URL(endpoint, 'http://localhost');
        const status = url.searchParams.get('mockStatus');

        switch (status) {
            case 'running':
                return mockData.jobStatus.running;
            case 'completed':
                return mockData.jobStatus.completed;
            case 'failed':
                return mockData.jobStatus.failed;
            default:
                return mockData.jobStatus.completed;
        }
    }

    // Alignment result
    if (endpoint.includes('/result/alignment')) {
        return mockData.alignmentResult;
    }

    // Sequence info
    if (endpoint.includes('/result/seq-info')) {
        return mockData.alignedSeqInfo;
    }

    // Job logs
    if (endpoint.includes('/logs')) {
        return mockData.jobLogs;
    }

    // Default 404
    return { error: 'Mock endpoint not found' };
}

// Install event
self.addEventListener('install', (event) => {
    console.log('[Mock SW] Installing...');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[Mock SW] Activating...');
    event.waitUntil(clients.claim());
});

// Fetch event - intercept API requests
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only intercept API requests
    if (!url.pathname.startsWith('/api/')) {
        return;
    }

    console.log('[Mock SW] Intercepting:', url.pathname);

    event.respondWith(
        handleMockRequest(event.request)
    );
});

async function handleMockRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const search = url.search;
    const method = request.method;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        // Get mock data based on endpoint
        const mockData = getMockResponse(pathname + search, method);

        // Return mock response
        return new Response(
            JSON.stringify(mockData),
            {
                status: mockData.error ? 404 : 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Mock-API': 'true',
                },
            }
        );
    } catch (error) {
        console.error('[Mock SW] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Mock API error' }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    }
}
