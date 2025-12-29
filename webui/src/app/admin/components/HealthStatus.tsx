'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import styles from './AdminComponents.module.css';

// Environment options for deployment status
interface EnvironmentOption {
    label: string;
    value: string;
    apiUrl: string;
}

const ENVIRONMENT_OPTIONS: EnvironmentOption[] = [
    { label: 'Local (this server)', value: 'local', apiUrl: '' },
    { label: 'Production (AWS)', value: 'production', apiUrl: 'https://pavi-api.alliancegenome.org' },
    { label: 'Development (AWS)', value: 'dev', apiUrl: 'https://pavi-api-dev.alliancegenome.org' },
];

// Helper to find environment option by value
const findEnvByValue = (value: string): EnvironmentOption => {
    return ENVIRONMENT_OPTIONS.find(env => env.value === value) || ENVIRONMENT_OPTIONS[0];
};

interface ComponentStatus {
    name: string;
    status: 'healthy' | 'unhealthy' | 'disabled' | 'unavailable' | 'error' | 'not_found' | 'no_access' | 'unknown';
    environment?: string;
    execution_mode?: string;
    details?: Record<string, unknown>;
}

interface DeploymentStatus {
    overall_status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
    environment: string;
    components: Record<string, ComponentStatus>;
}

interface HealthEndpoint {
    name: string;
    url: string;
    description: string;
    method?: 'GET' | 'OPTIONS' | 'HEAD';
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
        method: 'GET',
    },
    {
        name: 'Pipeline Jobs API',
        url: '/api/pipeline-job/',
        description: 'Pipeline job submission endpoint',
        method: 'OPTIONS',
    },
];

const COMPONENT_ICONS: Record<string, string> = {
    api: 'pi pi-server',
    step_functions: 'pi pi-sitemap',
    batch: 'pi pi-th-large',
    dynamodb: 'pi pi-database',
    s3_results: 'pi pi-cloud',
    s3_work: 'pi pi-cloud-upload',
};

const COMPONENT_DESCRIPTIONS: Record<string, string> = {
    api: 'FastAPI backend service handling job orchestration',
    step_functions: 'AWS Step Functions for pipeline workflow execution',
    batch: 'AWS Batch for compute job execution',
    dynamodb: 'DynamoDB table for job state storage',
    s3_results: 'S3 bucket for storing pipeline results',
    s3_work: 'S3 bucket for intermediate work files',
};

export function HealthStatus() {
    const [results, setResults] = useState<HealthResult[]>([]);
    const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const [selectedEnvValue, setSelectedEnvValue] = useState<string>('local'); // Default to local
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Get the current environment option
    const selectedEnv = findEnvByValue(selectedEnvValue);

    const checkEndpoint = useCallback(async (endpoint: HealthEndpoint): Promise<HealthResult> => {
        const startTime = performance.now();
        const method = endpoint.method || 'GET';

        try {
            const response = await fetch(endpoint.url, {
                method,
                headers: {
                    'Accept': 'application/json',
                },
            });

            const responseTime = Math.round(performance.now() - startTime);

            let details: Record<string, unknown> | undefined;
            try {
                const text = await response.text();
                if (text) {
                    details = JSON.parse(text);
                }
            } catch {
                // Response might not be JSON
            }

            const isHealthy = response.ok || response.status === 405;

            return {
                name: endpoint.name,
                url: endpoint.url,
                status: isHealthy ? 'healthy' : 'unhealthy',
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

    const fetchDeploymentStatus = useCallback(async () => {
        setFetchError(null);
        try {
            const baseUrl = selectedEnv.apiUrl;
            // For external APIs, use our proxy to avoid CORS issues
            // For local, call the deployment-status route directly
            const url = baseUrl
                ? `/api/proxy-deployment-status?url=${encodeURIComponent(`${baseUrl}/api/deployment-status`)}`
                : '/api/deployment-status';

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setDeploymentStatus(data);
            } else {
                setFetchError(`Failed to fetch: ${response.status} ${response.statusText}`);
                setDeploymentStatus(null);
            }
        } catch (error) {
            console.error('Failed to fetch deployment status:', error);
            setFetchError(error instanceof Error ? error.message : 'Failed to connect to API');
            setDeploymentStatus(null);
        }
    }, [selectedEnv]);

    const checkAllEndpoints = useCallback(async () => {
        setIsChecking(true);

        // Set all to checking
        setResults(HEALTH_ENDPOINTS.map(ep => ({
            name: ep.name,
            url: ep.url,
            status: 'checking' as const,
        })));

        // Check all endpoints and deployment status in parallel
        const [endpointResults] = await Promise.all([
            Promise.all(HEALTH_ENDPOINTS.map(ep => checkEndpoint(ep))),
            fetchDeploymentStatus(),
        ]);

        setResults(endpointResults);
        setLastChecked(new Date());
        setIsChecking(false);
    }, [checkEndpoint, fetchDeploymentStatus]);

    // Initial check on mount
    useEffect(() => {
        checkAllEndpoints();
    }, [checkAllEndpoints]);

    // Refetch when environment changes
    useEffect(() => {
        fetchDeploymentStatus();
    }, [selectedEnvValue, fetchDeploymentStatus]);

    // Auto-refresh every 30 seconds if enabled
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(checkAllEndpoints, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, checkAllEndpoints]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return <i className="pi pi-check-circle" style={{ color: 'var(--agr-success)' }} />;
            case 'unhealthy':
            case 'error':
                return <i className="pi pi-times-circle" style={{ color: 'var(--agr-error)' }} />;
            case 'disabled':
                return <i className="pi pi-minus-circle" style={{ color: 'var(--agr-gray-400)' }} />;
            case 'unavailable':
            case 'not_found':
            case 'no_access':
                return <i className="pi pi-exclamation-circle" style={{ color: 'var(--agr-warning)' }} />;
            case 'checking':
                return <ProgressSpinner style={{ width: '20px', height: '20px' }} />;
            default:
                return <i className="pi pi-question-circle" style={{ color: 'var(--agr-gray-400)' }} />;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'healthy':
                return styles.statusHealthy;
            case 'unhealthy':
            case 'error':
                return styles.statusUnhealthy;
            case 'checking':
                return styles.statusChecking;
            default:
                return styles.statusUnknown;
        }
    };

    const getStatusSeverity = (status: string): 'success' | 'danger' | 'warning' | 'info' | 'secondary' => {
        switch (status) {
            case 'healthy':
                return 'success';
            case 'unhealthy':
            case 'error':
                return 'danger';
            case 'disabled':
                return 'secondary';
            case 'unavailable':
            case 'not_found':
            case 'no_access':
                return 'warning';
            default:
                return 'info';
        }
    };

    const getOverallStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'var(--agr-success)';
            case 'degraded':
                return 'var(--agr-warning)';
            case 'unavailable':
                return 'var(--agr-error)';
            default:
                return 'var(--agr-gray-400)';
        }
    };

    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;

    const deploymentComponents = deploymentStatus?.components
        ? Object.entries(deploymentStatus.components)
        : [];
    const deploymentHealthy = deploymentComponents.filter(([, c]) => c.status === 'healthy').length;
    const deploymentUnhealthy = deploymentComponents.filter(([, c]) =>
        ['unhealthy', 'error', 'not_found', 'no_access'].includes(c.status)
    ).length;

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                    <h2>System Health & Deployment Status</h2>
                    <p>Monitor the status of API endpoints and AWS infrastructure components</p>
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

            {/* Environment Selector */}
            <div className={styles.environmentSelector}>
                <label htmlFor="envSelect">
                    <i className="pi pi-globe" style={{ marginRight: '0.5rem' }} />
                    Check Status From:
                </label>
                <Dropdown
                    id="envSelect"
                    value={selectedEnvValue}
                    options={ENVIRONMENT_OPTIONS}
                    onChange={(e) => setSelectedEnvValue(e.value)}
                    optionLabel="label"
                    optionValue="value"
                    className={styles.environmentDropdown}
                />
                {selectedEnv.apiUrl && (
                    <span className={styles.corsWarning}>
                        <i className="pi pi-info-circle" />
                        Checking status via {selectedEnv.label}
                    </span>
                )}
            </div>

            {/* Overall Status Banner */}
            {deploymentStatus && (
                <Card className={styles.overallStatusCard}>
                    <div className={styles.overallStatusContent}>
                        <div className={styles.overallStatusLeft}>
                            <i
                                className={deploymentStatus.overall_status === 'healthy' ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'}
                                style={{
                                    fontSize: '2.5rem',
                                    color: getOverallStatusColor(deploymentStatus.overall_status)
                                }}
                            />
                            <div>
                                <h3 style={{ margin: 0, textTransform: 'capitalize' }}>
                                    {deploymentStatus.overall_status === 'healthy' ? 'All Systems Operational' :
                                        deploymentStatus.overall_status === 'degraded' ? 'Degraded Performance' :
                                            'Systems Unavailable'}
                                </h3>
                                <p style={{ margin: '0.25rem 0 0', color: 'var(--agr-gray-600)' }}>
                                    Environment: <Tag value={deploymentStatus.environment.toUpperCase()} severity="info" />
                                    {lastChecked && (
                                        <span style={{ marginLeft: '1rem' }}>
                                            Last checked: {lastChecked.toLocaleTimeString()}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className={styles.statusSummary}>
                            <div className={`${styles.summaryCard} ${styles.summaryHealthy}`}>
                                <span className={styles.summaryCount}>{deploymentHealthy}</span>
                                <span className={styles.summaryLabel}>Healthy</span>
                            </div>
                            <div className={`${styles.summaryCard} ${styles.summaryUnhealthy}`}>
                                <span className={styles.summaryCount}>{deploymentUnhealthy}</span>
                                <span className={styles.summaryLabel}>Issues</span>
                            </div>
                            <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
                                <span className={styles.summaryCount}>{deploymentComponents.length}</span>
                                <span className={styles.summaryLabel}>Total</span>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* AWS Infrastructure Components */}
            <h3 className={styles.subsectionTitle}>AWS Infrastructure</h3>
            <div className={styles.cardGrid}>
                {deploymentComponents.map(([key, component]) => (
                    <Card key={key} className={`${styles.healthCard} ${getStatusClass(component.status)}`}>
                        <div className={styles.healthCardHeader}>
                            <i className={COMPONENT_ICONS[key] || 'pi pi-box'} style={{ fontSize: '1.25rem' }} />
                            <h3>{component.name}</h3>
                            <Tag
                                value={component.status.replace('_', ' ').toUpperCase()}
                                severity={getStatusSeverity(component.status)}
                                style={{ marginLeft: 'auto' }}
                            />
                        </div>
                        <p className={styles.componentDescription}>
                            {COMPONENT_DESCRIPTIONS[key] || ''}
                        </p>
                        <div className={styles.healthCardBody}>
                            {component.execution_mode && (
                                <div className={styles.healthDetail}>
                                    <span className={styles.label}>Mode:</span>
                                    <Tag value={component.execution_mode} severity="info" />
                                </div>
                            )}
                            {component.details && Object.entries(component.details).map(([detailKey, value]) => (
                                <div key={detailKey} className={styles.healthDetail}>
                                    <span className={styles.label}>{detailKey.replace(/_/g, ' ')}:</span>
                                    {typeof value === 'string' && value.startsWith('arn:') ? (
                                        <code className={styles.code} title={value}>
                                            ...{value.split(':').slice(-1)[0]}
                                        </code>
                                    ) : (
                                        <span className={detailKey === 'error' ? styles.error : ''}>
                                            {String(value)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}

                {!deploymentStatus && (
                    <Card className={styles.emptyCard}>
                        <div className={styles.emptyMessage}>
                            {isChecking ? (
                                <>
                                    <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                                    <h4>Loading deployment status...</h4>
                                    <p>Connecting to {selectedEnv.label}...</p>
                                </>
                            ) : fetchError ? (
                                <>
                                    <i className="pi pi-info-circle" style={{ fontSize: '2rem', color: 'var(--agr-warning)' }} />
                                    <h4>AWS Infrastructure Status Unavailable</h4>
                                    {!selectedEnv.apiUrl ? (
                                        // Local API not running
                                        <div className={styles.corsHelp}>
                                            <p>
                                                The local PAVI API server is not running. The deployment status
                                                endpoint is provided by the backend API.
                                            </p>
                                            <p style={{ marginTop: '0.5rem' }}>
                                                <strong>Options:</strong>
                                            </p>
                                            <ul style={{ textAlign: 'left', marginTop: '0.5rem' }}>
                                                <li>Start the API server: <code>make run-server-dev</code> from the api/ directory</li>
                                                <li>Or select a remote environment above to check Production or Development status</li>
                                            </ul>
                                        </div>
                                    ) : (
                                        // Remote API error
                                        <div className={styles.corsHelp}>
                                            <p>
                                                <strong>Error:</strong> {fetchError}
                                            </p>
                                            <p>
                                                The {selectedEnv.label} API may be unavailable or the deployment-status
                                                endpoint may not exist on this environment.
                                            </p>
                                            <a
                                                href={`${selectedEnv.apiUrl}/api/deployment-status`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.externalLink}
                                            >
                                                <i className="pi pi-external-link" />
                                                Open API directly
                                            </a>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <i className="pi pi-exclamation-triangle" style={{ fontSize: '2rem', color: 'var(--agr-warning)' }} />
                                    <h4>Deployment status unavailable</h4>
                                    <p>Could not fetch AWS component status from {selectedEnv.label}</p>
                                </>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {/* API Endpoints */}
            <h3 className={styles.subsectionTitle}>API Endpoints</h3>
            <div className={styles.statusSummary} style={{ marginBottom: '1rem' }}>
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
