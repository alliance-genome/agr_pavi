/**
 * Utility functions previously imported from @jbrowse/core
 */

export interface Feat {
    start: number;
    end: number;
    type?: string;
    name?: string;
    id?: string;
}

/**
 * Remove duplicate features based on start and end coordinates
 * Replacement for @jbrowse/core dedupe function
 */
export function dedupe<T extends { start: number; end: number }>(list: T[]): T[] {
    const seen = new Set<string>();
    return list.filter(item => {
        const key = `${item.start}-${item.end}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

/**
 * Reverse a list of features given a sequence length
 * For negative strand features, converts coordinates
 * Replacement for @jbrowse/core revlist function
 */
export function revlist(list: Feat[], seqlen: number): Feat[] {
    return list.map(item => ({
        ...item,
        start: seqlen - item.end,
        end: seqlen - item.start,
    })).reverse();
}

/**
 * Feature interface for compatibility with jbrowse Feature type
 * Provides typed accessors for common feature properties
 */
export interface Feature {
    get(_key: 'start'): number;
    get(_key: 'end'): number;
    get(_key: 'name'): string | undefined;
    get(_key: 'curie'): string | undefined;
    get(_key: 'is_canonical'): boolean | undefined;
    get(_key: string): unknown;
    id(): string;
    toJSON(): Record<string, unknown>;
}
