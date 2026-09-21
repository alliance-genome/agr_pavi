import { describe, expect, it } from '@jest/globals';
import { reconstructTranscriptsFromRows, GffRow } from '../tabixTranscripts';

// Build a parsed GFF row (the shape @gmod/gff.util.parseFeature yields:
// attribute values are arrays, and a comma-joined GFF3 value is pre-split).
function row(
    type: string,
    start: number,
    end: number,
    attrs: Record<string, string[]>,
    opts: { strand?: string; phase?: number } = {},
): GffRow {
    return { type, start, end, attributes: attrs, strand: opts.strand ?? '+', phase: opts.phase };
}

describe('reconstructTranscriptsFromRows', () => {
    it('reconstructs a transcript with exons + CDS in the final 1-based frame', () => {
        const rows: GffRow[] = [
            row('gene', 100, 500, { ID: ['gene-G'], Name: ['G'] }),
            row('mRNA', 100, 500, { ID: ['rna-T1'], Parent: ['gene-G'], transcript_id: ['T1'] }),
            row('exon', 100, 200, { ID: ['e1'], Parent: ['rna-T1'] }),
            row('exon', 300, 500, { ID: ['e2'], Parent: ['rna-T1'] }),
            row('CDS', 150, 200, { ID: ['c'], Parent: ['rna-T1'], protein_id: ['NP_1'] }, { phase: 0 }),
            row('CDS', 300, 400, { ID: ['c'], Parent: ['rna-T1'], protein_id: ['NP_1'] }, { phase: 1 }),
        ];
        const [t] = reconstructTranscriptsFromRows(rows, 'G');
        expect(t.id).toBe('rna-T1');
        expect(t.name).toBe('T1');
        expect(t.strand).toBe(1);
        expect(t.proteinAccession).toBe('NP_1');
        expect(t.exons).toEqual([{ start: 100, end: 200 }, { start: 300, end: 500 }]);
        expect(t.cds_regions).toEqual([
            { start: 150, end: 200, phase: 0 },
            { start: 300, end: 400, phase: 1 },
        ]);
    });

    // Regression for the comma-joined Parent bug: a shared exon/CDS feature with
    // Parent=[A,B] must attach to BOTH isoforms, not only the first.
    it('attaches a shared exon/CDS to every named parent (multi-valued Parent)', () => {
        const rows: GffRow[] = [
            row('gene', 1, 900, { ID: ['gene-G'], Name: ['G'] }),
            row('mRNA', 1, 900, { ID: ['A'], Parent: ['gene-G'] }),
            row('mRNA', 1, 900, { ID: ['B'], Parent: ['gene-G'] }),
            // one shared exon + one shared CDS, both owned by A and B
            row('exon', 1, 100, { ID: ['e'], Parent: ['A', 'B'] }),
            row('CDS', 10, 90, { ID: ['c'], Parent: ['A', 'B'] }, { phase: 0 }),
            // plus an exon unique to B
            row('exon', 200, 300, { ID: ['eB'], Parent: ['B'] }),
        ];
        const result = reconstructTranscriptsFromRows(rows, 'G');
        const a = result.find((t) => t.id === 'A')!;
        const b = result.find((t) => t.id === 'B')!;
        // Both isoforms get the shared segments (the bug dropped them from B).
        expect(a.exons).toEqual([{ start: 1, end: 100 }]);
        expect(a.cds_regions).toEqual([{ start: 10, end: 90, phase: 0 }]);
        expect(b.exons).toEqual([{ start: 1, end: 100 }, { start: 200, end: 300 }]);
        expect(b.cds_regions).toEqual([{ start: 10, end: 90, phase: 0 }]);
    });

    it('carries strand and keeps segments genomic-ascending on the minus strand', () => {
        const rows: GffRow[] = [
            row('gene', 1, 900, { ID: ['g'], Name: ['G'] }, { strand: '-' }),
            row('mRNA', 1, 900, { ID: ['t'], Parent: ['g'] }, { strand: '-' }),
            row('exon', 300, 400, { Parent: ['t'] }, { strand: '-' }),
            row('exon', 100, 200, { Parent: ['t'] }, { strand: '-' }),
            row('CDS', 320, 400, { Parent: ['t'] }, { strand: '-', phase: 0 }),
            row('CDS', 100, 180, { Parent: ['t'] }, { strand: '-', phase: 2 }),
        ];
        const [t] = reconstructTranscriptsFromRows(rows, 'G');
        expect(t.strand).toBe(-1);
        expect(t.exons).toEqual([{ start: 100, end: 200 }, { start: 300, end: 400 }]);
        expect(t.cds_regions.map((c) => c.start)).toEqual([100, 320]); // ascending
    });

    it('strips ENSEMBL:/RefSeq: DB prefixes from accessions', () => {
        const rows: GffRow[] = [
            row('gene', 1, 900, { ID: ['g'], Name: ['G'] }),
            row('mRNA', 1, 900, { ID: ['t'], Parent: ['g'], transcript_id: ['ENSEMBL:ENST9.1'] }),
            row('CDS', 10, 90, { Parent: ['t'], protein_id: ['RefSeq:NP_9.1'] }, { phase: 0 }),
        ];
        const [t] = reconstructTranscriptsFromRows(rows, 'G');
        expect(t.name).toBe('ENST9.1');
        expect(t.proteinAccession).toBe('NP_9.1');
    });

    describe('gene-membership filtering (fails safe, never open)', () => {
        // Region holds the wanted gene AND a neighbour; only the wanted gene's
        // transcripts must come back.
        const twoGenes: GffRow[] = [
            row('gene', 1, 500, { ID: ['gW'], Name: ['Wanted'] }),
            row('mRNA', 1, 500, { ID: ['tW'], Parent: ['gW'] }),
            row('CDS', 10, 90, { Parent: ['tW'] }, { phase: 0 }),
            row('gene', 600, 900, { ID: ['gN'], Name: ['SYS0001'] }), // neighbour, systematic name
            row('mRNA', 600, 900, { ID: ['tN'], Parent: ['gN'] }),
            row('CDS', 610, 690, { Parent: ['tN'] }, { phase: 0 }),
        ];

        it('returns only the matched gene, excluding a neighbour', () => {
            const result = reconstructTranscriptsFromRows(twoGenes, 'Wanted');
            expect(result.map((t) => t.id)).toEqual(['tW']);
        });

        it('returns nothing (not a wrong gene) when the symbol matches no gene and the slice is ambiguous', () => {
            // Symbol "SYS0001" matches gN by Name, so use one that matches none.
            const result = reconstructTranscriptsFromRows(twoGenes, 'NoSuchGene');
            expect(result).toEqual([]);
        });

        it('falls back to the sole gene when the symbol matches none but the slice has exactly one gene', () => {
            const oneGene: GffRow[] = [
                row('gene', 1, 500, { ID: ['g1'], Name: ['SYSTEMATIC_ID'] }),
                row('mRNA', 1, 500, { ID: ['t1'], Parent: ['g1'] }),
                row('CDS', 10, 90, { Parent: ['t1'] }, { phase: 0 }),
            ];
            const result = reconstructTranscriptsFromRows(oneGene, 'DisplaySymbol');
            expect(result.map((t) => t.id)).toEqual(['t1']);
        });
    });
});
