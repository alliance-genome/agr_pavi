import { describe, expect, it } from '@jest/globals';

import { render, fireEvent } from '@testing-library/react'
import { AlignmentEntryList } from '../AlignmentEntryList'

jest.mock('https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js',
    () => {
        return {
            getSpecies: jest.fn(() => {}),
            getSingleGenomeLocation: jest.fn(() => {})
        }
    },
    {virtual: true}
)

describe('AlignmentEntryList', () => {
    it('renders one input record by default', () => {
        const result = render(
            <AlignmentEntryList agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const inputGroups = result.container.querySelectorAll('div.p-inputgroup')
        expect(inputGroups).toHaveLength(1)  // Expect exactly one input group to be found
    })

    it('renders a functional button to remove individual records', () => {
        const result = render(
            <AlignmentEntryList agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const inputGroupsBefore = result.container.querySelectorAll('div.p-inputgroup')
        expect(inputGroupsBefore).toHaveLength(1)  // Expect exactly one input group to be found

        // Remove button only appears when there are >1 entries, so add one first
        const addRecordBtn = result.container.querySelector('button#add-record')
        expect(addRecordBtn).not.toBeNull()
        fireEvent.click(addRecordBtn!)

        const inputGroupsAfterAdd = result.container.querySelectorAll('div.p-inputgroup')
        expect(inputGroupsAfterAdd).toHaveLength(2)  // Now we have two entries

        // Now the remove button should be visible
        const removeRecordBtn = result.container.querySelector('button#remove-record')
        expect(removeRecordBtn).not.toBeNull()  // Expect remove-record button to be found
        expect(removeRecordBtn).toBeEnabled()

        fireEvent.click(removeRecordBtn!)

        // Check one entry-record was removed (one left)
        const inputGroupsAfter = result.container.querySelectorAll('div.p-inputgroup')
        expect(inputGroupsAfter).toHaveLength(1)  // Expect exactly one input group after removal
    })

    it('renders a functional add-record button', () => {
        const result = render(
            <AlignmentEntryList agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const addRecordBtn = result.container.querySelector('button#add-record')
        expect(addRecordBtn).not.toBeNull()  // Expect add-record button to be found
        expect(addRecordBtn).toBeEnabled()

        //Click the button
        fireEvent.click(addRecordBtn!)

        //Check one new entry-record was added (two total)
        const inputGroups = result.container.querySelectorAll('div.p-inputgroup')
        expect(inputGroups).toHaveLength(2)  // Expect exactly two input groups to be found
    })
})
