import type { JobStatusResponse } from '@/app/progress/components/JobProgressTracker/types';

export type ResultsUnavailableKind = 'failed' | 'running' | 'not-found' | 'unknown';

export interface ResultsUnavailable {
    kind: ResultsUnavailableKind;
    title: string;
    message: string;
}

/**
 * Explain why a job's results could not be loaded, from the job's status.
 * `job` is undefined when the status request itself failed (e.g. unknown or
 * expired job ID).
 */
export function describeResultsUnavailable(job: JobStatusResponse | undefined): ResultsUnavailable {
    if (!job) {
        return {
            kind: 'not-found',
            title: 'Job not found',
            message: 'This job could not be found. It may have expired, or the link may be incomplete.',
        };
    }
    switch (job.status?.toLowerCase()) {
        case 'failed':
            return {
                kind: 'failed',
                title: 'This job failed',
                message: job.error_message?.trim() || 'The pipeline reported a failure but gave no details.',
            };
        case 'pending':
        case 'running':
            return {
                kind: 'running',
                title: 'This job is still running',
                message: 'Results will be available when the job finishes.',
            };
        default:
            return {
                kind: 'unknown',
                title: 'Unable to load results',
                message: 'The job finished, but its results could not be retrieved. Try again in a moment.',
            };
    }
}
