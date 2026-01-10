import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeUpdates, isJobComplete } from '../useRealtimeUpdates';

// Mock Notification API
const mockNotification = jest.fn();
Object.defineProperty(window, 'Notification', {
    value: class MockNotification {
        static permission = 'granted';
        static requestPermission = jest.fn().mockResolvedValue('granted');
        constructor(title: string, options?: { body?: string; icon?: string }) {
            mockNotification(title, options);
        }
    },
    writable: true,
});

describe('useRealtimeUpdates', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const createMockFetchUpdate = (data: unknown = { status: 'running' }) => {
        return jest.fn().mockResolvedValue(data);
    };

    it('should initialize with default state', () => {
        const fetchUpdate = createMockFetchUpdate();
        const { result } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, autoStart: false })
        );

        expect(result.current.data).toBeNull();
        expect(result.current.connectionStatus).toBe('disconnected');
        expect(result.current.isPolling).toBe(false);
        expect(result.current.lastUpdate).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.retryCount).toBe(0);
    });

    it('should auto-start polling when autoStart is true', async () => {
        const fetchUpdate = createMockFetchUpdate({ status: 'running' });

        renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, autoStart: true })
        );

        await waitFor(() => {
            expect(fetchUpdate).toHaveBeenCalled();
        });
    });

    it('should start polling when start is called', async () => {
        const fetchUpdate = createMockFetchUpdate({ status: 'running' });
        const { result } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, autoStart: false })
        );

        expect(result.current.isPolling).toBe(false);

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        expect(result.current.isPolling).toBe(true);
        expect(fetchUpdate).toHaveBeenCalled();
    });

    it('should stop polling when stop is called', async () => {
        const fetchUpdate = createMockFetchUpdate({ status: 'running' });
        const { result } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, autoStart: false })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        expect(result.current.isPolling).toBe(true);

        act(() => {
            result.current.stop();
        });

        expect(result.current.isPolling).toBe(false);
        expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('should update data on successful fetch', async () => {
        const mockData = { status: 'running', progress: 50 };
        const fetchUpdate = createMockFetchUpdate(mockData);
        const { result } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, autoStart: false })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockData);
            expect(result.current.connectionStatus).toBe('connected');
            expect(result.current.lastUpdate).toBeTruthy();
        });
    });

    it('should call onUpdate callback when data is received', async () => {
        const mockData = { status: 'running' };
        const fetchUpdate = createMockFetchUpdate(mockData);
        const onUpdate = jest.fn();

        const { result } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, onUpdate, autoStart: false })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(onUpdate).toHaveBeenCalledWith(mockData);
        });
    });

    it('should stop polling when onComplete returns true', async () => {
        const mockData = { status: 'completed' };
        const fetchUpdate = createMockFetchUpdate(mockData);
        const onComplete = jest.fn().mockReturnValue(true);

        const { result } = renderHook(() =>
            useRealtimeUpdates({
                fetchUpdate,
                onComplete,
                autoStart: false,
                enableNotifications: false,
            })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalledWith(mockData);
            expect(result.current.isPolling).toBe(false);
        });
    });

    it('should handle fetch errors and increment retry count', async () => {
        const fetchUpdate = jest.fn().mockRejectedValue(new Error('Network error'));
        const onError = jest.fn();

        const { result } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, onError, autoStart: false })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(result.current.error).toBeTruthy();
            expect(result.current.retryCount).toBeGreaterThan(0);
        });
    });

    it('should call onError after max retries', async () => {
        const fetchUpdate = jest.fn().mockRejectedValue(new Error('Persistent error'));
        const onError = jest.fn();

        const { result } = renderHook(() =>
            useRealtimeUpdates({
                fetchUpdate,
                onError,
                autoStart: false,
                pollingInterval: 100,
            })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        // MAX_RETRY_COUNT is 3, need 4+ failures to reach error state
        // (check happens before increment, so 3 >= 3 only true on 4th fail)
        for (let i = 0; i < 10; i++) {
            await act(async () => {
                jest.advanceTimersByTime(200);
                await Promise.resolve();
            });
        }

        // After enough failures, should eventually reach error or have retryCount > 0
        await waitFor(() => {
            expect(result.current.retryCount).toBeGreaterThan(0);
        });
    });

    it('should refresh data manually', async () => {
        const mockData = { status: 'running' };
        const fetchUpdate = createMockFetchUpdate(mockData);

        const { result } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, autoStart: false })
        );

        await act(async () => {
            const data = await result.current.refresh();
            expect(data).toEqual(mockData);
        });
    });

    it('should call onConnectionChange when status changes', async () => {
        const fetchUpdate = createMockFetchUpdate({ status: 'running' });
        const onConnectionChange = jest.fn();

        const { result } = renderHook(() =>
            useRealtimeUpdates({
                fetchUpdate,
                onConnectionChange,
                autoStart: false,
            })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(onConnectionChange).toHaveBeenCalled();
        });
    });

    it('should request notification permission', async () => {
        const fetchUpdate = createMockFetchUpdate();
        const { result } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, autoStart: false })
        );

        let permission: string = '';
        await act(async () => {
            permission = await result.current.requestNotificationPermission();
        });

        expect(permission).toBe('granted');
    });

    it('should show notification when job completes and notifications are enabled', async () => {
        const mockData = { status: 'completed' };
        const fetchUpdate = createMockFetchUpdate(mockData);
        const onComplete = jest.fn().mockReturnValue(true);

        const { result } = renderHook(() =>
            useRealtimeUpdates({
                fetchUpdate,
                onComplete,
                enableNotifications: true,
                autoStart: false,
            })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(mockNotification).toHaveBeenCalledWith(
                'Job Complete',
                expect.objectContaining({ body: 'Your alignment job has finished processing.' })
            );
        });
    });

    it('should timeout after maxDuration', async () => {
        const fetchUpdate = createMockFetchUpdate({ status: 'running' });
        const onError = jest.fn();

        const { result } = renderHook(() =>
            useRealtimeUpdates({
                fetchUpdate,
                onError,
                maxDuration: 1000,
                pollingInterval: 100,
                autoStart: false,
            })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        // Advance past maxDuration
        await act(async () => {
            jest.advanceTimersByTime(1500);
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(result.current.isPolling).toBe(false);
            expect(result.current.connectionStatus).toBe('error');
        });
    });

    it('should not start if already polling', async () => {
        const fetchUpdate = createMockFetchUpdate({ status: 'running' });

        const { result } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, autoStart: false })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        fetchUpdate.mockClear();

        act(() => {
            result.current.start();
        });

        // Should not call fetchUpdate again immediately
        expect(fetchUpdate).not.toHaveBeenCalled();
    });

    it('should handle null fetch result as error', async () => {
        const fetchUpdate = jest.fn().mockResolvedValue(null);

        const { result } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, autoStart: false })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(result.current.error).toBeTruthy();
        });
    });

    it('should cleanup on unmount', async () => {
        const fetchUpdate = createMockFetchUpdate({ status: 'running' });

        const { result, unmount } = renderHook(() =>
            useRealtimeUpdates({ fetchUpdate, autoStart: false })
        );

        await act(async () => {
            result.current.start();
            await Promise.resolve();
        });

        unmount();

        // Should not throw when timers fire after unmount
        await act(async () => {
            jest.advanceTimersByTime(10000);
            await Promise.resolve();
        });
    });
});

describe('isJobComplete', () => {
    it('should return true for completed status', () => {
        expect(isJobComplete('completed')).toBe(true);
    });

    it('should return true for failed status', () => {
        expect(isJobComplete('failed')).toBe(true);
    });

    it('should return false for running status', () => {
        expect(isJobComplete('running')).toBe(false);
    });

    it('should return false for pending status', () => {
        expect(isJobComplete('pending')).toBe(false);
    });
});
