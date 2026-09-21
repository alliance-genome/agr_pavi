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
    stage?: string;  // sequence_retrieval, alignment, done
    error_message?: string;
    task_events?: string[];  // List of completed task descriptions
}

export interface ProgressStep {
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    message?: string;
    timestamp?: Date;
}
