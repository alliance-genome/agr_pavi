import { renderHook, act } from '@testing-library/react';
import { useJobHistory, JobHistoryEntry } from '../useJobHistory';

const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        get store() {
            return store;
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
});

describe('useJobHistory', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        jest.clearAllMocks();
    });

    const createMockJob = (overrides: Partial<Omit<JobHistoryEntry, 'submittedAt'>> = {}): Omit<JobHistoryEntry, 'submittedAt'> => ({
        uuid: 'test-uuid-123',
        status: 'completed',
        genes: ['BRCA1', 'TP53'],
        transcriptCount: 2,
        ...overrides,
    });

    it('should initialize with empty jobs list', () => {
        const { result } = renderHook(() => useJobHistory());

        expect(result.current.jobs).toEqual([]);
        expect(result.current.isLoading).toBe(false);
    });

    it('should load existing jobs from localStorage', () => {
        const existingJobs: JobHistoryEntry[] = [
            {
                uuid: 'existing-uuid',
                status: 'completed',
                submittedAt: '2024-01-01T00:00:00Z',
                genes: ['BRCA1'],
                transcriptCount: 1,
            },
        ];
        mockLocalStorage.setItem('pavi_job_history', JSON.stringify(existingJobs));

        const { result } = renderHook(() => useJobHistory());

        expect(result.current.jobs).toEqual(existingJobs);
    });

    it('should add a new job', () => {
        const { result } = renderHook(() => useJobHistory());
        const newJob = createMockJob();

        act(() => {
            result.current.addJob(newJob);
        });

        expect(result.current.jobs).toHaveLength(1);
        expect(result.current.jobs[0].uuid).toBe('test-uuid-123');
        expect(result.current.jobs[0].submittedAt).toBeDefined();
    });

    it('should not add duplicate jobs', () => {
        const { result } = renderHook(() => useJobHistory());
        const newJob = createMockJob();

        act(() => {
            result.current.addJob(newJob);
            result.current.addJob(newJob);
        });

        expect(result.current.jobs).toHaveLength(1);
    });

    it('should update an existing job', () => {
        const { result } = renderHook(() => useJobHistory());
        const newJob = createMockJob({ status: 'pending' });

        act(() => {
            result.current.addJob(newJob);
        });

        act(() => {
            result.current.updateJob('test-uuid-123', { status: 'completed' });
        });

        expect(result.current.jobs[0].status).toBe('completed');
    });

    it('should remove a job', () => {
        const { result } = renderHook(() => useJobHistory());

        act(() => {
            result.current.addJob(createMockJob({ uuid: 'job-1' }));
            result.current.addJob(createMockJob({ uuid: 'job-2' }));
        });

        expect(result.current.jobs).toHaveLength(2);

        act(() => {
            result.current.removeJob('job-1');
        });

        expect(result.current.jobs).toHaveLength(1);
        expect(result.current.jobs[0].uuid).toBe('job-2');
    });

    it('should remove multiple jobs', () => {
        const { result } = renderHook(() => useJobHistory());

        act(() => {
            result.current.addJob(createMockJob({ uuid: 'job-1' }));
            result.current.addJob(createMockJob({ uuid: 'job-2' }));
            result.current.addJob(createMockJob({ uuid: 'job-3' }));
        });

        act(() => {
            result.current.removeMultiple(['job-1', 'job-3']);
        });

        expect(result.current.jobs).toHaveLength(1);
        expect(result.current.jobs[0].uuid).toBe('job-2');
    });

    it('should toggle star on a job', () => {
        const { result } = renderHook(() => useJobHistory());

        act(() => {
            result.current.addJob(createMockJob({ starred: false }));
        });

        expect(result.current.jobs[0].starred).toBeFalsy();

        act(() => {
            result.current.toggleStar('test-uuid-123');
        });

        expect(result.current.jobs[0].starred).toBe(true);

        act(() => {
            result.current.toggleStar('test-uuid-123');
        });

        expect(result.current.jobs[0].starred).toBe(false);
    });

    it('should get a specific job', () => {
        const { result } = renderHook(() => useJobHistory());

        act(() => {
            result.current.addJob(createMockJob({ uuid: 'target-job' }));
        });

        const job = result.current.getJob('target-job');
        expect(job?.uuid).toBe('target-job');

        const notFound = result.current.getJob('non-existent');
        expect(notFound).toBeUndefined();
    });

    it('should clear all history', () => {
        const { result } = renderHook(() => useJobHistory());

        act(() => {
            result.current.addJob(createMockJob({ uuid: 'job-1' }));
            result.current.addJob(createMockJob({ uuid: 'job-2' }));
        });

        expect(result.current.jobs).toHaveLength(2);

        act(() => {
            result.current.clearHistory();
        });

        expect(result.current.jobs).toHaveLength(0);
    });

    it('should filter jobs by status', () => {
        const { result } = renderHook(() => useJobHistory());

        act(() => {
            result.current.addJob(createMockJob({ uuid: 'job-1', status: 'completed' }));
            result.current.addJob(createMockJob({ uuid: 'job-2', status: 'failed' }));
            result.current.addJob(createMockJob({ uuid: 'job-3', status: 'running' }));
        });

        const completedJobs = result.current.getFilteredJobs({ status: 'completed' });
        expect(completedJobs).toHaveLength(1);
        expect(completedJobs[0].uuid).toBe('job-1');

        const multiStatusJobs = result.current.getFilteredJobs({ status: ['completed', 'failed'] });
        expect(multiStatusJobs).toHaveLength(2);
    });

    it('should filter jobs by search term', () => {
        const { result } = renderHook(() => useJobHistory());

        act(() => {
            result.current.addJob(createMockJob({ uuid: 'job-1', genes: ['BRCA1', 'TP53'] }));
            result.current.addJob(createMockJob({ uuid: 'job-2', genes: ['EGFR'], title: 'Important Analysis' }));
        });

        const brca1Jobs = result.current.getFilteredJobs({ search: 'brca1' });
        expect(brca1Jobs).toHaveLength(1);

        const titleJobs = result.current.getFilteredJobs({ search: 'important' });
        expect(titleJobs).toHaveLength(1);
        expect(titleJobs[0].uuid).toBe('job-2');

        const uuidJobs = result.current.getFilteredJobs({ search: 'job-1' });
        expect(uuidJobs).toHaveLength(1);
    });

    it('should filter jobs by starred status', () => {
        const { result } = renderHook(() => useJobHistory());

        act(() => {
            result.current.addJob(createMockJob({ uuid: 'job-1', starred: true }));
            result.current.addJob(createMockJob({ uuid: 'job-2', starred: false }));
        });

        const starredJobs = result.current.getFilteredJobs({ starred: true });
        expect(starredJobs).toHaveLength(1);
        expect(starredJobs[0].uuid).toBe('job-1');
    });

    it('should get job statistics', () => {
        const { result } = renderHook(() => useJobHistory());

        act(() => {
            result.current.addJob(createMockJob({ uuid: 'job-1', status: 'completed', starred: true }));
            result.current.addJob(createMockJob({ uuid: 'job-2', status: 'failed' }));
            result.current.addJob(createMockJob({ uuid: 'job-3', status: 'running' }));
            result.current.addJob(createMockJob({ uuid: 'job-4', status: 'pending' }));
        });

        const stats = result.current.getStats();
        expect(stats.total).toBe(4);
        expect(stats.completed).toBe(1);
        expect(stats.failed).toBe(1);
        expect(stats.running).toBe(2); // running + pending
        expect(stats.starred).toBe(1);
    });

    it('should save to localStorage when jobs change', () => {
        const { result } = renderHook(() => useJobHistory());

        act(() => {
            result.current.addJob(createMockJob());
        });

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
            'pavi_job_history',
            expect.any(String)
        );
    });

    it('should handle localStorage errors gracefully', () => {
        mockLocalStorage.getItem.mockImplementationOnce(() => {
            throw new Error('Storage error');
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useJobHistory());

        expect(result.current.jobs).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should handle invalid JSON in localStorage', () => {
        mockLocalStorage.setItem('pavi_job_history', 'invalid json');
        mockLocalStorage.getItem.mockReturnValueOnce('invalid json');

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useJobHistory());

        expect(result.current.jobs).toEqual([]);

        consoleSpy.mockRestore();
    });
});
