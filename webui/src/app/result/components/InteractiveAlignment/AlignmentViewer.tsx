'use client';

import React, { useMemo } from 'react';
import { AlignmentViewer as AV2, Alignment } from 'alignment-viewer-2';
import 'alignment-viewer-2/dist/js/index.css';

export interface AlignmentViewerProps {
    readonly alignmentResult: string;  // CLUSTAL format string
    readonly height?: number;
}

interface ParsedSequence {
    id: string;
    sequence: string;
}

/**
 * Parse CLUSTAL format alignment into sequences
 */
function parseClustalFormat(clustalText: string): ParsedSequence[] {
    const lines = clustalText.split('\n');
    const sequences: Map<string, string> = new Map();

    for (const line of lines) {
        // Skip header line (starts with CLUSTAL)
        if (line.startsWith('CLUSTAL') || line.trim() === '') {
            continue;
        }

        // Skip conservation line (contains only spaces, *, :, .)
        if (/^[\s*:.]+$/.test(line)) {
            continue;
        }

        // Parse sequence line: "sequence_name    SEQUENCE"
        const match = line.match(/^(\S+)\s+([A-Za-z-]+)/);
        if (match) {
            const [, name, seq] = match;
            const existing = sequences.get(name) || '';
            sequences.set(name, existing + seq);
        }
    }

    return Array.from(sequences.entries()).map(([id, sequence]) => ({
        id,
        sequence
    }));
}

/**
 * Convert CLUSTAL format to FASTA format
 */
function clustalToFasta(clustalText: string): string {
    const sequences = parseClustalFormat(clustalText);
    return sequences.map(seq => `>${seq.id}\n${seq.sequence}`).join('\n');
}

export const AlignmentViewerComponent: React.FC<AlignmentViewerProps> = ({
    alignmentResult,
    height = 500,
}) => {
    // Parse CLUSTAL and create alignment object
    const alignment = useMemo(() => {
        if (!alignmentResult) return null;

        try {
            const sequences = parseClustalFormat(alignmentResult);
            if (sequences.length === 0) {
                console.warn('No sequences found in alignment');
                return null;
            }

            return new Alignment({
                name: 'Protein Alignment',
                sequencesAsInput: sequences,
                removeDuplicateSequences: false,
            });
        } catch (error) {
            console.error('Failed to parse alignment:', error);
            return null;
        }
    }, [alignmentResult]);

    if (!alignmentResult) {
        return <div>No alignment data available</div>;
    }

    if (!alignment) {
        return <div>Failed to parse alignment data</div>;
    }

    return (
        <div style={{ width: '100%', height: `${height}px` }}>
            <AV2
                alignment={alignment}
                showMinimap={true}
                showConsensus={true}
                showLogo={true}
                showRuler={true}
                zoomLevel={1}
            />
        </div>
    );
};

export default AlignmentViewerComponent;
