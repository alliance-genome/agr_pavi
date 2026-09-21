'use client';

import { ReactNode } from 'react';

export interface AccessibilityProviderProps {
    children: ReactNode;
}

/**
 * AccessibilityProvider wraps the application to enable accessibility features.
 * Global accessibility styles (focus indicators, reduced motion) are now handled
 * via globals.css using native CSS media queries.
 */
export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
    return <>{children}</>;
}

export default AccessibilityProvider;
