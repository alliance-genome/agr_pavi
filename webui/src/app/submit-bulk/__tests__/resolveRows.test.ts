import { resolveRows } from '../resolveRows';
import { RawRow } from '../types';
import type { GeneMatch } from '../serverActions';

function row(partial: Partial<RawRow> & { lineNumber: number }): RawRow {
    return { species: 'Homo sapiens', symbol: 'TP53', variants: [], ...partial };
}

describe('resolveRows', () => {
    it('resolves a unique symbol+species match into an ExampleGene entry', async () => {
        const resolver = async (): Promise<GeneMatch[]> => [
            { id: 'HGNC:11998', symbol: 'TP53', species: 'Homo sapiens' },
        ];
        const { entries, skipped } = await resolveRows(
            [row({ lineNumber: 2, transcript: 'ENST1', variants: ['HGNC:a'] })],
            resolver
        );
        expect(skipped).toEqual([]);
        expect(entries).toEqual([
            {
                geneId: 'HGNC:11998',
                geneName: 'TP53',
                species: 'Homo sapiens',
                transcriptNames: ['ENST1'],
                alleleIds: ['HGNC:a'],
            },
        ]);
    });

    it('skips a row with a missing required cell', async () => {
        const resolver = async (): Promise<GeneMatch[]> => [];
        const { entries, skipped } = await resolveRows(
            [row({ lineNumber: 2, symbol: '' })],
            resolver
        );
        expect(entries).toEqual([]);
        expect(skipped[0].reason).toMatch(/missing/i);
    });

    it('skips when no gene is found', async () => {
        const resolver = async (): Promise<GeneMatch[]> => [];
        const { skipped } = await resolveRows([row({ lineNumber: 2, symbol: 'NOPE' })], resolver);
        expect(skipped[0].reason).toMatch(/no gene found/i);
    });

    it('skips an ambiguous match without guessing', async () => {
        const resolver = async (): Promise<GeneMatch[]> => [
            { id: 'A:1', symbol: 'Sod1', species: 'Mus musculus' },
            { id: 'A:2', symbol: 'Sod1', species: 'Mus musculus' },
        ];
        const { entries, skipped } = await resolveRows(
            [row({ lineNumber: 2, species: 'Mus musculus', symbol: 'Sod1' })],
            resolver
        );
        expect(entries).toEqual([]);
        expect(skipped[0].reason).toMatch(/ambiguous/i);
    });

    it('dedupes a gene already resolved from an earlier row', async () => {
        const resolver = async (): Promise<GeneMatch[]> => [
            { id: 'HGNC:11998', symbol: 'TP53', species: 'Homo sapiens' },
        ];
        const { entries, skipped } = await resolveRows(
            [row({ lineNumber: 2 }), row({ lineNumber: 3 })],
            resolver
        );
        expect(entries).toHaveLength(1);
        expect(skipped[0].reason).toMatch(/duplicate/i);
    });
});
