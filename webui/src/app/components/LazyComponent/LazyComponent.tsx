'use client';

import React, { Suspense, ComponentType, ReactNode } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';
import styles from './LazyComponent.module.css';

export interface LazyComponentProps<T extends object> {
    loader: () => Promise<{ default: ComponentType<T> }>;
    loadingFallback?: ReactNode;
    errorFallback?: ReactNode;
    componentProps?: T;
    onLoad?: () => void;
    onError?: (_error: Error) => void;
    retryOnError?: boolean;
    minLoadTime?: number;
}

interface LazyWrapperState {
    hasError: boolean;
    error: Error | null;
    isLoading: boolean;
}

/**
 * Default loading fallback component
 */
function DefaultLoadingFallback({ message = 'Loading...' }: { message?: string }) {
    return (
        <div className={styles.loadingContainer}>
            <ProgressSpinner
                style={{ width: '40px', height: '40px' }}
                strokeWidth="4"
                animationDuration="1s"
            />
            <span className={styles.loadingMessage}>{message}</span>
        </div>
    );
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({
    error,
    onRetry,
    showRetry = true,
}: {
    error: Error;
    onRetry?: () => void;
    showRetry?: boolean;
}) {
    return (
        <div className={styles.errorContainer}>
            <i className="pi pi-exclamation-triangle" />
            <h3 className={styles.errorTitle}>Failed to load component</h3>
            <p className={styles.errorMessage}>
                {error.message || 'An unexpected error occurred'}
            </p>
            {showRetry && onRetry && (
                <button
                    onClick={onRetry}
                    className={styles.retryButton}
                    type="button"
                >
                    <i className="pi pi-refresh" />
                    Try Again
                </button>
            )}
        </div>
    );
}

/**
 * Error boundary for lazy loaded components
 */
class LazyErrorBoundary extends React.Component<
    {
        children: ReactNode;
        fallback: ReactNode;
        onError?: (_error: Error) => void;
        onRetry?: () => void;
        retryOnError?: boolean;
    },
    LazyWrapperState
> {
    constructor(props: {
        children: ReactNode;
        fallback: ReactNode;
        onError?: (_error: Error) => void;
        onRetry?: () => void;
        retryOnError?: boolean;
    }) {
        super(props);
        this.state = { hasError: false, error: null, isLoading: false };
    }

    static getDerivedStateFromError(error: Error): Partial<LazyWrapperState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
        this.props.onError?.(error);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        this.props.onRetry?.();
    };

    render() {
        if (this.state.hasError && this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <DefaultErrorFallback
                    error={this.state.error}
                    onRetry={this.props.retryOnError ? this.handleRetry : undefined}
                    showRetry={this.props.retryOnError}
                />
            );
        }

        return this.props.children;
    }
}

/**
 * LazyComponent - A wrapper for dynamically importing and rendering components
 *
 * Features:
 * - Code splitting with React.lazy
 * - Configurable loading fallback
 * - Error boundary with retry capability
 * - Minimum load time to prevent flash
 * - Callbacks for load/error events
 *
 * Usage:
 * ```tsx
 * <LazyComponent
 *   loader={() => import('../HeavyComponent/HeavyComponent')}
 *   componentProps={{ data: myData }}
 *   loadingFallback={<CustomLoader />}
 *   retryOnError
 * />
 * ```
 */
export function LazyComponent<T extends object>({
    loader,
    loadingFallback,
    errorFallback,
    componentProps,
    onLoad,
    onError,
    retryOnError = true,
    minLoadTime = 0,
}: LazyComponentProps<T>) {
    const [key, setKey] = React.useState(0);

    // Create the lazy component with optional minimum load time
    const LazyLoadedComponent = React.useMemo(() => {
        return React.lazy(async () => {
            const startTime = Date.now();

            try {
                const loadedModule = await loader();

                // Ensure minimum load time to prevent flash
                if (minLoadTime > 0) {
                    const elapsed = Date.now() - startTime;
                    if (elapsed < minLoadTime) {
                        await new Promise(resolve =>
                            setTimeout(resolve, minLoadTime - elapsed)
                        );
                    }
                }

                onLoad?.();
                return loadedModule;
            } catch (error) {
                onError?.(error as Error);
                throw error;
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loader, minLoadTime, onLoad, onError, key]); // key intentionally included to force re-creation on retry

    const handleRetry = React.useCallback(() => {
        setKey(prev => prev + 1);
    }, []);

    return (
        <LazyErrorBoundary
            fallback={errorFallback}
            onError={onError}
            onRetry={handleRetry}
            retryOnError={retryOnError}
        >
            <Suspense fallback={loadingFallback || <DefaultLoadingFallback />}>
                <LazyLoadedComponent {...(componentProps as T)} />
            </Suspense>
        </LazyErrorBoundary>
    );
}

/**
 * Higher-order component for creating lazy-loaded component factories
 *
 * Usage:
 * ```tsx
 * const LazyHeavyComponent = createLazyComponent(
 *   () => import('../HeavyComponent/HeavyComponent'),
 *   { loadingFallback: <Skeleton /> }
 * );
 *
 * // Then use like a normal component
 * <LazyHeavyComponent data={myData} />
 * ```
 */
export function createLazyComponent<T extends object>(
    loader: () => Promise<{ default: ComponentType<T> }>,
    options: Partial<Omit<LazyComponentProps<T>, 'loader' | 'componentProps'>> = {}
): ComponentType<T> {
    return function LazyWrapper(props: T) {
        return (
            <LazyComponent<T>
                loader={loader}
                componentProps={props}
                {...options}
            />
        );
    };
}

/**
 * Preload a component without rendering it
 * Useful for prefetching components that will likely be needed
 *
 * Usage:
 * ```tsx
 * // Preload on hover or focus
 * onMouseEnter={() => preloadComponent(() => import('../Modal/Modal'))}
 * ```
 */
export function preloadComponent<T extends object>(
    loader: () => Promise<{ default: ComponentType<T> }>
): void {
    // Simply call the loader to trigger the import
    loader().catch(() => {
        // Silently fail - component will be loaded when actually needed
    });
}

export default LazyComponent;
