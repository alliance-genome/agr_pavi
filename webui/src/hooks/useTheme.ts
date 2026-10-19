'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'pavi_theme';

// Resolve 'auto' into the OS preference. Called in hooks that need to
// know the EFFECTIVE theme (e.g. to pick a logo variant).
function systemPrefersDark(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/**
 * Apply the chosen theme by setting `data-theme` on <html>. 'auto'
 * clears the attribute so the @media (prefers-color-scheme: dark)
 * block in agr-theme.css takes over.
 *
 * Kept out of the hook body so the inline no-flash script in
 * layout.tsx can call the same logic before React hydrates.
 */
function applyTheme(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    if (mode === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', mode);
    }
}

export function useTheme(): {
    mode: ThemeMode;
    effective: 'light' | 'dark';
    setMode: (_m: ThemeMode) => void;
    cycle: () => void;
} {
    const [mode, setModeState] = useState<ThemeMode>('auto');
    const [effective, setEffective] = useState<'light' | 'dark'>('light');

    // Load persisted choice on mount, after hydration (so SSR output and
    // client state match on first render). The pre-hydration inline script
    // has already applied the right data-theme by this point.
    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
            if (stored === 'light' || stored === 'dark' || stored === 'auto') {
                setModeState(stored);
            }
        } catch {
            // localStorage disabled; stay on 'auto'.
        }
    }, []);

    // Keep `effective` in sync with mode + OS preference. Only triggers
    // re-render when the resolved value changes; useful for consumers
    // that pick colors by theme (e.g. alignment viewer).
    useEffect(() => {
        const resolve = () => (mode === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode);
        setEffective(resolve());
        if (mode !== 'auto') return;
        const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!mql) return;
        const onChange = () => setEffective(resolve());
        mql.addEventListener?.('change', onChange);
        return () => mql.removeEventListener?.('change', onChange);
    }, [mode]);

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);
        applyTheme(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Fine — the attribute still took effect.
        }
    }, []);

    const cycle = useCallback(() => {
        const order: ThemeMode[] = ['auto', 'light', 'dark'];
        const idx = order.indexOf(mode);
        setMode(order[(idx + 1) % order.length]);
    }, [mode, setMode]);

    return { mode, effective, setMode, cycle };
}

// Script string injected into <head> by layout.tsx. Runs BEFORE React
// hydrates so there's no flash-of-wrong-theme on reload. Must stay
// in sync with useTheme's `applyTheme` logic.
export const NO_FLASH_SCRIPT = `(function(){
  try {
    var s = localStorage.getItem('${STORAGE_KEY}');
    if (s === 'light' || s === 'dark') {
      document.documentElement.setAttribute('data-theme', s);
    }
    /* 'auto' or missing: leave attribute off so @media rules apply. */
  } catch (e) {}
})();`;
