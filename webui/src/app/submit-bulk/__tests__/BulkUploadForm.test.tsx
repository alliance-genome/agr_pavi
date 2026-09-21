import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BulkUploadForm } from '../BulkUploadForm';

// Mock parse + resolve so the test is deterministic and offline.
jest.mock('../parseGeneListFile', () => ({
    parseGeneListFile: jest.fn(async () => ({
        rows: [{ species: 'Homo sapiens', symbol: 'TP53', variants: [], lineNumber: 2 }],
    })),
}));
jest.mock('../resolveRows', () => ({
    resolveRows: jest.fn(async () => ({
        entries: [{ geneId: 'HGNC:11998', geneName: 'TP53', species: 'Homo sapiens' }],
        skipped: [{ lineNumber: 3, raw: { species: 'X', symbol: 'NOPE', variants: [], lineNumber: 3 }, reason: 'no gene found for "NOPE" in X' }],
    })),
}));

// Capture the entries handed to the form without rendering the real one.
const formSpy = jest.fn();
jest.mock('@/app/submit/components/JobSubmitForm/JobSubmitForm', () => ({
    JobSubmitForm: (props: unknown) => {
        formSpy(props);
        return <div data-testid="job-submit-form" />;
    },
}));

describe('BulkUploadForm', () => {
    beforeEach(() => formSpy.mockClear());

    it('parses + resolves an uploaded file, then renders the form and the report', async () => {
        render(<BulkUploadForm agrjBrowseDataRelease="8.2.0" />);

        const file = new File(['species,gene_symbol\nHomo sapiens,TP53\n'], 'genes.csv', { type: 'text/plain' });
        const input = screen.getByLabelText(/gene list file/i);
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(screen.getByTestId('job-submit-form')).toBeInTheDocument());

        const props = formSpy.mock.calls.at(-1)?.[0] as { initialGenes?: unknown };
        expect(props.initialGenes).toEqual([
            { geneId: 'HGNC:11998', geneName: 'TP53', species: 'Homo sapiens' },
        ]);
        expect(screen.getByText(/skipped 1 row/i)).toBeInTheDocument();
    });

    it('shows a file-level error and no form when parsing fails', async () => {
        const { parseGeneListFile } = jest.requireMock('../parseGeneListFile');
        parseGeneListFile.mockResolvedValueOnce({ rows: [], fileError: 'The file appears to be empty.' });

        render(<BulkUploadForm agrjBrowseDataRelease="8.2.0" />);
        const file = new File([''], 'empty.csv', { type: 'text/plain' });
        fireEvent.change(screen.getByLabelText(/gene list file/i), { target: { files: [file] } });

        await waitFor(() => expect(screen.getByText(/file appears to be empty/i)).toBeInTheDocument());
        expect(screen.queryByTestId('job-submit-form')).toBeNull();
    });

    it('shows a friendly error and no form when resolving genes throws', async () => {
        const { resolveRows } = jest.requireMock('../resolveRows');
        resolveRows.mockRejectedValueOnce(new Error('network exploded'));

        render(<BulkUploadForm agrjBrowseDataRelease="8.2.0" />);
        const file = new File(['species,gene_symbol\nHomo sapiens,TP53\n'], 'genes.csv', { type: 'text/plain' });
        fireEvent.change(screen.getByLabelText(/gene list file/i), { target: { files: [file] } });

        await waitFor(() =>
            expect(
                screen.getByText(/something went wrong while resolving genes/i)
            ).toBeInTheDocument()
        );
        expect(screen.queryByTestId('job-submit-form')).toBeNull();
    });
});
