import { describe, expect, it } from '@jest/globals';

import { render } from '@testing-library/react'
import { AlignmentEntry } from '../AlignmentEntry/AlignmentEntry'

jest.mock('https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js',
  () => {
      return {
          getSpecies: jest.fn(() => {}),
          getSingleGenomeLocation: jest.fn(() => {})
      }
  },
  {virtual: true}
)

describe('AlignmentEntry', () => {
  it('renders a gene input element', () => {
    const result = render(
      <AlignmentEntry index={0} agrjBrowseDataRelease='7.3.0' dispatchInputPayloadPart={jest.fn()} />
    )

    const geneInputElement = result.container.querySelector('#gene')
    expect(geneInputElement).not.toBe(null)  // Expect gene input element to be found
    expect(geneInputElement).toHaveClass('p-inputtext') // Expect element to be inputtext box
  })

  it('renders transcript input element', () => {
    const result = render(
      <AlignmentEntry index={0} agrjBrowseDataRelease='7.3.0' dispatchInputPayloadPart={jest.fn()} />
    )
 
    const transcriptInputElement = result.container.querySelector('#transcripts')
    expect(transcriptInputElement).not.toBe(null)  // Expect transcript input element to be found
    expect(transcriptInputElement).toHaveClass('p-multiselect') // Expect element to be multiselect box
  })
})
