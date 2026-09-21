import { ExampleGene } from '@/app/submit/components/ExampleDataLoader/ExampleDataLoader';
import { RawRow, ResolveResult, SkippedRow } from './types';
import { GeneMatch, resolveGeneBySymbolSpecies } from './serverActions';

type Resolver = (_symbol: string, _species: string) => Promise<GeneMatch[]>;

// Turn parsed rows into form entries, best-effort: every row that resolves
// to exactly one gene becomes an ExampleGene; the rest are reported with a
// reason. Genes already resolved from an earlier row are deduped.
export async function resolveRows(
    rows: RawRow[],
    resolver: Resolver = resolveGeneBySymbolSpecies
): Promise<ResolveResult> {
    const entries: ExampleGene[] = [];
    const skipped: SkippedRow[] = [];
    const seenGeneIds = new Set<string>();

    for (const raw of rows) {
        if (!raw.species || !raw.symbol) {
            skipped.push({ lineNumber: raw.lineNumber, raw, reason: 'missing species or gene symbol' });
            continue;
        }

        let matches: GeneMatch[];
        try {
            matches = await resolver(raw.symbol, raw.species);
        } catch (e) {
            skipped.push({
                lineNumber: raw.lineNumber,
                raw,
                reason: `lookup failed: ${e instanceof Error ? e.message : String(e)}`,
            });
            continue;
        }

        if (matches.length === 0) {
            skipped.push({
                lineNumber: raw.lineNumber,
                raw,
                reason: `no gene found for "${raw.symbol}" in ${raw.species}`,
            });
            continue;
        }
        if (matches.length > 1) {
            skipped.push({
                lineNumber: raw.lineNumber,
                raw,
                reason: `ambiguous — matched ${matches.length} genes`,
            });
            continue;
        }

        const match = matches[0];
        if (seenGeneIds.has(match.id)) {
            skipped.push({
                lineNumber: raw.lineNumber,
                raw,
                reason: `duplicate — ${match.symbol} (${match.id}) already loaded`,
            });
            continue;
        }
        seenGeneIds.add(match.id);

        entries.push({
            geneId: match.id,
            geneName: match.symbol,
            species: match.species,
            transcriptNames: raw.transcript ? [raw.transcript] : undefined,
            alleleIds: raw.variants.length > 0 ? raw.variants : undefined,
        });
    }

    return { entries, skipped };
}
