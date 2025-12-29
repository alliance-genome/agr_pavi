'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface ResponsiveState {
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLandscape: boolean;
    isPortrait: boolean;
    breakpoint: 'mobile' | 'tablet' | 'desktop';
}

export interface UseResponsiveOptions {
    mobileBreakpoint?: number;
    tabletBreakpoint?: number;
    debounceMs?: number;
}

const DEFAULT_OPTIONS: Required<UseResponsiveOptions> = {
    mobileBreakpoint: 640,
    tabletBreakpoint: 1024,
    debounceMs: 100,
};

/**
 * Custom hook for responsive design detection
 * Provides viewport dimensions and breakpoint information
 */
export function useResponsive(options: UseResponsiveOptions = {}): ResponsiveState {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [
        options.mobileBreakpoint,
        options.tabletBreakpoint,
        options.debounceMs,
    ]);

    const [state, setState] = useState<ResponsiveState>(() => {
        // Initial state (SSR-safe)
        if (typeof window === 'undefined') {
            return {
                width: 1024,
                height: 768,
                isMobile: false,
                isTablet: false,
                isDesktop: true,
                isLandscape: true,
                isPortrait: false,
                breakpoint: 'desktop',
            };
        }

        return calculateState(window.innerWidth, window.innerHeight, config);
    });

    const handleResize = useCallback(() => {
        const newState = calculateState(
            window.innerWidth,
            window.innerHeight,
            config
        );
        setState(newState);
    }, [config]);

    useEffect(() => {
        // Update on mount (for SSR hydration)
        handleResize();

        let timeoutId: ReturnType<typeof setTimeout>;
        const debouncedResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(handleResize, config.debounceMs);
        };

        window.addEventListener('resize', debouncedResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', debouncedResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [handleResize, config.debounceMs]);

    return state;
}

function calculateState(
    width: number,
    height: number,
    config: Required<UseResponsiveOptions>
): ResponsiveState {
    const isMobile = width < config.mobileBreakpoint;
    const isTablet = width >= config.mobileBreakpoint && width < config.tabletBreakpoint;
    const isDesktop = width >= config.tabletBreakpoint;
    const isLandscape = width > height;
    const isPortrait = height >= width;

    let breakpoint: 'mobile' | 'tablet' | 'desktop';
    if (isMobile) {
        breakpoint = 'mobile';
    } else if (isTablet) {
        breakpoint = 'tablet';
    } else {
        breakpoint = 'desktop';
    }

    return {
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        isLandscape,
        isPortrait,
        breakpoint,
    };
}

/**
 * Hook to detect if the user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return prefersReducedMotion;
}

/**
 * Hook to detect touch device
 */
export function useTouchDevice(): boolean {
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        const checkTouch = () => {
            setIsTouchDevice(
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                // @ts-expect-error - msMaxTouchPoints is IE-specific
                navigator.msMaxTouchPoints > 0
            );
        };

        checkTouch();
    }, []);

    return isTouchDevice;
}

export default useResponsive;
