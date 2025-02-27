/// <reference types="cypress" />

describe('check all health endpoints', () => {

    it('webUI health endpoint should return success', () => {
        cy.request(`/health`).then((response) => {
            // Must return with status code 200 as that's expected by EB health checks
            expect(response.status).to.eq(200)

            // Response must never be cached
            let response_cache_control = response.headers['cache-control']
            if(typeof response_cache_control === 'string'){
                const cache_control_flags = response_cache_control.split(/\s*,\s*/)
                response_cache_control = cache_control_flags
            }

            expect(response_cache_control).not.to.be.an('undefined')

            const cache_control_map = new Map()
            response_cache_control.forEach((val) => { cache_control_map.set(val, true) })

            expect(cache_control_map).to.include.any.keys('no-cache', 'no-store')
        })

        cy.intercept('/health', () => {
            console.log('/health GET call intercepted.')
        }).as('healthCall')

        cy.visit('/health')
        cy.wait('@healthCall')
        cy.location().should((loc: Location) => {
            expect(loc.pathname).to.eq('/health')
        })
        cy.get('div').contains('This the web application is healthy and ready to receive!')

        //Reloading page must request new page load (not cache)
        cy.reload()
        cy.wait('@healthCall')
    })

    it('API health endpoint should return success', () => {
        cy.request(`${Cypress.env('API_BASE_URL')}/api/health`).then((response) => {
            expect(response.status).to.eq(200)
        })
    })

})
