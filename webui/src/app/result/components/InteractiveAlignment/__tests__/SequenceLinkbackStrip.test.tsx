import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect } from '@jest/globals';
import '@testing-library/jest-dom';

import { SequenceLinkbackStrip } from '../SequenceLinkbackStrip';
import type { SeqInfoDict } from '../types';

const EV = (gene_id: string) => ([{
    gene_id,
    alignment_start_pos: 1, alignment_end_pos: 1, seq_start_pos: 1, seq_end_pos: 1, seq_length: 3,
    variant_id: 'v1', genomic_seq_id: 'x', genomic_start_pos: 1, genomic_end_pos: 1,
    genomic_ref_seq: 'A', genomic_alt_seq: 'T', seq_substitution_type: 'SNV',
}]);

const SEQ_INFO: SeqInfoDict = {
    'ADCY3_ENST00000679454.1_ref':      { species: 'Homo sapiens', embedded_variants: EV('HGNC:234') },
    'Adcy3_ENSRNOT00000005389.8_ref':   { species: 'Rattus norvegicus', embedded_variants: EV('RGD:71009') },
    'Adcy3_ENSMUST00000127756':         { species: 'Mus musculus' },
    'Ac3_FB:FBtr0085897':               { species: 'Drosophila melanogaster' },
};

const ALN_DATA = [
    { name: 'ADCY3_ENST00000679454.1_ref',    sequence: 'MAE' },
    { name: 'Adcy3_ENSRNOT00000005389.8_ref', sequence: 'MAE' },
    { name: 'Adcy3_ENSMUST00000127756',       sequence: 'MAE' },
    { name: 'Ac3_FB:FBtr0085897',             sequence: 'KKK' },
];

describe('SequenceLinkbackStrip', () => {
    test('renders a chip per sequence with a label, transcript and species', () => {
        render(<SequenceLinkbackStrip seqInfoDict={SEQ_INFO} alignmentData={ALN_DATA} />);
        expect(screen.getByText(/Sequences:/)).toBeInTheDocument();
        expect(screen.getAllByText('ADCY3').length).toBe(1);
        expect(screen.getAllByText('Adcy3').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText(/Mus musculus/)).toBeInTheDocument();
        expect(screen.getByText(/Drosophila melanogaster/)).toBeInTheDocument();
    });

    test('ADCY3 chip is an anchor to the Alliance gene page when a curie resolves', () => {
        render(<SequenceLinkbackStrip seqInfoDict={SEQ_INFO} alignmentData={ALN_DATA} />);
        const adcy3 = screen.getByRole('link', { name: 'ADCY3' });
        expect(adcy3).toHaveAttribute('href', expect.stringMatching(/\/gene\/HGNC%3A234$/));
        expect(adcy3).toHaveAttribute('target', '_blank');
    });

    test('rows without their own gene_id still link via sibling-symbol propagation', () => {
        render(<SequenceLinkbackStrip seqInfoDict={SEQ_INFO} alignmentData={ALN_DATA} />);
        // Mouse Adcy3 has no gene_id of its own but shares the "Adcy3" symbol
        // with the rat row (RGD:71009).
        const adcy3Links = screen.getAllByRole('link', { name: 'Adcy3' });
        expect(adcy3Links.length).toBeGreaterThanOrEqual(2);
        for (const a of adcy3Links) {
            expect(a).toHaveAttribute('href', expect.stringMatching(/\/gene\/RGD%3A71009$/));
        }
    });

    test('rows with no resolvable curie stay as plain text', () => {
        render(<SequenceLinkbackStrip seqInfoDict={SEQ_INFO} alignmentData={ALN_DATA} />);
        // Dme Ac3 has no gene_id anywhere; the chip should render but not as a link.
        const ac3 = screen.getByText('Ac3');
        expect(ac3.tagName).not.toBe('A');
    });

    test('renders nothing when the alignment is empty', () => {
        const { container } = render(<SequenceLinkbackStrip seqInfoDict={{}} alignmentData={[]} />);
        expect(container.firstChild).toBeNull();
    });
});
