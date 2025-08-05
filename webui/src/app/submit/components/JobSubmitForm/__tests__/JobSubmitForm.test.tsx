import { describe, expect, it } from '@jest/globals';

import { render, fireEvent } from '@testing-library/react'
import { JobSubmitForm } from '../JobSubmitForm'

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
            <JobSubmitForm agrjBrowseDataRelease='0.0.0' />
        )

        const inputGroup = result.container.querySelector('div.p-inputgroup')
        expect(inputGroup).not.toBeNull()  // Expect (at least one) input group to be found

        // Input field checks are done in AlignmentEntry tests
    })

    it('renders a submit button that is disabled by default', () => {
        const result = render(
            <JobSubmitForm agrjBrowseDataRelease='0.0.0' />
        )

        const submitBtn = result.container.querySelector('button[aria-label="Submit"]')
        expect(submitBtn).not.toBeNull()  // Expect submit button to be found
        expect(submitBtn).toBeDisabled()
    })

    it('add record button is functional', () => {
        const result = render(
            <JobSubmitForm agrjBrowseDataRelease='0.0.0' />
        )

        // Expect exactly one input group to be found
        const inputGroup = result.container.querySelectorAll('div.p-inputgroup')
        expect(inputGroup).toHaveLength(1)

        // Expect exactly one add-record button to be found
        const addRecordBtn = result.container.querySelector('button#add-record')
        expect(addRecordBtn).not.toBeNull()

        // Clicking the add-record button should add a new input group (exactly one extra, so two in total)
        fireEvent.click(addRecordBtn!)

        const inputGroups = result.container.querySelectorAll('div.p-inputgroup')
        expect(inputGroups).toHaveLength(2)
    })

    it('remove record button is functional', () => {
        const result = render(
            <JobSubmitForm agrjBrowseDataRelease='0.0.0' />
        )

        // Expect exactly one input group to be found
        const initialInputGroups = result.container.querySelectorAll('div.p-inputgroup')
        expect(initialInputGroups).toHaveLength(1)

        // Expect exactly one remove-record button to be found
        const removeRecordBtn = result.container.querySelectorAll('button#remove-record')
        expect(removeRecordBtn).toHaveLength(1)

        // Clicking the add-record button should remove a input group (exactly one extra, so 0 left)
        fireEvent.click(removeRecordBtn[0])

        const newInputGroups = result.container.querySelectorAll('div.p-inputgroup')
        expect(newInputGroups).toHaveLength(0)
    })

    //TODO: add tests for API payload generation
})
