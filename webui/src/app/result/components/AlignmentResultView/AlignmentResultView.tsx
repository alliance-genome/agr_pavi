'use client';

import React, { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';

import { fetchAlignmentResults, fetchAlignmentSeqInfo } from './serverActions';
import { fetchJobStatusFull } from '@/app/progress/components/JobProgressTracker/serverActions';
import { describeResultsUnavailable, ResultsUnavailable } from '../../utils/resultsUnavailable';
import { displayModeType } from './types';
import { TextAlignment } from '../TextAlignment/TextAlignment';
import { SeqInfoDict } from '../InteractiveAlignment/types';
import { FailureDisplay } from '../FailureDisplay/FailureDisplay';
import { ResultsSummary } from '../ResultsSummary';
import { AlignmentSkeleton } from '../AlignmentSkeleton';
import { dataCache, CACHE_CONFIGS } from '@/utils/dataCache';
import { withBasePath } from '@/utils/basePath';
import { useJobHistory } from '@/hooks/useJobHistory';
import { deduplicateSequences } from '../../utils/deduplicateSequences';
import { PublicationFigureDialog } from '../PublicationFigure/PublicationFigureDialog';

const InteractiveAlignment = dynamic(() => import('../InteractiveAlignment/InteractiveAlignment'), { ssr: false })
const VirtualizedAlignment = dynamic(() => import('../InteractiveAlignment/VirtualizedAlignment'), { ssr: false })

export interface AlignmentResultViewProps {
    readonly uuidStr: string
}
export const AlignmentResultView: FunctionComponent<AlignmentResultViewProps> = (props: AlignmentResultViewProps) => {
    const router = useRouter()
    const { getJob } = useJobHistory()

    const [displayMode, setDisplayMode] = useState('virtualized' as displayModeType)
    type displayModeOptionsType = {
        label: string,
        value: displayModeType
    }
    const displayModeOptions: displayModeOptionsType[] = [
        {label: 'Interactive (Virtualized)', value: 'virtualized'},
        {label: 'Interactive (Legacy)', value: 'interactive'},
        {label: 'Text', value: 'text'}
    ]

    const [alignmentResult, setAlignmentResult] = useState<string>('')
    const [alignmentSeqInfo, setAlignmentSeqInfo] = useState<SeqInfoDict>({})
    const [seqFailures, setSeqFailures] = useState<Map<string, string>>(new Map<string, string>())
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [loadError, setLoadError] = useState<ResultsUnavailable | null>(null)
    const [loadedAt, setLoadedAt] = useState<Date | undefined>(undefined)
    const [figureDialogVisible, setFigureDialogVisible] = useState<boolean>(false)

    const downloadMenuRef = useRef<Menu>(null)
    const downloadExport = useCallback((format: string) => {
        window.location.href = withBasePath(`/api/pipeline-job/${props.uuidStr}/export?format=${format}`)
    }, [props.uuidStr])
    const downloadMenuItems = [
        { label: 'JSON bundle', icon: 'pi pi-file', command: () => downloadExport('json') },
        { label: 'Aligned FASTA', icon: 'pi pi-align-left', command: () => downloadExport('fasta') },
        { label: 'Variants (CSV)', icon: 'pi pi-table', command: () => downloadExport('csv') },
        { separator: true },
        { label: 'SQLite (.db)', icon: 'pi pi-database', command: () => downloadExport('db') },
    ]

    function changeDisplayMode(displayMode: displayModeType) {
        console.log(`Changing display mode to ${displayMode}.`)
        setDisplayMode(displayMode)
    }

    const getAlignmentResult = useCallback(async (retried: boolean = false): Promise<void> => {
        setIsLoading(true)
        setLoadError(null)

        // Use cache for alignment results (completed jobs don't change)
        const alignmentCacheKey = `alignment_result_${props.uuidStr}`
        const seqInfoCacheKey = `alignment_seqinfo_${props.uuidStr}`

        // Fetch alignment output with caching
        const rawResult = await dataCache.getOrFetch<string | undefined>(
            alignmentCacheKey,
            () => fetchAlignmentResults(props.uuidStr),
            CACHE_CONFIGS.session // Cache for 24 hours - completed results don't change
        )

        // Fetch alignment seq-info with caching
        const rawSeqInfo = await dataCache.getOrFetch<SeqInfoDict | undefined>(
            seqInfoCacheKey,
            () => fetchAlignmentSeqInfo(props.uuidStr),
            CACHE_CONFIGS.session
        )

        if (!rawResult) {
            console.log('Failed to retrieve alignment results; checking the job status for the reason.')
            const unavailable = describeResultsUnavailable(await fetchJobStatusFull(props.uuidStr))
            // A job that finishes between the two requests reports completed
            // while its results were still missing: fetch them once more.
            if (unavailable.kind === 'unknown' && !retried) {
                return getAlignmentResult(true)
            }
            setLoadError(unavailable)
            setIsLoading(false)
            return
        }

        if (!rawSeqInfo) {
            console.log('Failed to retrieve alignment seq-info.')
            // Still set alignment result even if seq-info fails
            setAlignmentResult(rawResult)
            setIsLoading(false)
            return
        }

        // Deduplicate reference sequences (KANBAN-727)
        // When same transcript is submitted with multiple alleles,
        // the alignment contains duplicate reference sequences.
        const { alignmentResult: deduplicatedAlignment, seqInfoDict: deduplicatedSeqInfo, duplicatesRemoved } =
            deduplicateSequences(rawResult, rawSeqInfo)

        if (duplicatesRemoved > 0) {
            console.log(`Removed ${duplicatesRemoved} duplicate reference sequence(s) from alignment.`)
        }

        setAlignmentResult(deduplicatedAlignment)
        setAlignmentSeqInfo(deduplicatedSeqInfo)

        // Store failures
        if (Object.keys(deduplicatedSeqInfo).length > 0) {
            const failures: Map<string, string> = new Map<string, string>()
            for (const [seq_name, seq_info] of Object.entries(deduplicatedSeqInfo)) {
                if (seq_info.error) {
                    failures.set(seq_name, seq_info.error)
                }
            }
            setSeqFailures(failures)
        } else {
            setSeqFailures(new Map<string, string>())
        }

        setLoadedAt(new Date())
        setIsLoading(false)
    }, [props.uuidStr])

    const handleDownload = () => {
        if (!alignmentResult) return

        const blob = new Blob([alignmentResult], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `alignment-${props.uuidStr.slice(0, 8)}.fasta`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleShare = () => {
        const url = `${window.location.origin}/result?uuid=${props.uuidStr}`
        navigator.clipboard.writeText(url).then(() => {
            // Could add a toast notification here
            console.log('Result URL copied to clipboard')
        })
    }

    const job = getJob(props.uuidStr)
    const canEditSequences = !!job?.inputGenes && job.inputGenes.length > 0

    const handleEditSequences = () => {
        if (!job?.inputGenes || job.inputGenes.length === 0) return
        try {
            sessionStorage.setItem('pavi_edit', JSON.stringify(job.inputGenes))
        } catch (e) {
            console.error('Failed to stash inputGenes for edit:', e)
            return
        }
        router.push('/submit?edit=true')
    }

    useEffect(
        () => {
            console.log(`Fetching alignmentResult.`)

            getAlignmentResult()

        }, [] // eslint-disable-line react-hooks/exhaustive-deps
    )

    useEffect(
        () => {
            console.log(`alignmentSeqInfo updated.`)

            if(alignmentSeqInfo){
                console.log(`alignmentSeqInfo updated to:`, alignmentSeqInfo)
            }

        }, [alignmentSeqInfo]
    )

    useEffect(
        () => {
            console.log(`AlignmentResult updated.`)

            if(alignmentResult){
                console.log(`AlignmentResult updated to: ${alignmentResult}`)
            }

        }, [alignmentResult]
    )

    return (
        <div className="agr-page-section">
            <div className="agr-page-header">
                <h1>Alignment Results</h1>
            </div>

            {/* Results Summary Panel — collapsible with inline stats.
                Hidden when results could not be loaded: its green check would
                suggest success next to the error. */}
            {!loadError && (() => {
                const seqCount = alignmentSeqInfo ? Object.keys(alignmentSeqInfo).length : 0;
                const alnLength = alignmentResult ? (alignmentResult.split('\n').find(l => l && !l.startsWith('>'))?.length || 0) : 0;
                let variantCount = 0;
                if (alignmentSeqInfo) {
                    for (const info of Object.values(alignmentSeqInfo)) {
                        variantCount += info.embedded_variants?.length || 0;
                    }
                }
                return (
                    <details open={false} style={{ marginBottom: '0.75rem' }}>
                        <summary style={{
                            cursor: 'pointer',
                            padding: '0.75rem 1rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--agr-gray-800)',
                            userSelect: 'none',
                            listStyle: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: 'linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)',
                            border: '1px solid var(--agr-gray-200)',
                            borderRadius: '8px',
                            WebkitAppearance: 'none',
                        }}>
                            <i className="pi pi-check-circle" style={{ color: 'var(--agr-success)', fontSize: '1.1rem' }} />
                            <span>Alignment Results</span>
                            {seqCount > 0 && (
                                <span style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--agr-gray-600)' }}>
                                    <span>{seqCount} sequences</span>
                                    <span style={{ color: 'var(--agr-gray-300)' }}>|</span>
                                    <span>{alnLength} aa</span>
                                    {variantCount > 0 && (<>
                                        <span style={{ color: 'var(--agr-gray-300)' }}>|</span>
                                        <span>{variantCount} variants</span>
                                    </>)}
                                </span>
                            )}
                            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--agr-gray-400)' }}>
                                Click to expand
                            </span>
                        </summary>
                        <ResultsSummary
                            jobId={props.uuidStr}
                            alignmentResult={alignmentResult}
                            seqInfoDict={alignmentSeqInfo}
                            isLoading={isLoading}
                            completedAt={loadedAt}
                            onDownload={alignmentResult ? handleDownload : undefined}
                            onShare={handleShare}
                            onEdit={canEditSequences ? handleEditSequences : undefined}
                        />
                    </details>
                );
            })()}

            {seqFailures && seqFailures.size > 0 && (
                <div className="agr-card agr-card-warning">
                    <FailureDisplay failureList={seqFailures} />
                </div>
            )}

            <div className="agr-card">
                <div className="agr-card-header">
                    <div className="agr-result-header">
                        <h2>Protein Sequence Alignment</h2>
                        <div className="agr-display-mode-selector" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <label htmlFor="display-mode">Display mode: </label>
                            <Dropdown id="display-mode"
                                value={displayMode} onChange={(e) => changeDisplayMode(e.value)}
                                options={displayModeOptions}
                                optionLabel='label'
                                className="agr-dropdown-sm"/>
                            <Menu model={downloadMenuItems} popup ref={downloadMenuRef} id="download-menu" />
                            <Button
                                type="button"
                                label="Export"
                                icon="pi pi-download"
                                iconPos="left"
                                size="small"
                                outlined
                                tooltip="Export this job (JSON, FASTA, variants CSV, or SQLite)"
                                tooltipOptions={{ position: 'top' }}
                                aria-haspopup
                                aria-controls="download-menu"
                                onClick={(e) => downloadMenuRef.current?.toggle(e)}
                                disabled={isLoading || !!loadError || !alignmentResult}
                            />
                            <Button
                                type="button"
                                label="Publication figure"
                                icon="pi pi-image"
                                iconPos="left"
                                size="small"
                                outlined
                                tooltip="Build a publication-quality SVG figure of this alignment"
                                tooltipOptions={{ position: 'top' }}
                                onClick={() => setFigureDialogVisible(true)}
                                disabled={isLoading || !!loadError || !alignmentResult}
                            />
                        </div>
                    </div>
                </div>
                <div className="agr-card-body">
                    <div
                        className="agr-alignment-viewer"
                        role="region"
                        aria-label="Alignment viewer"
                        aria-busy={isLoading}
                    >
                        {/* Accessible status announcements */}
                        <div
                            role="status"
                            aria-live="polite"
                            aria-atomic="true"
                            className="sr-only"
                        >
                            {isLoading && 'Loading alignment results...'}
                            {!isLoading && alignmentResult && 'Alignment results loaded successfully.'}
                            {!isLoading && loadError && `${loadError.title}: ${loadError.message}`}
                        </div>

                        {isLoading ? (
                            <AlignmentSkeleton rows={10} aria-label="Loading alignment results..." />
                        ) : loadError ? (
                            <div className="agr-empty-state">
                                <i className="pi pi-exclamation-circle" style={{ fontSize: '3rem', color: 'var(--agr-error)' }} aria-hidden="true"></i>
                                <h3>{loadError.title}</h3>
                                <p style={{ maxWidth: '40rem', overflowWrap: 'anywhere' }}>{loadError.message}</p>
                                {loadError.kind === 'running' ? (
                                    <button
                                        className="p-button p-button-outlined"
                                        onClick={() => router.push(`/progress?uuid=${props.uuidStr}`)}
                                        style={{ marginTop: '1rem' }}
                                    >
                                        <i className="pi pi-spinner" style={{ marginRight: '0.5rem' }}></i>
                                        View progress
                                    </button>
                                ) : loadError.kind === 'failed' ? (
                                    <button
                                        className="p-button p-button-outlined"
                                        onClick={() => router.push('/submit')}
                                        style={{ marginTop: '1rem' }}
                                    >
                                        <i className="pi pi-plus" style={{ marginRight: '0.5rem' }}></i>
                                        Submit a new job
                                    </button>
                                ) : (
                                    <button
                                        className="p-button p-button-outlined"
                                        onClick={() => getAlignmentResult()}
                                        style={{ marginTop: '1rem' }}
                                    >
                                        <i className="pi pi-refresh" style={{ marginRight: '0.5rem' }}></i>
                                        Try Again
                                    </button>
                                )}
                            </div>
                        ) : alignmentResult ? (
                            <>
                                {displayMode === 'virtualized' && <VirtualizedAlignment alignmentResult={alignmentResult} seqInfoDict={alignmentSeqInfo} jobUuid={props.uuidStr} />}
                                {displayMode === 'interactive' && <InteractiveAlignment alignmentResult={alignmentResult} seqInfoDict={alignmentSeqInfo} />}
                                {displayMode === 'text' && <TextAlignment alignmentResult={alignmentResult} />}
                            </>
                        ) : (
                            <div className="agr-empty-state">
                                <i className="pi pi-inbox" style={{ fontSize: '3rem', color: 'var(--agr-gray-400)' }} aria-hidden="true"></i>
                                <h3>No Alignment Data</h3>
                                <p>No alignment results are available for this job.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <PublicationFigureDialog
                visible={figureDialogVisible}
                onHide={() => setFigureDialogVisible(false)}
                alignmentResult={alignmentResult}
                seqInfo={alignmentSeqInfo}
                jobId={props.uuidStr}
            />
        </div>
    )
}
