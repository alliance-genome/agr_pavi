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
