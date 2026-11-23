import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { expect } from '@jest/globals';
import '@testing-library/jest-dom';

import { StaleBuildBanner } from '../StaleBuildBanner';

describe('StaleBuildBanner', () => {
    beforeEach(() => {
        try { window.localStorage.removeItem('pavi_stale_build_dismissed_at'); } catch { /* localStorage disabled */ }
    });

    test('is silent on mount with no error', () => {
        render(<StaleBuildBanner />);
        expect(screen.queryByRole('alert')).toBeNull();
    });

    test('is silent for unrelated errors', () => {
        render(<StaleBuildBanner />);
        act(() => {
            window.dispatchEvent(new ErrorEvent('error', { message: 'TypeError: Cannot read property x of undefined' }));
        });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    test('renders when a stale server-action error fires (via error event)', () => {
        render(<StaleBuildBanner />);
        act(() => {
            window.dispatchEvent(new ErrorEvent('error', {
                message: 'Error: Server Reference ID did not match the expected format. Received "x".',
            }));
        });
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/A new version of PAVI is available/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    });

    test('renders when a stale action error fires via unhandledrejection', () => {
        render(<StaleBuildBanner />);
        act(() => {
            // PromiseRejectionEvent isn't constructible in JSDOM; synthesize
            // the same listener call the browser would do on the event.
            const ev = new Event('unhandledrejection') as PromiseRejectionEvent & { reason: unknown };
            (ev as unknown as { reason: unknown }).reason = new Error('Invalid Server Actions request.');
            window.dispatchEvent(ev);
        });
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('stays dismissed for the dismiss window after × is clicked', () => {
        render(<StaleBuildBanner />);
        act(() => {
            window.dispatchEvent(new ErrorEvent('error', { message: 'Failed to find Server Action' }));
        });
        expect(screen.getByRole('alert')).toBeInTheDocument();
        act(() => {
            screen.getByRole('button', { name: 'Dismiss' }).click();
        });
        expect(screen.queryByRole('alert')).toBeNull();
        // Another error inside the dismiss window must NOT re-raise the banner.
        act(() => {
            window.dispatchEvent(new ErrorEvent('error', { message: 'Server Reference ID did not match' }));
        });
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
