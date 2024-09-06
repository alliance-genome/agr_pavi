/// <reference types="cypress" />

describe('Test API rewrite functionality', () => {
    it('/openapi.json response matches API config', () => {

        cy.request(`${Cypress.env('API_BASE_URL')}/openapi.json`).then((apiResp) => {

            expect(apiResp.status).to.eq(200)

            cy.request('/openapi.json').then((webResp) => {
                expect(webResp.status).to.eq(200)
                expect(JSON.stringify(webResp.body))
                  .to.eq(JSON.stringify(apiResp.body))
            })
        })
    })

    it('Test openAPI UI endpoint execution', () => {

        cy.visit('/api/docs')

        cy.get('span[data-path="/api/health"').parents('button').as('endpointBtn')
          .should('have.length', 1)
          .should('be.enabled')
          .click()

        cy.get('@endpointBtn').parents('div.opblock.is-open').as('operationBlock')

        cy.get('@operationBlock').find('button.try-out__btn')
          .should('have.length', 1)
          .should('be.enabled')
          .click()

        cy.get('@operationBlock').find('button.execute')
          .should('have.length', 1)
          .should('be.enabled')
          .click()

        cy.get('@operationBlock').find('table.live-responses-table')
          .should('have.length', 1)
          .find('tbody>tr.response>td.response-col_status')
          .contains(200)
    })
})
