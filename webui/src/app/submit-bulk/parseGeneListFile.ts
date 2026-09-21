import * as XLSX from 'xlsx';
import { RawRow } from './types';

// Header aliases → canonical field. Matching is lowercase + trimmed.
const HEADER_MAP: Record<string, 'species' | 'symbol' | 'transcript' | 'variants'> = {
    'species': 'species',
    'gene_symbol': 'symbol',
    'gene symbol': 'symbol',
    'symbol': 'symbol',
    'gene': 'symbol',
    'transcript': 'transcript',
    'variants': 'variants',
    'variant': 'variants',
    'alleles': 'variants',
};

function normalizeHeader(h: string): 'species' | 'symbol' | 'transcript' | 'variants' | undefined {
    return HEADER_MAP[h.trim().toLowerCase()];
}

function splitVariants(cell: string | undefined): string[] {
    if (!cell) return [];
    return cell
        .split(/[;,]/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
}

// file.text() / file.arrayBuffer() aren't implemented on jsdom's File in the
// test environment, so read via FileReader instead — it works in both jsdom
// and real browsers.
function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// A parsed non-blank row, tagged with its 1-based physical line number in
// the source file (or physical row number in the spreadsheet) so blank
// lines/rows don't cause lineNumber to drift from the row the user sees.
interface GridRow {
    cells: string[];
    lineNumber: number;
}

function isBlankRow(cells: string[]): boolean {
    return cells.every((c) => c.trim().length === 0);
}

// Read the file into rows of string cells, each tagged with its physical
// line/row number. CSV/TSV are sniffed by delimiter; .xlsx is read via
// SheetJS from the first sheet. Blank lines/rows are skipped but do not
// shift the reported line number of the rows around them.
async function readGrid(file: File): Promise<GridRow[]> {
    const isXlsx = /\.xlsx$/i.test(file.name);
    if (isXlsx) {
        const buf = await readFileAsArrayBuffer(file);
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
            header: 1,
            blankrows: true,
            defval: '',
            raw: false,
        });
        const rows: GridRow[] = [];
        grid.forEach((row, idx) => {
            const cells = row.map((c) => String(c ?? ''));
            if (!isBlankRow(cells)) rows.push({ cells, lineNumber: idx + 1 });
        });
        return rows;
    }
    const text = await readFileAsText(file);
    const allLines = text.split(/\r?\n/);
    const delimiter = (allLines.find((l) => l.trim().length > 0) ?? '').includes('\t') ? '\t' : ',';
    const rows: GridRow[] = [];
    allLines.forEach((line, idx) => {
        if (line.trim().length === 0) return;
        rows.push({ cells: line.split(delimiter).map((c) => c.trim()), lineNumber: idx + 1 });
    });
    return rows;
}

export async function parseGeneListFile(
    file: File
): Promise<{ rows: RawRow[]; fileError?: string }> {
    let grid: GridRow[];
    try {
        grid = await readGrid(file);
    } catch (e) {
        return { rows: [], fileError: `Couldn't read the file: ${e instanceof Error ? e.message : String(e)}` };
    }

    if (grid.length === 0) {
        return { rows: [], fileError: 'The file appears to be empty.' };
    }

    const headerCells = grid[0].cells;
    const colIndex: Partial<Record<'species' | 'symbol' | 'transcript' | 'variants', number>> = {};
    headerCells.forEach((cell, i) => {
        const field = normalizeHeader(cell);
        if (field && colIndex[field] === undefined) colIndex[field] = i;
    });

    if (colIndex.species === undefined || colIndex.symbol === undefined) {
        return {
            rows: [],
            fileError:
                'The file needs a header row with at least "species" and "gene_symbol" columns.',
        };
    }

    const rows: RawRow[] = [];
    for (let i = 1; i < grid.length; i++) {
        const { cells, lineNumber } = grid[i];
        const get = (idx?: number) => (idx === undefined ? '' : (cells[idx] ?? '').trim());
        rows.push({
            species: get(colIndex.species),
            symbol: get(colIndex.symbol),
            transcript: get(colIndex.transcript) || undefined,
            variants: splitVariants(get(colIndex.variants)),
            lineNumber,
        });
    }

    if (rows.length === 0) {
        return { rows: [], fileError: 'The file has a header but no data rows.' };
    }

    return { rows };
}
