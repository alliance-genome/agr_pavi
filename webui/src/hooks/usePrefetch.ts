'use client';

import { useCallback, useEffect, useRef, useState, type RefCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface PrefetchOptions {
    /** Delay before prefetching in milliseconds */
    delay?: number;
    /** Priority of the prefetch request */
    priority?: 'low' | 'high';
    /** Whether to prefetch on mount */
    prefetchOnMount?: boolean;
    /** Whether to prefetch on hover */
    prefetchOnHover?: boolean;
    /** Cache time in milliseconds */
    cacheTime?: number;
}

export interface UsePrefetchResult {
    /** Trigger prefetch manually */
    prefetch: () => void;
    /** Whether prefetching is in progress */
    isPrefetching: boolean;
    /** Whether the resource has been prefetched */
    isPrefetched: boolean;
    /** Error if prefetch failed */
    error: Error | null;
    /** Event handlers for hover prefetching */
    hoverProps: {
        onMouseEnter: () => void;
        onFocus: () => void;
    };
}

// Global prefetch cache
const prefetchCache = new Map<string, {
    timestamp: number;
    promise: Promise<unknown>;
}>();

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for prefetching routes in Next.js
 *
 * Usage:
 * ```tsx
 * const { hoverProps, isPrefetched } = usePrefetchRoute('/results/123');
 * return <a {...hoverProps} href="/results/123">View Results</a>
 * ```
 */
export function usePrefetchRoute(
    route: string,
    options: PrefetchOptions = {}
): UsePrefetchResult {
    const router = useRouter();
    const {
        delay = 100,
        prefetchOnMount = false,
        cacheTime = DEFAULT_CACHE_TIME,
    } = options;

    const [isPrefetching, setIsPrefetching] = useState(false);
    const [isPrefetched, setIsPrefetched] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const prefetch = useCallback(() => {
        // Check cache
        const cached = prefetchCache.get(route);
        if (cached && Date.now() - cached.timestamp < cacheTime) {
            setIsPrefetched(true);
            return;
        }

        setIsPrefetching(true);
        setError(null);

        try {
            router.prefetch(route);
            prefetchCache.set(route, {
                timestamp: Date.now(),
                promise: Promise.resolve(),
            });
            setIsPrefetched(true);
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsPrefetching(false);
        }
    }, [route, router, cacheTime]);

    const handleHover = useCallback(() => {
        if (isPrefetched) return;

        if (delay > 0) {
            timeoutRef.current = setTimeout(prefetch, delay);
        } else {
            prefetch();
        }
    }, [delay, isPrefetched, prefetch]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Prefetch on mount if enabled
    useEffect(() => {
        if (prefetchOnMount) {
            prefetch();
        }
    }, [prefetchOnMount, prefetch]);

    return {
        prefetch,
        isPrefetching,
        isPrefetched,
        error,
        hoverProps: {
            onMouseEnter: handleHover,
            onFocus: handleHover,
        },
    };
}

/**
 * Hook for prefetching data with a custom fetcher
 *
 * Usage:
 * ```tsx
 * const { prefetch, data, isPrefetched } = usePrefetchData(
 *   'gene-info',
 *   () => fetch('/api/genes/123').then(r => r.json())
 * );
 * ```
 */
export function usePrefetchData<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: PrefetchOptions = {}
): UsePrefetchResult & { data: T | null } {
    const {
        delay = 100,
        prefetchOnMount = false,
        cacheTime = DEFAULT_CACHE_TIME,
    } = options;

    const [isPrefetching, setIsPrefetching] = useState(false);
    const [isPrefetched, setIsPrefetched] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<T | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const prefetch = useCallback(async () => {
        // Check cache
        const cached = prefetchCache.get(key);
        if (cached && Date.now() - cached.timestamp < cacheTime) {
            try {
                const cachedData = await cached.promise as T;
                setData(cachedData);
                setIsPrefetched(true);
                return;
            } catch {
                // Cache invalid, continue with fetch
            }
        }

        setIsPrefetching(true);
        setError(null);

        try {
            const promise = fetcher();
            prefetchCache.set(key, {
                timestamp: Date.now(),
                promise,
            });

            const result = await promise;
            setData(result);
            setIsPrefetched(true);
        } catch (err) {
            setError(err as Error);
            prefetchCache.delete(key);
        } finally {
            setIsPrefetching(false);
        }
    }, [key, fetcher, cacheTime]);

    const handleHover = useCallback(() => {
        if (isPrefetched) return;

        if (delay > 0) {
            timeoutRef.current = setTimeout(prefetch, delay);
        } else {
            prefetch();
        }
    }, [delay, isPrefetched, prefetch]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Prefetch on mount if enabled
    useEffect(() => {
        if (prefetchOnMount) {
            prefetch();
        }
    }, [prefetchOnMount, prefetch]);

    return {
        prefetch,
        isPrefetching,
        isPrefetched,
        error,
        data,
        hoverProps: {
            onMouseEnter: handleHover,
            onFocus: handleHover,
        },
    };
}

/**
 * Utility to clear the prefetch cache
 */
export function clearPrefetchCache(key?: string): void {
    if (key) {
        prefetchCache.delete(key);
    } else {
        prefetchCache.clear();
    }
}

/**
 * Hook for prefetching on intersection (when element becomes visible)
 *
 * Usage:
 * ```tsx
 * const ref = usePrefetchOnVisible('/results/123');
 * return <div ref={ref}><Link href="/results/123">View</Link></div>
 * ```
 */
export function usePrefetchOnVisible(
    route: string,
    options: PrefetchOptions & { rootMargin?: string; threshold?: number } = {}
): RefCallback<Element> {
    const router = useRouter();
    const { cacheTime = DEFAULT_CACHE_TIME, rootMargin = '50px', threshold = 0 } = options;
    const hasPreetched = useRef(false);

    const refCallback = useCallback((node: Element | null) => {
        if (!node || hasPreetched.current) return;

        // Check cache first
        const cached = prefetchCache.get(route);
        if (cached && Date.now() - cached.timestamp < cacheTime) {
            hasPreetched.current = true;
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && !hasPreetched.current) {
                    router.prefetch(route);
                    prefetchCache.set(route, {
                        timestamp: Date.now(),
                        promise: Promise.resolve(),
                    });
                    hasPreetched.current = true;
                    observer.disconnect();
                }
            },
            { rootMargin, threshold }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [route, router, cacheTime, rootMargin, threshold]);

    return refCallback;
}

export default usePrefetchRoute;
