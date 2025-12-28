'use client';

import React, { Suspense, ComponentType, ReactNode, useState, useEffect } from 'react';
import { ErrorBoundary, ErrorFallback } from '../ErrorBoundary';
import { LoadingSpinner } from '../LoadingSpinner';
import { SkeletonCard } from '../Skeleton';

export interface LazyComponentProps<P extends object> {
    /** The lazy-loaded component */
    component: React.LazyExoticComponent<ComponentType<P>>;
    /** Props to pass to the component */
    componentProps?: P;
    /** Loading fallback - can be a node or a skeleton type */
    loading?: ReactNode | 'spinner' | 'skeleton' | 'none';
    /** Error fallback component */
    errorFallback?: ReactNode;
    /** Minimum loading time in ms (prevents flash of loading state) */
    minLoadingTime?: number;
    /** Delay before showing loading state in ms */
    loadingDelay?: number;
    /** Callback when component loads successfully */
    onLoad?: () => void;
    /** Callback when component fails to load */
    // eslint-disable-next-line no-unused-vars
    onError?: (error: Error) => void;
    /** Additional class name */
    className?: string;
}

interface LoadingStateProps {
    type: ReactNode | 'spinner' | 'skeleton' | 'none';
    className?: string;
}

function LoadingState({ type, className }: LoadingStateProps) {
    if (type === 'none') {
        return null;
    }

    if (type === 'skeleton') {
        return <SkeletonCard className={className} />;
    }

    if (type === 'spinner') {
        return <LoadingSpinner centered className={className} />;
    }

    // Custom loading node
    return <>{type}</>;
}

export function LazyComponent<P extends object>({
    component: Component,
    componentProps,
    loading = 'spinner',
    errorFallback,
    minLoadingTime = 0,
    loadingDelay = 0,
    onLoad,
    onError,
    className,
}: LazyComponentProps<P>) {
    const [showLoading, setShowLoading] = useState(loadingDelay === 0);
    const [isReady, setIsReady] = useState(false);

    // Handle loading delay
    useEffect(() => {
        if (loadingDelay > 0) {
            const timer = setTimeout(() => {
                setShowLoading(true);
            }, loadingDelay);
            return () => clearTimeout(timer);
        }
    }, [loadingDelay]);

    // Handle minimum loading time
    useEffect(() => {
        if (minLoadingTime > 0) {
            const timer = setTimeout(() => {
                setIsReady(true);
            }, minLoadingTime);
            return () => clearTimeout(timer);
        } else {
            setIsReady(true);
        }
    }, [minLoadingTime]);

    const handleError = (error: Error) => {
        onError?.(error);
    };

    const loadingFallback = showLoading && !isReady ? (
        <LoadingState type={loading} className={className} />
    ) : null;

    const errorFallbackElement = errorFallback || (
        <ErrorFallback
            error={new Error('Failed to load component')}
            title="Failed to load"
            message="This component could not be loaded. Please try again."
            variant="inline"
        />
    );

    return (
        <ErrorBoundary
            fallback={errorFallbackElement}
            onError={(error) => handleError(error)}
        >
            <Suspense fallback={loadingFallback}>
                <LazyWrapper
                    Component={Component}
                    componentProps={componentProps}
                    onLoad={onLoad}
                />
            </Suspense>
        </ErrorBoundary>
    );
}

// Wrapper to trigger onLoad callback
interface LazyWrapperProps<P extends object> {
    Component: React.LazyExoticComponent<ComponentType<P>>;
    componentProps?: P;
    onLoad?: () => void;
}

function LazyWrapper<P extends object>({
    Component,
    componentProps,
    onLoad,
}: LazyWrapperProps<P>) {
    useEffect(() => {
        onLoad?.();
    }, [onLoad]);

    return <Component {...(componentProps as P)} />;
}

// HOC for creating lazy-loadable components with preloading support
export interface LazyWithPreloadResult<P extends object> {
    Component: React.LazyExoticComponent<ComponentType<P>>;
    preload: () => Promise<{ default: ComponentType<P> }>;
}

export function lazyWithPreload<P extends object>(
    importFn: () => Promise<{ default: ComponentType<P> }>
): LazyWithPreloadResult<P> {
    const Component = React.lazy(importFn);
    return {
        Component,
        preload: importFn,
    };
}

// Utility to create lazy component with retry logic
export function lazyWithRetry<P extends object>(
    importFn: () => Promise<{ default: ComponentType<P> }>,
    retries = 3,
    delay = 1000
): React.LazyExoticComponent<ComponentType<P>> {
    return React.lazy(async () => {
        let lastError: Error | undefined;

        for (let i = 0; i < retries; i++) {
            try {
                return await importFn();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Import failed');

                if (i < retries - 1) {
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                }
            }
        }

        throw lastError;
    });
}

// Prefetch utility for route-based code splitting
export function prefetchComponent<P extends object>(
    importFn: () => Promise<{ default: ComponentType<P> }>
): void {
    // Only prefetch in browser
    if (typeof window === 'undefined') return;

    // Use requestIdleCallback if available, otherwise setTimeout
    const schedule = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));

    schedule(() => {
        importFn().catch(() => {
            // Ignore prefetch errors silently
        });
    });
}

// Hook for conditional lazy loading
export function useLazyComponent<P extends object>(
    importFn: () => Promise<{ default: ComponentType<P> }>,
    shouldLoad: boolean = true
): {
    Component: React.LazyExoticComponent<ComponentType<P>> | null;
    isLoading: boolean;
    error: Error | null;
    preload: () => void;
} {
    const [Component, setComponent] = useState<React.LazyExoticComponent<ComponentType<P>> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (shouldLoad && !Component && !isLoading) {
            setIsLoading(true);
            setComponent(React.lazy(importFn));
            setIsLoading(false);
        }
    }, [shouldLoad, Component, isLoading, importFn]);

    const preload = () => {
        if (!Component) {
            importFn().catch(e => setError(e instanceof Error ? e : new Error('Preload failed')));
        }
    };

    return { Component, isLoading, error, preload };
}

export default LazyComponent;
