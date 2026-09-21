import React from 'react';
import { render } from '@testing-library/react';
import { expect } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock lit elements, because jest otherwise trips over @lit/react
jest.mock('@lit/react', () => {
    return {
        LitElement: class LitElement {
            render() {
                return null
            }
        },
        createComponent: () => () => (<div></div>)
    }
})

jest.mock('@nightingale-elements/nightingale-navigation', () => jest.fn());
jest.mock('@nightingale-elements/nightingale-msa', () => jest.fn());
jest.mock('@nightingale-elements/nightingale-manager', () => jest.fn());

import InteractiveAlignment from '../InteractiveAlignment/InteractiveAlignment';

describe('InteractiveAlignment Component', () => {
    const mockAlignmentResult = `CLUSTAL O(1.2.4) multiple sequence alignment

seq1        PRTL        4
seq2        P-TL        3
seq3        PKT-        3
`;

    const mockSeqInfoDict = {
        'seq1': {
            'embedded_variants': [
                {
                    'alignment_start_pos': 4,
                    'alignment_end_pos': 4,
                    'seq_start_pos': 4,
                    'seq_end_pos': 4,
                    'embedded_ref_seq_len': 1,
                    'embedded_alt_seq_len': 1,
                    'variant_id': 'mock:variant1',
                    'seq_length': 1,
                    'genomic_seq_id': 'chrX',
                    'genomic_start_pos': 1,
                    'genomic_end_pos': 1,
                    'genomic_ref_seq': 'N',
                    'genomic_alt_seq': 'N',
                    'seq_substitution_type': 'substitution'
                }
            ]
        },
        'seq2': {},
        'seq3': {},
    }

    test('renders without crashing', () => {
        const {container} = render(<InteractiveAlignment alignmentResult={mockAlignmentResult} seqInfoDict={mockSeqInfoDict} />);
        expect(container.querySelector('#dd-colorscheme')).toBeInTheDocument();
    });

    test('displays the correct initial color scheme', () => {
        const {container} = render(<InteractiveAlignment alignmentResult={mockAlignmentResult} seqInfoDict={mockSeqInfoDict} />);
        const colorSchemeDefault = container.querySelector('#dd-colorscheme option[selected]')
        expect(colorSchemeDefault).toHaveValue('clustal2');
    });

});

describe('molecular_consequences filter logic', () => {
    const missenseVariant = {
        alignment_start_pos: 1, alignment_end_pos: 1,
        seq_start_pos: 1, seq_end_pos: 1, seq_length: 1,
        variant_id: 'var:missense', genomic_seq_id: 'chr1',
        genomic_start_pos: 100, genomic_end_pos: 100,
        genomic_ref_seq: 'A', genomic_alt_seq: 'T',
        seq_substitution_type: 'substitution',
        molecular_consequences: ['missense_variant']
    };

    const frameshiftVariant = {
        alignment_start_pos: 2, alignment_end_pos: 2,
        seq_start_pos: 2, seq_end_pos: 2, seq_length: 1,
        variant_id: 'var:frameshift', genomic_seq_id: 'chr1',
        genomic_start_pos: 200, genomic_end_pos: 200,
        genomic_ref_seq: 'C', genomic_alt_seq: '-',
        seq_substitution_type: 'deletion',
        molecular_consequences: ['frameshift_variant']
    };

    const multiConsequenceVariant = {
        alignment_start_pos: 3, alignment_end_pos: 3,
        seq_start_pos: 3, seq_end_pos: 3, seq_length: 1,
        variant_id: 'var:multi', genomic_seq_id: 'chr1',
        genomic_start_pos: 300, genomic_end_pos: 300,
        genomic_ref_seq: 'G', genomic_alt_seq: 'T',
        seq_substitution_type: 'substitution',
        molecular_consequences: ['missense_variant', 'stop_gained']
    };

    const noConsequenceVariant = {
        alignment_start_pos: 4, alignment_end_pos: 4,
        seq_start_pos: 4, seq_end_pos: 4, seq_length: 1,
        variant_id: 'var:none', genomic_seq_id: 'chr1',
        genomic_start_pos: 400, genomic_end_pos: 400,
        genomic_ref_seq: 'T', genomic_alt_seq: 'A',
        seq_substitution_type: 'substitution'
    };

    const allVariants = [missenseVariant, frameshiftVariant, multiConsequenceVariant, noConsequenceVariant];

    const applyFilter = (filter: Set<string>, variant: typeof missenseVariant) =>
        filter.size === 0 || variant.molecular_consequences?.some(mc => filter.has(mc));

    test('empty filter passes all variants', () => {
        const filter = new Set<string>();
        const results = allVariants.filter(v => applyFilter(filter, v));
        expect(results).toHaveLength(4);
    });

    test('filter on missense_variant matches missense and multi-consequence variants', () => {
        const filter = new Set(['missense_variant']);
        const results = allVariants.filter(v => applyFilter(filter, v));
        expect(results).toHaveLength(2);
        expect(results.map(v => v.variant_id)).toEqual(
            expect.arrayContaining(['var:missense', 'var:multi'])
        );
    });

    test('filter on frameshift_variant matches only the frameshift variant', () => {
        const filter = new Set(['frameshift_variant']);
        const results = allVariants.filter(v => applyFilter(filter, v));
        expect(results).toHaveLength(1);
        expect(results[0].variant_id).toBe('var:frameshift');
    });

    test('filter with multiple consequences uses OR logic', () => {
        const filter = new Set(['missense_variant', 'frameshift_variant']);
        const results = allVariants.filter(v => applyFilter(filter, v));
        expect(results).toHaveLength(3);
        expect(results.map(v => v.variant_id)).toEqual(
            expect.arrayContaining(['var:missense', 'var:frameshift', 'var:multi'])
        );
    });

    test('filter on stop_gained matches only multi-consequence variant', () => {
        const filter = new Set(['stop_gained']);
        const results = allVariants.filter(v => applyFilter(filter, v));
        expect(results).toHaveLength(1);
        expect(results[0].variant_id).toBe('var:multi');
    });

    test('filter excludes variants with no molecular_consequences field', () => {
        const filter = new Set(['missense_variant']);
        const results = allVariants.filter(v => applyFilter(filter, v));
        expect(results.map(v => v.variant_id)).not.toContain('var:none');
    });
});
