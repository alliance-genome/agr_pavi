import { describe, expect, it } from '@jest/globals';

import { render } from '@testing-library/react'
import { JobSubmitForm } from '../JobSubmitForm/JobSubmitForm'

jest.mock('https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js',
    () => {
        return {
            getSpecies: jest.fn(() => {}),
            getSingleGenomeLocation: jest.fn(() => {})
        }
    },
    {virtual: true}
)

// Mock useRouter:
jest.mock("next/navigation", () => ({
    useRouter() {
        return {
        prefetch: () => null
        };
    }
}));

describe('AlignmentEntry', () => {
    it('renders a data-entry form', () => {
        const result = render(
            <JobSubmitForm agrjBrowseDataRelease='7.3.0' />
        )

        const inputGroup = result.container.querySelector('div.p-inputgroup')
        expect(inputGroup).not.toBeNull()  // Expect (at least one) input group to be found

        // Expect gene input to be found
        expect(inputGroup?.querySelector('input[id="gene"]')).not.toBeNull()
        // Expect alleles multiselect to be found
        expect(inputGroup?.querySelector('div[id="alleles"].p-multiselect')).not.toBeNull()
        // Expect transcripts multiselect to be found
        expect(inputGroup?.querySelector('div[id="transcripts"].p-multiselect')).not.toBeNull()
    })

    it('renders a submit button that is disabled by default', () => {
        const result = render(
            <JobSubmitForm agrjBrowseDataRelease='7.3.0' />
        )

        const submitBtn = result.container.querySelector('button[aria-label="Submit"]')
        expect(submitBtn).not.toBeNull()  // Expect submit button to be found
        expect(submitBtn).toBeDisabled()
    })
})
