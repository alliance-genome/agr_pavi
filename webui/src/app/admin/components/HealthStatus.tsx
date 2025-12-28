'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import styles from './AdminComponents.module.css';

interface HealthEndpoint {
    name: string;
    url: string;
    description: string;
}

interface HealthResult {
    name: string;
    url: string;
    status: 'healthy' | 'unhealthy' | 'checking' | 'unknown';
    responseTime?: number;
    error?: string;
    details?: Record<string, unknown>;
    lastChecked?: Date;
}

const HEALTH_ENDPOINTS: HealthEndpoint[] = [
    {
        name: 'API Health',
        url: '/api/health',
        description: 'Main API health endpoint',
    },
    {
        name: 'Pipeline Jobs API',
        url: '/api/pipeline-job/',
        description: 'Pipeline job submission endpoint',
    },
];

export function HealthStatus() {
    const [results, setResults] = useState<HealthResult[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const checkEndpoint = useCallback(async (endpoint: HealthEndpoint): Promise<HealthResult> => {
        const startTime = performance.now();

        try {
            const response = await fetch(endpoint.url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            const responseTime = Math.round(performance.now() - startTime);

            let details: Record<string, unknown> | undefined;
            try {
                details = await response.json();
            } catch {
                // Response might not be JSON
            }

            return {
                name: endpoint.name,
                url: endpoint.url,
                status: response.ok ? 'healthy' : 'unhealthy',
                responseTime,
                details,
                lastChecked: new Date(),
            };
        } catch (error) {
            return {
                name: endpoint.name,
                url: endpoint.url,
                status: 'unhealthy',
                responseTime: Math.round(performance.now() - startTime),
                error: error instanceof Error ? error.message : 'Unknown error',
                lastChecked: new Date(),
            };
        }
    }, []);

    const checkAllEndpoints = useCallback(async () => {
        setIsChecking(true);

        // Set all to checking
        setResults(HEALTH_ENDPOINTS.map(ep => ({
            name: ep.name,
            url: ep.url,
            status: 'checking' as const,
        })));

        // Check all endpoints in parallel
        const promises = HEALTH_ENDPOINTS.map(ep => checkEndpoint(ep));
        const newResults = await Promise.all(promises);

        setResults(newResults);
        setIsChecking(false);
    }, [checkEndpoint]);

    // Initial check on mount
    useEffect(() => {
        checkAllEndpoints();
    }, [checkAllEndpoints]);

    // Auto-refresh every 30 seconds if enabled
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(checkAllEndpoints, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, checkAllEndpoints]);

    const getStatusIcon = (status: HealthResult['status']) => {
        switch (status) {
            case 'healthy':
                return <i className="pi pi-check-circle" style={{ color: 'var(--agr-success)' }} />;
            case 'unhealthy':
                return <i className="pi pi-times-circle" style={{ color: 'var(--agr-error)' }} />;
            case 'checking':
                return <ProgressSpinner style={{ width: '20px', height: '20px' }} />;
            default:
                return <i className="pi pi-question-circle" style={{ color: 'var(--agr-gray-400)' }} />;
        }
    };

    const getStatusClass = (status: HealthResult['status']) => {
        switch (status) {
            case 'healthy':
                return styles.statusHealthy;
            case 'unhealthy':
                return styles.statusUnhealthy;
            case 'checking':
                return styles.statusChecking;
            default:
                return styles.statusUnknown;
        }
    };

    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                    <h2>System Health</h2>
                    <p>Monitor the status of API endpoints and services</p>
                </div>
                <div className={styles.sectionActions}>
                    <Button
                        label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                        icon={autoRefresh ? 'pi pi-pause' : 'pi pi-play'}
                        className={`p-button-sm ${autoRefresh ? 'p-button-success' : 'p-button-secondary'}`}
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    />
                    <Button
                        label="Refresh Now"
                        icon="pi pi-refresh"
                        className="p-button-sm"
                        onClick={checkAllEndpoints}
                        loading={isChecking}
                    />
                </div>
            </div>

            <div className={styles.statusSummary}>
                <div className={`${styles.summaryCard} ${styles.summaryHealthy}`}>
                    <span className={styles.summaryCount}>{healthyCount}</span>
                    <span className={styles.summaryLabel}>Healthy</span>
                </div>
                <div className={`${styles.summaryCard} ${styles.summaryUnhealthy}`}>
                    <span className={styles.summaryCount}>{unhealthyCount}</span>
                    <span className={styles.summaryLabel}>Unhealthy</span>
                </div>
                <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
                    <span className={styles.summaryCount}>{results.length}</span>
                    <span className={styles.summaryLabel}>Total</span>
                </div>
            </div>

            <div className={styles.cardGrid}>
                {results.map((result) => (
                    <Card key={result.url} className={`${styles.healthCard} ${getStatusClass(result.status)}`}>
                        <div className={styles.healthCardHeader}>
                            {getStatusIcon(result.status)}
                            <h3>{result.name}</h3>
                        </div>
                        <div className={styles.healthCardBody}>
                            <div className={styles.healthDetail}>
                                <span className={styles.label}>Endpoint:</span>
                                <code className={styles.code}>{result.url}</code>
                            </div>
                            {result.responseTime !== undefined && (
                                <div className={styles.healthDetail}>
                                    <span className={styles.label}>Response Time:</span>
                                    <span className={result.responseTime > 1000 ? styles.slow : ''}>
                                        {result.responseTime}ms
                                    </span>
                                </div>
                            )}
                            {result.error && (
                                <div className={styles.healthDetail}>
                                    <span className={styles.label}>Error:</span>
                                    <span className={styles.error}>{result.error}</span>
                                </div>
                            )}
                            {result.lastChecked && (
                                <div className={styles.healthDetail}>
                                    <span className={styles.label}>Last Checked:</span>
                                    <span>{result.lastChecked.toLocaleTimeString()}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
