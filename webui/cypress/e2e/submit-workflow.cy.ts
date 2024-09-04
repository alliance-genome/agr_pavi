/// <reference types="cypress" />

// To learn more about how Cypress works,
// please read our getting started guide:
// https://on.cypress.io/introduction-to-cypress

describe('default submit form behaviour', () => {
  beforeEach(() => {
    // Cypress starts out with a blank slate for each test
    // so we must tell it to visit our website with the `cy.visit()` command
    // before each test
    cy.visit('/')
  })

  it('displays one alignmentEntry by default', () => {
    // We use the `cy.get()` command to get all elements that match the selector.
    // There should only be one cell with a inputgroup.
    // cy.get('table tbody tr td .p-inputgroup').should('have.length', 1)
    cy.get('.p-inputgroup').should('have.length', 1)
  })

  it('has a disabled submit button (on incomplete input)', () => {
    cy.get('button').filter('[aria-label="Submit"]').as('submitBtn')

    // There should be excactly one submit button
    cy.get('@submitBtn').should('have.length', 1)
    // and it should be disabled by default (on incomplete input)
    cy.get('@submitBtn')
      .should('be.disabled')
  })
})
