'use client';

import { useState, useEffect, useCallback } from 'react';

import type { ExampleGene } from '@/app/submit/components/ExampleDataLoader/ExampleDataLoader';

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
    /** User-assigned tags for ad-hoc grouping ('urgent', 'paper-1', etc.). */
    tags?: string[];
    /** Free-text note; shown in the row-expander on /jobs. */
    notes?: string;
    /** Form selections (gene/transcripts/alleles per entry) captured at
     * submit time, used to pre-fill the Submit form for "Edit these
     * sequences". Absent for jobs imported via "Add by UUID". */
    inputGenes?: ExampleGene[];
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

    // Tag CRUD. Tags are deduped case-insensitively but stored verbatim so
    // display preserves the user's casing. An empty-string tag is a no-op.
    const addTag = useCallback((uuid: string, tag: string) => {
        const clean = tag.trim();
        if (!clean) return;
        setJobs(prev => prev.map(job => {
            if (job.uuid !== uuid) return job;
            const existing = job.tags ?? [];
            if (existing.some(t => t.toLowerCase() === clean.toLowerCase())) return job;
            return { ...job, tags: [...existing, clean] };
        }));
    }, []);

    const removeTag = useCallback((uuid: string, tag: string) => {
        setJobs(prev => prev.map(job => {
            if (job.uuid !== uuid) return job;
            return { ...job, tags: (job.tags ?? []).filter(t => t !== tag) };
        }));
    }, []);

    const setNotes = useCallback((uuid: string, notes: string) => {
        setJobs(prev => prev.map(job => {
            if (job.uuid !== uuid) return job;
            // Normalise empty-string back to undefined so the field drops off
            // the stored record instead of writing an empty value forever.
            return { ...job, notes: notes.trim() ? notes : undefined };
        }));
    }, []);

    // Set of unique tags across the whole history, sorted. Used by the
    // /jobs page tag-filter dropdown.
    const getAllTags = useCallback((): string[] => {
        const set = new Set<string>();
        for (const j of jobs) for (const t of j.tags ?? []) set.add(t);
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [jobs]);

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
        tag?: string;
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
                (job.title && job.title.toLowerCase().includes(searchLower)) ||
                (job.notes && job.notes.toLowerCase().includes(searchLower)) ||
                (job.tags ?? []).some(t => t.toLowerCase().includes(searchLower))
            );
        }

        if (options.starred !== undefined) {
            filtered = filtered.filter(job => job.starred === options.starred);
        }

        if (options.tag) {
            const want = options.tag.toLowerCase();
            filtered = filtered.filter(job => (job.tags ?? []).some(t => t.toLowerCase() === want));
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
        addTag,
        removeTag,
        setNotes,
        getAllTags,
        getJob,
        clearHistory,
        getFilteredJobs,
        getStats,
    };
}
