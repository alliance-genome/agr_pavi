'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook that focuses the main content area when a page mounts.
 * This improves accessibility by ensuring keyboard users land in the right place
 * after navigation.
 *
 * @param selector - Optional CSS selector for the element to focus (default: 'main' or '[role="main"]')
 * @param delay - Optional delay in ms before focusing (useful for transitions)
 */
export function useFocusOnMount(selector?: string, delay = 0): void {
    const hasFocused = useRef(false);

    useEffect(() => {
        if (hasFocused.current) return;

        const focusMain = () => {
            const targetSelector = selector || 'main, [role="main"], .agr-page-section';
            const mainElement = document.querySelector<HTMLElement>(targetSelector);

            if (mainElement) {
                // Make the element focusable if it isn't already
                if (!mainElement.hasAttribute('tabindex')) {
                    mainElement.setAttribute('tabindex', '-1');
                }

                // Focus without scrolling (user's scroll position should be preserved)
                mainElement.focus({ preventScroll: true });
                hasFocused.current = true;
            }
        };

        if (delay > 0) {
            const timeoutId = setTimeout(focusMain, delay);
            return () => clearTimeout(timeoutId);
        } else {
            focusMain();
        }
    }, [selector, delay]);
}

/**
 * Hook that announces page changes to screen readers
 *
 * @param title - The page title to announce
 */
export function usePageAnnouncement(title: string): void {
    useEffect(() => {
        // Create or get the live region for announcements
        let announcer = document.getElementById('page-announcer');

        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'page-announcer';
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only';
            document.body.appendChild(announcer);
        }

        // Announce the page change
        announcer.textContent = `Navigated to ${title}`;

        // Clean up announcement after a delay
        const timeoutId = setTimeout(() => {
            if (announcer) {
                announcer.textContent = '';
            }
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [title]);
}

export default useFocusOnMount;
