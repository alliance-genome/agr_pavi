/// <reference types="cypress" />

/**
 * End-to-end test for every example dataset in the shared catalog.
 *
 * Each example is driven via the "Load Example" dialog (rather than
 * filling the form by hand) so this spec stays a thin UI driver: it
 * submits, waits for the result page, then asserts against the same
 * tolerant expectations the pavi-cli harness uses.
 *
 * Catalog lives in `tests/examples/catalog.json` and is shared with
 * the Python CLI runner.
 *
 * Environment:
 *   CYPRESS_BASE_URL      - WebUI URL (default http://localhost:3000)
 *   CYPRESS_API_BASE_URL  - API URL the WebUI talks to (default http://localhost:8000)
 *   CYPRESS_JOB_TIMEOUT_MS - per-example max wait for pipeline completion (default 600000)
 */

import { exampleCatalog } from '../../../tests/examples/index'
import type { CatalogExample } from '../../../tests/examples/index'

const API_BASE = Cypress.env('API_BASE_URL') || 'http://localhost:8000'
const JOB_TIMEOUT_MS = Number(Cypress.env('JOB_TIMEOUT_MS') || 600_000)
const ONLY_EXAMPLE = (Cypress.env('ONLY_EXAMPLE') as string | undefined) || ''

// After each example aligns, optionally run the pavi-cli external check:
// compare the produced proteins against UniProt canonical sequences. This
// is the only check in the sweep that validates against an outside source
// rather than the pipeline's own output. Disable with SKIP_SEQUENCE_CHECK=1
// (e.g. environments without the Python venv or outbound network).
const RUN_SEQUENCE_CHECK = Cypress.env('SKIP_SEQUENCE_CHECK') !== '1'
// Paths are relative to the Cypress project root (webui/), which is also
// cy.exec's working directory.
const PAVI_CLI = '../tests/cli/.venv/bin/pavi-cli'
const ALN_DIR = 'cypress/results/alignments'

function parseClustal(text: string): Array<[string, string]> {
    const sequences = new Map<string, string[]>()
    const order: string[] = []
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.replace(/\s+$/, '')
        if (!line || line.startsWith('CLUSTAL')) continue
        // Conservation marker lines start with whitespace
        if (line.startsWith(' ')) continue
        const parts = line.split(/\s+/)
        if (parts.length < 2) continue
        const [seqId, segment] = [parts[0], parts[1]]
        if (!sequences.has(seqId)) {
            sequences.set(seqId, [])
            order.push(seqId)
        }
        sequences.get(seqId)!.push(segment)
    }
    return order.map((id) => [id, sequences.get(id)!.join('')] as [string, string])
}

function pairwiseIdentityPct(a: string, b: string): number {
    if (a.length !== b.length || a.length === 0) return 0
    let matches = 0
    let compared = 0
    for (let i = 0; i < a.length; i++) {
        const ca = a[i]
        const cb = b[i]
        if (ca === '-' || cb === '-') continue
        compared += 1
        if (ca.toUpperCase() === cb.toUpperCase()) matches += 1
    }
    return compared > 0 ? (matches / compared) * 100 : 0
}

function maxPairwiseIdentity(seqs: Array<[string, string]>): number | null {
    if (seqs.length < 2) return null
    let best = 0
    for (let i = 0; i < seqs.length; i++) {
        for (let j = i + 1; j < seqs.length; j++) {
            best = Math.max(best, pairwiseIdentityPct(seqs[i][1], seqs[j][1]))
        }
    }
    return best
}

function extractSeqInfoEntries(seqInfo: unknown): Array<Record<string, unknown>> {
    if (seqInfo && typeof seqInfo === 'object' && !Array.isArray(seqInfo)) {
        const maybe = (seqInfo as Record<string, unknown>).sequences
        if (maybe && typeof maybe === 'object' && !Array.isArray(maybe)) {
            return Object.values(maybe as Record<string, Record<string, unknown>>)
        }
        return Object.values(seqInfo as Record<string, Record<string, unknown>>)
    }
    return []
}

describe('catalog examples end-to-end', () => {
    Cypress.on('uncaught:exception', (err) => {
        // Nightingale canvas errors are noise on first render
        if (err.message.includes('CanvasRenderingContext2D')) return false
        return undefined
    })

    const selected = ONLY_EXAMPLE
        ? exampleCatalog.examples.filter((e) => e.id === ONLY_EXAMPLE)
        : exampleCatalog.examples

    selected.forEach((example: CatalogExample) => {
        it(`runs example: ${example.id}`, () => {
            cy.visit('/submit')

            // Open the "Load Example" dialog
            cy.get('[aria-label="Open example dataset selector"]').click()

            // Click the card for this example by its name
            cy.contains('h4', example.name).click()

            // Dialog closes, form is populated. The submit button is the
            // most reliable "ready" signal — it stays disabled until
            // every loader (transcripts / alleles) has resolved.
            cy.get('button[aria-label="Submit Job"]', { timeout: 60_000 })
                .should('be.enabled')

            // For examples that pin specific allele IDs, the submit button
            // enables as soon as transcripts are selected — before the
            // async allele auto-selection has populated the form. Wait for
            // at least one `[id^="alleles-"]` MultiSelect to show a
            // non-placeholder label so we don't race past the selection.
            const totalCatalogAlleles = example.genes.reduce(
                (acc, g) => acc + (g.alleleIds?.length ?? 0),
                0
            )
            if (totalCatalogAlleles > 0) {
                // PrimeReact MultiSelect stamps the label with
                // `.p-multiselect-label-empty` while no items are selected.
                // Wait until the allele multiselect's label drops that
                // class — that means the async auto-selection completed.
                cy.get('[id^="alleles-"]', { timeout: 60_000 })
                    .closest('.p-multiselect')
                    .find('.p-multiselect-label', { timeout: 60_000 })
                    .filter((_, el) => !el.classList.contains('p-multiselect-label-empty'))
                    .should('have.length.at.least', 1)
            }

            cy.get('button[aria-label="Submit Job"]').click()

            // /progress → /result transition
            cy.url({ timeout: JOB_TIMEOUT_MS }).should('match', /\/result\?uuid=[A-Za-z0-9-]+/)

            cy.url().then((url) => {
                const m = url.match(/uuid=([A-Za-z0-9-]+)/)
                expect(m, 'job uuid in /result URL').to.not.be.null
                const uuid = m![1]

                // --- Alignment: parse + max pairwise identity ----------
                cy.request(`${API_BASE}/api/pipeline-job/${uuid}/result/alignment`).then((res) => {
                    expect(res.status, 'alignment fetch status').to.eq(200)
                    const seqs = parseClustal(res.body as string)
                    expect(
                        seqs.length,
                        `sequenceCount >= ${example.expectations.minSequenceCount}`
                    ).to.be.at.least(example.expectations.minSequenceCount)

                    if (example.expectations.minMaxPairwiseIdentityPct > 0) {
                        const maxId = maxPairwiseIdentity(seqs)
                        expect(maxId, 'pairwise identity computable').to.not.be.null
                        expect(
                            maxId as number,
                            `maxPairwiseIdentity >= ${example.expectations.minMaxPairwiseIdentityPct}%`
                        ).to.be.at.least(example.expectations.minMaxPairwiseIdentityPct)
                    }

                    // Persist the alignment so the post-step UniProt check
                    // (and any debugging) has the exact bytes we asserted on.
                    if (RUN_SEQUENCE_CHECK) {
                        cy.writeFile(`${ALN_DIR}/${example.id}.aln`, res.body as string)
                    }
                })

                // --- Seq-info: embedded variants + consequence categories ----------
                cy.request(`${API_BASE}/api/pipeline-job/${uuid}/result/seq-info`).then((res) => {
                    expect(res.status, 'seq-info fetch status').to.eq(200)
                    const entries = extractSeqInfoEntries(res.body)

                    let embeddedTotal = 0
                    const consequencesSeen = new Set<string>()
                    for (const entry of entries) {
                        const variants = (entry?.embedded_variants as Array<Record<string, unknown>>) || []
                        for (const v of variants) {
                            embeddedTotal += 1
                            const mcs = (v?.molecular_consequences as string[]) || []
                            for (const mc of mcs) consequencesSeen.add(mc)
                        }
                    }

                    expect(
                        embeddedTotal,
                        `embeddedVariantsTotal >= ${example.expectations.minEmbeddedVariantsTotal}`
                    ).to.be.at.least(example.expectations.minEmbeddedVariantsTotal)

                    const expected = example.expectations.expectedConsequenceCategories ?? []
                    for (const cat of expected) {
                        expect(
                            [...consequencesSeen],
                            `consequence category "${cat}" present`
                        ).to.include(cat)
                    }
                })
            })

            // --- External truth check: produced proteins vs UniProt ----------
            // Runs the pavi-cli verify-sequences command against the alignment
            // we just saved. A non-zero exit means a gene's protein diverged
            // from its UniProt canonical beyond the identity threshold.
            if (RUN_SEQUENCE_CHECK) {
                cy.exec(
                    `${PAVI_CLI} verify-sequences --example ${example.id} --alignment-file ${ALN_DIR}/${example.id}.aln`,
                    { failOnNonZeroExit: false, timeout: 120_000 }
                ).then((result) => {
                    const report = `${result.stdout}\n${result.stderr}`.trim()
                    cy.log(report || 'verify-sequences produced no output')
                    expect(
                        result.exitCode,
                        `verify-sequences for ${example.id}:\n${report}`
                    ).to.eq(0)
                })
            }

            // Visual sanity — Nightingale rendered something
            cy.get('nightingale-msa', { timeout: 30_000 }).should('be.visible')
        })
    })
})
