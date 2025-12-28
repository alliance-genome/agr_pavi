'use client';

import { useState, useEffect, useCallback } from 'react';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobHistoryEntry {
    uuid: string;
    status: JobStatus;
    submittedAt: string; // ISO date string
    completedAt?: string;
    title?: string;
    genes: string[];
    transcriptCount: number;
    duration?: number; // in seconds
    error?: string;
    starred?: boolean;
}

const STORAGE_KEY = 'pavi_job_history';
const MAX_HISTORY_ITEMS = 100;

function loadFromStorage(): JobHistoryEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load job history from localStorage:', e);
    }
    return [];
}

function saveToStorage(jobs: JobHistoryEntry[]): void {
    if (typeof window === 'undefined') return;
    try {
        // Keep only the most recent jobs
        const trimmed = jobs.slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.error('Failed to save job history to localStorage:', e);
    }
}

export function useJobHistory() {
    const [jobs, setJobs] = useState<JobHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial data from localStorage
    useEffect(() => {
        const loaded = loadFromStorage();
        setJobs(loaded);
        setIsLoading(false);
    }, []);

    // Save to localStorage when jobs change
    useEffect(() => {
        if (!isLoading) {
            saveToStorage(jobs);
        }
    }, [jobs, isLoading]);

    const addJob = useCallback((job: Omit<JobHistoryEntry, 'submittedAt'>) => {
        setJobs(prev => {
            // Check if job already exists
            const exists = prev.some(j => j.uuid === job.uuid);
            if (exists) {
                return prev;
            }
            const newJob: JobHistoryEntry = {
                ...job,
                submittedAt: new Date().toISOString(),
            };
            return [newJob, ...prev];
        });
    }, []);

    const updateJob = useCallback((uuid: string, updates: Partial<JobHistoryEntry>) => {
        setJobs(prev => prev.map(job => {
            if (job.uuid === uuid) {
                return { ...job, ...updates };
            }
            return job;
        }));
    }, []);

    const removeJob = useCallback((uuid: string) => {
        setJobs(prev => prev.filter(job => job.uuid !== uuid));
    }, []);

    const removeMultiple = useCallback((uuids: string[]) => {
        setJobs(prev => prev.filter(job => !uuids.includes(job.uuid)));
    }, []);

    const toggleStar = useCallback((uuid: string) => {
        setJobs(prev => prev.map(job => {
            if (job.uuid === uuid) {
                return { ...job, starred: !job.starred };
            }
            return job;
        }));
    }, []);

    const getJob = useCallback((uuid: string): JobHistoryEntry | undefined => {
        return jobs.find(job => job.uuid === uuid);
    }, [jobs]);

    const clearHistory = useCallback(() => {
        setJobs([]);
    }, []);

    const getFilteredJobs = useCallback((options: {
        status?: JobStatus | JobStatus[];
        search?: string;
        starred?: boolean;
    } = {}): JobHistoryEntry[] => {
        let filtered = [...jobs];

        if (options.status) {
            const statuses = Array.isArray(options.status) ? options.status : [options.status];
            filtered = filtered.filter(job => statuses.includes(job.status));
        }

        if (options.search) {
            const searchLower = options.search.toLowerCase();
            filtered = filtered.filter(job =>
                job.uuid.toLowerCase().includes(searchLower) ||
                job.genes.some(g => g.toLowerCase().includes(searchLower)) ||
                (job.title && job.title.toLowerCase().includes(searchLower))
            );
        }

        if (options.starred !== undefined) {
            filtered = filtered.filter(job => job.starred === options.starred);
        }

        return filtered;
    }, [jobs]);

    const getStats = useCallback(() => {
        return {
            total: jobs.length,
            completed: jobs.filter(j => j.status === 'completed').length,
            failed: jobs.filter(j => j.status === 'failed').length,
            running: jobs.filter(j => j.status === 'running' || j.status === 'pending').length,
            starred: jobs.filter(j => j.starred).length,
        };
    }, [jobs]);

    return {
        jobs,
        isLoading,
        addJob,
        updateJob,
        removeJob,
        removeMultiple,
        toggleStar,
        getJob,
        clearHistory,
        getFilteredJobs,
        getStats,
    };
}
