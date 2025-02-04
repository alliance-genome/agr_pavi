import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InteractiveAlignment from '../InteractiveAlignment/InteractiveAlignment';

describe('InteractiveAlignment Component', () => {
    const mockAlignmentResult = `
        CLUSTAL O(1.2.4) multiple sequence alignment

        seq1        ACGT
        seq2        A-GT
        seq3        ACG-
    `;

    test('renders without crashing', () => {
        render(<InteractiveAlignment alignmentResult={mockAlignmentResult} />);
        expect(screen.getByTestId('dd-colorscheme')).toBeInTheDocument();
    });

    test('displays the correct initial color scheme', () => {
        render(<InteractiveAlignment alignmentResult={mockAlignmentResult} />);
        expect(screen.getByTestId('dd-colorscheme')).toHaveValue('clustal2');
    });

    test('updates color scheme on selection change', () => {
        render(<InteractiveAlignment alignmentResult={mockAlignmentResult} />);
        const dropdown = screen.getByTestId('dd-colorscheme');
        fireEvent.change(dropdown, { target: { value: 'conservation' } });
        expect(dropdown).toHaveValue('conservation');
    });

    test('renders Nightingale components', () => {
        const {container} = render(<InteractiveAlignment alignmentResult={mockAlignmentResult} />);
        const nightingaleMSA = container.querySelector('nightingale-msa')
        expect(nightingaleMSA).not.toBeNull()  // Expect nightingale-msa to be rendered
        // Check that the sequences names are rendered and visible
        const nightingaleMSALabels = container.querySelector('nightingale-msa.msa-labels')
        expect(nightingaleMSALabels).toContain('seq1');
        expect(nightingaleMSALabels).toContain('seq2');
        expect(nightingaleMSALabels).toContain('seq3');
        expect(screen.getByText('seq1')).toBeVisible();
        expect(screen.getByText('seq2')).toBeVisible();
        expect(screen.getByText('seq3')).toBeVisible();
    });

    test('calls saveDisplayRange on display-start or display-end change', () => {
        const consoleSpy = jest.spyOn(console, 'log');
        render(<InteractiveAlignment alignmentResult={mockAlignmentResult} />);
        const nightingaleNavigation = screen.getByRole('navigation');
        fireEvent.change(nightingaleNavigation, { target: { attributes: { 'display-start': 2, 'display-end': 4 } } });
        expect(consoleSpy).toHaveBeenCalledWith('Display start or end change detected.');
        consoleSpy.mockRestore();
    });
});
