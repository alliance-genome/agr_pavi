import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

seq1        ACGT        4
seq2        A-GT        3
seq3        ACG-        3
`;

    test('renders without crashing', () => {
        const {container} = render(<InteractiveAlignment alignmentResult={mockAlignmentResult} />);
        expect(container.querySelector('#dd-colorscheme')).toBeInTheDocument();
    });

    test('displays the correct initial color scheme', () => {
        const {container} = render(<InteractiveAlignment alignmentResult={mockAlignmentResult} />);
        const colorSchemeDefault = container.querySelector('#dd-colorscheme option[selected]')
        expect(colorSchemeDefault).toHaveValue('clustal2');
    });

});
