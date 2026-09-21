'use client';

/**
 * DataCache - Client-side caching utility with TTL support
 *
 * Provides in-memory and localStorage caching for API responses
 * with configurable time-to-live (TTL) and automatic cleanup.
 */

import { useState, useEffect, useCallback } from 'react';

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    key: string;
}

export interface CacheOptions {
    /** Time to live in milliseconds (default: 5 minutes) */
    ttl?: number;
    /** Use localStorage for persistence (default: false) */
    persist?: boolean;
    /** Storage key prefix for localStorage (default: 'cache_') */
    storagePrefix?: string;
    /** Maximum number of entries in memory cache (default: 100) */
    maxEntries?: number;
}

export interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ENTRIES = 100;
const DEFAULT_STORAGE_PREFIX = 'pavi_cache_';

class DataCacheImpl {
    private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
    private stats = { hits: 0, misses: 0 };
    private maxEntries: number;
    private storagePrefix: string;

    constructor(options: Pick<CacheOptions, 'maxEntries' | 'storagePrefix'> = {}) {
        this.maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
        this.storagePrefix = options.storagePrefix || DEFAULT_STORAGE_PREFIX;
    }

    /**
     * Get a value from the cache
     */
    get<T>(key: string, options: CacheOptions = {}): T | null {
        const { persist = false } = options;

        // Check memory cache first
        const memoryEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
        if (memoryEntry && !this.isExpired(memoryEntry)) {
            this.stats.hits++;
            return memoryEntry.data;
        }

        // Check localStorage if persistence is enabled
        if (persist && typeof window !== 'undefined') {
            const storageEntry = this.getFromStorage<T>(key);
            if (storageEntry && !this.isExpired(storageEntry)) {
                // Restore to memory cache
                this.memoryCache.set(key, storageEntry as CacheEntry<unknown>);
                this.stats.hits++;
                return storageEntry.data;
            }
        }

        // Remove expired entry
        this.memoryCache.delete(key);
        if (persist) {
            this.removeFromStorage(key);
        }

        this.stats.misses++;
        return null;
    }

    /**
     * Set a value in the cache
     */
    set<T>(key: string, data: T, options: CacheOptions = {}): void {
        const { ttl = DEFAULT_TTL, persist = false } = options;

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
            key,
        };

        // Enforce max entries limit
        if (this.memoryCache.size >= this.maxEntries) {
            this.evictOldest();
        }

        this.memoryCache.set(key, entry as CacheEntry<unknown>);

        // Persist to localStorage if enabled
        if (persist && typeof window !== 'undefined') {
            this.saveToStorage(key, entry);
        }
    }

    /**
     * Check if a key exists and is not expired
     */
    has(key: string, options: CacheOptions = {}): boolean {
        return this.get(key, options) !== null;
    }

    /**
     * Remove a specific key from the cache
     */
    delete(key: string, options: CacheOptions = {}): boolean {
        const { persist = false } = options;

        const existed = this.memoryCache.delete(key);

        if (persist && typeof window !== 'undefined') {
            this.removeFromStorage(key);
        }

        return existed;
    }

    /**
     * Clear all cached entries
     */
    clear(options: { persist?: boolean } = {}): void {
        const { persist = false } = options;

        this.memoryCache.clear();
        this.stats = { hits: 0, misses: 0 };

        if (persist && typeof window !== 'undefined') {
            this.clearStorage();
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            size: this.memoryCache.size,
            hitRate: total > 0 ? this.stats.hits / total : 0,
        };
    }

    /**
     * Get or fetch data with automatic caching
     */
    async getOrFetch<T>(
        key: string,
        fetcher: () => Promise<T>,
        options: CacheOptions = {}
    ): Promise<T> {
        // Try to get from cache first
        const cached = this.get<T>(key, options);
        if (cached !== null) {
            return cached;
        }

        // Fetch fresh data
        const data = await fetcher();
        this.set(key, data, options);
        return data;
    }

    /**
     * Invalidate entries matching a pattern
     */
    invalidatePattern(pattern: string | RegExp): number {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        let count = 0;

        for (const key of this.memoryCache.keys()) {
            if (regex.test(key)) {
                this.memoryCache.delete(key);
                count++;
            }
        }

        return count;
    }

    /**
     * Clean up expired entries
     */
    cleanup(): number {
        let removed = 0;

        for (const [key, entry] of this.memoryCache.entries()) {
            if (this.isExpired(entry)) {
                this.memoryCache.delete(key);
                removed++;
            }
        }

        return removed;
    }

    /**
     * Get all keys in the cache
     */
    keys(): string[] {
        return Array.from(this.memoryCache.keys());
    }

    // Private methods

    private isExpired<T>(entry: CacheEntry<T>): boolean {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.memoryCache.delete(oldestKey);
        }
    }

    private getFromStorage<T>(key: string): CacheEntry<T> | null {
        try {
            const stored = localStorage.getItem(this.storagePrefix + key);
            if (stored) {
                return JSON.parse(stored) as CacheEntry<T>;
            }
        } catch {
            // localStorage not available or parsing failed
        }
        return null;
    }

    private saveToStorage<T>(key: string, entry: CacheEntry<T>): void {
        try {
            localStorage.setItem(this.storagePrefix + key, JSON.stringify(entry));
        } catch {
            // localStorage full or not available
        }
    }

    private removeFromStorage(key: string): void {
        try {
            localStorage.removeItem(this.storagePrefix + key);
        } catch {
            // localStorage not available
        }
    }

    private clearStorage(): void {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.storagePrefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch {
            // localStorage not available
        }
    }
}

// Singleton instance for global use
export const dataCache = new DataCacheImpl();

// Factory function for creating isolated cache instances
export function createCache(options: CacheOptions = {}): DataCacheImpl {
    return new DataCacheImpl(options);
}

// React hook for using cache with components
export function useCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
): {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
} {

    const [data, setData] = useState<T | null>(() => dataCache.get<T>(key, options));
    const [isLoading, setIsLoading] = useState(!data);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await dataCache.getOrFetch(key, fetcher, options);
            setData(result);
        } catch (e) {
            setError(e instanceof Error ? e : new Error('Fetch failed'));
        } finally {
            setIsLoading(false);
        }
    }, [key, fetcher, options]);

    useEffect(() => {
        if (!data) {
            fetchData();
        }
    }, [data, fetchData]);

    const refetch = useCallback(async () => {
        dataCache.delete(key, options);
        await fetchData();
    }, [key, options, fetchData]);

    return { data, isLoading, error, refetch };
}

// Predefined cache configurations for common use cases
export const CACHE_CONFIGS = {
    /** Short-lived cache for real-time data (30 seconds) */
    realtime: { ttl: 30 * 1000 },
    /** Standard cache for API responses (5 minutes) */
    standard: { ttl: 5 * 60 * 1000 },
    /** Long-lived cache for static data (1 hour) */
    static: { ttl: 60 * 60 * 1000 },
    /** Session cache with localStorage persistence (24 hours) */
    session: { ttl: 24 * 60 * 60 * 1000, persist: true },
    /** Persistent cache for user preferences */
    preferences: { ttl: 7 * 24 * 60 * 60 * 1000, persist: true },
} as const;

export default dataCache;
