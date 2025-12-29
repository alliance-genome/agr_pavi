export enum JobProgressStatus {
    /* eslint-disable no-unused-vars */
    pending,
    running,
    completed,
    failed
}

export interface JobStatusResponse {
    uuid: string;
    status: string;
    name?: string;
    error_message?: string;
}

export interface ProgressStep {
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    message?: string;
    timestamp?: Date;
}
