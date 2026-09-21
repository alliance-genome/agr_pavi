'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// NotificationPermission is a browser global type
type NotificationPermissionType = 'granted' | 'denied' | 'default';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface RealtimeUpdateOptions<T> {
    /** Fetch function to get updates */
    fetchUpdate: () => Promise<T | null>;
    /** Polling interval in milliseconds (default: 5000) */
    pollingInterval?: number;
    /** Maximum polling duration before timeout in milliseconds (default: 1 hour) */
    maxDuration?: number;
    /** Callback when update is received */
    onUpdate?: (_data: T) => void;
    /** Callback when job completes (return true to stop polling) */
    onComplete?: (_data: T) => boolean;
    /** Callback when error occurs */
    onError?: (_error: Error) => void;
    /** Callback when connection status changes */
    onConnectionChange?: (_status: ConnectionStatus) => void;
    /** Enable browser notifications (requires permission) */
    enableNotifications?: boolean;
    /** Auto-start polling on mount */
    autoStart?: boolean;
}

export interface RealtimeUpdateResult<T> {
    /** Current data from last successful fetch */
    data: T | null;
    /** Connection status */
    connectionStatus: ConnectionStatus;
    /** Whether polling is active */
    isPolling: boolean;
    /** Last update timestamp */
    lastUpdate: Date | null;
    /** Error from last fetch attempt */
    error: Error | null;
    /** Retry count since last successful fetch */
    retryCount: number;
    /** Start polling */
    start: () => void;
    /** Stop polling */
    stop: () => void;
    /** Manually trigger a fetch */
    refresh: () => Promise<T | null>;
    /** Request notification permission */
    requestNotificationPermission: () => Promise<NotificationPermissionType>;
}

const MAX_RETRY_COUNT = 3;
const _RETRY_BACKOFF_MS = 2000; // Reserved for future backoff implementation

export function useRealtimeUpdates<T>(
    options: RealtimeUpdateOptions<T>
): RealtimeUpdateResult<T> {
    const {
        fetchUpdate,
        pollingInterval = 5000,
        maxDuration = 60 * 60 * 1000, // 1 hour
        onUpdate,
        onComplete,
        onError,
        onConnectionChange,
        enableNotifications = false,
        autoStart = true,
    } = options;

    const [data, setData] = useState<T | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [isPolling, setIsPolling] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const mountedRef = useRef(true);

    // Update connection status and notify
    const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
        setConnectionStatus(status);
        onConnectionChange?.(status);
    }, [onConnectionChange]);

    // Show browser notification
    const showNotification = useCallback((title: string, body: string) => {
        if (enableNotifications && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: '/favicon.ico',
                    tag: 'pavi-job-update',
                });
            } catch (e) {
                console.warn('Failed to show notification:', e);
            }
        }
    }, [enableNotifications]);

    // Request notification permission
    const requestNotificationPermission = useCallback(async (): Promise<NotificationPermissionType> => {
        if (!('Notification' in window)) {
            return 'denied';
        }
        if (Notification.permission === 'granted') {
            return 'granted';
        }
        if (Notification.permission !== 'denied') {
            return await Notification.requestPermission();
        }
        return Notification.permission;
    }, []);

    // Perform a single fetch
    const doFetch = useCallback(async (): Promise<T | null> => {
        try {
            updateConnectionStatus('connecting');
            const result = await fetchUpdate();

            if (!mountedRef.current) return null;

            if (result !== null) {
                setData(result);
                setLastUpdate(new Date());
                setError(null);
                setRetryCount(0);
                updateConnectionStatus('connected');
                onUpdate?.(result);
                return result;
            } else {
                throw new Error('Fetch returned null');
            }
        } catch (e) {
            if (!mountedRef.current) return null;

            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            setRetryCount(prev => prev + 1);

            if (retryCount >= MAX_RETRY_COUNT) {
                updateConnectionStatus('error');
                onError?.(err);
            } else {
                updateConnectionStatus('disconnected');
            }

            return null;
        }
    }, [fetchUpdate, onUpdate, onError, updateConnectionStatus, retryCount]);

    // Polling loop
    const poll = useCallback(async () => {
        if (!mountedRef.current || !startTimeRef.current) return;

        // Check for timeout
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed > maxDuration) {
            setIsPolling(false);
            updateConnectionStatus('error');
            onError?.(new Error('Polling timeout exceeded'));
            return;
        }

        const result = await doFetch();

        if (!mountedRef.current) return;

        // Check if complete
        if (result !== null && onComplete?.(result)) {
            setIsPolling(false);
            showNotification('Job Complete', 'Your alignment job has finished processing.');
            return;
        }

        // Schedule next poll with backoff on error
        const nextInterval = error ? Math.min(pollingInterval * (retryCount + 1), pollingInterval * 3) : pollingInterval;
        pollingRef.current = setTimeout(poll, nextInterval);
    }, [doFetch, maxDuration, onComplete, onError, updateConnectionStatus, pollingInterval, error, retryCount, showNotification]);

    // Start polling
    const start = useCallback(() => {
        if (isPolling) return;

        startTimeRef.current = Date.now();
        setIsPolling(true);
        setError(null);
        setRetryCount(0);
        poll();
    }, [isPolling, poll]);

    // Stop polling
    const stop = useCallback(() => {
        if (pollingRef.current) {
            clearTimeout(pollingRef.current);
            pollingRef.current = null;
        }
        setIsPolling(false);
        updateConnectionStatus('disconnected');
    }, [updateConnectionStatus]);

    // Manual refresh
    const refresh = useCallback(async (): Promise<T | null> => {
        return await doFetch();
    }, [doFetch]);

    // Auto-start on mount
    useEffect(() => {
        mountedRef.current = true;

        if (autoStart) {
            start();
        }

        return () => {
            mountedRef.current = false;
            if (pollingRef.current) {
                clearTimeout(pollingRef.current);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        data,
        connectionStatus,
        isPolling,
        lastUpdate,
        error,
        retryCount,
        start,
        stop,
        refresh,
        requestNotificationPermission,
    };
}

// Helper to check if job is complete based on status
export function isJobComplete(status: string): boolean {
    return status === 'completed' || status === 'failed';
}
