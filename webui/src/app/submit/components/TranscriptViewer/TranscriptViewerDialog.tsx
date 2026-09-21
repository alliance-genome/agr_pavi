'use client';

import React, { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import dynamic from 'next/dynamic';
import { GeneInfo } from '../AlignmentEntry/types';

// genomefeatures / D3 must not be server-rendered.
const GenomeFeatureView = dynamic(() => import('./GenomeFeatureView'), {
    ssr: false,
});

export interface TranscriptViewerDialogProps {
    readonly visible: boolean;
    readonly gene: GeneInfo | undefined;
    readonly release: string;
    readonly onHide: () => void;
}

export function TranscriptViewerDialog({
    visible,
    gene,
    release,
    onHide,
}: TranscriptViewerDialogProps) {
    const [error, setError] = useState<string | null>(null);

    // Reset the error whenever the dialog is (re)opened or the gene changes.
    useEffect(() => {
        setError(null);
    }, [visible, gene]);

    const header = gene ? `Transcripts — ${gene.symbol}` : 'Transcripts';

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={header}
            modal
            dismissableMask
            style={{ width: '950px', maxWidth: '95vw' }}
        >
            {visible && gene ? (
                error ? (
                    <div>
                        Could not load the transcript view.{' '}
                        <a
                            href={`https://www.alliancegenome.org/gene/${gene.id}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            View on Alliance
                        </a>
                        .
                    </div>
                ) : (
                    // Genes with many isoforms produce a tall SVG; scroll it
                    // within the dialog rather than letting the dialog grow
                    // past the viewport.
                    <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
                        <GenomeFeatureView gene={gene} release={release} onError={setError} />
                    </div>
                )
            ) : null}
        </Dialog>
    );
}
