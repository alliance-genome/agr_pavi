'use client';

import type { JobHistoryEntry } from '../hooks/useJobHistory';

export interface JobExportData {
    version: string;
    exportedAt: string;
    job: {
        id: string;
        status: string;
        title?: string;
        submittedAt: string;
        completedAt?: string;
        duration?: number;
        genes: string[];
        transcriptCount: number;
        error?: string;
    };
    alignment?: {
        format: string;
        content: string;
        sequenceCount: number;
        alignmentLength: number;
    };
    logs?: string[];
    metadata?: {
        pipelineVersion?: string;
        alignmentTool?: string;
        parameters?: Record<string, unknown>;
    };
}

export interface ExportFileInfo {
    filename: string;
    content: string | Blob;
    mimeType: string;
}

/**
 * Parse FASTA content into sequence objects
 */
export function parseFasta(fastaContent: string): Array<{
    id: string;
    description: string;
    sequence: string;
}> {
    const lines = fastaContent.split('\n');
    const sequences: Array<{ id: string; description: string; sequence: string }> = [];
    let currentId = '';
    let currentDesc = '';
    let currentSeq = '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) {
            if (currentId && currentSeq) {
                sequences.push({
                    id: currentId,
                    description: currentDesc,
                    sequence: currentSeq,
                });
            }
            const header = trimmed.substring(1);
            const parts = header.split(' ');
            currentId = parts[0];
            currentDesc = parts.slice(1).join(' ');
            currentSeq = '';
        } else if (trimmed) {
            currentSeq += trimmed;
        }
    }

    if (currentId && currentSeq) {
        sequences.push({
            id: currentId,
            description: currentDesc,
            sequence: currentSeq,
        });
    }

    return sequences;
}

/**
 * Convert FASTA to Clustal format
 */
export function fastaToClusal(fastaContent: string): string {
    const sequences = parseFasta(fastaContent);
    if (sequences.length === 0) return '';

    let output = 'CLUSTAL W (1.83) multiple sequence alignment\n\n';
    const maxNameLen = Math.max(...sequences.map(s => s.id.length), 10);
    const blockSize = 60;
    const seqLen = sequences[0]?.sequence.length || 0;

    for (let i = 0; i < seqLen; i += blockSize) {
        for (const seq of sequences) {
            const block = seq.sequence.substring(i, i + blockSize);
            output += `${seq.id.padEnd(maxNameLen + 4)}${block}\n`;
        }
        output += '\n';
    }

    return output;
}

/**
 * Convert FASTA to PHYLIP format
 */
export function fastaToPhylip(fastaContent: string): string {
    const sequences = parseFasta(fastaContent);
    if (sequences.length === 0) return '';

    const seqLen = sequences[0]?.sequence.length || 0;
    let output = ` ${sequences.length} ${seqLen}\n`;

    for (const seq of sequences) {
        const name = seq.id.substring(0, 10).padEnd(10);
        output += `${name} ${seq.sequence}\n`;
    }

    return output;
}

/**
 * Create full job export data
 */
export function createJobExportData(
    jobHistory: JobHistoryEntry | undefined,
    alignmentResult?: string,
    logs?: string[],
    metadata?: Record<string, unknown>
): JobExportData {
    const sequences = alignmentResult ? parseFasta(alignmentResult) : [];

    return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        job: {
            id: jobHistory?.uuid || 'unknown',
            status: jobHistory?.status || 'unknown',
            title: jobHistory?.title,
            submittedAt: jobHistory?.submittedAt || new Date().toISOString(),
            completedAt: jobHistory?.completedAt,
            duration: jobHistory?.duration,
            genes: jobHistory?.genes || [],
            transcriptCount: jobHistory?.transcriptCount || 0,
            error: jobHistory?.error,
        },
        alignment: alignmentResult ? {
            format: 'fasta',
            content: alignmentResult,
            sequenceCount: sequences.length,
            alignmentLength: sequences[0]?.sequence.length || 0,
        } : undefined,
        logs,
        metadata: metadata as JobExportData['metadata'],
    };
}

/**
 * Download a file in the browser
 */
export function downloadFile(filename: string, content: string | Blob, mimeType: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export job data as JSON
 */
export function exportJobAsJson(
    jobHistory: JobHistoryEntry | undefined,
    alignmentResult?: string,
    logs?: string[],
    metadata?: Record<string, unknown>
): void {
    const data = createJobExportData(jobHistory, alignmentResult, logs, metadata);
    const json = JSON.stringify(data, null, 2);
    const jobId = jobHistory?.uuid?.slice(0, 8) || 'job';
    downloadFile(`pavi-job-${jobId}.json`, json, 'application/json');
}

/**
 * Create a ZIP archive containing all export formats
 * Uses JSZip library (must be installed)
 */
export async function createZipArchive(
    jobHistory: JobHistoryEntry | undefined,
    alignmentResult?: string,
    logs?: string[],
    metadata?: Record<string, unknown>
): Promise<Blob> {
    // Dynamic import of JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const jobId = jobHistory?.uuid?.slice(0, 8) || 'job';
    const folder = zip.folder(`pavi-job-${jobId}`);

    if (!folder) {
        throw new Error('Failed to create ZIP folder');
    }

    // Add job metadata as JSON
    const exportData = createJobExportData(jobHistory, alignmentResult, logs, metadata);
    folder.file('job-data.json', JSON.stringify(exportData, null, 2));

    // Add alignment in multiple formats
    if (alignmentResult) {
        folder.file('alignment.fasta', alignmentResult);
        folder.file('alignment.aln', fastaToClusal(alignmentResult));
        folder.file('alignment.phy', fastaToPhylip(alignmentResult));

        // Also add sequences-only JSON
        const sequences = parseFasta(alignmentResult);
        folder.file('sequences.json', JSON.stringify(sequences, null, 2));
    }

    // Add logs if available
    if (logs && logs.length > 0) {
        folder.file('logs.txt', logs.join('\n'));
    }

    // Add a README
    const readme = `PAVI Job Export
===============

Job ID: ${jobHistory?.uuid || 'unknown'}
Exported: ${new Date().toISOString()}
Status: ${jobHistory?.status || 'unknown'}

Files included:
- job-data.json: Complete job metadata and results
${alignmentResult ? `- alignment.fasta: Alignment in FASTA format
- alignment.aln: Alignment in Clustal format
- alignment.phy: Alignment in PHYLIP format
- sequences.json: Parsed sequences as JSON` : ''}
${logs?.length ? '- logs.txt: Processing logs' : ''}

Generated by PAVI (Proteins Annotations and Variants Inspector)
https://alliancegenome.org
`;
    folder.file('README.txt', readme);

    return await zip.generateAsync({ type: 'blob' });
}

/**
 * Export job as ZIP archive
 */
export async function exportJobAsZip(
    jobHistory: JobHistoryEntry | undefined,
    alignmentResult?: string,
    logs?: string[],
    metadata?: Record<string, unknown>
): Promise<void> {
    const blob = await createZipArchive(jobHistory, alignmentResult, logs, metadata);
    const jobId = jobHistory?.uuid?.slice(0, 8) || 'job';
    downloadFile(`pavi-job-${jobId}.zip`, blob, 'application/zip');
}
