'use client';

import React, {
    useState,
    useCallback,
    useEffect,
    useRef,
    ReactNode,
} from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import styles from './ResponsiveAlignmentContainer.module.css';

export interface ViewportInfo {
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLandscape: boolean;
}

export interface ResponsiveAlignmentContainerProps {
    children: ReactNode;
    onZoomChange?: (_zoom: number) => void;
    onScrollChange?: (_position: { x: number; y: number }) => void;
    onFullscreenChange?: (_isFullscreen: boolean) => void;
    onViewportChange?: (_viewport: ViewportInfo) => void;
    showMobileControls?: boolean;
    enableTouchGestures?: boolean;
    minZoom?: number;
    maxZoom?: number;
    initialZoom?: number;
    isLoading?: boolean;
    loadingMessage?: string;
    className?: string;
}

const BREAKPOINTS = {
    mobile: 640,
    tablet: 1024,
} as const;

export function ResponsiveAlignmentContainer({
    children,
    onZoomChange,
    onScrollChange,
    onFullscreenChange,
    onViewportChange,
    showMobileControls = true,
    enableTouchGestures = true,
    minZoom = 0.5,
    maxZoom = 3,
    initialZoom = 1,
    isLoading = false,
    loadingMessage = 'Loading alignment...',
    className = '',
}: ResponsiveAlignmentContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const [zoom, setZoom] = useState(initialZoom);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [viewport, setViewport] = useState<ViewportInfo>({
        width: 0,
        height: 0,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLandscape: true,
    });

    // Touch gesture state
    const [touchState, setTouchState] = useState({
        isPinching: false,
        initialDistance: 0,
        initialZoom: 1,
        lastTouchEnd: 0,
    });

    // Calculate viewport info
    const updateViewport = useCallback(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobile = width < BREAKPOINTS.mobile;
        const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
        const isDesktop = width >= BREAKPOINTS.tablet;
        const isLandscape = width > height;

        const newViewport: ViewportInfo = {
            width,
            height,
            isMobile,
            isTablet,
            isDesktop,
            isLandscape,
        };

        setViewport(newViewport);
        onViewportChange?.(newViewport);
    }, [onViewportChange]);

    // Handle zoom
    const handleZoom = useCallback((newZoom: number) => {
        const clampedZoom = Math.min(maxZoom, Math.max(minZoom, newZoom));
        setZoom(clampedZoom);
        onZoomChange?.(clampedZoom);
    }, [minZoom, maxZoom, onZoomChange]);

    // Handle fullscreen
    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
                onFullscreenChange?.(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
                onFullscreenChange?.(false);
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    }, [onFullscreenChange]);

    // Touch gesture handlers
    const getTouchDistance = useCallback((touches: React.TouchList) => {
        if (touches.length < 2) return 0;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!enableTouchGestures) return;

        if (e.touches.length === 2) {
            // Pinch start
            const distance = getTouchDistance(e.touches);
            setTouchState({
                isPinching: true,
                initialDistance: distance,
                initialZoom: zoom,
                lastTouchEnd: touchState.lastTouchEnd,
            });
        }
    }, [enableTouchGestures, getTouchDistance, zoom, touchState.lastTouchEnd]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!enableTouchGestures || !touchState.isPinching) return;

        if (e.touches.length === 2) {
            const distance = getTouchDistance(e.touches);
            const scale = distance / touchState.initialDistance;
            const newZoom = touchState.initialZoom * scale;
            handleZoom(newZoom);
        }
    }, [enableTouchGestures, touchState, getTouchDistance, handleZoom]);

    const handleTouchEnd = useCallback(() => {
        if (!enableTouchGestures) return;

        const now = Date.now();

        // Double tap to reset zoom
        if (now - touchState.lastTouchEnd < 300) {
            handleZoom(1);
        }

        setTouchState(prev => ({
            ...prev,
            isPinching: false,
            lastTouchEnd: now,
        }));
    }, [enableTouchGestures, touchState.lastTouchEnd, handleZoom]);

    // Scroll handler
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        onScrollChange?.({
            x: target.scrollLeft,
            y: target.scrollTop,
        });
    }, [onScrollChange]);

    // Auto-hide controls on mobile after inactivity
    useEffect(() => {
        if (!viewport.isMobile || !showMobileControls) return;

        let timeout: ReturnType<typeof setTimeout>;
        const resetTimeout = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 3000);
        };

        const handleInteraction = () => resetTimeout();

        window.addEventListener('touchstart', handleInteraction);
        window.addEventListener('mousemove', handleInteraction);

        resetTimeout();

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('touchstart', handleInteraction);
            window.removeEventListener('mousemove', handleInteraction);
        };
    }, [viewport.isMobile, showMobileControls]);

    // Listen for viewport changes
    useEffect(() => {
        updateViewport();

        const handleResize = () => updateViewport();
        const handleOrientationChange = () => {
            // Small delay for orientation change to complete
            setTimeout(updateViewport, 100);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);

        // Listen for fullscreen changes
        const handleFullscreenChange = () => {
            const isNowFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isNowFullscreen);
            onFullscreenChange?.(isNowFullscreen);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [updateViewport, onFullscreenChange]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                toggleFullscreen();
            }
            if (e.key === '+' || e.key === '=') {
                handleZoom(zoom + 0.1);
            }
            if (e.key === '-') {
                handleZoom(zoom - 0.1);
            }
            if (e.key === '0') {
                handleZoom(1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, zoom, toggleFullscreen, handleZoom]);

    const containerClasses = [
        styles.container,
        viewport.isMobile ? styles.mobile : '',
        viewport.isTablet ? styles.tablet : '',
        isFullscreen ? styles.fullscreen : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={containerRef}
            className={containerClasses}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Loading Overlay */}
            {isLoading && (
                <div className={styles.loadingOverlay}>
                    <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                    <span className={styles.loadingMessage}>{loadingMessage}</span>
                </div>
            )}

            {/* Mobile Orientation Hint */}
            {viewport.isMobile && !viewport.isLandscape && !isFullscreen && (
                <div className={styles.orientationHint}>
                    <i className="pi pi-mobile" />
                    <span>Rotate device for better view</span>
                    <Button
                        icon="pi pi-times"
                        className="p-button-text p-button-sm"
                        onClick={() => {
                            const hint = document.querySelector(`.${styles.orientationHint}`);
                            if (hint) (hint as HTMLElement).style.display = 'none';
                        }}
                        aria-label="Dismiss hint"
                    />
                </div>
            )}

            {/* Mobile Controls */}
            {(viewport.isMobile || viewport.isTablet) && showMobileControls && (
                <div className={`${styles.mobileControls} ${showControls ? styles.visible : ''}`}>
                    <div className={styles.controlGroup}>
                        <Button
                            icon="pi pi-minus"
                            className="p-button-rounded p-button-text"
                            onClick={() => handleZoom(zoom - 0.2)}
                            disabled={zoom <= minZoom}
                            aria-label="Zoom out"
                        />
                        <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
                        <Button
                            icon="pi pi-plus"
                            className="p-button-rounded p-button-text"
                            onClick={() => handleZoom(zoom + 0.2)}
                            disabled={zoom >= maxZoom}
                            aria-label="Zoom in"
                        />
                    </div>
                    <div className={styles.controlGroup}>
                        <Button
                            icon="pi pi-refresh"
                            className="p-button-rounded p-button-text"
                            onClick={() => handleZoom(1)}
                            tooltip="Reset zoom"
                            tooltipOptions={{ position: 'top' }}
                            aria-label="Reset zoom"
                        />
                        <Button
                            icon={isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'}
                            className="p-button-rounded p-button-text"
                            onClick={toggleFullscreen}
                            tooltip={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                            tooltipOptions={{ position: 'top' }}
                            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        />
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div
                ref={contentRef}
                className={styles.content}
                onScroll={handleScroll}
                style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                }}
            >
                {children}
            </div>

            {/* Pinch Indicator */}
            {touchState.isPinching && (
                <div className={styles.pinchIndicator}>
                    <i className="pi pi-search-plus" />
                    <span>{Math.round(zoom * 100)}%</span>
                </div>
            )}

            {/* Quick Actions (Desktop) */}
            {viewport.isDesktop && (
                <div className={styles.desktopActions}>
                    <Button
                        icon={isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'}
                        className="p-button-rounded p-button-text p-button-sm"
                        onClick={toggleFullscreen}
                        tooltip={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
                        tooltipOptions={{ position: 'left' }}
                        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    />
                </div>
            )}
        </div>
    );
}

export default ResponsiveAlignmentContainer;
