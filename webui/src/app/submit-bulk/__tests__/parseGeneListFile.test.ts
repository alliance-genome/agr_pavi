import * as XLSX from 'xlsx';
import { parseGeneListFile } from '../parseGeneListFile';

// jsdom's File.text() is available; construct File objects from strings.
function csvFile(name: string, content: string): File {
    return new File([content], name, { type: 'text/plain' });
}

// Build a real .xlsx File in-memory via SheetJS, so the xlsx branch of
// readGrid is exercised end-to-end rather than mocked.
function xlsxFile(name: string, rows: string[][]): File {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    return new File([buf], name, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
}

describe('parseGeneListFile', () => {
    it('parses a CSV with a header row and optional columns', async () => {
        const file = csvFile(
            'genes.csv',
            'species,gene_symbol,transcript,variants\n' +
                'Homo sapiens,TP53,ENST00000269305.9,\n' +
                'Mus musculus,Sod1,,MGI:6157439;MGI:6157441\n'
        );
        const { rows, fileError } = await parseGeneListFile(file);
        expect(fileError).toBeUndefined();
        expect(rows).toEqual([
            { species: 'Homo sapiens', symbol: 'TP53', transcript: 'ENST00000269305.9', variants: [], lineNumber: 2 },
            { species: 'Mus musculus', symbol: 'Sod1', transcript: undefined, variants: ['MGI:6157439', 'MGI:6157441'], lineNumber: 3 },
        ]);
    });

    it('parses TSV and is case-insensitive about header names', async () => {
        const file = csvFile(
            'genes.tsv',
            'Species\tGene_Symbol\n' + 'Rattus norvegicus\tSod1\n'
        );
        const { rows } = await parseGeneListFile(file);
        expect(rows).toEqual([
            { species: 'Rattus norvegicus', symbol: 'Sod1', transcript: undefined, variants: [], lineNumber: 2 },
        ]);
    });

    it('reports a file error when required columns are missing', async () => {
        const file = csvFile('bad.csv', 'foo,bar\n1,2\n');
        const { rows, fileError } = await parseGeneListFile(file);
        expect(rows).toEqual([]);
        expect(fileError).toMatch(/species/i);
    });

    it('reports a file error when there are no data rows', async () => {
        const file = csvFile('empty.csv', 'species,gene_symbol\n');
        const { fileError } = await parseGeneListFile(file);
        expect(fileError).toMatch(/no data rows/i);
    });

    it('parses a real .xlsx workbook via SheetJS', async () => {
        const file = xlsxFile('genes.xlsx', [
            ['species', 'gene_symbol', 'transcript', 'variants'],
            ['Homo sapiens', 'TP53', 'ENST00000269305.9', ''],
            ['Mus musculus', 'Sod1', '', 'MGI:6157439;MGI:6157441'],
        ]);
        const { rows, fileError } = await parseGeneListFile(file);
        expect(fileError).toBeUndefined();
        expect(rows).toEqual([
            { species: 'Homo sapiens', symbol: 'TP53', transcript: 'ENST00000269305.9', variants: [], lineNumber: 2 },
            { species: 'Mus musculus', symbol: 'Sod1', transcript: undefined, variants: ['MGI:6157439', 'MGI:6157441'], lineNumber: 3 },
        ]);
    });

    it('keeps the true physical line number when an interior blank line is present', async () => {
        const file = csvFile(
            'with-blank-line.csv',
            'species,gene_symbol\n' +
                'Homo sapiens,TP53\n' +
                '\n' +
                'Mus musculus,Sod1\n'
        );
        const { rows, fileError } = await parseGeneListFile(file);
        expect(fileError).toBeUndefined();
        expect(rows).toEqual([
            { species: 'Homo sapiens', symbol: 'TP53', transcript: undefined, variants: [], lineNumber: 2 },
            { species: 'Mus musculus', symbol: 'Sod1', transcript: undefined, variants: [], lineNumber: 4 },
        ]);
    });
});
