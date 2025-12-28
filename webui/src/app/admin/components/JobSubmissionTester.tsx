'use client';

import React, { useState, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Timeline } from 'primereact/timeline';
import { Tag } from 'primereact/tag';
import styles from './AdminComponents.module.css';

interface TestScenario {
    name: string;
    description: string;
    payload: unknown[];
}

interface TestStep {
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    message?: string;
    duration?: number;
    data?: unknown;
}

const TEST_SCENARIOS: TestScenario[] = [
    {
        name: 'Single Sequence Test',
        description: 'Submit a minimal job with two sequences',
        payload: [
            {
                gene_symbol: "TEST1",
                seq_id: "test-seq-1",
                seq_strand: "+",
                seq_regions: [{ start: 1, end: 100 }],
                raw_seq: "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH"
            },
            {
                gene_symbol: "TEST2",
                seq_id: "test-seq-2",
                seq_strand: "+",
                seq_regions: [{ start: 1, end: 100 }],
                raw_seq: "MVLSGEDKSNIKAAWGKIGGHGAEYGAEALERMFASFPTTKTYFPHFDVSH"
            }
        ],
    },
    {
        name: 'Cross-Species Comparison',
        description: 'Compare TP53 orthologs across species',
        payload: [
            {
                gene_symbol: "TP53_HUMAN",
                seq_id: "NP_000537.3",
                seq_strand: "+",
                seq_regions: [{ start: 1, end: 393 }]
            },
            {
                gene_symbol: "Trp53_MOUSE",
                seq_id: "NP_035770.2",
                seq_strand: "+",
                seq_regions: [{ start: 1, end: 390 }]
            }
        ],
    },
    {
        name: 'Error Test - Empty Payload',
        description: 'Test error handling with empty payload',
        payload: [],
    },
    {
        name: 'Error Test - Single Sequence',
        description: 'Test validation with only one sequence',
        payload: [
            {
                gene_symbol: "SOLO",
                seq_id: "test-single",
                seq_strand: "+",
                seq_regions: [{ start: 1, end: 50 }],
                raw_seq: "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH"
            }
        ],
    },
];

export function JobSubmissionTester() {
    const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
    const [customPayload, setCustomPayload] = useState('');
    const [testSteps, setTestSteps] = useState<TestStep[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [jobUuid, setJobUuid] = useState<string | null>(null);
    const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

    const handleScenarioChange = useCallback((scenario: TestScenario) => {
        setSelectedScenario(scenario);
        setCustomPayload(JSON.stringify(scenario.payload, null, 2));
        setTestSteps([]);
        setJobUuid(null);
    }, []);

    const updateStep = useCallback((index: number, updates: Partial<TestStep>) => {
        setTestSteps(prev => prev.map((step, i) =>
            i === index ? { ...step, ...updates } : step
        ));
    }, []);

    const runE2ETest = useCallback(async () => {
        // Parse payload
        let payload: unknown[];
        try {
            payload = JSON.parse(customPayload);
        } catch {
            setTestSteps([{
                name: 'Parse Payload',
                status: 'error',
                message: 'Invalid JSON in payload',
            }]);
            return;
        }

        setIsRunning(true);
        setJobUuid(null);

        // Initialize test steps
        const steps: TestStep[] = [
            { name: 'Parse Payload', status: 'pending' },
            { name: 'Submit Job', status: 'pending' },
            { name: 'Verify Job Created', status: 'pending' },
            { name: 'Poll Job Status', status: 'pending' },
            { name: 'Verify Completion', status: 'pending' },
        ];
        setTestSteps(steps);

        // Step 1: Parse Payload
        const step1Start = performance.now();
        updateStep(0, { status: 'running' });
        await new Promise(r => setTimeout(r, 300));
        updateStep(0, {
            status: 'success',
            message: `Parsed ${Array.isArray(payload) ? payload.length : 0} sequence(s)`,
            duration: Math.round(performance.now() - step1Start),
        });

        // Step 2: Submit Job
        const step2Start = performance.now();
        updateStep(1, { status: 'running' });

        try {
            const response = await fetch('/api/pipeline-job/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                updateStep(1, {
                    status: 'error',
                    message: data.error || `HTTP ${response.status}: ${response.statusText}`,
                    duration: Math.round(performance.now() - step2Start),
                    data,
                });
                setIsRunning(false);
                return;
            }

            const uuid = data.uuid;
            setJobUuid(uuid);

            updateStep(1, {
                status: 'success',
                message: `Job submitted: ${uuid}`,
                duration: Math.round(performance.now() - step2Start),
                data,
            });

            // Step 3: Verify Job Created
            const step3Start = performance.now();
            updateStep(2, { status: 'running' });

            const verifyResponse = await fetch(`/api/pipeline-job/${uuid}`);
            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
                updateStep(2, {
                    status: 'error',
                    message: 'Failed to verify job creation',
                    duration: Math.round(performance.now() - step3Start),
                });
                setIsRunning(false);
                return;
            }

            updateStep(2, {
                status: 'success',
                message: `Job verified, status: ${verifyData.status}`,
                duration: Math.round(performance.now() - step3Start),
                data: verifyData,
            });

            // Step 4: Poll Job Status
            updateStep(3, { status: 'running', message: 'Polling for completion...' });

            const pollStart = performance.now();
            let pollCount = 0;
            const maxPolls = 60; // 5 minutes with 5s interval

            const poll = async () => {
                pollCount++;
                try {
                    const statusResponse = await fetch(`/api/pipeline-job/${uuid}`);
                    const statusData = await statusResponse.json();

                    updateStep(3, {
                        status: 'running',
                        message: `Poll ${pollCount}: ${statusData.status} (${statusData.stage || 'unknown stage'})`,
                        data: statusData,
                    });

                    if (statusData.status === 'COMPLETED' || statusData.status === 'completed') {
                        if (pollingInterval) {
                            clearInterval(pollingInterval);
                            setPollingInterval(null);
                        }

                        updateStep(3, {
                            status: 'success',
                            message: `Completed after ${pollCount} polls`,
                            duration: Math.round(performance.now() - pollStart),
                            data: statusData,
                        });

                        // Step 5: Verify Completion
                        const step5Start = performance.now();
                        updateStep(4, { status: 'running' });

                        try {
                            const resultResponse = await fetch(`/api/pipeline-job/${uuid}/result/alignment`);

                            if (resultResponse.ok) {
                                const resultData = await resultResponse.json();
                                updateStep(4, {
                                    status: 'success',
                                    message: 'Alignment result retrieved successfully',
                                    duration: Math.round(performance.now() - step5Start),
                                    data: resultData,
                                });
                            } else {
                                updateStep(4, {
                                    status: 'error',
                                    message: `Failed to get result: ${resultResponse.status}`,
                                    duration: Math.round(performance.now() - step5Start),
                                });
                            }
                        } catch (err) {
                            updateStep(4, {
                                status: 'error',
                                message: err instanceof Error ? err.message : 'Failed to get result',
                                duration: Math.round(performance.now() - step5Start),
                            });
                        }

                        setIsRunning(false);
                        return;
                    }

                    if (statusData.status === 'FAILED' || statusData.status === 'failed') {
                        if (pollingInterval) {
                            clearInterval(pollingInterval);
                            setPollingInterval(null);
                        }

                        updateStep(3, {
                            status: 'error',
                            message: `Job failed: ${statusData.error_message || 'Unknown error'}`,
                            duration: Math.round(performance.now() - pollStart),
                            data: statusData,
                        });
                        updateStep(4, { status: 'error', message: 'Skipped due to job failure' });
                        setIsRunning(false);
                        return;
                    }

                    if (pollCount >= maxPolls) {
                        if (pollingInterval) {
                            clearInterval(pollingInterval);
                            setPollingInterval(null);
                        }
                        updateStep(3, {
                            status: 'error',
                            message: 'Timeout waiting for completion',
                            duration: Math.round(performance.now() - pollStart),
                        });
                        updateStep(4, { status: 'error', message: 'Skipped due to timeout' });
                        setIsRunning(false);
                    }
                } catch (err) {
                    console.error('Poll error:', err);
                }
            };

            // Start polling
            await poll();
            const interval = setInterval(poll, 5000);
            setPollingInterval(interval);

        } catch (err) {
            updateStep(1, {
                status: 'error',
                message: err instanceof Error ? err.message : 'Request failed',
                duration: Math.round(performance.now() - step2Start),
            });
            setIsRunning(false);
        }
    }, [customPayload, updateStep, pollingInterval]);

    const cancelTest = useCallback(() => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
        setIsRunning(false);
    }, [pollingInterval]);

    const getStepIcon = (status: TestStep['status']) => {
        switch (status) {
            case 'success': return 'pi pi-check-circle';
            case 'error': return 'pi pi-times-circle';
            case 'running': return 'pi pi-spin pi-spinner';
            default: return 'pi pi-circle';
        }
    };

    const getStepColor = (status: TestStep['status']) => {
        switch (status) {
            case 'success': return 'var(--agr-success)';
            case 'error': return 'var(--agr-error)';
            case 'running': return 'var(--agr-primary)';
            default: return 'var(--agr-gray-400)';
        }
    };

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                    <h2>End-to-End Job Submission Tester</h2>
                    <p>Test the complete job submission and processing workflow</p>
                </div>
            </div>

            <div className={styles.e2eLayout}>
                <Card className={styles.testConfig}>
                    <h3>Test Configuration</h3>

                    <div className={styles.formGroup}>
                        <label>Test Scenario</label>
                        <Dropdown
                            value={selectedScenario}
                            options={TEST_SCENARIOS}
                            optionLabel="name"
                            placeholder="Select a test scenario..."
                            onChange={(e) => handleScenarioChange(e.value)}
                            className={styles.dropdown}
                        />
                        {selectedScenario && (
                            <small className={styles.hint}>{selectedScenario.description}</small>
                        )}
                    </div>

                    <div className={styles.formGroup}>
                        <label>Payload (JSON)</label>
                        <InputTextarea
                            value={customPayload}
                            onChange={(e) => setCustomPayload(e.target.value)}
                            rows={12}
                            className={styles.codeTextarea}
                            placeholder="Enter job payload..."
                            disabled={isRunning}
                        />
                    </div>

                    <div className={styles.buttonGroup}>
                        <Button
                            label={isRunning ? 'Running...' : 'Run E2E Test'}
                            icon={isRunning ? 'pi pi-spin pi-spinner' : 'pi pi-play'}
                            onClick={runE2ETest}
                            disabled={isRunning || !customPayload.trim()}
                            className="p-button-lg"
                        />
                        {isRunning && (
                            <Button
                                label="Cancel"
                                icon="pi pi-stop"
                                onClick={cancelTest}
                                className="p-button-danger"
                            />
                        )}
                    </div>
                </Card>

                <Card className={styles.testResults}>
                    <h3>Test Progress</h3>

                    {testSteps.length > 0 ? (
                        <>
                            {jobUuid && (
                                <div className={styles.jobIdBanner}>
                                    <span>Job UUID:</span>
                                    <code>{jobUuid}</code>
                                </div>
                            )}

                            <Timeline
                                value={testSteps}
                                marker={(item) => (
                                    <i
                                        className={getStepIcon(item.status)}
                                        style={{ color: getStepColor(item.status), fontSize: '1.2rem' }}
                                    />
                                )}
                                content={(item) => (
                                    <div className={styles.timelineItem}>
                                        <div className={styles.timelineHeader}>
                                            <strong>{item.name}</strong>
                                            {item.duration !== undefined && (
                                                <Tag value={`${item.duration}ms`} severity="info" />
                                            )}
                                        </div>
                                        {item.message && (
                                            <p className={item.status === 'error' ? styles.errorText : ''}>
                                                {item.message}
                                            </p>
                                        )}
                                        {item.data && item.status !== 'running' && (
                                            <details className={styles.dataDetails}>
                                                <summary>View Data</summary>
                                                <pre className={styles.jsonPreview}>
                                                    {JSON.stringify(item.data, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                )}
                            />
                        </>
                    ) : (
                        <div className={styles.emptyMessage}>
                            <i className="pi pi-play" style={{ fontSize: '3rem', color: 'var(--agr-gray-400)' }} />
                            <h4>Ready to Test</h4>
                            <p>Select a test scenario and click &quot;Run E2E Test&quot; to begin</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
