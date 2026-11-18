'use client';

import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { ExampleGene } from '@/app/submit/components/ExampleDataLoader/ExampleDataLoader';

export interface BulkPreviewTableProps {
    readonly entries: ExampleGene[];
    // eslint-disable-next-line no-unused-vars
    readonly onRemove: (geneId: string) => void;
    readonly onLoad: () => void;
    readonly onClear: () => void;
}

// Pre-submit review table. Keeps the user from accidentally feeding a stale /
// fat gene list into JobSubmitForm — they can trim rows out and confirm the
// shape of each entry (which transcript name, which variant ids) before the
// alignment form actually renders. Minimal and read-only beyond the per-row
// remove action; editing fields in-place would mean duplicating a lot of the
// JobSubmitForm's resolution logic for little gain, since the user can still
// tweak each entry once it's loaded there.
export function BulkPreviewTable({ entries, onRemove, onLoad, onClear }: BulkPreviewTableProps) {
    const rowActions = (row: ExampleGene) => (
        <Button
            type="button"
            icon="pi pi-times"
            className="p-button-text p-button-sm p-button-danger"
            aria-label={`Remove ${row.geneName}`}
            onClick={() => onRemove(row.geneId)}
        />
    );

    const variantsBody = (row: ExampleGene) => {
        const vs = row.alleleIds ?? [];
        if (vs.length === 0) return <span style={{ color: '#9ca3af' }}>—</span>;
        return (
            <span title={vs.join(', ')} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                {vs.length <= 2 ? vs.join(', ') : `${vs.slice(0, 2).join(', ')} +${vs.length - 2}`}
            </span>
        );
    };

    const transcriptBody = (row: ExampleGene) => {
        const ts = row.transcriptNames ?? [];
        if (ts.length === 0) return <span style={{ color: '#9ca3af' }}>canonical</span>;
        return (
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                {ts.join(', ')}
            </span>
        );
    };

    return (
        <div className="agr-card" style={{ marginBottom: '1rem' }}>
            <div className="agr-card-body">
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
                        Preview&nbsp;<span style={{ color: '#6b7280', fontWeight: 400 }}>
                            ({entries.length} gene{entries.length === 1 ? '' : 's'})
                        </span>
                    </h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button
                            type="button"
                            label="Clear"
                            icon="pi pi-undo"
                            className="p-button-text p-button-sm"
                            onClick={onClear}
                        />
                        <Button
                            type="button"
                            label={`Load ${entries.length} into form`}
                            icon="pi pi-arrow-down"
                            className="p-button-sm"
                            disabled={entries.length === 0}
                            onClick={onLoad}
                        />
                    </div>
                </div>
                <DataTable
                    value={entries}
                    dataKey="geneId"
                    size="small"
                    stripedRows
                    emptyMessage="No entries left — upload another file or clear to start over."
                    paginator={entries.length > 25}
                    rows={25}
                >
                    <Column field="species" header="Species" sortable />
                    <Column field="geneName" header="Gene" sortable />
                    <Column
                        field="geneId"
                        header="ID"
                        body={(r: ExampleGene) => (
                            <code style={{ fontSize: '0.75rem' }}>{r.geneId}</code>
                        )}
                    />
                    <Column header="Transcript" body={transcriptBody} />
                    <Column header="Variants" body={variantsBody} />
                    <Column body={rowActions} style={{ width: '3rem' }} />
                </DataTable>
            </div>
        </div>
    );
}
