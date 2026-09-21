import React from 'react';
import { render } from '@testing-library/react';
import { JobSubmitForm } from '../JobSubmitForm';

// Mock useRouter (JobSubmitForm calls it on every render).
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            prefetch: () => null,
            push: () => null,
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

describe('JobSubmitForm "Edit these sequences" pre-fill (pavi_edit stash)', () => {
    beforeEach(() => {
        listSpy.mockClear();
        sessionStorage.clear();
    });

    it('pre-fills initialGenes from sessionStorage.pavi_edit and clears the stash', () => {
        const stashedGenes = [
            { geneId: 'HGNC:1', geneName: '', species: '', transcriptNames: ['T1'], alleleIds: ['a1'] },
        ];
        sessionStorage.setItem('pavi_edit', JSON.stringify(stashedGenes));

        render(<JobSubmitForm agrjBrowseDataRelease="8.2.0" />);

        const lastProps = listSpy.mock.calls.at(-1)?.[0] as { initialGenes?: unknown };
        expect(lastProps.initialGenes).toEqual(stashedGenes);
        expect(sessionStorage.getItem('pavi_edit')).toBeNull();
    });

    it('does not apply the stash when an initialGenes prop is already supplied', () => {
        const propGenes = [{ geneId: 'HGNC:2', geneName: 'X', species: 'Y' }];
        const stashedGenes = [{ geneId: 'HGNC:1', geneName: '', species: '' }];
        sessionStorage.setItem('pavi_edit', JSON.stringify(stashedGenes));

        render(<JobSubmitForm agrjBrowseDataRelease="8.2.0" initialGenes={propGenes} />);

        const lastProps = listSpy.mock.calls.at(-1)?.[0] as { initialGenes?: unknown };
        expect(lastProps.initialGenes).toEqual(propGenes);
        // The stash is left untouched for a caller-supplied prop, since it was never read.
        expect(sessionStorage.getItem('pavi_edit')).not.toBeNull();
    });

    it('leaves initialGenes undefined when there is no stash and no prop', () => {
        render(<JobSubmitForm agrjBrowseDataRelease="8.2.0" />);

        const lastProps = listSpy.mock.calls.at(-1)?.[0] as { initialGenes?: unknown };
        expect(lastProps.initialGenes).toBeUndefined();
    });

    it('ignores a malformed stash without throwing', () => {
        sessionStorage.setItem('pavi_edit', 'not-json');

        expect(() => render(<JobSubmitForm agrjBrowseDataRelease="8.2.0" />)).not.toThrow();

        const lastProps = listSpy.mock.calls.at(-1)?.[0] as { initialGenes?: unknown };
        expect(lastProps.initialGenes).toBeUndefined();
    });
});
