import React from 'react'
import { render, screen } from '@testing-library/react'
import { expect } from '@jest/globals'
import '@testing-library/jest-dom'

import UnsupportedVariants from '../UnsupportedVariants/UnsupportedVariants'
import type { SeqInfoDict } from '../InteractiveAlignment/types'

describe('UnsupportedVariants', () => {
    test('renders nothing when no sequence has unsupported variants', () => {
        const dict: SeqInfoDict = {
            seq_a: { species: 'Caenorhabditis elegans' },
            seq_b: { species: 'Homo sapiens', requested_variant_ids: ['foo'] },
        }
        const { container } = render(<UnsupportedVariants seqInfoDict={dict} />)
        expect(container).toBeEmptyDOMElement()
    })

    test('renders nothing for an empty dict', () => {
        const { container } = render(<UnsupportedVariants seqInfoDict={{}} />)
        expect(container).toBeEmptyDOMElement()
    })

    test('lists one entry per unsupported variant with sequence name + reason', () => {
        const dict: SeqInfoDict = {
            apl_1_WB_alt: {
                species: 'Caenorhabditis elegans',
                unsupported_variants: [
                    {
                        variant_id: 'NC_003284.9:g.5113285_5115215del',
                        reason: 'disrupts a splice acceptor site — resulting transcript cannot be predicted from the reference exon map',
                    },
                ],
            },
            app_human: {
                species: 'Homo sapiens',
                unsupported_variants: [
                    {
                        variant_id: 'NC_000021.9:g.26174765T>C',
                        reason: 'stop codon lost — translating past the reference stop requires re-predicting the resulting transcript',
                    },
                ],
            },
        }
        render(<UnsupportedVariants seqInfoDict={dict} />)

        // Count in header
        expect(screen.getByText(/2 variants skipped/)).toBeInTheDocument()

        // Each variant id + sequence name + reason text appears
        expect(screen.getByText('NC_003284.9:g.5113285_5115215del')).toBeInTheDocument()
        expect(screen.getByText('apl_1_WB_alt')).toBeInTheDocument()
        expect(screen.getByText(/splice acceptor/)).toBeInTheDocument()
        expect(screen.getByText('NC_000021.9:g.26174765T>C')).toBeInTheDocument()
        expect(screen.getByText('app_human')).toBeInTheDocument()
        expect(screen.getByText(/stop codon lost/)).toBeInTheDocument()
    })

    test('uses singular wording when exactly one variant is skipped', () => {
        const dict: SeqInfoDict = {
            seq_x: {
                unsupported_variants: [
                    {
                        variant_id: 'v1',
                        reason: 'disrupts a splice donor site — resulting transcript cannot be predicted from the reference exon map',
                    },
                ],
            },
        }
        render(<UnsupportedVariants seqInfoDict={dict} />)
        expect(screen.getByText(/1 variant skipped/)).toBeInTheDocument()
    })

    test('exposes the region to assistive tech with a descriptive label', () => {
        const dict: SeqInfoDict = {
            seq_x: {
                unsupported_variants: [
                    { variant_id: 'v1', reason: 'disrupts a splice donor site' },
                ],
            },
        }
        const { container } = render(<UnsupportedVariants seqInfoDict={dict} />)
        const region = container.querySelector('[role="region"]')
        expect(region).toBeInTheDocument()
        expect(region?.getAttribute('aria-label')).toMatch(/skipped/i)
    })
})
