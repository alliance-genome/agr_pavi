/// <reference types="cypress" />

// To learn more about how Cypress works,
// please read our getting started guide:
// https://on.cypress.io/introduction-to-cypress

import formInput from '../fixtures/test-submit-success-input.json'

describe('submit form behaviour', () => {
    beforeEach(() => {
        // Cypress starts out with a blank slate for each test
        // so we must tell it to visit our website with the `cy.visit()` command
        // before each test
        cy.visit('/')
    })

    afterEach(() => {
        cy.task('clearSnapshotResults');
    });

    Cypress.on('uncaught:exception', (err, ) => {
        // Expect errors from nightingale elements are ignored
        // InvalidStateError: CanvasRenderingContext2D.drawImage: Passed-in canvas is empty
        console.log(`Uncaught error intercepted during cypress testing.`)
        console.log(`Intercepted error cause: ${err.cause}`)
        console.log(`Intercepted error message: ${err.message}`)
        console.log(`Intercepted error name: ${err.name}`)
        console.log(`Intercepted error stack: ${err.stack}`)
        console.log('End of intercepted error.')
        if ( err.message.includes('CanvasRenderingContext2D') ) {
            console.log('CanvasRenderingContext2D error detected during Cypress E2E testing. Ignoring as expected.')
            return false
        }
        // we still want to ensure there are no other unexpected
        // errors, so we let them fail the test
    })

    it('tests job submission success', () => {
        // Ensure test-resource file required further down exists
        cy.readFile('cypress/test-resources/submit-workflow-success-output.aln', {timeout: 100}).should('exist')

        // We use the `cy.get()` command to get all elements that match the selector.
        // There should only be one cell with a inputgroup.
        // cy.get('table tbody tr td .p-inputgroup').should('have.length', 1)

        // Should displays one alignmentEntry by default.
        cy.get('.p-inputgroup').should('have.length', 1)

        // There should be excactly one submit button
        cy.get('button').filter('[aria-label="Submit"]').as('submitBtn')
        cy.get('@submitBtn').should('have.length', 1)

        // and it should be disabled by default (on incomplete input).
        cy.get('@submitBtn').should('be.disabled')

        // There should be excactly one element to click to add records
        cy.get('button#add-record').as('addRecordBtn')
        cy.get('@addRecordBtn').should('have.length', 1)

        // add as many records as there are entries in formInput
        for(let i = 1, len = formInput.length; i < len; ++i){
            cy.get('@addRecordBtn').click()
        }
        cy.get('.p-inputgroup').should('have.length', formInput.length)

        // Input all data into form
        for(let i = 0, len = formInput.length; i < len; ++i){

            // Form should be able to receive gene as user input.
            cy.get('.p-inputgroup').eq(i).find('input#gene').as('geneInputField')
            cy.get('@geneInputField').focus()
            cy.get('@geneInputField').type(formInput[i].gene)

            // Once the transcript list loaded, from should enable selecting the relevant transcripts.
            cy.get('.p-inputgroup').eq(i).find('#transcripts').find('input').focus()
            cy.get('.p-multiselect-panel', {timeout: 5000}).as('openTranscriptsSelectBox').should('be.visible')

            // A list of transcript should be available
            cy.get('@openTranscriptsSelectBox').find('li.p-multiselect-item').as('openTranscriptsList')
            cy.get('@openTranscriptsList').should('have.length.at.least', 1)

            // And the relevant transcripts should be selectable
            formInput[i].transcripts.forEach((transcript) => {
                cy.get('@openTranscriptsList').contains(transcript).click()
            })
            cy.get('@openTranscriptsSelectBox').find('button.p-multiselect-close').click()

            cy.focused().blur()

            // Submit button should stay disabled as long a last entry was not submitted
            if ( i < len - 1 ) {
                cy.get('@submitBtn').should('be.disabled')

                if (i === 0) {
                    // eslint-disable-next-line cypress/no-unnecessary-waiting
                    cy.wait(5000)
                    cy.get('@submitBtn').should('be.disabled')
                }
            }
        }

        // Delete any records that had the delete flag set.
        // Those records are deemed useful for submission form testing
        // but require datasets too large for automated testing (too slow).
        for(let i = 0, len = formInput.length; i < len; ++i){
            if(formInput[i].delete){
                cy.get('.p-inputgroup').eq(i).parents('tr').find('button#remove-record').click()
            }
        }

        // Submit button should become active after completing all input
        cy.get('@submitBtn').should('be.enabled')

        // Submitting the analysis should route to the progress page
        let jobUuid: string

        cy.get('@submitBtn').click()
        cy.location().should((loc: Location) => {
            expect(loc.pathname).to.eq('/progress')

            //queryparams should contain the job UUID
            const uuidCaptureRegex = /^\?uuid=([A-Za-z0-9-]+)$/
            expect(loc.search).to.match(uuidCaptureRegex)

            jobUuid = uuidCaptureRegex.exec(loc.search)![1]
        })

        // Progress page should indicate job progress
        cy.contains('p#progress-msg', /^Job .+ is running\.$/)

        // Successful job completion should route to the results page (wait max 5 minutes)
        cy.location({timeout: 300000}).should((loc: Location) => {
            expect(loc.pathname).to.eq('/result')

            //queryparams should contain the same UUID as progress page did
            expect(loc.search).to.eq(`?uuid=${jobUuid}`)
        })

        // Result page should have a display mode selector
        cy.get('#display-mode').as('displayModeDropdown')
        cy.get('@displayModeDropdown').should('have.length', 1)

        // Display mode selector should default to 'interactive'
        cy.get('@displayModeDropdown').find('option[selected]').should('have.value', 'interactive')

        // nightingale-elements should be visible
        cy.get('nightingale-manager').as('nightingaleManager')
        cy.get('@nightingaleManager').should('have.length', 1)

        cy.get('@nightingaleManager').find('nightingale-navigation').as('nightingaleNavigation')
        cy.get('@nightingaleNavigation').should('have.length', 1)
        cy.get('@nightingaleNavigation').should('be.visible')

        cy.get('@nightingaleManager').find('nightingale-msa').as('nightingaleMsa')
        cy.get('@nightingaleMsa').should('have.length', 1)
        cy.get('@nightingaleMsa').should('be.visible')

        cy.get('@nightingaleMsa').find('msa-labels:visible')
            .as('nightingaleSequenceLabels')

        // all sequences should be visible in nightingale-msa
        cy.get('@nightingaleSequenceLabels').should('have.length', 1)
        cy.get('@nightingaleSequenceLabels').should('be.visible')
        cy.get('@nightingaleSequenceLabels').shadow().find('ul > li').as('NightingaleLabels')

        cy.get('@NightingaleLabels').should('have.length', 5)
        cy.get('@NightingaleLabels').contains('Appl_Appl-RA')
        cy.get('@NightingaleLabels').contains('Appl_Appl-RB')
        cy.get('@NightingaleLabels').contains('apl-1_C42D8.8a.1')
        cy.get('@NightingaleLabels').contains('apl-1_C42D8.8b.1')
        cy.get('@NightingaleLabels').contains('mgl-1_ZC506.4a.1')

        cy.get('@nightingaleSequenceLabels').parent('div').find('msa-sequence-viewer:visible').as('nightingaleSequenceView')
        cy.get('@nightingaleSequenceView').should('have.length', 1)

        // Wait for @nightingaleSequenceView to get a width and height > 0 (no negative values)
        cy.get('@nightingaleSequenceView')
          .invoke('attr', 'width')
          .should('match', /^[1-9][0-9]*$/)

        cy.get('@nightingaleSequenceView')
          .invoke('attr', 'height')
          .should('match', /^[1-9][0-9]*$/)

        // Color-scheme selector should default to 'clustal2'
        const defaultColorScheme = 'clustal2'
        cy.get('#dd-colorscheme').as('colorSchemeDropdown')
        cy.get('@colorSchemeDropdown').should('have.length', 1)
        cy.get('@colorSchemeDropdown').find('option[selected]').should('have.value', defaultColorScheme)

        // Selected color scheme should be represented in nightingale view
        cy.get('@nightingaleSequenceView').should('have.attr', 'color-scheme', defaultColorScheme)

        // Give visual nightingale-elements some time to render
        cy.wait(1000)  //eslint-disable-line cypress/no-unnecessary-waiting

        // Compare (visual) snapshot of successfull cypress @nightingaleSequenceView render
        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleSequenceView')
                .compareSnapshot({name: 'initial-msa-viewer'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'initial-msa-viewer', result: snapshotResult})
                })
        }

        // Selecting a different color scheme should change the colors in nightingale-msa
        const newColorScheme = {
            label: 'Similarity',
            value: 'conservation'
        }
        cy.get('@colorSchemeDropdown').click()
        cy.get('div.p-dropdown-panel > div.p-dropdown-items-wrapper > ul > li:visible')
          .contains(newColorScheme.label).click()

        // Selected color scheme should be represented in nightingale view
        cy.get('@colorSchemeDropdown').find('option[selected]').should('have.value', newColorScheme.value)
        cy.get('@nightingaleSequenceView').should('have.attr', 'color-scheme', newColorScheme.value)

        // Compare (visual) snapshot of successfull cypress @nightingaleSequenceView render
        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleSequenceView')
                .compareSnapshot({name: 'conservation-msa-viewer'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'conservation-msa-viewer', result: snapshotResult})
                })
        }

        // Compare (visual) snapshot of successfull @nightingaleNavigation render
        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleNavigation')
                .compareSnapshot({name: 'initial-msa-navigation'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'initial-msa-navigation', result: snapshotResult})
                })
        }

        cy.get('@nightingaleNavigation').find('svg > g > rect.selection').as('nightingaleNavigationSelector')

        // Dragging the navigation selector should update the displayed navigation bar and the displayed sequence.
        cy.get('@nightingaleNavigationSelector').realMouseDown({button: 'left', position: 'center'})
        cy.get('@nightingaleNavigationSelector').realMouseMove(-100, 0, { position: 'center' })
        cy.get('@nightingaleNavigationSelector').realMouseUp()

        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleNavigation')
                .compareSnapshot({name: 'msa-navigation-bar-moved-left'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'msa-navigation-bar-moved-left', result: snapshotResult})
                })
        }

        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleSequenceView')
                .compareSnapshot({name: 'msa-sequence-view-bar-moved-left'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'msa-sequence-view-bar-moved-left', result: snapshotResult})
                })
        }

        // Return to original position
        cy.get('@nightingaleNavigationSelector').realMouseDown({button: 'left', position: 'center'})
        cy.get('@nightingaleNavigationSelector').realMouseMove(100, 0, { position: 'center' })
        cy.get('@nightingaleNavigationSelector').realMouseUp()

        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleSequenceView')
                .compareSnapshot({name: 'conservation-msa-viewer'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'msa-sequence-view-bar-reset1', result: snapshotResult})
                })
        }

        // Dragging the displayed sequence should update the displayed sequence and navigation bar.
        cy.get('@nightingaleSequenceView')
        cy.get('@nightingaleSequenceView').realMouseDown({button: 'left', position: 'center'})
        cy.get('@nightingaleSequenceView').realMouseMove(-100, 0, { position: 'center' })
        cy.get('@nightingaleSequenceView').realMouseUp()

        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleNavigation')
                .compareSnapshot({name: 'msa-navigation-sequence-moved-left'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'msa-navigation-sequence-moved-left', result: snapshotResult})
                })
        }

        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleSequenceView')
                .compareSnapshot({name: 'msa-sequence-view-sequence-moved-left'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'msa-sequence-view-sequence-moved-left', result: snapshotResult})
                })
        }

        // Return to original position
        cy.get('@nightingaleSequenceView').realMouseDown({button: 'left', position: 'center'})
        cy.get('@nightingaleSequenceView').realMouseMove(100, 0, { position: 'center' })
        cy.get('@nightingaleSequenceView').realMouseUp()

        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleSequenceView')
                .compareSnapshot({name: 'conservation-msa-viewer'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'msa-sequence-view-reset2', result: snapshotResult})
                })
        }

        // Resizing the navigation selector should update the displayed navigation bar and the displayed sequence.
        cy.get('@nightingaleNavigation').find('svg > g > rect.handle--w').as('nightingaleNavigationResizeLeft')

        cy.get('@nightingaleNavigationResizeLeft').realMouseDown({button: 'left', position: 'center'})
        cy.get('@nightingaleNavigationResizeLeft').realMouseMove(50, 0, { position: 'center' })
        cy.get('@nightingaleNavigationResizeLeft').realMouseUp()

        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleNavigation')
                .compareSnapshot({name: 'msa-navigation-nav-resize-left-zoom-in'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'msa-navigation-nav-resize-left-zoom-in', result: snapshotResult})
                })
        }

        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleSequenceView')
                .compareSnapshot({name: 'msa-sequence-view-nav-resize-left-zoom-in'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'msa-sequence-view-nav-resize-left-zoom-in', result: snapshotResult})
                })
        }

        // Changing display mode to 'text' should hide the interactive alignment and display the text alignment
        cy.get('@displayModeDropdown').click()
        cy.get('ul.p-dropdown-items').find('li').contains('Text').click()

        cy.get('@nightingaleMsa').should('not.be.visible')

        cy.get('textarea#alignment-result-text').as('alignmentTextDisplay')
        cy.get('@alignmentTextDisplay').should('be.visible')

        // Displayed alignment should match the expected output
        cy.readFile('cypress/test-resources/submit-workflow-success-output.aln').then(function(txt){
            expect(txt).to.be.a('string')

            cy.get('textarea#alignment-result-text').should('have.text', txt)
        });

        // Returning to 'interactive' display mode should show the interactive alignment with restored state
        cy.get('@displayModeDropdown').click()
        cy.get('ul.p-dropdown-items').find('li').contains('Interactive').click()

        cy.get('@alignmentTextDisplay').should('not.be.visible')
        cy.get('@nightingaleMsa').should('be.visible')

        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleNavigation')
                .compareSnapshot({name: 'msa-navigation-nav-resize-left-zoom-in'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'msa-navigation-nav-resume-interactive', result: snapshotResult})
                })
        }

        if( !Cypress.config('isInteractive') ) {
            cy.get('@nightingaleSequenceView')
                .compareSnapshot({name: 'msa-sequence-view-nav-resize-left-zoom-in'})
                .then((snapshotResult) => {
                    cy.task('storeSnapshotResult', {id: 'msa-sequence-view-nav-resume-interactive', result: snapshotResult})
                })
        }

        cy.task('errorOnSnapshotFailures')
    })
})
