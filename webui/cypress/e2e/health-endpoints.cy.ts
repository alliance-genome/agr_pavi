/// <reference types="cypress" />

describe('check all health endpoints', () => {

    it('webUI health endpoint should return success', () => {
        cy.request(`/health`).then((response) => {
            expect(response.status).to.eq(200)
        })
    })

    it('API health endpoint should return success', () => {
        cy.request(`${Cypress.env('API_BASE_URL')}/api/health`).then((response) => {
            expect(response.status).to.eq(200)
        })
    })

})
