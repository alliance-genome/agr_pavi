import { describe, expect, it } from '@jest/globals';

import { render, screen } from '@testing-library/react'
import { PrimeReactProvider } from 'primereact/api';
import { DarkModeToggle } from '../DarkModeToggle'

describe('DarkModeToggle', () => {
    it('renders a toggle element', () => {
        render(
            <PrimeReactProvider>
            <DarkModeToggle />
            </PrimeReactProvider>
        )

        const element = screen.getByRole('checkbox')

        expect(element).toBeInTheDocument()
    })
})
