'use client';

import React, { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { ExampleGene } from '@/app/submit/components/ExampleDataLoader/ExampleDataLoader';
import { JobSubmitForm } from '@/app/submit/components/JobSubmitForm/JobSubmitForm';
import { parseGeneListFile } from './parseGeneListFile';
import { resolveRows } from './resolveRows';
import { BulkUploadReport } from './BulkUploadReport';
import { BulkPreviewTable } from './BulkPreviewTable';
import { buildTemplateCsv, TEMPLATE_FILENAME } from './bulkTemplate';
import { SkippedRow } from './types';

export interface BulkUploadFormProps {
    readonly agrjBrowseDataRelease: string;
}

// 'preview' = resolved, user is editing the list; 'loaded' = user clicked
// "Load into form" and the actual JobSubmitForm is mounted below.
type Status = 'idle' | 'processing' | 'preview' | 'loaded' | 'error';

export function BulkUploadForm({ agrjBrowseDataRelease }: BulkUploadFormProps) {
    const [status, setStatus] = useState<Status>('idle');
    const [fileError, setFileError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [entries, setEntries] = useState<ExampleGene[]>([]);
    const [skipped, setSkipped] = useState<SkippedRow[]>([]);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setStatus('processing');
        setFileError(null);
        setEntries([]);
        setSkipped([]);
        setProgress(null);

        const { rows, fileError: parseError } = await parseGeneListFile(file);
        if (parseError) {
            setFileError(parseError);
            setStatus('error');
            return;
        }

        try {
            const result = await resolveRows(rows, {
                onProgress: (done, total) => setProgress({ done, total }),
            });
            setEntries(result.entries);
            setSkipped(result.skipped);
            setStatus('preview');
            setProgress(null);
        } catch {
            setFileError('Something went wrong while resolving genes. Please try again.');
            setStatus('error');
            setProgress(null);
        }
    }

    function removeEntry(geneId: string) {
        setEntries((prev) => prev.filter((e) => e.geneId !== geneId));
    }

    function clearAll() {
        setEntries([]);
        setSkipped([]);
        setFileName(null);
        setFileError(null);
        setStatus('idle');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function downloadTemplate() {
        const blob = new Blob([buildTemplateCsv()], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = TEMPLATE_FILENAME;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div>
            <div className="agr-card" style={{ marginBottom: '1rem' }}>
                <div className="agr-card-body">
                    <p style={{ marginTop: 0, marginBottom: '0.75rem', color: 'var(--agr-text-secondary)' }}>
                        Upload a gene list to populate the alignment below. Columns:{' '}
                        <code>species</code>, <code>gene_symbol</code>, and optional{' '}
                        <code>transcript</code> / <code>variants</code>.
                    </p>
                    {/* The real input stays in the DOM (hidden) so its label
                        association and the id-based tests/E2E keep working; a
                        styled button drives it. */}
                    <label htmlFor="bulk-file" className="sr-only">
                        Gene list file (CSV, TSV, or .xlsx)
                    </label>
                    <input
                        id="bulk-file"
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.tsv,.txt,.xlsx"
                        onChange={handleFile}
                        style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Button
                            type="button"
                            label="Choose file"
                            icon="pi pi-upload"
                            className="p-button-outlined"
                            onClick={() => fileInputRef.current?.click()}
                        />
                        <span style={{ color: 'var(--agr-text-secondary)' }}>
                            {fileName ?? 'CSV, TSV, or .xlsx'}
                        </span>
                        <Button
                            type="button"
                            label="Download template"
                            icon="pi pi-download"
                            className="p-button-text"
                            onClick={downloadTemplate}
                        />
                    </div>
                    {status === 'processing' && (
                        <div style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                            <p style={{ marginTop: 0, marginBottom: '0.25rem' }}>
                                <i className="pi pi-spin pi-spinner" style={{ marginRight: '0.5rem' }} />
                                {progress
                                    ? `Resolving genes… ${progress.done} of ${progress.total}`
                                    : 'Resolving genes…'}
                            </p>
                            {progress && progress.total > 0 && (
                                <div
                                    role="progressbar"
                                    aria-valuenow={progress.done}
                                    aria-valuemin={0}
                                    aria-valuemax={progress.total}
                                    style={{
                                        height: 8,
                                        borderRadius: 4,
                                        background: 'var(--agr-gray-200, #e5e7eb)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${Math.round((progress.done / progress.total) * 100)}%`,
                                            height: '100%',
                                            background: 'var(--agr-primary, #2563eb)',
                                            transition: 'width 150ms ease',
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    {fileError && (
                        <p role="alert" className="agr-message agr-message-error" style={{ marginBottom: 0 }}>
                            {fileError}
                        </p>
                    )}
                </div>
            </div>

            {(status === 'preview' || status === 'loaded') && (
                <BulkUploadReport loaded={entries.length} skipped={skipped} />
            )}

            {status === 'preview' && (
                <BulkPreviewTable
                    entries={entries}
                    onRemove={removeEntry}
                    onLoad={() => setStatus('loaded')}
                    onClear={clearAll}
                />
            )}

            {status === 'loaded' && entries.length > 0 && (
                <JobSubmitForm
                    agrjBrowseDataRelease={agrjBrowseDataRelease}
                    initialGenes={entries}
                    embedded
                />
            )}
        </div>
    );
}
