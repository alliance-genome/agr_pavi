import { ExampleGene } from '@/app/submit/components/ExampleDataLoader/ExampleDataLoader';

export interface RawRow {
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
