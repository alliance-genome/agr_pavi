'use client';

import React from 'react';
import { SkippedRow } from './types';

export interface BulkUploadReportProps {
    readonly loaded: number;
    readonly skipped: SkippedRow[];
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
                        <summary>Skipped rows</summary>
                        <ul>
                            {skipped.map((s) => (
                                <li key={s.lineNumber}>
                                    Line {s.lineNumber}: {s.raw.symbol || '(no symbol)'} — {s.reason}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>
        </div>
    );
}
