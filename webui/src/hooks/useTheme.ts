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
 * Apply the chosen theme by setting `data-theme` on <html> to the
 * RESOLVED value (always 'light' or 'dark', never missing).
 *
 * We used to leave the attribute off for 'auto' and let a
 * @media (prefers-color-scheme: dark) block in agr-theme.css handle
 * it — but that only flipped the semantic tokens. CSS-module overrides
 * written as `[data-theme="dark"] .foo { … }` didn't fire in Auto
 * mode, so Auto and explicit Dark diverged visibly. Resolving here
 * means every rule keyed off `[data-theme="dark"]` applies in both.
 *
 * Kept out of the hook body so the inline no-flash script in
 * layout.tsx can call the same logic before React hydrates.
 */
function applyTheme(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    const resolved = mode === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
    document.documentElement.setAttribute('data-theme', resolved);
    // Record the USER's choice separately so cycle() and the no-flash
    // script can distinguish Auto-resolved-dark from explicit-dark.
    document.documentElement.setAttribute('data-theme-mode', mode);
}

export function useTheme(): {
    mode: ThemeMode;
    effective: 'light' | 'dark';
    setMode: (_m: ThemeMode) => void;
    cycle: () => void;
} {
    const [mode, setModeState] = useState<ThemeMode>('auto');
    const [effective, setEffective] = useState<'light' | 'dark'>('light');

    // Load persisted choice on mount AND re-apply the theme attribute.
    // Normally the pre-hydration NO_FLASH_SCRIPT has already set data-theme,
    // but Next.js error-fallback paths (route-level notFound() renders) emit
    // a bare <html id="__next_error__"> shell with an empty <head>, so the
    // inline script never runs. Calling applyTheme here means those pages
    // still get the right data-theme once React takes over.
    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
            const loaded = (stored === 'light' || stored === 'dark' || stored === 'auto') ? stored : 'auto';
            setModeState(loaded);
            // Idempotent re-apply: if NO_FLASH_SCRIPT already ran it's a no-op.
            applyTheme(loaded);
        } catch {
            // localStorage disabled; apply default anyway so data-theme exists.
            applyTheme('auto');
        }
    }, []);

    // Keep `effective` in sync with mode + OS preference, AND keep the
    // DOM data-theme attribute in sync when Auto's underlying OS pref
    // flips. Without re-applying on media-query change, Auto mode would
    // get stuck on whatever the OS preference was at load time.
    useEffect(() => {
        const resolve = (): 'light' | 'dark' =>
            mode === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
        setEffective(resolve());
        if (mode !== 'auto') return;
        const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!mql) return;
        const onChange = () => {
            setEffective(resolve());
            applyTheme('auto');  // Re-resolve + re-apply the attribute.
        };
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
// in sync with useTheme's `applyTheme` logic — always resolve Auto
// to light/dark here so CSS-module `[data-theme="dark"]` rules apply
// in both Auto and explicit Dark.
export const NO_FLASH_SCRIPT = `(function(){
  try {
    var mode = localStorage.getItem('${STORAGE_KEY}') || 'auto';
    var resolved = mode;
    if (mode === 'auto') {
      resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else if (mode !== 'light' && mode !== 'dark') {
      resolved = 'light';
      mode = 'auto';
    }
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-mode', mode);
  } catch (e) {}
})();`;
