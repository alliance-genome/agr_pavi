import { describe, expect, it } from '@jest/globals';
import { applyManeSelect, isHumanTaxon, loadManeSelect, withManeSelect } from '../maneSelect';
import { GffTranscript, pickDefaultTranscript } from '../tabixTranscripts';

const tx = (name: string, coding = true, isCanonical?: boolean): GffTranscript => ({
    id: `rna-${name}`,
    name,
    curie: name,
    strand: 1,
    isCanonical,
    exons: [],
    cds_regions: coding ? [{ start: 1, end: 3, phase: 0 }] : [],
});

describe('applyManeSelect', () => {
    const mane = new Set(['ENST00000269305', 'NM_000546']);

    it('flags transcripts whose unversioned accession is MANE Select', () => {
        const [partial, maneEnst, maneNm] = applyManeSelect(
            [tx('ENST00000413465.6'), tx('ENST00000269305.9'), tx('NM_000546.6')],
            mane,
        );
        expect(partial.isCanonical).toBeUndefined();
        expect(maneEnst.isCanonical).toBe(true);
        expect(maneNm.isCanonical).toBe(true);
    });

    it('matches regardless of the transcript version in the GFF', () => {
        expect(applyManeSelect([tx('ENST00000269305.12')], mane)[0].isCanonical).toBe(true);
    });

    it('keeps an existing canonical flag and does not mutate the input', () => {
        const input = [tx('ENSMUST00000023707', true, true)];
        const out = applyManeSelect(input, mane);
        expect(out[0].isCanonical).toBe(true);
        expect(input[0]).not.toBe(out[0]);
    });

    it('makes the default pick the MANE transcript instead of the first coding one (TP53)', () => {
        // Mirrors TP53 in the Alliance human GFF: a partial isoform is listed first
        // and no transcript carries a canonical tag.
        const tp53 = [tx('ENST00000413465.6'), tx('ENST00000635293.1', false), tx('ENST00000269305.9')];
        expect(pickDefaultTranscript(tp53)?.name).toBe('ENST00000413465.6');
        expect(pickDefaultTranscript(applyManeSelect(tp53, mane))?.name).toBe('ENST00000269305.9');
    });
});

describe('loadManeSelect', () => {
    it('loads the bundled MANE Select list', async () => {
        const mane = await loadManeSelect();
        expect(mane.size).toBeGreaterThan(30000);
        expect(mane.has('ENST00000269305')).toBe(true); // TP53
        expect(mane.has('NM_007294')).toBe(true); // BRCA1
        expect(mane.has('ENST00000413465')).toBe(false); // a non-MANE TP53 isoform
    });

    it('returns the same cached set on repeated calls', async () => {
        expect(await loadManeSelect()).toBe(await loadManeSelect());
    });
});

describe('isHumanTaxon', () => {
    it('is true only for NCBITaxon:9606', () => {
        expect(isHumanTaxon('NCBITaxon:9606')).toBe(true);
        expect(isHumanTaxon('NCBITaxon:10090')).toBe(false);
        expect(isHumanTaxon(undefined)).toBe(false);
    });
});

describe('withManeSelect', () => {
    const tp53 = [tx('ENST00000413465.6'), tx('ENST00000269305.9')];

    it('flags MANE transcripts for human genes', async () => {
        const out = await withManeSelect(tp53, 'NCBITaxon:9606');
        expect(out.map((t) => t.isCanonical)).toEqual([undefined, true]);
    });

    it('leaves other species unchanged (same array, no list download)', async () => {
        expect(await withManeSelect(tp53, 'NCBITaxon:10090')).toBe(tp53);
    });
});
