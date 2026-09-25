import { describe, expect, it } from '@jest/globals';
import { describeResultsUnavailable } from '../resultsUnavailable';

describe('describeResultsUnavailable', () => {
    it('shows the pipeline error for a failed job', () => {
        const r = describeResultsUnavailable({
            uuid: 'u', status: 'failed',
            error_message: 'SEQUENCE_RETRIEVAL: Sequence retrieval failed for 1 of 2 entries: C54H2.5.1',
        });
        expect(r.kind).toBe('failed');
        expect(r.title).toBe('This job failed');
        expect(r.message).toContain('failed for 1 of 2 entries: C54H2.5.1');
    });

    it('has a fallback message when a failed job has no error text', () => {
        expect(describeResultsUnavailable({ uuid: 'u', status: 'FAILED' }).message).toMatch(/no details/);
    });

    it.each(['pending', 'running', 'RUNNING'])('reports a %s job as still running', (status) => {
        expect(describeResultsUnavailable({ uuid: 'u', status }).kind).toBe('running');
    });

    it('reports a missing job as not found', () => {
        expect(describeResultsUnavailable(undefined)).toMatchObject({ kind: 'not-found', title: 'Job not found' });
    });

    it('falls back to a generic message for a completed job whose results are missing', () => {
        expect(describeResultsUnavailable({ uuid: 'u', status: 'completed' }).kind).toBe('unknown');
    });
});
