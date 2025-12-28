'use client';

import React, { useState, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { TabView, TabPanel } from 'primereact/tabview';
import styles from './AdminComponents.module.css';

interface ApiEndpoint {
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    description: string;
    sampleBody?: string;
}

interface ApiResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    time: number;
}

const API_ENDPOINTS: ApiEndpoint[] = [
    {
        name: 'Health Check',
        method: 'GET',
        path: '/api/health',
        description: 'Check API health status',
    },
    {
        name: 'Submit New Job',
        method: 'POST',
        path: '/api/pipeline-job/',
        description: 'Submit a new pipeline job',
        sampleBody: JSON.stringify([
            {
                "unique_entry_id": "test-entry-1",
                "base_seq_name": "Homo sapiens TP53",
                "seq_id": "NP_000537.3",
                "seq_strand": "+",
                "exon_seq_regions": [{ "start": 1, "end": 393 }],
                "cds_seq_regions": [{ "start": 1, "end": 393, "frame": 0 }],
                "fasta_file_url": "https://example.com/sequence.fasta",
                "variant_ids": []
            }
        ], null, 2),
    },
    {
        name: 'Get Job by UUID',
        method: 'GET',
        path: '/api/pipeline-job/YOUR-UUID-HERE',
        description: 'Replace YOUR-UUID-HERE with a job UUID from "Submit New Job" (e.g., aa3d0cc4-e420-11f0-a739-d0817ad57bdf)',
    },
    {
        name: 'Get Job Alignment Result',
        method: 'GET',
        path: '/api/pipeline-job/YOUR-UUID-HERE/result/alignment',
        description: 'Replace YOUR-UUID-HERE with a completed job UUID to get alignment results',
    },
];

export function ApiTester() {
    const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
    const [customPath, setCustomPath] = useState('');
    const [requestBody, setRequestBody] = useState('');
    const [response, setResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [history, setHistory] = useState<Array<{ endpoint: string; response: ApiResponse }>>([]);

    const handleEndpointChange = useCallback((endpoint: ApiEndpoint) => {
        setSelectedEndpoint(endpoint);
        setCustomPath(endpoint.path);
        setRequestBody(endpoint.sampleBody || '');
        setResponse(null);
        setError('');
    }, []);

    const executeRequest = useCallback(async () => {
        if (!customPath) {
            setError('Please enter an API path');
            return;
        }

        setLoading(true);
        setError('');
        setResponse(null);

        const method = selectedEndpoint?.method || 'GET';
        const startTime = performance.now();

        try {
            const options: { method: string; headers: Record<string, string>; body?: string } = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            };

            if (method !== 'GET' && requestBody.trim()) {
                try {
                    JSON.parse(requestBody); // Validate JSON
                    options.body = requestBody;
                } catch {
                    setError('Invalid JSON in request body');
                    setLoading(false);
                    return;
                }
            }

            const res = await fetch(customPath, options);
            const endTime = performance.now();

            // Get headers
            const headers: Record<string, string> = {};
            res.headers.forEach((value, key) => {
                headers[key] = value;
            });

            // Get body
            let body: unknown;
            const contentType = res.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                body = await res.json();
            } else {
                body = await res.text();
            }

            const apiResponse: ApiResponse = {
                status: res.status,
                statusText: res.statusText,
                headers,
                body,
                time: Math.round(endTime - startTime),
            };

            setResponse(apiResponse);

            // Add to history
            setHistory(prev => [
                { endpoint: `${method} ${customPath}`, response: apiResponse },
                ...prev.slice(0, 9),
            ]);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setLoading(false);
        }
    }, [customPath, selectedEndpoint, requestBody]);

    const getStatusClass = (status: number) => {
        if (status >= 200 && status < 300) return styles.statusSuccess;
        if (status >= 400 && status < 500) return styles.statusClientError;
        if (status >= 500) return styles.statusServerError;
        return styles.statusInfo;
    };

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                    <h2>API Tester</h2>
                    <p>Test PAVI API endpoints directly from the dashboard</p>
                </div>
            </div>

            <div className={styles.apiTesterLayout}>
                <Card className={styles.requestCard}>
                    <h3>Request</h3>

                    <div className={styles.formGroup}>
                        <label>Preset Endpoints</label>
                        <Dropdown
                            value={selectedEndpoint}
                            options={API_ENDPOINTS}
                            optionLabel="name"
                            placeholder="Select an endpoint..."
                            onChange={(e) => handleEndpointChange(e.value)}
                            className={styles.dropdown}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Request Path</label>
                        <div className="p-inputgroup">
                            <span className="p-inputgroup-addon">
                                {selectedEndpoint?.method || 'GET'}
                            </span>
                            <InputText
                                value={customPath}
                                onChange={(e) => setCustomPath(e.target.value)}
                                placeholder="/api/..."
                            />
                        </div>
                        {selectedEndpoint?.description && (
                            <small className={styles.hint}>{selectedEndpoint.description}</small>
                        )}
                    </div>

                    {(selectedEndpoint?.method === 'POST' || selectedEndpoint?.method === 'PUT') && (
                        <div className={styles.formGroup}>
                            <label>Request Body (JSON)</label>
                            <InputTextarea
                                value={requestBody}
                                onChange={(e) => setRequestBody(e.target.value)}
                                rows={10}
                                className={styles.codeTextarea}
                                placeholder="Enter JSON body..."
                            />
                        </div>
                    )}

                    {error && (
                        <div className={styles.errorMessage}>
                            <i className="pi pi-exclamation-triangle" />
                            {error}
                        </div>
                    )}

                    <Button
                        label="Send Request"
                        icon="pi pi-send"
                        onClick={executeRequest}
                        loading={loading}
                        className="p-button-lg"
                    />
                </Card>

                <Card className={styles.responseCard}>
                    <h3>Response</h3>

                    {response ? (
                        <div className={styles.responseContent}>
                            <div className={styles.responseHeader}>
                                <span className={`${styles.statusBadge} ${getStatusClass(response.status)}`}>
                                    {response.status} {response.statusText}
                                </span>
                                <span className={styles.responseTime}>
                                    <i className="pi pi-clock" /> {response.time}ms
                                </span>
                            </div>

                            <TabView>
                                <TabPanel header="Body">
                                    <pre className={styles.jsonResponse}>
                                        {typeof response.body === 'string'
                                            ? response.body
                                            : JSON.stringify(response.body, null, 2)}
                                    </pre>
                                </TabPanel>
                                <TabPanel header="Headers">
                                    <pre className={styles.jsonResponse}>
                                        {JSON.stringify(response.headers, null, 2)}
                                    </pre>
                                </TabPanel>
                            </TabView>
                        </div>
                    ) : (
                        <div className={styles.emptyResponse}>
                            <i className="pi pi-send" style={{ fontSize: '2rem', color: 'var(--agr-gray-400)' }} />
                            <p>Send a request to see the response</p>
                        </div>
                    )}
                </Card>
            </div>

            {history.length > 0 && (
                <Card className={styles.historyCard}>
                    <h3>Request History</h3>
                    <div className={styles.historyList}>
                        {history.map((item, index) => (
                            <div key={index} className={styles.historyItem}>
                                <span className={styles.historyEndpoint}>{item.endpoint}</span>
                                <span className={`${styles.statusBadge} ${getStatusClass(item.response.status)}`}>
                                    {item.response.status}
                                </span>
                                <span className={styles.historyTime}>{item.response.time}ms</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
