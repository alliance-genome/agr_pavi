'use client';

import { useEffect } from 'react';

/**
 * Registers mock service worker for GitHub Pages deployment
 * Only activates when MOCK_API environment variable is set
 */
export default function MockServiceWorker() {
    useEffect(() => {
        // Only register in browser and when MOCK_API is enabled
        if (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            process.env.NEXT_PUBLIC_MOCK_API === 'true'
        ) {
            navigator.serviceWorker
                .register('/mock-sw.js')
                .then((registration) => {
                    console.log('[PAVI] Mock Service Worker registered:', registration.scope);
                })
                .catch((error) => {
                    console.error('[PAVI] Mock Service Worker registration failed:', error);
                });
        }
    }, []);

    return null; // This component doesn't render anything
}
