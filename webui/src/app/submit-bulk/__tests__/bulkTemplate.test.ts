import { buildTemplateCsv, TEMPLATE_FILENAME } from '../bulkTemplate';

describe('bulkTemplate', () => {
    it('has the exact header row', () => {
        expect(buildTemplateCsv().split(/\r?\n/)[0]).toBe('species,gene_symbol,transcript,variants');
    });

    it('includes at least one example data row', () => {
        expect(buildTemplateCsv().split(/\r?\n/).length).toBeGreaterThanOrEqual(2);
    });

    it('names the template file with a .csv extension', () => {
        expect(TEMPLATE_FILENAME).toMatch(/\.csv$/);
    });
});
