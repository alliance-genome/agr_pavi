import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import MSAComponent from '../../InteractiveAlignment/nightingale/MSA';

describe('Nightingale MSA Component', () => {
    const mockAlignmentData = [
        {name: 'seq1', sequence: 'ACGT'},
        {name: 'seq2', sequence: 'A-GT'},
        {name: 'seq3', sequence: 'ACG-'}
    ];

    test('renders without crashing', () => {
        const {container} = render(<MSAComponent data={mockAlignmentData} />);
        const nightingaleMSA = container.querySelector('nightingale-msa')
        expect(nightingaleMSA).not.toBeNull()  // Expect nightingale-msa to be rendered
    });

});
