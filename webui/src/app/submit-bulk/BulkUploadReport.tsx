'use client';

import React from 'react';
import { Button } from 'primereact/button';
import { SkippedRow } from './types';

export interface BulkUploadReportProps {
    readonly loaded: number;
    readonly skipped: SkippedRow[];
}

const SKIPPED_CSV_HEADERS = [
    'line_number',
    'gene_id',
    'species',
    'gene_symbol',
    'transcript',
    'variants',
    'skip_reason',
];

// RFC 4180 cell: wrap in quotes if the cell has ',' / '"' / '\n', doubling
// any inner '"'. Everything else stays unquoted so the file stays readable.
function csvCell(value: string): string {
    if (/[",\r\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function buildSkippedCsv(skipped: SkippedRow[]): string {
    const rows = [SKIPPED_CSV_HEADERS.join(',')];
    for (const s of skipped) {
        rows.push(
            [
                String(s.lineNumber),
                s.raw.geneId ?? '',
                s.raw.species,
                s.raw.symbol,
                s.raw.transcript ?? '',
                s.raw.variants.join(';'),
                s.reason,
            ]
                .map(csvCell)
                .join(',')
        );
    }
    return rows.join('\n') + '\n';
}

function downloadSkippedCsv(skipped: SkippedRow[]) {
    const blob = new Blob([buildSkippedCsv(skipped)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pavi-bulk-skipped.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function BulkUploadReport({ loaded, skipped }: BulkUploadReportProps) {
    if (loaded === 0 && skipped.length === 0) {
        return null;
    }
    return (
        <div className="agr-card" style={{ marginBottom: '1rem' }}>
            <div className="agr-card-body">
                <p>
                    Loaded <strong>{loaded}</strong> gene{loaded === 1 ? '' : 's'}
                    {skipped.length > 0 ? <> · skipped {skipped.length} row{skipped.length === 1 ? '' : 's'}</> : null}.
                </p>
                {skipped.length > 0 && (
                    <details>
                        <summary style={{ cursor: 'pointer' }}>
                            Skipped rows
                            <Button
                                type="button"
                                label="Download skipped as CSV"
                                icon="pi pi-download"
                                className="p-button-text p-button-sm"
                                style={{ marginLeft: '0.75rem' }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    downloadSkippedCsv(skipped);
                                }}
                            />
                        </summary>
                        <ul>
                            {skipped.map((s) => (
                                <li key={s.lineNumber}>
                                    Line {s.lineNumber}: {s.raw.geneId || s.raw.symbol || '(no symbol)'} — {s.reason}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>
        </div>
    );
}
