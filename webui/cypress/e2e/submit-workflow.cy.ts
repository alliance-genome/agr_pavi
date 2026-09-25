/// <reference types="cypress" />

/**
 * End-to-end test of the submit form driven by hand: type gene IDs, pick
 * transcripts and alleles, submit, follow /progress to /result and check
 * the result page. The "Load Example" dialog is covered by
 * examples-catalog.cy.ts instead.
 *
 * Environment:
 *   CYPRESS_BASE_URL     - WebUI URL (may include a base path, e.g. .../pavi)
 *   VISUAL_REGRESSION=1  - also compare against the stored visual baselines
 *   JOB_TIMEOUT_MS       - max wait for pipeline completion (default 300000)
 */

import formInput from '../fixtures/test-submit-success-input'

const JOB_TIMEOUT_MS = Number(Cypress.env('JOB_TIMEOUT_MS') || 300_000)
// `--env VISUAL_REGRESSION=1` arrives as the number 1, so compare as a string.
// The stored baselines predate the current UI, so visual comparison is opt-in.
const VISUAL_REGRESSION = ['1', 'true'].includes(String(Cypress.env('VISUAL_REGRESSION') ?? '').toLowerCase())

// PrimeReact appends open dropdown/multiselect/autocomplete panels to <body>.
const OPEN_MULTISELECT_PANEL = '.p-multiselect-panel:visible'

function compareSnapshot(alias: string, name: string, id: string = name) {
    if (!VISUAL_REGRESSION || Cypress.config('isInteractive')) return
    cy.get(alias)
        .compareSnapshot({ name })
        .then((snapshotResult) => {
            cy.task('storeSnapshotResult', { id, result: snapshotResult })
        })
}

// Does a transcript option's text belong to the given transcript name?
// Option text is the name (possibly carrying a "WB:"-style prefix),
// optionally followed by "(protein accession)" and a canonical tag, so
// require a non-identifier char after the name.
function optionMatchesName(optionText: string, name: string): boolean {
    optionText = optionText.replace(/^[A-Za-z]+:/, '')
    if (!optionText.startsWith(name)) return false
    const next = optionText.charAt(name.length)
    return next === '' || !/[A-Za-z0-9._-]/.test(next)
}

describe('submit form behaviour', () => {
    beforeEach(() => {
        cy.visit('/submit')
    })

    afterEach(() => {
        cy.task('clearSnapshotResults')
    })

    Cypress.on('uncaught:exception', (err) => {
        // Nightingale canvas errors are noise on first render
        // (InvalidStateError: CanvasRenderingContext2D.drawImage: Passed-in canvas is empty)
        if (err.message.includes('CanvasRenderingContext2D')) return false
        // Let any other unexpected error fail the test
        return undefined
    })

    it('tests job submission success', () => {
        // Should display one alignment entry by default.
        cy.get('.agr-alignment-entry').should('have.length', 1)

        // There should be exactly one submit button, disabled on incomplete input.
        cy.get('button[aria-label="Submit Job"]').as('submitBtn')
        cy.get('@submitBtn').should('have.length', 1)
        cy.get('@submitBtn').should('be.disabled')

        // There should be exactly one element to click to add records
        cy.get('button#add-record').as('addRecordBtn')
        cy.get('@addRecordBtn').should('have.length', 1)

        // Add as many records as there are entries in formInput
        for (let i = 1, len = formInput.length; i < len; ++i) {
            cy.get('@addRecordBtn').click()
        }
        cy.get('.agr-alignment-entry').should('have.length', formInput.length)

        // No row removed yet, so row i has entry index i (ids gene-i, transcripts-i, alleles-i).
        formInput.forEach((entry, i) => {
            // Gene: type the query and pick a suggestion
            cy.get(`#gene-${i} input`).as('geneInputField')
            cy.get('@geneInputField').focus()
            cy.get('@geneInputField').type(entry.gene.type)

            cy.get('.p-autocomplete-panel:visible li.p-autocomplete-item', { timeout: 30_000 })
                .as('geneSuggestions')
                .should('have.length.at.least', 1)
            const geneSelection = entry.gene.select ?? 0
            if (typeof geneSelection === 'string') {
                cy.get('@geneSuggestions').contains(geneSelection).click()
            } else {
                cy.get('@geneSuggestions').eq(geneSelection).click()
            }

            // Transcripts: once the transcript list loaded the canonical transcript
            // gets preselected; open the panel and make the selection exactly
            // the fixture's transcripts.
            cy.get(`#transcripts-${i}`).as('transcriptsSelect')
            cy.get('@transcriptsSelect').find('.p-multiselect-label', { timeout: 60_000 })
                .should('not.have.class', 'p-multiselect-label-empty')
            cy.get('@transcriptsSelect').click()
            cy.get(OPEN_MULTISELECT_PANEL).as('openTranscriptsPanel').should('be.visible')

            // The transcript list should be filterable
            cy.get('@openTranscriptsPanel').find('input.p-multiselect-filter').should('exist')

            // A list of transcripts should be available
            cy.get('@openTranscriptsPanel').find('li.p-multiselect-item')
                .should('have.length.at.least', 1)

            // Deselect anything not requested (e.g. a preselected canonical transcript)
            cy.get('@openTranscriptsPanel').find('li.p-multiselect-item').then(($items) => {
                $items
                    .filter((_, el) => el.getAttribute('aria-selected') === 'true')
                    .filter((_, el) => !entry.transcripts.some((t) => optionMatchesName(el.textContent?.trim() ?? '', t)))
                    .each((_, el) => { cy.wrap(el).click() })
            })

            // The relevant transcripts should be findable (through the filter) and selectable
            entry.transcripts.forEach((transcript: string) => {
                cy.get('@openTranscriptsPanel').find('input.p-multiselect-filter').clear()
                cy.get('@openTranscriptsPanel').find('input.p-multiselect-filter').type(transcript)
                cy.get('@openTranscriptsPanel').find('li.p-multiselect-item')
                    .filter((_, el) => optionMatchesName(el.textContent?.trim() ?? '', transcript))
                    .should('have.length', 1)
                    .then(($li) => {
                        if ($li.attr('aria-selected') !== 'true') cy.wrap($li).click()
                    })
            })
            cy.get('@openTranscriptsPanel').find('input.p-multiselect-filter').clear()
            cy.get('@openTranscriptsPanel').find('li.p-multiselect-item[aria-selected="true"]')
                .should('have.length', entry.transcripts.length)
            cy.get('@openTranscriptsPanel').find('button.p-multiselect-close').click()
            cy.get(OPEN_MULTISELECT_PANEL).should('not.exist')

            // Alleles (optional): findable through the filter box and selectable
            if (entry.alleles && entry.alleles.length > 0) {
                cy.get(`#alleles-${i}`).as('allelesSelect')
                cy.get('@allelesSelect').should('not.have.class', 'p-disabled')
                cy.get('@allelesSelect').click()
                cy.get(OPEN_MULTISELECT_PANEL).as('openAllelesPanel').should('be.visible')

                // A list of alleles should load
                cy.get('@openAllelesPanel').find('li.p-multiselect-item', { timeout: 60_000 })
                    .should('have.length.at.least', 1)

                entry.alleles.forEach((allele: string) => {
                    cy.get('@openAllelesPanel').find('input.p-multiselect-filter').as('openAllelesFilterBox')
                    cy.get('@openAllelesFilterBox').clear()
                    cy.get('@openAllelesFilterBox').type(allele)
                    // Typing may also trigger a server-side lookup that adds the allele
                    cy.contains(`${OPEN_MULTISELECT_PANEL} li.p-multiselect-item`, allele, { timeout: 30_000 })
                        .click()
                })
                cy.get('@openAllelesPanel').find('li.p-multiselect-item[aria-selected="true"]')
                    .should('have.length', entry.alleles.length)
                cy.get('@openAllelesPanel').find('button.p-multiselect-close').click()
                cy.get(OPEN_MULTISELECT_PANEL).should('not.exist')
                cy.get('@allelesSelect').find('.p-multiselect-label')
                    .should('not.have.class', 'p-multiselect-label-empty')
            }

            // Submit button should stay disabled as long as the last entry was not completed
            if (i < formInput.length - 1) {
                cy.get('@submitBtn').should('be.disabled')
            }
        })

        // Delete any records that had the delete flag set.
        // Those records are useful for submission form testing
        // but require datasets too large for automated testing (too slow).
        // Remove from the last row backwards so earlier row positions stay valid.
        const toDelete = formInput
            .map((entry, i) => (entry.delete ? i : -1))
            .filter((i) => i >= 0)
            .reverse()
        toDelete.forEach((i) => {
            cy.get('.agr-alignment-entry').eq(i).find('button#remove-record').click()
        })
        cy.get('.agr-alignment-entry').should('have.length', formInput.length - toDelete.length)

        // Submit button should become active after completing all input
        cy.get('@submitBtn', { timeout: 60_000 }).should('be.enabled')

        // Submitting the analysis should route to the progress page
        cy.get('@submitBtn').click()
        cy.location('pathname', { timeout: 60_000 }).should('match', /\/progress$/)
        cy.location('search').should('match', /^\?uuid=[A-Za-z0-9-]+$/).then((search) => {
            const jobUuid = /^\?uuid=([A-Za-z0-9-]+)$/.exec(search)![1]

            // Progress page should indicate job progress
            cy.contains('h1', 'Job Progress')

            // Successful job completion should route to the results page
            cy.location('pathname', { timeout: JOB_TIMEOUT_MS }).should('match', /\/result$/)
            // query params should contain the same UUID as progress page did
            cy.location('search').should('eq', `?uuid=${jobUuid}`)
        })

        // Result page should have a display mode selector defaulting to the virtualized view
        cy.get('#display-mode').as('displayModeDropdown')
        cy.get('@displayModeDropdown').should('have.length', 1)
        cy.get('@displayModeDropdown').should('contain.text', 'Interactive (Virtualized)')

        // nightingale-elements should be visible
        cy.get('nightingale-manager', { timeout: 60_000 }).as('nightingaleManager')
        cy.get('@nightingaleManager').should('have.length', 1)

        cy.get('@nightingaleManager').find('nightingale-navigation').as('nightingaleNavigation')
        cy.get('@nightingaleNavigation').should('have.length', 1)
        cy.get('@nightingaleNavigation').should('be.visible')

        cy.get('@nightingaleManager').find('nightingale-msa').as('nightingaleMsa')
        cy.get('@nightingaleMsa').should('have.length', 1)
        cy.get('@nightingaleMsa').should('be.visible')

        // All expected sequences should be listed
        cy.get('[role="application"][aria-label^="Alignment viewer"]').as('alignmentViewContainer')
        expectedSequenceLabels.forEach((label) => {
            cy.get('@alignmentViewContainer').contains('button', label).should('be.visible')
        })
        cy.get('@alignmentViewContainer')
            .contains(/of\s*\d+\s*sequences/)
            .should('contain.text', `${expectedSequenceLabels.length} of ${expectedSequenceLabels.length} sequences`)

        // Color-scheme selector should default to 'Clustal2'
        cy.get('#dd-colorscheme').as('colorSchemeDropdown')
        cy.get('@colorSchemeDropdown').should('have.length', 1)
        cy.get('@colorSchemeDropdown').should('contain.text', 'Clustal2')
        // Selected color scheme should be represented in the nightingale view
        cy.get('nightingale-msa').should('have.prop', 'colorScheme', 'clustal2')

        // Give visual nightingale-elements some time to render
        cy.wait(1000)  //eslint-disable-line cypress/no-unnecessary-waiting
        compareSnapshot('@alignmentViewContainer', 'alignment-view-initial')

        // Selecting a different color scheme should update the selector
        cy.get('@colorSchemeDropdown').click()
        cy.get('.p-dropdown-panel:visible li.p-dropdown-item').contains('Conservation').click()
        cy.get('@colorSchemeDropdown').should('contain.text', 'Conservation')
        cy.get('nightingale-msa').should('have.prop', 'colorScheme', 'conservation')
        compareSnapshot('@alignmentViewContainer', 'alignment-view-conservation')

        // Changing display mode to 'Text' should hide the interactive alignment and display the text alignment
        cy.get('@displayModeDropdown').click()
        cy.get('.p-dropdown-panel:visible li.p-dropdown-item').contains(/^Text$/).click()

        cy.get('nightingale-msa').should('not.exist')
        cy.get('textarea#alignment-result-text').as('alignmentTextDisplay')
        cy.get('@alignmentTextDisplay').should('be.visible')

        // Displayed alignment should match the expected output
        cy.readFile('cypress/fixtures/submit-workflow-success-output.aln').then((txt) => {
            expect(txt).to.be.a('string')
            cy.get('@alignmentTextDisplay').should('have.value', txt)
        })

        // Returning to the interactive display mode should show the interactive alignment again
        cy.get('@displayModeDropdown').click()
        cy.get('.p-dropdown-panel:visible li.p-dropdown-item').contains('Interactive (Virtualized)').click()

        cy.get('textarea#alignment-result-text').should('not.exist')
        cy.get('nightingale-msa').should('be.visible')
        compareSnapshot('@alignmentViewContainer', 'alignment-view-initial', 'alignment-view-resume-interactive')

        cy.task('errorOnSnapshotFailures')
    })
})

// Sequence labels shown on the result page for formInput (after removal of
// the entries flagged for deletion, and deduplication of repeated references).
const expectedSequenceLabels: string[] = [
    'apl-1_WB:C42D8.8a.1_ref',
    'apl-1_WB:C42D8.8a.1_yn32',
    'apl-1_WB:C42D8.8a.1_yn10',
    'apl-1_WB:C42D8.8a.1_alt5',
    'sup-9_WB:F34D6.3.1_ref',
    'sup-9_WB:F34D6.3.1_n1913',
    'paxt-1_WB:R05D11.6.1_ref',
    'paxt-1_WB:R05D11.6.1_xe5',
    'Appl_FB:FBtr0070109',
    'Appl_FB:FBtr0307291',
    'mgl-1_WB:ZC506.4a.1',
]
