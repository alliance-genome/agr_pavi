import { ExampleGene } from '@/app/submit/components/ExampleDataLoader/ExampleDataLoader';

export interface RawRow {
    // Optional direct gene id (e.g. HGNC:11998, MGI:98834). When present the
    // resolver skips the symbol+species search and fetches the gene directly.
    geneId?: string;
    species: string;
    symbol: string;
    transcript?: string;
    variants: string[];
    lineNumber: number;
}

export interface SkippedRow {
    lineNumber: number;
    raw: RawRow;
    reason: string;
}

export interface ResolveResult {
    entries: ExampleGene[];
    skipped: SkippedRow[];
}
