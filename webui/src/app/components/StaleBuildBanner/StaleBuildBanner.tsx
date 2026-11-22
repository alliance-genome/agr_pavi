'use client';

import React, { useEffect, useState } from 'react';

// Patterns Next.js emits (client-side) when an action call references an ID
// that the current build no longer knows about — typical after a deploy
// while a user still has an old tab open.
const STALE_ACTION_PATTERNS: RegExp[] = [
    /Failed to find Server Action/i,
    /Server Reference ID did not match/i,
    /Invalid Server Actions request/i,
    // The runtime also throws a generic error when the server response's
    // x-nextjs-error-digest is `NEXT_DYNAMIC_SERVER_USAGE` after a build
    // swap; match the digest marker directly.
    /NEXT_NOT_FOUND[\s\S]*ServerAction/,
];

const DISMISS_KEY = 'pavi_stale_build_dismissed_at';
// Keep the banner silent for 30s after a dismiss so the next failed action
// doesn't immediately re-raise it; after that, show again (the build is
// still stale and the user still needs to reload to recover).
const DISMISS_WINDOW_MS = 30_000;

function looksStale(message: unknown): boolean {
    if (typeof message !== 'string') return false;
    return STALE_ACTION_PATTERNS.some(re => re.test(message));
}

function withinDismissWindow(): boolean {
    try {
        const raw = window.localStorage.getItem(DISMISS_KEY);
        if (!raw) return false;
        const t = Number(raw);
        return Number.isFinite(t) && Date.now() - t < DISMISS_WINDOW_MS;
    } catch {
        return false;
    }
}

/**
 * Banner shown when the user's browser tab holds an old PAVI build but
 * is trying to call server actions on the new build — Next.js refuses
 * the stale action ID and the user sees nothing happen. Catching those
 * failures and offering a one-click reload is less confusing than an
 * invisible no-op.
 *
 * Mounted at the root layout so it covers every page. Silent until a
 * stale-action error is observed.
 */
export function StaleBuildBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const raise = () => {
            if (withinDismissWindow()) return;
            setVisible(true);
        };

        const onError = (ev: ErrorEvent) => {
            if (looksStale(ev.message) || looksStale(ev.error?.message)) raise();
        };
        const onRejection = (ev: PromiseRejectionEvent) => {
            const reason = ev.reason as unknown;
            const msg = typeof reason === 'string' ? reason : (reason as { message?: string } | null)?.message;
            if (looksStale(msg)) raise();
        };

        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);
        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
        };
    }, []);

    if (!visible) return null;

    const reload = () => {
        try { window.localStorage.removeItem(DISMISS_KEY); } catch { /* localStorage disabled */ }
        window.location.reload();
    };

    const dismiss = () => {
        try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* localStorage disabled */ }
        setVisible(false);
    };

    return (
        <div
            role="alert"
            aria-live="assertive"
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.5rem 1rem',
                background: 'var(--agr-warning, #f59e0b)',
                color: '#000',
                fontSize: '0.875rem',
                borderBottom: '1px solid rgba(0,0,0,0.15)',
                fontWeight: 500,
            }}
        >
            <i className="pi pi-exclamation-triangle" aria-hidden="true" />
            <span>A new version of PAVI is available. Reload to continue.</span>
            <button
                type="button"
                onClick={reload}
                style={{
                    background: '#000',
                    color: '#fff',
                    border: 'none',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontWeight: 600,
                }}
            >
                Reload
            </button>
            <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '0 0.25rem',
                }}
            >
                ×
            </button>
        </div>
    );
}

export default StaleBuildBanner;
