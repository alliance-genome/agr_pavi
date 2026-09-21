import React from 'react';
import { render, screen } from '@testing-library/react';
import { BulkUploadReport } from '../BulkUploadReport';
import { SkippedRow } from '../types';

const skipped: SkippedRow[] = [
    { lineNumber: 3, raw: { species: 'X', symbol: 'NOPE', variants: [], lineNumber: 3 }, reason: 'no gene found for "NOPE" in X' },
];

describe('BulkUploadReport', () => {
    it('summarizes loaded and skipped counts', () => {
        render(<BulkUploadReport loaded={5} skipped={skipped} />);
        expect(screen.getByText(/5/)).toBeInTheDocument();
        expect(screen.getByText(/skipped 1/i)).toBeInTheDocument();
    });

    it('lists each skipped row with its line number and reason', () => {
        render(<BulkUploadReport loaded={5} skipped={skipped} />);
        expect(screen.getByText(/line 3/i)).toBeInTheDocument();
        expect(screen.getByText(/no gene found for "NOPE"/i)).toBeInTheDocument();
    });

    it('renders nothing when there is nothing to report', () => {
        const { container } = render(<BulkUploadReport loaded={0} skipped={[]} />);
        expect(container).toBeEmptyDOMElement();
    });
});
