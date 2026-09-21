import { renderHook, act } from '@testing-library/react';
import { usePrefetchRoute, usePrefetchData, clearPrefetchCache, usePrefetchOnVisible } from '../usePrefetch';

// Mock Next.js router
const mockPrefetch = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        prefetch: mockPrefetch,
    }),
}));

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
const mockIntersectionObserver = jest.fn().mockImplementation((callback: (_entries: IntersectionObserverEntry[]) => void) => {
    return {
        observe: mockObserve,
        disconnect: mockDisconnect,
        unobserve: jest.fn(),
        root: null,
        rootMargin: '',
        thresholds: [],
        takeRecords: () => [],
        // Store callback for manual trigger
        _callback: callback,
    };
});

Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: mockIntersectionObserver,
});

describe('usePrefetchRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        clearPrefetchCache();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => usePrefetchRoute('/test-route'));

        expect(result.current.isPrefetching).toBe(false);
        expect(result.current.isPrefetched).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should prefetch route when prefetch is called', () => {
        const { result } = renderHook(() => usePrefetchRoute('/test-route'));

        act(() => {
            result.current.prefetch();
        });

        expect(mockPrefetch).toHaveBeenCalledWith('/test-route');
        expect(result.current.isPrefetched).toBe(true);
    });

    it('should prefetch on hover with delay', () => {
        const { result } = renderHook(() => usePrefetchRoute('/test-route', { delay: 100 }));

        act(() => {
            result.current.hoverProps.onMouseEnter();
        });

        expect(mockPrefetch).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(100);
        });

        expect(mockPrefetch).toHaveBeenCalledWith('/test-route');
    });

    it('should prefetch on focus', () => {
        const { result } = renderHook(() => usePrefetchRoute('/test-route', { delay: 0 }));

        act(() => {
            result.current.hoverProps.onFocus();
        });

        expect(mockPrefetch).toHaveBeenCalledWith('/test-route');
    });

    it('should not prefetch if already prefetched', () => {
        const { result } = renderHook(() => usePrefetchRoute('/test-route'));

        act(() => {
            result.current.prefetch();
        });

        mockPrefetch.mockClear();

        act(() => {
            result.current.hoverProps.onMouseEnter();
            jest.advanceTimersByTime(200);
        });

        expect(mockPrefetch).not.toHaveBeenCalled();
    });

    it('should use cache for repeated prefetches', () => {
        const { result } = renderHook(() => usePrefetchRoute('/cached-route'));

        act(() => {
            result.current.prefetch();
        });

        expect(mockPrefetch).toHaveBeenCalledTimes(1);

        mockPrefetch.mockClear();

        act(() => {
            result.current.prefetch();
        });

        // Should use cache, not call prefetch again
        expect(mockPrefetch).not.toHaveBeenCalled();
        expect(result.current.isPrefetched).toBe(true);
    });

    it('should prefetch on mount when prefetchOnMount is true', () => {
        renderHook(() => usePrefetchRoute('/mount-route', { prefetchOnMount: true }));

        expect(mockPrefetch).toHaveBeenCalledWith('/mount-route');
    });

    it('should cleanup timeout on unmount', () => {
        const { result, unmount } = renderHook(() => usePrefetchRoute('/test-route', { delay: 100 }));

        act(() => {
            result.current.hoverProps.onMouseEnter();
        });

        unmount();

        // Advancing timers should not cause errors after unmount
        act(() => {
            jest.advanceTimersByTime(200);
        });

        expect(mockPrefetch).not.toHaveBeenCalled();
    });

    it('should handle prefetch errors', () => {
        mockPrefetch.mockImplementationOnce(() => {
            throw new Error('Prefetch failed');
        });

        const { result } = renderHook(() => usePrefetchRoute('/error-route'));

        act(() => {
            result.current.prefetch();
        });

        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Prefetch failed');
    });
});

describe('usePrefetchData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        clearPrefetchCache();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should initialize with null data', () => {
        const fetcher = jest.fn().mockResolvedValue({ data: 'test' });
        const { result } = renderHook(() => usePrefetchData('test-key', fetcher));

        expect(result.current.data).toBeNull();
        expect(result.current.isPrefetched).toBe(false);
    });

    it('should fetch and store data when prefetch is called', async () => {
        const mockData = { gene: 'BRCA1', info: 'test' };
        const fetcher = jest.fn().mockResolvedValue(mockData);
        const { result } = renderHook(() => usePrefetchData('gene-data', fetcher));

        await act(async () => {
            await result.current.prefetch();
        });

        expect(fetcher).toHaveBeenCalled();
        expect(result.current.data).toEqual(mockData);
        expect(result.current.isPrefetched).toBe(true);
    });

    it('should handle fetch errors', async () => {
        const fetcher = jest.fn().mockRejectedValue(new Error('Fetch failed'));
        const { result } = renderHook(() => usePrefetchData('error-key', fetcher));

        await act(async () => {
            await result.current.prefetch();
        });

        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Fetch failed');
        expect(result.current.data).toBeNull();
    });

    it('should use cached data on subsequent calls', async () => {
        const mockData = { cached: true };
        const fetcher = jest.fn().mockResolvedValue(mockData);
        const { result } = renderHook(() => usePrefetchData('cache-key', fetcher));

        await act(async () => {
            await result.current.prefetch();
        });

        expect(fetcher).toHaveBeenCalledTimes(1);

        fetcher.mockClear();

        await act(async () => {
            await result.current.prefetch();
        });

        // Should use cache
        expect(fetcher).not.toHaveBeenCalled();
        expect(result.current.data).toEqual(mockData);
    });

    it('should prefetch on hover with delay', async () => {
        const mockData = { hover: true };
        const fetcher = jest.fn().mockResolvedValue(mockData);
        const { result } = renderHook(() =>
            usePrefetchData('hover-key', fetcher, { delay: 100 })
        );

        act(() => {
            result.current.hoverProps.onMouseEnter();
        });

        expect(fetcher).not.toHaveBeenCalled();

        await act(async () => {
            jest.advanceTimersByTime(100);
            await Promise.resolve();
        });

        expect(fetcher).toHaveBeenCalled();
    });

    it('should prefetch on mount when enabled', async () => {
        const mockData = { mount: true };
        const fetcher = jest.fn().mockResolvedValue(mockData);

        await act(async () => {
            renderHook(() =>
                usePrefetchData('mount-key', fetcher, { prefetchOnMount: true })
            );
            await Promise.resolve();
        });

        expect(fetcher).toHaveBeenCalled();
    });
});

describe('clearPrefetchCache', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearPrefetchCache();
    });

    it('should clear specific key from cache', async () => {
        const fetcher = jest.fn().mockResolvedValue({ data: 'test' });
        const { result } = renderHook(() => usePrefetchData('clear-key', fetcher));

        await act(async () => {
            await result.current.prefetch();
        });

        fetcher.mockClear();

        act(() => {
            clearPrefetchCache('clear-key');
        });

        // Create new hook instance to test cache was cleared
        const { result: result2 } = renderHook(() => usePrefetchData('clear-key', fetcher));

        await act(async () => {
            await result2.current.prefetch();
        });

        expect(fetcher).toHaveBeenCalled();
    });

    it('should clear all cache when no key provided', () => {
        // Just verify it doesn't throw
        expect(() => clearPrefetchCache()).not.toThrow();
    });
});

describe('usePrefetchOnVisible', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearPrefetchCache();
        mockObserve.mockClear();
        mockDisconnect.mockClear();
    });

    it('should return a ref callback', () => {
        const { result } = renderHook(() => usePrefetchOnVisible('/visible-route'));

        expect(typeof result.current).toBe('function');
    });

    it('should create intersection observer when ref is attached', () => {
        const { result } = renderHook(() => usePrefetchOnVisible('/visible-route'));

        const mockElement = document.createElement('div');

        act(() => {
            result.current(mockElement);
        });

        expect(mockIntersectionObserver).toHaveBeenCalled();
        expect(mockObserve).toHaveBeenCalledWith(mockElement);
    });

    it('should not observe if node is null', () => {
        const { result } = renderHook(() => usePrefetchOnVisible('/visible-route'));

        act(() => {
            result.current(null);
        });

        expect(mockObserve).not.toHaveBeenCalled();
    });

    it('should prefetch when element becomes visible', () => {
        const { result } = renderHook(() => usePrefetchOnVisible('/visible-route'));

        const mockElement = document.createElement('div');

        act(() => {
            result.current(mockElement);
        });

        // Get the callback that was passed to IntersectionObserver
        const observerCallback = mockIntersectionObserver.mock.calls[0][0] as (
            _entries: IntersectionObserverEntry[],
            _observer: IntersectionObserver
        ) => void;

        // Simulate intersection
        act(() => {
            observerCallback(
                [{ isIntersecting: true } as IntersectionObserverEntry],
                {} as IntersectionObserver
            );
        });

        expect(mockPrefetch).toHaveBeenCalledWith('/visible-route');
        expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should not prefetch when element is not intersecting', () => {
        const { result } = renderHook(() => usePrefetchOnVisible('/visible-route'));

        const mockElement = document.createElement('div');

        act(() => {
            result.current(mockElement);
        });

        const observerCallback = mockIntersectionObserver.mock.calls[0][0] as (
            _entries: IntersectionObserverEntry[],
            _observer: IntersectionObserver
        ) => void;

        act(() => {
            observerCallback(
                [{ isIntersecting: false } as IntersectionObserverEntry],
                {} as IntersectionObserver
            );
        });

        expect(mockPrefetch).not.toHaveBeenCalled();
    });

    it('should use custom rootMargin and threshold', () => {
        const { result } = renderHook(() =>
            usePrefetchOnVisible('/visible-route', { rootMargin: '100px', threshold: 0.5 })
        );

        const mockElement = document.createElement('div');

        act(() => {
            result.current(mockElement);
        });

        expect(mockIntersectionObserver).toHaveBeenCalledWith(
            expect.any(Function),
            { rootMargin: '100px', threshold: 0.5 }
        );
    });
});
