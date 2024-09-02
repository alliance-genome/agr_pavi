import { render, screen } from '@testing-library/react'
import { PrimeReactProvider } from 'primereact/api';
import { DarkModeToggle } from '../DarkModeToggle'

describe('DarkModeToggle', () => {
  it('renders a switch', () => {
    render(
      <PrimeReactProvider>
        <DarkModeToggle />
      </PrimeReactProvider>
    )

    const element = screen.getByRole('switch')
 
    expect(element).toBeInTheDocument()
  })
})
