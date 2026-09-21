import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { TranscriptViewerDialog } from '../TranscriptViewerDialog';

// Replace the dynamic GenomeFeatureView with a marker so the dialog test
// does not pull in genomefeatures / D3.
jest.mock('../GenomeFeatureView', () => ({
    __esModule: true,
    default: () => <div data-testid="genome-feature-view" />,
}));

const gene = {
    id: 'HGNC:11998',
    symbol: 'TP53',
    species: { taxonId: 'NCBITaxon:9606' },
    genomeLocations: [{ chromosome: '17', start: 100, end: 200 }],
} as any;

describe('TranscriptViewerDialog', () => {
    it('does not render viewer content when hidden', () => {
        render(
            <TranscriptViewerDialog visible={false} gene={gene} release="8.2.0" onHide={() => {}} />
        );
        expect(screen.queryByTestId('genome-feature-view')).toBeNull();
    });

    it('renders the viewer and the gene symbol in the header when visible', async () => {
        await act(async () => {
            render(
                <TranscriptViewerDialog visible gene={gene} release="8.2.0" onHide={() => {}} />
            );
        });
        expect(await screen.findByTestId('genome-feature-view')).toBeInTheDocument();
        expect(screen.getByText(/TP53/)).toBeInTheDocument();
    });
});
