import { describe, expect, it } from '@jest/globals';

import { render, fireEvent } from '@testing-library/react'
import { AlignmentEntryList } from '../AlignmentEntryList/AlignmentEntryList'

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
      <AlignmentEntryList agrjBrowseDataRelease='7.3.0' dispatchInputPayloadPart={jest.fn()} />
    )

    const inputGroups = result.container.querySelectorAll('div.p-inputgroup')
    expect(inputGroups).toHaveLength(1)  // Expect exactly one input group to be found
  })

  it('renders a functional add-record button', () => {
    const result = render(
      <AlignmentEntryList agrjBrowseDataRelease='7.3.0' dispatchInputPayloadPart={jest.fn()} />
    )

    const addRecordBtn = result.container.querySelector('button#add-record')
    expect(addRecordBtn).not.toBe(null)  // Expect add-record button to be found
    expect(addRecordBtn).toBeEnabled()

    //Click the button
    fireEvent.click(addRecordBtn!)

    //Check one new entry-record was added (two total)
    const inputGroups = result.container.querySelectorAll('div.p-inputgroup')
    expect(inputGroups).toHaveLength(2)  // Expect exactly two input groups to be found
  })
})
