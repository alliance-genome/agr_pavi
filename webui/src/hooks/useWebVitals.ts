'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

// Web Vitals metric types
export interface WebVitalMetric {
    name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    delta: number;
    id: string;
    entries: PerformanceEntry[];
    navigationType: string;
}

// Thresholds based on Google's Core Web Vitals
const THRESHOLDS = {
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    FID: { good: 100, poor: 300 },
    INP: { good: 200, poor: 500 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
} as const;

type MetricName = keyof typeof THRESHOLDS;

function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[name];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
}

export interface WebVitalsState {
    cls: WebVitalMetric | null;
    fcp: WebVitalMetric | null;
    fid: WebVitalMetric | null;
    inp: WebVitalMetric | null;
    lcp: WebVitalMetric | null;
    ttfb: WebVitalMetric | null;
}

export interface UseWebVitalsOptions {
    // eslint-disable-next-line no-unused-vars
    onMetric?: (metric: WebVitalMetric) => void;
    reportAllChanges?: boolean;
    debug?: boolean;
}

export interface UseWebVitalsReturn {
    metrics: WebVitalsState;
    isSupported: boolean;
    getReport: () => WebVitalMetric[];
    clearMetrics: () => void;
}

export function useWebVitals(options: UseWebVitalsOptions = {}): UseWebVitalsReturn {
    const { onMetric, reportAllChanges = false, debug = false } = options;

    const [metrics, setMetrics] = useState<WebVitalsState>({
        cls: null,
        fcp: null,
        fid: null,
        inp: null,
        lcp: null,
        ttfb: null,
    });

    const [isSupported, setIsSupported] = useState(false);
    const metricsRef = useRef<WebVitalsState>(metrics);

    // Update ref when metrics change
    useEffect(() => {
        metricsRef.current = metrics;
    }, [metrics]);

    const handleMetric = useCallback((metric: WebVitalMetric) => {
        if (debug) {
            console.log(`[Web Vitals] ${metric.name}:`, {
                value: metric.value.toFixed(metric.name === 'CLS' ? 3 : 0),
                rating: metric.rating,
                delta: metric.delta,
            });
        }

        setMetrics(prev => ({
            ...prev,
            [metric.name.toLowerCase()]: metric,
        }));

        onMetric?.(metric);
    }, [onMetric, debug]);

    useEffect(() => {
        // Check for browser support
        if (typeof window === 'undefined') {
            return;
        }

        const hasPerformanceObserver = 'PerformanceObserver' in window;
        setIsSupported(hasPerformanceObserver);

        if (!hasPerformanceObserver) {
            if (debug) {
                console.warn('[Web Vitals] PerformanceObserver not supported');
            }
            return;
        }

        // Dynamic import of web-vitals library
        const loadWebVitals = async () => {
            try {
                const webVitals = await import('web-vitals').catch(() => null);

                if (!webVitals) {
                    // Fallback to manual measurement
                    measureVitalsManually();
                    return;
                }

                // Note: FID is deprecated in web-vitals v4+, use INP instead
                const { onCLS, onFCP, onINP, onLCP, onTTFB } = webVitals;

                const options = { reportAllChanges };

                // Register vital observers (FID deprecated, removed in favor of INP)
                onCLS((metric: unknown) => handleMetric(metric as WebVitalMetric), options);
                onFCP((metric: unknown) => handleMetric(metric as WebVitalMetric), options);
                onINP((metric: unknown) => handleMetric(metric as WebVitalMetric), options);
                onLCP((metric: unknown) => handleMetric(metric as WebVitalMetric), options);
                onTTFB((metric: unknown) => handleMetric(metric as WebVitalMetric), options);

                if (debug) {
                    console.log('[Web Vitals] Monitoring initialized with web-vitals library');
                }
            } catch (error) {
                if (debug) {
                    console.warn('[Web Vitals] Failed to load web-vitals, using manual measurement:', error);
                }
                measureVitalsManually();
            }
        };

        // Manual measurement fallback
        const measureVitalsManually = () => {
            // TTFB using Navigation Timing API
            if (performance.timing) {
                const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
                handleMetric({
                    name: 'TTFB',
                    value: ttfb,
                    rating: getRating('TTFB', ttfb),
                    delta: ttfb,
                    id: `ttfb-${Date.now()}`,
                    entries: [],
                    navigationType: 'navigate',
                });
            }

            // FCP using PerformanceObserver
            try {
                const fcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
                    if (fcpEntry) {
                        handleMetric({
                            name: 'FCP',
                            value: fcpEntry.startTime,
                            rating: getRating('FCP', fcpEntry.startTime),
                            delta: fcpEntry.startTime,
                            id: `fcp-${Date.now()}`,
                            entries: [fcpEntry],
                            navigationType: 'navigate',
                        });
                    }
                });
                fcpObserver.observe({ type: 'paint', buffered: true });
            } catch {
                // Paint observer not supported
            }

            // LCP using PerformanceObserver
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    if (lastEntry) {
                        handleMetric({
                            name: 'LCP',
                            value: lastEntry.startTime,
                            rating: getRating('LCP', lastEntry.startTime),
                            delta: lastEntry.startTime,
                            id: `lcp-${Date.now()}`,
                            entries: [lastEntry],
                            navigationType: 'navigate',
                        });
                    }
                });
                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
            } catch {
                // LCP observer not supported
            }

            // CLS using PerformanceObserver
            try {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        // Only count if not recently input
                        if (!(entry as unknown as { hadRecentInput?: boolean }).hadRecentInput) {
                            clsValue += (entry as unknown as { value: number }).value;
                        }
                    }
                    handleMetric({
                        name: 'CLS',
                        value: clsValue,
                        rating: getRating('CLS', clsValue),
                        delta: clsValue,
                        id: `cls-${Date.now()}`,
                        entries: list.getEntries(),
                        navigationType: 'navigate',
                    });
                });
                clsObserver.observe({ type: 'layout-shift', buffered: true });
            } catch {
                // Layout shift observer not supported
            }

            if (debug) {
                console.log('[Web Vitals] Monitoring initialized with manual measurement');
            }
        };

        loadWebVitals();
    }, [handleMetric, reportAllChanges, debug]);

    const getReport = useCallback((): WebVitalMetric[] => {
        const current = metricsRef.current;
        return Object.values(current).filter((m): m is WebVitalMetric => m !== null);
    }, []);

    const clearMetrics = useCallback(() => {
        setMetrics({
            cls: null,
            fcp: null,
            fid: null,
            inp: null,
            lcp: null,
            ttfb: null,
        });
    }, []);

    return {
        metrics,
        isSupported,
        getReport,
        clearMetrics,
    };
}

// Utility to send metrics to analytics
export function sendToAnalytics(metric: WebVitalMetric): void {
    // Generic analytics reporting
    const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        timestamp: Date.now(),
    });

    // Use sendBeacon if available, fallback to fetch
    if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/vitals', body);
    } else {
        fetch('/api/analytics/vitals', {
            method: 'POST',
            body,
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
        }).catch(() => {
            // Ignore analytics errors
        });
    }
}

// Utility to log metrics to console in development
export function logMetricToConsole(metric: WebVitalMetric): void {
    const color = metric.rating === 'good' ? 'green' :
                  metric.rating === 'needs-improvement' ? 'orange' : 'red';

    console.log(
        `%c[${metric.name}] ${metric.value.toFixed(metric.name === 'CLS' ? 3 : 0)} (${metric.rating})`,
        `color: ${color}; font-weight: bold;`
    );
}

export default useWebVitals;
