'use client';

import { useEffect, useCallback, useRef } from 'react';

const STORAGE_PREFIX = 'pavi_form_';
const DEFAULT_DEBOUNCE_MS = 1000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredFormData<T> {
    data: T;
    timestamp: number;
    version: number;
}

interface UseFormPersistenceOptions {
    /** Storage key suffix (will be prefixed with pavi_form_) */
    key: string;
    /** Version number - increment when data structure changes */
    version?: number;
    /** Debounce delay in milliseconds */
    debounceMs?: number;
    /** Maximum age of stored data in milliseconds */
    maxAgeMs?: number;
    /** Whether persistence is enabled */
    enabled?: boolean;
}

interface UseFormPersistenceReturn<T> {
    /** Save form data to localStorage */
    // eslint-disable-next-line no-unused-vars
    saveFormData: (data: T) => void;
    /** Load form data from localStorage */
    loadFormData: () => T | null;
    /** Clear stored form data */
    clearFormData: () => void;
    /** Check if stored data exists and is valid */
    hasStoredData: () => boolean;
}

/**
 * Custom hook for persisting form data to localStorage
 * with debouncing, versioning, and expiration support.
 */
export function useFormPersistence<T>(
    options: UseFormPersistenceOptions
): UseFormPersistenceReturn<T> {
    const {
        key,
        version = 1,
        debounceMs = DEFAULT_DEBOUNCE_MS,
        maxAgeMs = MAX_AGE_MS,
        enabled = true,
    } = options;

    const storageKey = `${STORAGE_PREFIX}${key}`;
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const saveFormData = useCallback(
        (data: T) => {
            if (!enabled || typeof window === 'undefined') {
                return;
            }

            // Clear existing debounce timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Debounce the save operation
            debounceTimerRef.current = setTimeout(() => {
                try {
                    const storedData: StoredFormData<T> = {
                        data,
                        timestamp: Date.now(),
                        version,
                    };
                    localStorage.setItem(storageKey, JSON.stringify(storedData));
                } catch (error) {
                    // Handle quota exceeded or other storage errors
                    console.warn('Failed to save form data to localStorage:', error);
                }
            }, debounceMs);
        },
        [enabled, storageKey, version, debounceMs]
    );

    const loadFormData = useCallback((): T | null => {
        if (!enabled || typeof window === 'undefined') {
            return null;
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) {
                return null;
            }

            const parsed: StoredFormData<T> = JSON.parse(stored);

            // Check version compatibility
            if (parsed.version !== version) {
                localStorage.removeItem(storageKey);
                return null;
            }

            // Check if data has expired
            if (Date.now() - parsed.timestamp > maxAgeMs) {
                localStorage.removeItem(storageKey);
                return null;
            }

            return parsed.data;
        } catch (error) {
            console.warn('Failed to load form data from localStorage:', error);
            return null;
        }
    }, [enabled, storageKey, version, maxAgeMs]);

    const clearFormData = useCallback(() => {
        if (typeof window === 'undefined') {
            return;
        }

        // Cancel any pending save
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.warn('Failed to clear form data from localStorage:', error);
        }
    }, [storageKey]);

    const hasStoredData = useCallback((): boolean => {
        if (!enabled || typeof window === 'undefined') {
            return false;
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) {
                return false;
            }

            const parsed: StoredFormData<T> = JSON.parse(stored);

            // Check version and expiration
            if (parsed.version !== version) {
                return false;
            }

            if (Date.now() - parsed.timestamp > maxAgeMs) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }, [enabled, storageKey, version, maxAgeMs]);

    return {
        saveFormData,
        loadFormData,
        clearFormData,
        hasStoredData,
    };
}

/**
 * Clear all PAVI form data from localStorage
 */
export function clearAllFormData(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
        console.warn('Failed to clear all form data:', error);
    }
}
