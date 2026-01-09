import { renderHook, act } from '@testing-library/react';
import { useResponsive, usePrefersReducedMotion, useTouchDevice } from '../useResponsive';

// Store original window properties
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

// Helper to set window dimensions
const setWindowSize = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
};

// Helper to trigger resize event
const triggerResize = () => {
    window.dispatchEvent(new Event('resize'));
};

// Helper to trigger orientation change
const triggerOrientationChange = () => {
    window.dispatchEvent(new Event('orientationchange'));
};

describe('useResponsive', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        setWindowSize(1024, 768);
    });

    afterEach(() => {
        jest.useRealTimers();
        setWindowSize(originalInnerWidth, originalInnerHeight);
    });

    it('should return desktop breakpoint for large screens', () => {
        setWindowSize(1200, 800);
        const { result } = renderHook(() => useResponsive());

        expect(result.current.breakpoint).toBe('desktop');
        expect(result.current.isDesktop).toBe(true);
        expect(result.current.isTablet).toBe(false);
        expect(result.current.isMobile).toBe(false);
    });

    it('should return tablet breakpoint for medium screens', () => {
        setWindowSize(800, 600);
        const { result } = renderHook(() => useResponsive());

        expect(result.current.breakpoint).toBe('tablet');
        expect(result.current.isDesktop).toBe(false);
        expect(result.current.isTablet).toBe(true);
        expect(result.current.isMobile).toBe(false);
    });

    it('should return mobile breakpoint for small screens', () => {
        setWindowSize(400, 700);
        const { result } = renderHook(() => useResponsive());

        expect(result.current.breakpoint).toBe('mobile');
        expect(result.current.isDesktop).toBe(false);
        expect(result.current.isTablet).toBe(false);
        expect(result.current.isMobile).toBe(true);
    });

    it('should detect landscape orientation', () => {
        setWindowSize(1200, 800);
        const { result } = renderHook(() => useResponsive());

        expect(result.current.isLandscape).toBe(true);
        expect(result.current.isPortrait).toBe(false);
    });

    it('should detect portrait orientation', () => {
        setWindowSize(600, 900);
        const { result } = renderHook(() => useResponsive());

        expect(result.current.isLandscape).toBe(false);
        expect(result.current.isPortrait).toBe(true);
    });

    it('should return correct dimensions', () => {
        setWindowSize(1024, 768);
        const { result } = renderHook(() => useResponsive());

        expect(result.current.width).toBe(1024);
        expect(result.current.height).toBe(768);
    });

    it('should update on window resize', () => {
        setWindowSize(1200, 800);
        const { result } = renderHook(() => useResponsive({ debounceMs: 50 }));

        expect(result.current.breakpoint).toBe('desktop');

        act(() => {
            setWindowSize(400, 700);
            triggerResize();
            jest.advanceTimersByTime(100);
        });

        expect(result.current.breakpoint).toBe('mobile');
    });

    it('should debounce resize events', () => {
        setWindowSize(1200, 800);
        const { result } = renderHook(() => useResponsive({ debounceMs: 100 }));

        act(() => {
            setWindowSize(400, 700);
            triggerResize();
        });

        // Before debounce completes, should still be desktop
        expect(result.current.breakpoint).toBe('desktop');

        act(() => {
            jest.advanceTimersByTime(100);
        });

        // After debounce, should be mobile
        expect(result.current.breakpoint).toBe('mobile');
    });

    it('should update on orientation change without debounce', () => {
        setWindowSize(1200, 800);
        const { result } = renderHook(() => useResponsive());

        act(() => {
            setWindowSize(800, 1200);
            triggerOrientationChange();
        });

        expect(result.current.isPortrait).toBe(true);
    });

    it('should use custom breakpoints', () => {
        setWindowSize(700, 500);

        // With default breakpoints (640, 1024), 700 is tablet
        const { result: defaultResult } = renderHook(() => useResponsive());
        expect(defaultResult.current.breakpoint).toBe('tablet');

        // With custom breakpoints, 700 can be desktop
        const { result: customResult } = renderHook(() =>
            useResponsive({ mobileBreakpoint: 400, tabletBreakpoint: 600 })
        );
        expect(customResult.current.breakpoint).toBe('desktop');
    });

    it('should cleanup event listeners on unmount', () => {
        const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() => useResponsive());

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));

        removeEventListenerSpy.mockRestore();
    });

    it('should handle equal width and height as portrait', () => {
        setWindowSize(800, 800);
        const { result } = renderHook(() => useResponsive());

        expect(result.current.isPortrait).toBe(true);
        expect(result.current.isLandscape).toBe(false);
    });
});

describe('usePrefersReducedMotion', () => {
    let mockMatchMedia: jest.Mock;
    let mediaQueryListeners: Array<(e: MediaQueryListEvent) => void> = [];

    beforeEach(() => {
        mediaQueryListeners = [];
        mockMatchMedia = jest.fn().mockImplementation((query: string) => ({
            matches: query.includes('reduce') ? false : true,
            media: query,
            onchange: null,
            addEventListener: jest.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
                if (event === 'change') {
                    mediaQueryListeners.push(listener);
                }
            }),
            removeEventListener: jest.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
                if (event === 'change') {
                    const index = mediaQueryListeners.indexOf(listener);
                    if (index > -1) {
                        mediaQueryListeners.splice(index, 1);
                    }
                }
            }),
            dispatchEvent: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
        }));

        Object.defineProperty(window, 'matchMedia', {
            value: mockMatchMedia,
            writable: true,
        });
    });

    it('should return false when reduced motion is not preferred', () => {
        const { result } = renderHook(() => usePrefersReducedMotion());

        expect(result.current).toBe(false);
    });

    it('should return true when reduced motion is preferred', () => {
        mockMatchMedia.mockImplementation(() => ({
            matches: true,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        }));

        const { result } = renderHook(() => usePrefersReducedMotion());

        expect(result.current).toBe(true);
    });

    it('should update when preference changes', () => {
        const { result } = renderHook(() => usePrefersReducedMotion());

        expect(result.current).toBe(false);

        // Simulate preference change
        act(() => {
            mediaQueryListeners.forEach(listener => {
                listener({ matches: true } as MediaQueryListEvent);
            });
        });

        expect(result.current).toBe(true);
    });

    it('should cleanup listener on unmount', () => {
        const removeEventListenerMock = jest.fn();
        mockMatchMedia.mockImplementation(() => ({
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: removeEventListenerMock,
        }));

        const { unmount } = renderHook(() => usePrefersReducedMotion());
        unmount();

        expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });
});

describe('useTouchDevice', () => {
    const originalOntouchstart = 'ontouchstart' in window;
    const originalMaxTouchPoints = navigator.maxTouchPoints;

    afterEach(() => {
        // Restore original values
        if (!originalOntouchstart) {
            delete (window as unknown as { ontouchstart?: unknown }).ontouchstart;
        }
        Object.defineProperty(navigator, 'maxTouchPoints', {
            value: originalMaxTouchPoints,
            writable: true,
        });
    });

    it('should return false for non-touch devices', () => {
        delete (window as unknown as { ontouchstart?: unknown }).ontouchstart;
        Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, writable: true });

        const { result } = renderHook(() => useTouchDevice());

        expect(result.current).toBe(false);
    });

    it('should return true when ontouchstart is present', () => {
        (window as unknown as { ontouchstart: unknown }).ontouchstart = true;

        const { result } = renderHook(() => useTouchDevice());

        expect(result.current).toBe(true);
    });

    it('should return true when maxTouchPoints > 0', () => {
        delete (window as unknown as { ontouchstart?: unknown }).ontouchstart;
        Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, writable: true });

        const { result } = renderHook(() => useTouchDevice());

        expect(result.current).toBe(true);
    });
});
