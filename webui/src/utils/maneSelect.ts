import type { GffTranscript } from './tabixTranscripts';

// MANE Select (NCBI + Ensembl) picks one representative transcript per human
// protein-coding gene. The Alliance human GFF carries no canonical tag, so
// without this the submit form preselected the first coding transcript, often
// a partial isoform (e.g. TP53 ENST00000413465, 285 aa instead of 393 aa).
// The list lives in src/data/mane-select.json; regenerate it with
// `node scripts/build-mane-select.mjs`.

const HUMAN_TAXON = 'NCBITaxon:9606';

export function isHumanTaxon(taxonId: string | undefined): boolean {
    return taxonId === HUMAN_TAXON;
}

let maneSelectPromise: Promise<Set<string>> | undefined;

/**
 * Load the MANE Select accessions (unversioned Ensembl and RefSeq transcript IDs).
 * Imported on demand so only pages that load a human gene download the list.
 */
export function loadManeSelect(): Promise<Set<string>> {
    maneSelectPromise ??= import('../data/mane-select.json').then(
        (mod) => new Set<string>(mod.default.transcripts),
    );
    return maneSelectPromise;
}

const unversioned = (accession: string): string => accession.replace(/\.\d+$/, '');

/** Mark MANE Select transcripts as canonical, so pickDefaultTranscript prefers them. */
export function applyManeSelect(transcripts: GffTranscript[], maneSelect: Set<string>): GffTranscript[] {
    return transcripts.map((t) =>
        !t.isCanonical && maneSelect.has(unversioned(t.name)) ? { ...t, isCanonical: true } : { ...t },
    );
}

/**
 * Flag MANE Select transcripts for human genes; other species are returned as-is.
 * If the list cannot be loaded, the transcripts are returned unflagged so the
 * form still works, falling back to the first coding transcript.
 */
export async function withManeSelect(transcripts: GffTranscript[], taxonId: string | undefined): Promise<GffTranscript[]> {
    if (!isHumanTaxon(taxonId)) return transcripts;
    try {
        return applyManeSelect(transcripts, await loadManeSelect());
    } catch (e) {
        console.error('Failed to load the MANE Select list; default transcript falls back to the first coding one.', e);
        return transcripts;
    }
}
