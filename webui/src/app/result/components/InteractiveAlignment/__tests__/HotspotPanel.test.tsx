import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect } from '@jest/globals';
import '@testing-library/jest-dom';

import { HotspotPanel } from '../HotspotPanel';
import type { SeqInfoDict } from '../types';

const SEQ = 'MAE' + '-'.repeat(27);  // 30-column alignment

describe('HotspotPanel', () => {
    it('renders the legend and a density cell per alignment column', () => {
        const seqInfoDict: SeqInfoDict = {
            s1: {
                embedded_variants: [
                    {
                        alignment_start_pos: 5,
                        alignment_end_pos: 5,
                        seq_start_pos: 5,
                        seq_end_pos: 5,
                        seq_length: 30,
                        variant_id: 'v1',
                        genomic_seq_id: 'x', genomic_start_pos: 1, genomic_end_pos: 1,
                        genomic_ref_seq: 'A', genomic_alt_seq: 'T',
                        seq_substitution_type: 'SNV',
                        impact: 'HIGH',
                    },
                ],
            },
        };
        render(
            <HotspotPanel
                alignmentData={[{ name: 's1', sequence: SEQ }]}
                seqInfoDict={seqInfoDict}
            />,
        );
        // Legend labels appear
        expect(screen.getByText('high impact')).toBeInTheDocument();
        expect(screen.getByText('moderate impact')).toBeInTheDocument();
        // Count chip reflects the one variant
        expect(screen.getByText('(1)')).toBeInTheDocument();
        // One bar per column, 30 columns
        expect(screen.getByTestId('hotspot-col-1')).toBeInTheDocument();
        expect(screen.getByTestId('hotspot-col-30')).toBeInTheDocument();
    });

    it('renders no density strip when there are no variants, just the legend', () => {
        render(
            <HotspotPanel
                alignmentData={[{ name: 's1', sequence: SEQ }]}
                seqInfoDict={{}}
            />,
        );
        expect(screen.getByText(/no embedded variants/)).toBeInTheDocument();
        // No bars rendered when totalVariants === 0
        expect(screen.queryByTestId('hotspot-col-1')).not.toBeInTheDocument();
    });

    it('renders nothing when the alignment is empty', () => {
        const { container } = render(
            <HotspotPanel alignmentData={[]} seqInfoDict={{}} />,
        );
        expect(container.firstChild).toBeNull();
    });
});
