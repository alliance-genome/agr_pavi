import { renderHook, act, waitFor } from '@testing-library/react';
import { useFocusOnMount, usePageAnnouncement } from '../useFocusOnMount';

// Save original timer functions to restore them later
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;

describe('useFocusOnMount', () => {
    beforeEach(() => {
        document.body.innerHTML = '<main id="main-content">Test Content</main>';
    });

    afterEach(() => {
        document.body.innerHTML = '';
        // Restore timers if they were faked
        if (jest.isMockFunction(global.setTimeout)) {
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
        }
        // Ensure original timer functions are available
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
    });

    it('should focus the main element on mount', async () => {
        const mainElement = document.querySelector('main') as HTMLElement;
        const focusSpy = jest.spyOn(mainElement, 'focus');

        renderHook(() => useFocusOnMount());

        await waitFor(() => {
            expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
        });
    });

    it('should add tabindex attribute if not present', async () => {
        const mainElement = document.querySelector('main') as HTMLElement;
        expect(mainElement.hasAttribute('tabindex')).toBe(false);

        renderHook(() => useFocusOnMount());

        await waitFor(() => {
            expect(mainElement.getAttribute('tabindex')).toBe('-1');
        });
    });

    it('should not overwrite existing tabindex', async () => {
        const mainElement = document.querySelector('main') as HTMLElement;
        mainElement.setAttribute('tabindex', '0');

        renderHook(() => useFocusOnMount());

        await waitFor(() => {
            expect(mainElement.getAttribute('tabindex')).toBe('0');
        });
    });

    it('should focus element with custom selector', async () => {
        document.body.innerHTML = '<div class="custom-main" id="custom">Custom Content</div>';
        const customElement = document.querySelector('.custom-main') as HTMLElement;
        const focusSpy = jest.spyOn(customElement, 'focus');

        renderHook(() => useFocusOnMount('.custom-main'));

        await waitFor(() => {
            expect(focusSpy).toHaveBeenCalled();
        });
    });

    it('should focus element with role="main"', async () => {
        document.body.innerHTML = '<div role="main">Main Content</div>';
        const roleMainElement = document.querySelector('[role="main"]') as HTMLElement;
        const focusSpy = jest.spyOn(roleMainElement, 'focus');

        renderHook(() => useFocusOnMount());

        await waitFor(() => {
            expect(focusSpy).toHaveBeenCalled();
        });
    });

    it('should delay focus when delay option is provided', async () => {
        jest.useFakeTimers();
        const mainElement = document.querySelector('main') as HTMLElement;
        const focusSpy = jest.spyOn(mainElement, 'focus');

        renderHook(() => useFocusOnMount(undefined, 100));

        expect(focusSpy).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(100);
        });

        expect(focusSpy).toHaveBeenCalled();
    });

    it('should cleanup timeout on unmount', () => {
        jest.useFakeTimers();
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

        const { unmount } = renderHook(() => useFocusOnMount(undefined, 100));

        unmount();

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should only focus once even on re-render', () => {
        const mainElement = document.querySelector('main') as HTMLElement;
        const focusSpy = jest.spyOn(mainElement, 'focus');

        const { rerender } = renderHook(() => useFocusOnMount());

        // Focus is called via requestAnimationFrame, so it should be called synchronously in test env
        expect(focusSpy).toHaveBeenCalledTimes(1);

        rerender();
        rerender();

        expect(focusSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle missing element gracefully', () => {
        document.body.innerHTML = '';

        expect(() => {
            renderHook(() => useFocusOnMount());
        }).not.toThrow();
    });
});

describe('usePageAnnouncement', () => {
    beforeAll(() => {
        // Ensure real timers are restored before this suite runs
        jest.useRealTimers();
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
    });

    beforeEach(() => {
        jest.useRealTimers(); // Ensure each test starts with real timers
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should create announcer element if not exists', () => {
        renderHook(() => usePageAnnouncement('Test Page'));

        const announcer = document.getElementById('page-announcer');
        expect(announcer).toBeTruthy();
        expect(announcer?.getAttribute('role')).toBe('status');
        expect(announcer?.getAttribute('aria-live')).toBe('polite');
        expect(announcer?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should announce the page title', () => {
        renderHook(() => usePageAnnouncement('Results Page'));

        const announcer = document.getElementById('page-announcer');
        expect(announcer?.textContent).toBe('Navigated to Results Page');
    });

    it('should reuse existing announcer element', () => {
        const existingAnnouncer = document.createElement('div');
        existingAnnouncer.id = 'page-announcer';
        document.body.appendChild(existingAnnouncer);

        renderHook(() => usePageAnnouncement('Test Page'));

        const announcers = document.querySelectorAll('#page-announcer');
        expect(announcers.length).toBe(1);
    });

    it('should clear announcement after delay', async () => {
        renderHook(() => usePageAnnouncement('Test Page'));

        const announcer = document.getElementById('page-announcer');
        expect(announcer?.textContent).toBe('Navigated to Test Page');

        // Wait for the 1 second timeout
        await waitFor(() => {
            expect(announcer?.textContent).toBe('');
        }, { timeout: 2000 });
    });

    it('should update announcement when title changes', () => {
        const { rerender } = renderHook(
            ({ title }) => usePageAnnouncement(title),
            { initialProps: { title: 'Page One' } }
        );

        const announcer = document.getElementById('page-announcer');
        expect(announcer?.textContent).toBe('Navigated to Page One');

        rerender({ title: 'Page Two' });
        expect(announcer?.textContent).toBe('Navigated to Page Two');
    });
});
