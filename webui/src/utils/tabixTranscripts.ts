/**
 * Fetch protein-coding transcript models from AGR's tabix-indexed GFF3 tracks.
 *
 * The AGR JBrowse gene tracks were migrated from NCList (`trackData.jsonz`) to
 * bgzip+tabix GFF3 (`GFF_<PROVIDER>.sorted.gff.gz` + `.tbi`), on the *current*
 * genome assemblies. This module replaces the old NCList fetch: it does an
 * HTTP byte-range tabix query for a gene's region (no full-file download),
 * parses the GFF3 rows, and reconstructs each transcript with its exon and CDS
 * segments.
 *
 * Coordinate contract — IMPORTANT: GFF3 is 1-based inclusive, forward-strand,
 * start <= end, with a per-CDS phase in column 8. That is EXACTLY the frame the
 * PAVI pipeline payload expects (`{start, end}` / `{start, end, frame}`, see
 * JobSumbissionPayloadRecord). So this module emits final coordinates directly
 * and callers must NOT route them through the legacy NCList relative→reference
 * math (`jBrowseSubfeatureRelToRefPos`), which assumes 0-based half-open NCList
 * input and would double-shift every boundary by 1.
 *
 * Strand/order: segments are emitted in genomic-ascending order with strand
 * carried separately. The pipeline (`MultiPartSeqRegion`) re-sorts by start
 * (ascending for '+', descending for '-') and reverse-complements minus-strand
 * regions itself, so no client-side revlist flipping is needed.
 */

import { TabixIndexedFile } from '@gmod/tabix';
import { RemoteFile } from 'generic-filehandle';
import gffModule from '@gmod/gff';
import { FeatureStrand } from '@/app/submit/components/AlignmentEntry/types';

// `@gmod/gff`'s default export is double-wrapped under some module-interop
// builds (the util lives on `.default`); normalise to whichever exposes `util`.
const gff: any = (gffModule as any)?.util
    ? (gffModule as any)
    : (gffModule as any)?.default;

/** One exon segment, 1-based inclusive, genomic forward coords (start <= end). */
export interface GffExon {
    start: number;
    end: number;
}

/** One CDS segment, 1-based inclusive genomic coords, with its reading frame. */
export interface GffCds {
    start: number;
    end: number;
    phase: 0 | 1 | 2;
}

/**
 * A reconstructed transcript. Carries the fields the Alleles/transcript
 * MultiSelect needs (id, name, proteinAccession) AND the exon/CDS segments in
 * the final pipeline coordinate frame, so no further coordinate transform is
 * applied downstream.
 */
export interface GffTranscript {
    /** Stable unique id (GFF `ID` attribute). */
    id: string;
    /** Display accession, DB-prefix stripped (e.g. NM_131327.2, ENSRNOT...). */
    name: string;
    curie: string;
    strand: FeatureStrand;
    proteinAccession?: string;
    isCanonical?: boolean;
    exons: GffExon[];
    cds_regions: GffCds[];
}

export interface FetchTranscriptsGffOptions {
    /** Fully-resolved GFF URL (e.g. .../9.1.0/zfin/zebrafish/GFF_ZFIN.sorted.gff.gz). */
    gffUrl: string;
    /** Chromosome / contig name as it appears in the GFF (bare, e.g. "5"). */
    refseq: string;
    /** Region start (1-based inclusive). */
    start: number;
    /** Region end (1-based inclusive). */
    end: number;
    /** Gene symbol to select (matched against gene-row Name, case-insensitive). */
    geneSymbol: string;
}

// SO transcript-level types we surface as (potential) protein-coding transcripts.
const TRANSCRIPT_TYPES = new Set([
    'mRNA', 'transcript', 'lnc_RNA', 'lncRNA', 'ncRNA', 'primary_transcript',
    'snRNA', 'snoRNA', 'tRNA', 'rRNA', 'miRNA', 'pre_miRNA',
    'C_gene_segment', 'V_gene_segment', 'D_gene_segment', 'J_gene_segment',
]);

function stripDbPrefix(value: unknown): string | undefined {
    if (value == null) return undefined;
    const str = String(value);
    if (str === '' || str === 'None') return undefined;
    // Strip an optional 'DB:' prefix (ENSEMBL:, RefSeq:, NCBI:) but keep bare accessions.
    const m = str.match(/^(?:ENSEMBL|RefSeq|NCBI):(.+)$/i);
    return m ? m[1] : str;
}

function firstAttr(attr: Record<string, any> | undefined, ...keys: string[]): unknown {
    if (!attr) return undefined;
    for (const k of keys) {
        const val = attr[k];
        if (val != null) return Array.isArray(val) ? val[0] : val;
    }
    return undefined;
}

/**
 * Read a possibly multi-valued attribute (e.g. `Parent`) as a flat string list.
 * @gmod/gff parses a comma-separated GFF3 value into an array, but a shared
 * feature's `Parent=a,b,c` must reach ALL of a/b/c — so handle the array form,
 * a raw comma string (defensive), and a single value uniformly.
 */
function attrList(attr: Record<string, any> | undefined, key: string): string[] {
    const val = attr?.[key];
    if (val == null) return [];
    const arr = Array.isArray(val) ? val : [val];
    return arr
        .flatMap((v) => String(v).split(','))
        .map((s) => s.trim())
        .filter(Boolean);
}

interface ChildRow {
    parentId: string;
    type: 'exon' | 'CDS';
    start: number;
    end: number;
    phase?: 0 | 1 | 2;
    proteinAccession?: string;
}

interface TranscriptAcc {
    id: string;
    parentGenes: string[];
    strand: FeatureStrand;
    name: string;
    curie: string;
    isCanonical?: boolean;
    proteinAccession?: string;
    exons: GffExon[];
    cds: GffCds[];
}

/** A parsed GFF3 feature row (the shape `@gmod/gff`'s parseFeature returns). */
export interface GffRow {
    type: string;
    attributes: Record<string, any>;
    start: number;
    end: number;
    strand?: string;
    phase?: number | string | null;
}

/**
 * Parse GFF3 lines into transcripts for a gene. Thin wrapper: parse each line
 * (skipping comments / malformed rows) then delegate to the pure reducer. We
 * parse line-by-line rather than using @gmod/gff's feature-nesting engine,
 * which throws on a region slice whose parent gene row sits outside the sliced
 * '###' scope.
 */
export function reconstructTranscripts(lines: string[], geneSymbol: string): GffTranscript[] {
    const rows: GffRow[] = [];
    for (const line of lines) {
        if (!line || line[0] === '#') continue;
        try {
            rows.push(gff.util.parseFeature(line));
        } catch {
            /* skip malformed line */
        }
    }
    return reconstructTranscriptsFromRows(rows, geneSymbol);
}

/**
 * Reconstruct transcripts (with exon/CDS) for a gene from parsed GFF3 rows.
 * Links exon/CDS to their transcript(s) strictly by `Parent == transcript.ID`
 * (never `transcript_id`, which some providers omit on child rows) — honouring
 * multi-valued `Parent` so a feature shared across isoforms reaches every one —
 * then keeps only the transcripts of the gene whose `Name` matches `geneSymbol`.
 *
 * Pure and @gmod-free so it is directly unit-testable.
 */
export function reconstructTranscriptsFromRows(rows: GffRow[], geneSymbol: string): GffTranscript[] {
    const matchedGeneIds = new Set<string>(); // gene rows whose Name matched the symbol
    const allGeneIds = new Set<string>();      // every gene/pseudogene row in the slice
    const transcripts = new Map<string, TranscriptAcc>();
    const children: ChildRow[] = [];
    const wantLc = geneSymbol.toLowerCase();

    for (const feat of rows) {
        const type: string = feat.type;
        const attr: Record<string, any> = feat.attributes || {};
        const id = firstAttr(attr, 'ID') as string | undefined;
        const parents = attrList(attr, 'Parent');
        const strand: FeatureStrand = feat.strand === '-' ? -1 : 1;

        if (type === 'gene' || type === 'pseudogene') {
            if (!id) continue;
            allGeneIds.add(id);
            const symbol = (firstAttr(attr, 'Name', 'gene_name', 'symbol') as string | undefined) ?? id;
            if (symbol && symbol.toLowerCase() === wantLc) matchedGeneIds.add(id);
        } else if (TRANSCRIPT_TYPES.has(type)) {
            if (!id) continue;
            transcripts.set(id, {
                id,
                parentGenes: parents,
                strand,
                name: stripDbPrefix(firstAttr(attr, 'transcript_id'))
                    ?? stripDbPrefix(firstAttr(attr, 'Name'))
                    ?? id,
                curie: (stripDbPrefix(firstAttr(attr, 'curie', 'transcript_id')) ?? '') as string,
                isCanonical: firstAttr(attr, 'is_canonical') === 'true'
                    || firstAttr(attr, 'canonical') === 'true' || undefined,
                exons: [],
                cds: [],
            });
        } else if (type === 'exon' || type === 'CDS') {
            if (parents.length === 0) continue;
            const phaseRaw = feat.phase;
            const phase = (phaseRaw == null || phaseRaw === '.')
                ? undefined
                : (Number(phaseRaw) as 0 | 1 | 2);
            const proteinAccession = type === 'CDS'
                ? (stripDbPrefix(firstAttr(attr, 'protein_id')) ?? stripDbPrefix(firstAttr(attr, 'Name')))
                : undefined;
            // A shared exon/CDS feature belongs to EVERY named parent transcript.
            for (const parentId of parents) {
                children.push({
                    parentId,
                    type: type as 'exon' | 'CDS',
                    start: feat.start,
                    end: feat.end,
                    phase,
                    proteinAccession,
                });
            }
        }
    }

    // Attach children to their transcript by Parent == transcript ID.
    for (const c of children) {
        const t = transcripts.get(c.parentId);
        if (!t) continue;
        if (c.type === 'exon') {
            t.exons.push({ start: c.start, end: c.end });
        } else {
            t.cds.push({ start: c.start, end: c.end, phase: c.phase ?? 0 });
            if (!t.proteinAccession && c.proteinAccession) t.proteinAccession = c.proteinAccession;
        }
    }

    // Resolve which gene's transcripts to keep. A region query pulls in
    // neighbouring/overlapping genes, so we MUST filter — and fail SAFE, not
    // open: never return a different gene's transcripts under the requested
    // symbol.
    let wantedGeneIds = matchedGeneIds;
    if (wantedGeneIds.size === 0) {
        // No gene row's Name matched the symbol (e.g. a provider whose gene
        // Name is a systematic id). If the slice holds exactly one gene, it is
        // almost certainly the requested one (the query span is that gene's own
        // locus); otherwise we cannot disambiguate → return nothing.
        if (allGeneIds.size === 1) {
            wantedGeneIds = allGeneIds;
        } else {
            return [];
        }
    }

    const result: GffTranscript[] = [];
    for (const t of transcripts.values()) {
        if (!t.parentGenes.some((pg) => wantedGeneIds.has(pg))) continue;
        // Genomic-ascending order; the pipeline re-sorts per strand.
        t.exons.sort((a, b) => a.start - b.start);
        t.cds.sort((a, b) => a.start - b.start);
        result.push({
            id: t.id,
            name: t.name,
            curie: t.curie,
            strand: t.strand,
            proteinAccession: t.proteinAccession,
            isCanonical: t.isCanonical,
            exons: t.exons,
            cds_regions: t.cds,
        });
    }
    return result;
}

/**
 * Fetch and reconstruct the transcripts of a gene from a remote tabix GFF.
 * Returns every transcript belonging to the gene (protein-coding and not);
 * callers decide what to surface/require (a transcript with no CDS cannot be
 * aligned). Throws if the remote GFF/index cannot be read, so the UI can
 * surface a load failure the same way the old NCList path did.
 */
export async function fetchTranscriptsGff(
    options: FetchTranscriptsGffOptions,
): Promise<GffTranscript[]> {
    const { gffUrl, refseq, start, end, geneSymbol } = options;

    // In the browser RemoteFile uses the native fetch; pass it explicitly so the
    // same code also works under Node (jest/SSR) without auto-detection.
    const fetchOpt = { fetch: (...args: Parameters<typeof fetch>) => fetch(...args) };
    const tbi = new TabixIndexedFile({
        filehandle: new RemoteFile(gffUrl, fetchOpt),
        tbiFilehandle: new RemoteFile(`${gffUrl}.tbi`, fetchOpt),
    });

    const lines: string[] = [];
    // tabix getLines is 0-based half-open [start, end); our region is 1-based inclusive.
    await tbi.getLines(refseq, start - 1, end, (line: string) => lines.push(line));

    return reconstructTranscripts(lines, geneSymbol);
}
