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

    it('tests job submission success', () => {
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
            cy.get('.p-inputgroup').eq(i).find('input#gene').focus().type(formInput[i].gene)

            // Once the transcript list loaded, from should enable selecting the relevant transcripts.
            cy.get('.p-inputgroup').eq(i).find('#transcripts').find('input').focus()
            cy.get('.p-multiselect-panel').as('openTranscriptsSelectBox').should('be.visible')

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

        // Progress page should indicate successful job completion (wait max 5 minutes)
        cy.contains('p#progress-msg', /^Job .+ is completed\.$/, {timeout: 300000})

        // Successful job completion should route to the results page
        cy.location().should((loc: Location) => {
            expect(loc.pathname).to.eq('/result')

            //queryparams should contain the same UUID as progress page did
            expect(loc.search).to.eq(`?uuid=${jobUuid}`)
        })

        // Result page should display the expected alignment results
        cy.readFile('cypress/fixtures/test-submit-success-output.txt').then(function(txt){
            expect(txt).to.be.a('string')

            cy.get('textarea#alignment-result-text').should('have.text', txt)
        });

    })
})
