import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { PrimeReactProvider } from 'primereact/api';
import { DarkModeToggle } from '../DarkModeToggle'

describe('DarkModeToggle', () => {
  it('renders a switch', () => {
    // TODO: figure out why this generates big amount of "Error: Could not parse CSS stylesheet" console errors
    render(
      <PrimeReactProvider>
        <DarkModeToggle />
      </PrimeReactProvider>
    )

    const element = screen.getByRole('switch')
 
    expect(element).toBeInTheDocument
  })
})
