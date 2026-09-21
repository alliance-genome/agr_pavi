/// <reference types="cypress" />

// Verifies the "View transcripts" modal opens for a selected gene and the
// genomefeatures viewer renders transcript models into an <svg>.

describe('transcript viewer modal', () => {
    Cypress.on('uncaught:exception', (err) => {
        if (err.message.includes('CanvasRenderingContext2D')) return false;
        return undefined;
    });

    it('opens the viewer and renders transcript models', () => {
        cy.visit('/submit');

        // Load a known example so a gene (with a genome location) is selected.
        cy.get('[aria-label="Open example dataset selector"]').click();
        cy.contains('h4', 'TP53 Orthologs').click();

        // The View transcripts button becomes enabled once a gene is set.
        cy.get('button[aria-label="View transcripts"]', { timeout: 60_000 })
            .first()
            .should('be.enabled')
            .click();

        // The dialog opens with the genome feature svg.
        cy.get('.p-dialog', { timeout: 30_000 }).should('be.visible');
        cy.get('.p-dialog svg[id^="gfv-"]', { timeout: 60_000 }).should('exist');

        // The viewer draws transcript models as SVG path/rect children.
        cy.get('.p-dialog svg[id^="gfv-"]', { timeout: 60_000 })
            .find('path, rect')
            .its('length')
            .should('be.greaterThan', 0);
    });
});
