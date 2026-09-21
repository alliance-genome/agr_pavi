/**
 * Mock API data for visual testing and Vercel deployment without backend
 * Used when MOCK_API=true environment variable is set
 */

export const mockJobSubmissionResponse = {
    uuid: '123e4567-e89b-42d3-a456-426614174000',
    status: 'pending',
    inputValidationPassed: true,
};

export const mockJobStatusPending = {
    uuid: '123e4567-e89b-42d3-a456-426614174000',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

export const mockJobStatusRunning = {
    uuid: '123e4567-e89b-42d3-a456-426614174000',
    status: 'running',
    created_at: new Date(Date.now() - 60000).toISOString(),
    updated_at: new Date().toISOString(),
    progress: 45,
};

export const mockJobStatusCompleted = {
    uuid: '123e4567-e89b-42d3-a456-426614174000',
    status: 'completed',
    created_at: new Date(Date.now() - 120000).toISOString(),
    updated_at: new Date().toISOString(),
    progress: 100,
    completed_at: new Date().toISOString(),
};

export const mockJobStatusFailed = {
    uuid: '123e4567-e89b-42d3-a456-426614174000',
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

// Aligned sequence info, keyed by the sequence names used in the alignment
// output above (matches the real API's aligned_seq_info.json: a SeqInfoDict of
// { [seqName]: SeqInfo } with per-sequence embedded variants positioned onto
// the gapped alignment columns).
export const mockAlignedSeqInfo = {
    BRCA1_HUMAN: {
        species: 'Homo sapiens',
        requested_variant_ids: ['NC_000017.11:g.43093456A>G'],
        embedded_variants: [
            {
                alignment_start_pos: 30,
                alignment_end_pos: 30,
                seq_start_pos: 30,
                seq_end_pos: 30,
                seq_length: 1,
                variant_id: 'NC_000017.11:g.43093456A>G',
                genomic_seq_id: 'NC_000017.11',
                genomic_start_pos: 43093456,
                genomic_end_pos: 43093456,
                genomic_ref_seq: 'A',
                genomic_alt_seq: 'G',
                seq_substitution_type: 'substitution',
                molecular_consequences: ['missense_variant'],
                hgvs_protein: 'NP_009225.1:p.Ile30Val',
                hgvs_coding: 'NM_007294.4:c.88A>G',
                impact: 'MODERATE',
                gene_id: 'HGNC:1100',
            },
        ],
    },
    BRCA1_MOUSE: {
        species: 'Mus musculus',
    },
};

export const mockJobLogs = `[2024-01-19 10:15:23] Job submitted with UUID: 123e4567-e89b-42d3-a456-426614174000
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
