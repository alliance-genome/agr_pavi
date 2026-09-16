/**
 * Jest stub for the browser-oriented tabix/GFF ESM libraries
 * (@gmod/tabix, @gmod/gff, generic-filehandle), which jest can't transform and
 * which would otherwise make real HTTP requests.
 *
 * It lets `src/utils/tabixTranscripts.ts` load under jsdom; the stubbed
 * TabixIndexedFile yields no lines, so `fetchTranscriptsGff` resolves to an
 * empty transcript list by default. Tests that need specific fetch behaviour
 * mock `@/utils/tabixTranscripts` directly.
 */


// --- @gmod/tabix ---
export class TabixIndexedFile {
    constructor(_opts?: unknown) { /* no-op */ }
    async getLines(
        _refseq: string,
        _start: number,
        _end: number,
        _callback: (_line: string) => void,
    ): Promise<void> {
        // No data in tests.
    }
}

// --- generic-filehandle ---
export class RemoteFile {
    constructor(_url?: string, _opts?: unknown) { /* no-op */ }
}

// --- @gmod/gff (default export with a `util.parseFeature`) ---
const gff = {
    util: {
        parseFeature: (_line: string): any => ({ type: '', attributes: {} }),
    },
};

export default gff;
