import React from 'react'
import { render, screen } from '@testing-library/react'
import { expect } from '@jest/globals'
import '@testing-library/jest-dom'

import { ResultsSummary } from '../ResultsSummary/ResultsSummary'
import type { SeqInfoDict } from '../InteractiveAlignment/types'

// Jennifer Smith (2026-11-10) reported that the Pairwise Identity table drops
// orthologs that share a gene symbol: a 4-species alignment (Hsa, Rno, Mmu,
// Dme) produced a 3-row matrix because rat Adcy3 and mouse Adcy3 collapsed to
// the same "Adcy3" label. This test pins down a species-disambiguated key
// without flipping the visible label away from the gene symbol.

// clustal-js parses the CLUSTAL header line, then one block of
// (name, spaces, residues) rows. Short residues are fine for identity math.
const ALN = [
    'CLUSTAL W (test fixture)',
    '',
    'ADCY3_ENST00000679454.1_ref         MAE',
    'Adcy3_ENSRNOT00000005389.8_ref      MAE',
    'Adcy3_ENSMUST00000127756            MAE',
    'Ac3_FB:FBtr0085897                  KKK',
    '',
].join('\n')

const SEQ_INFO: SeqInfoDict = {
    'ADCY3_ENST00000679454.1_ref':         { species: 'Homo sapiens' },
    'Adcy3_ENSRNOT00000005389.8_ref':      { species: 'Rattus norvegicus' },
    'Adcy3_ENSMUST00000127756':            { species: 'Mus musculus' },
    'Ac3_FB:FBtr0085897':                  { species: 'Drosophila melanogaster' },
}

describe('ResultsSummary pairwise identity table — ortholog label collision', () => {
    test('renders one row per species, including same-symbol orthologs', () => {
        render(
            <ResultsSummary
                jobId="test-job"
                alignmentResult={ALN}
                seqInfoDict={SEQ_INFO}
                isLoading={false}
            />,
        )

        // The summary panel starts collapsed as a <details>; open it so the
        // pairwise matrix is in the document.
        const summary = screen.getByText(/Alignment Results/i).closest('summary')
        if (summary) summary.click()

        // Every species must have a row header in the matrix. Before the fix,
        // either rat or mouse would be absent because both resolved to "Adcy3".
        expect(screen.getAllByText(/H\.\s*sapiens/).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/R\.\s*norvegicus/).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/M\.\s*musculus/).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/D\.\s*melanogaster/).length).toBeGreaterThan(0)

        // The display label stays the gene symbol — "Adcy3" appears twice
        // (rat + mouse). Before the fix one of them was dropped.
        const adcy3Headers = screen.getAllByText('Adcy3')
        expect(adcy3Headers.length).toBeGreaterThanOrEqual(2)
    })
})
