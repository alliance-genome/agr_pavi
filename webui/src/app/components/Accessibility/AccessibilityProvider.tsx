'use client';

import { useEffect, ReactNode } from 'react';
import styles from './Accessibility.module.css';

export interface AccessibilityProviderProps {
    children: ReactNode;
    /** Enable enhanced focus indicators globally */
    enableFocusEnhancements?: boolean;
    /** Enable reduced motion support globally */
    enableReducedMotion?: boolean;
}

/**
 * AccessibilityProvider applies global accessibility enhancements
 * to the document body, including focus indicators and reduced motion support.
 */
export function AccessibilityProvider({
    children,
    enableFocusEnhancements = true,
    enableReducedMotion = true,
}: AccessibilityProviderProps) {
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const body = document.body;

        // Apply focus enhancements class
        if (enableFocusEnhancements) {
            body.classList.add(styles.focusEnhancements);
        }

        // Apply reduced motion class
        if (enableReducedMotion) {
            body.classList.add(styles.reducedMotion);
        }

        return () => {
            body.classList.remove(styles.focusEnhancements);
            body.classList.remove(styles.reducedMotion);
        };
    }, [enableFocusEnhancements, enableReducedMotion]);

    return <>{children}</>;
}

export default AccessibilityProvider;
