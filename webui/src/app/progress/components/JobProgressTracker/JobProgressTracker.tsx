'use client';

import React, { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { Timeline } from 'primereact/timeline';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { useRouter } from 'next/navigation'

import { fetchJobStatusFull } from './serverActions';
import { ProgressStep } from './types';
import styles from './JobProgressTracker.module.css';
import { dataCache, CACHE_CONFIGS } from '@/utils/dataCache';
import { fetchAlignmentResults, fetchAlignmentSeqInfo } from '@/app/result/components/AlignmentResultView/serverActions';

interface LogEntry {
    timestamp: Date;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
}

export interface JobProgressTrackerProps {
    readonly uuidStr: string
}

const INITIAL_STEPS: ProgressStep[] = [
    { name: 'Job Submitted', status: 'success', message: 'Job created and queued' },
    { name: 'Pipeline Started', status: 'pending' },
    { name: 'Sequence Retrieval', status: 'pending', message: 'Fetching protein sequences' },
    { name: 'Alignment', status: 'pending', message: 'Running Clustal Omega alignment' },
    { name: 'Finalizing Results', status: 'pending' },
];

export const JobProgressTracker: FunctionComponent<JobProgressTrackerProps> = (props: JobProgressTrackerProps) => {
    const router = useRouter()

    const [steps, setSteps] = useState<ProgressStep[]>(INITIAL_STEPS.map(s => ({ ...s })))
    const [isPolling, setIsPolling] = useState<boolean>(true)
    const [lastStatus, setLastStatus] = useState<string>('')
    const [errorMessage, setErrorMessage] = useState<string>('')
    const [lastChecked, setLastChecked] = useState<Date | null>(null)
    const isPollingRef = useRef<boolean>(true)
    const [logs, setLogs] = useState<LogEntry[]>([])
    const logContainerRef = useRef<HTMLDivElement>(null)
    const hasInitializedRef = useRef<boolean>(false)
    const hasStartedPollingRef = useRef<boolean>(false)
    // Track which statuses we've already logged to prevent duplicates
    const loggedStatusesRef = useRef<Set<string>>(new Set())

    const addLog = useCallback((level: LogEntry['level'], message: string) => {
        setLogs(prev => [...prev, { timestamp: new Date(), level, message }])
    }, [])

    const updateStepsForStatus = useCallback((status: string, errorMsg?: string) => {
        setSteps(prevSteps => {
            const newSteps = prevSteps.map(s => ({ ...s }))

            if (status === 'pending') {
                // Job queued, waiting to start
                newSteps[0] = { ...newSteps[0], status: 'success', timestamp: new Date() }
                newSteps[1] = { ...newSteps[1], status: 'pending', message: 'Waiting in queue...' }
            } else if (status === 'running') {
                // Pipeline is running
                newSteps[0] = { ...newSteps[0], status: 'success' }
                newSteps[1] = { ...newSteps[1], status: 'success', message: 'Pipeline initialized', timestamp: new Date() }
                newSteps[2] = { ...newSteps[2], status: 'running', message: 'Retrieving sequences from genome...' }
                newSteps[3] = { ...newSteps[3], status: 'pending' }
                newSteps[4] = { ...newSteps[4], status: 'pending' }
            } else if (status === 'completed') {
                // All done
                newSteps[0] = { ...newSteps[0], status: 'success' }
                newSteps[1] = { ...newSteps[1], status: 'success', message: 'Pipeline initialized' }
                newSteps[2] = { ...newSteps[2], status: 'success', message: 'Sequences retrieved' }
                newSteps[3] = { ...newSteps[3], status: 'success', message: 'Alignment complete' }
                newSteps[4] = { ...newSteps[4], status: 'success', message: 'Results ready!', timestamp: new Date() }
            } else if (status === 'failed') {
                // Mark current running step as error
                newSteps[0] = { ...newSteps[0], status: 'success' }
                const runningIdx = newSteps.findIndex(s => s.status === 'running' || s.status === 'pending')
                if (runningIdx >= 0) {
                    newSteps[runningIdx] = {
                        ...newSteps[runningIdx],
                        status: 'error',
                        message: errorMsg || 'Pipeline failed',
                        timestamp: new Date()
                    }
                    // Mark remaining as error
                    for (let i = runningIdx + 1; i < newSteps.length; i++) {
                        newSteps[i] = { ...newSteps[i], status: 'error', message: 'Skipped' }
                    }
                }
            }

            return newSteps
        })
    }, [])

    const stopPolling = useCallback(() => {
        isPollingRef.current = false
        setIsPolling(false)
    }, [])

    const pollJobStatus = useCallback(async () => {
        const response = await fetchJobStatusFull(props.uuidStr)
        setLastChecked(new Date())

        if (!response) {
            setErrorMessage(`Failed to fetch job status. Please check the job UUID.`)
            addLog('error', 'Failed to fetch job status from server')
            stopPolling()
            updateStepsForStatus('failed', 'Could not connect to server')
            return
        }

        // Only log if we haven't logged this status before (use ref for reliable tracking)
        if (!loggedStatusesRef.current.has(response.status)) {
            loggedStatusesRef.current.add(response.status)

            if (response.status === 'pending') {
                addLog('info', `Job ${props.uuidStr.slice(0, 8)}... queued`)
                addLog('info', 'Waiting for pipeline worker to pick up job...')
            } else if (response.status === 'running') {
                addLog('success', 'Pipeline worker acquired job')
                addLog('info', 'Initializing Nextflow pipeline...')
                addLog('success', 'Pipeline started')
                addLog('info', 'Retrieving protein sequences from genome database...')
            } else if (response.status === 'completed') {
                addLog('success', 'Sequence retrieval completed')
                addLog('info', 'Starting Clustal Omega alignment...')
                addLog('success', 'Alignment completed successfully')
            } else if (response.status === 'failed') {
                addLog('error', `Pipeline failed: ${response.error_message || 'Unknown error'}`)
            }
        }

        setLastStatus(response.status)
        updateStepsForStatus(response.status, response.error_message)

        if (response.status === 'completed') {
            stopPolling()
            addLog('info', 'Prefetching alignment results...')

            // Prefetch results during the redirect delay (uses same cache keys as AlignmentResultView)
            const alignmentCacheKey = `alignment_result_${props.uuidStr}`
            const seqInfoCacheKey = `alignment_seqinfo_${props.uuidStr}`

            // Fire off prefetch requests (don't await - let them run in parallel with redirect timer)
            dataCache.getOrFetch(
                alignmentCacheKey,
                () => fetchAlignmentResults(props.uuidStr),
                CACHE_CONFIGS.session
            ).then(() => {
                addLog('success', 'Alignment results cached')
            }).catch(() => {
                // Silent fail - results will be fetched on the results page
            })

            dataCache.getOrFetch(
                seqInfoCacheKey,
                () => fetchAlignmentSeqInfo(props.uuidStr),
                CACHE_CONFIGS.session
            ).then(() => {
                addLog('success', 'Sequence info cached')
            }).catch(() => {
                // Silent fail
            })

            addLog('info', 'Redirecting to results page...')
            // Redirect to results after a short delay
            setTimeout(() => {
                const params = new URLSearchParams()
                params.set("uuid", props.uuidStr)
                router.push(`/result?${params.toString()}`)
            }, 2000)
        } else if (response.status === 'failed') {
            stopPolling()
            setErrorMessage(response.error_message || 'Pipeline execution failed')
        }
    }, [props.uuidStr, router, updateStepsForStatus, stopPolling, addLog])

    // Auto-scroll logs to bottom when new entries are added
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
        }
    }, [logs])

    // Add initial log on mount (use ref to prevent double-logging in Strict Mode)
    useEffect(() => {
        if (hasInitializedRef.current) return
        hasInitializedRef.current = true
        addLog('info', `Tracking job: ${props.uuidStr}`)
        addLog('info', 'Connecting to pipeline server...')
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Single consolidated polling effect (use ref to prevent double-polling in Strict Mode)
    useEffect(() => {
        if (hasStartedPollingRef.current) return
        hasStartedPollingRef.current = true

        let intervalId: ReturnType<typeof setInterval> | null = null
        let mounted = true

        const startPolling = async () => {
            // Initial poll
            await pollJobStatus()

            // Only set up interval if still mounted and should be polling
            if (mounted && isPollingRef.current) {
                intervalId = setInterval(() => {
                    // Check ref before each poll to ensure we should still be polling
                    if (isPollingRef.current) {
                        pollJobStatus()
                    } else if (intervalId) {
                        clearInterval(intervalId)
                        intervalId = null
                    }
                }, 5000)
            }
        }

        startPolling()

        return () => {
            mounted = false
            isPollingRef.current = false
            if (intervalId) {
                clearInterval(intervalId)
            }
        }
    }, [props.uuidStr]) // eslint-disable-line react-hooks/exhaustive-deps

    const getStepIcon = (status: ProgressStep['status']) => {
        switch (status) {
            case 'success': return 'pi pi-check-circle'
            case 'error': return 'pi pi-times-circle'
            case 'running': return 'pi pi-spin pi-spinner'
            default: return 'pi pi-circle'
        }
    }

    const getStepColor = (status: ProgressStep['status']) => {
        switch (status) {
            case 'success': return 'var(--agr-success, #22c55e)'
            case 'error': return 'var(--agr-error, #ef4444)'
            case 'running': return 'var(--agr-primary, #3b82f6)'
            default: return 'var(--agr-gray-400, #9ca3af)'
        }
    }

    const handleRetry = () => {
        router.push('/submit')
    }

    const formatLogTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
    }

    return (
        <div className="agr-page-section">
            <div className="agr-page-header">
                <h1>Job Progress</h1>
                <p className="agr-page-description">
                    Tracking alignment job: <code className="agr-code">{props.uuidStr}</code>
                </p>
            </div>

            <div className={styles.container}>
                {/* Left side: Step graph */}
                <div className={styles.stepsPanel}>
                    <Card className="agr-card">
                        <div className="agr-card-header" style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Pipeline Progress</h2>
                            {lastChecked && (
                                <small style={{ color: 'var(--agr-gray-500)', fontWeight: 'normal' }}>
                                    Last updated: {lastChecked.toLocaleTimeString()}
                                    {isPolling && ' (auto-refreshing every 5s)'}
                                </small>
                            )}
                        </div>

                        <Timeline
                            value={steps}
                            marker={(item) => (
                                <span
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '2rem',
                                        height: '2rem',
                                        borderRadius: '50%',
                                        backgroundColor: item.status === 'running' ? 'var(--agr-primary-light, #dbeafe)' : 'transparent'
                                    }}
                                >
                                    <i
                                        className={`${getStepIcon(item.status)}${item.status === 'running' ? ' agr-spinner' : ''}`}
                                        style={{
                                            color: getStepColor(item.status),
                                            fontSize: '1.25rem'
                                        }}
                                    />
                                </span>
                            )}
                            content={(item) => (
                                <div style={{ paddingBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <strong style={{
                                            color: item.status === 'error' ? 'var(--agr-error)' : 'inherit'
                                        }}>
                                            {item.name}
                                        </strong>
                                        {item.status === 'running' && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.125rem 0.5rem',
                                                backgroundColor: 'var(--agr-primary-light, #dbeafe)',
                                                color: 'var(--agr-primary, #3b82f6)',
                                                borderRadius: '9999px'
                                            }}>
                                                In Progress
                                            </span>
                                        )}
                                    </div>
                                    {item.message && (
                                        <p style={{
                                            margin: '0.25rem 0 0 0',
                                            fontSize: '0.875rem',
                                            color: item.status === 'error' ? 'var(--agr-error)' : 'var(--agr-gray-600)'
                                        }}>
                                            {item.message}
                                        </p>
                                    )}
                                    {item.timestamp && (
                                        <small style={{ color: 'var(--agr-gray-400)' }}>
                                            {item.timestamp.toLocaleTimeString()}
                                        </small>
                                    )}
                                </div>
                            )}
                        />

                        {errorMessage && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                backgroundColor: 'var(--agr-error-light, #fef2f2)',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--agr-error, #ef4444)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <i className="pi pi-exclamation-triangle" style={{ color: 'var(--agr-error)' }} />
                                    <strong style={{ color: 'var(--agr-error)' }}>Error</strong>
                                </div>
                                <p style={{ margin: 0, color: 'var(--agr-error-dark, #991b1b)' }}>{errorMessage}</p>
                                <Button
                                    label="Submit New Job"
                                    icon="pi pi-refresh"
                                    className="p-button-sm p-button-outlined"
                                    style={{ marginTop: '1rem' }}
                                    onClick={handleRetry}
                                />
                            </div>
                        )}

                        {lastStatus === 'completed' && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                backgroundColor: 'var(--agr-success-light, #f0fdf4)',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--agr-success, #22c55e)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <i className="pi pi-check-circle" style={{ color: 'var(--agr-success)', fontSize: '1.25rem' }} />
                                    <strong style={{ color: 'var(--agr-success-dark, #166534)' }}>
                                        Alignment Complete!
                                    </strong>
                                </div>
                                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--agr-success-dark, #166534)' }}>
                                    Redirecting to results page...
                                </p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right side: Log viewer */}
                <div className={styles.logPanel}>
                    <div className={styles.logContainer} ref={logContainerRef}>
                        <div className={styles.logHeader}>
                            <div className={styles.logTitle}>
                                <i className="pi pi-desktop" />
                                <span>Pipeline Log</span>
                            </div>
                            <span className={styles.logCount}>{logs.length} entries</span>
                        </div>
                        <div className={styles.logContent}>
                            {logs.length === 0 ? (
                                <div className={styles.emptyLog}>
                                    <i className="pi pi-inbox" />
                                    <p>Waiting for log entries...</p>
                                </div>
                            ) : (
                                logs.map((log, index) => (
                                    <div key={index} className={styles.logEntry}>
                                        <span className={styles.logTimestamp}>{formatLogTime(log.timestamp)}</span>
                                        <span className={`${styles.logLevel} ${styles[log.level]}`}>
                                            {log.level}
                                        </span>
                                        <span className={`${styles.logMessage} ${styles[log.level]}`}>
                                            {log.message}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
