/// <reference types="cypress" />

// Uploads a small gene list on /submit-bulk and asserts the alignment
// form is populated with the resolved genes and the skipped-row report
// shows the unresolvable one.

describe('bulk gene-list upload', () => {
    Cypress.on('uncaught:exception', (err) => {
        if (err.message.includes('CanvasRenderingContext2D')) return false;
        return undefined;
    });

    it('resolves a file into pre-filled alignment entries + a skipped-row report', () => {
        cy.visit('/submit-bulk');

        cy.get('input#bulk-file').selectFile('cypress/fixtures/bulk-genes.csv', { force: true });

        // Two rows resolve (human TP53, mouse Trp53); one is skipped.
        cy.contains(/loaded\s+2\s+genes/i, { timeout: 60_000 }).should('be.visible');
        cy.contains(/skipped 1 row/i).should('be.visible');

        // The gene inputs are populated in the alignment form. Each
        // AlignmentEntry's gene AutoComplete root is `#gene-<index>`
        // (PrimeReact stamps the `id` prop on the root <span>, not the
        // <input> itself), so match by prefix like the allele multiselects
        // in examples-catalog.cy.ts do.
        cy.get('.p-inputgroup [id^="gene-"] input', { timeout: 60_000 }).should('have.length.at.least', 2);
        cy.get('.p-inputgroup [id^="gene-"] input').first().should('have.value', 'TP53 (Hsa)');
    });
});
