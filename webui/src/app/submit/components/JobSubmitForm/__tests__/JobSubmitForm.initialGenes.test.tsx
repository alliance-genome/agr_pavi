import React from 'react';
import { render } from '@testing-library/react';
import { JobSubmitForm } from '../JobSubmitForm';

// Mock useRouter (JobSubmitForm calls it on every render).
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            prefetch: () => null
        };
    }
}));

// Capture what AlignmentEntryList receives, without rendering the real one.
const listSpy = jest.fn();
jest.mock('../../AlignmentEntryList/AlignmentEntryList', () => ({
    AlignmentEntryList: (props: unknown) => {
        listSpy(props);
        return null;
    },
}));

// The example loader is irrelevant to this test.
jest.mock('../../ExampleDataLoader/ExampleDataLoader', () => ({
    ExampleDataLoader: () => null,
    EXAMPLE_DATASETS: [],
}));

describe('JobSubmitForm initialGenes', () => {
    beforeEach(() => listSpy.mockClear());

    it('seeds AlignmentEntryList with the initialGenes prop when provided', () => {
        const genes = [{ geneId: 'HGNC:1', geneName: 'TP53', species: 'Homo sapiens' }];
        render(<JobSubmitForm agrjBrowseDataRelease="8.2.0" initialGenes={genes} />);
        const lastProps = listSpy.mock.calls.at(-1)?.[0] as { initialGenes?: unknown };
        expect(lastProps.initialGenes).toEqual(genes);
    });

    it('passes undefined initialGenes when the prop is omitted', () => {
        render(<JobSubmitForm agrjBrowseDataRelease="8.2.0" />);
        const lastProps = listSpy.mock.calls.at(-1)?.[0] as { initialGenes?: unknown };
        expect(lastProps.initialGenes).toBeUndefined();
    });
});
