import {
    buildPublicationSvg,
    defaultPublicationSvgOptions,
    PublicationSequence,
    PublicationSvgOptions,
} from '../publicationSvg';
import { SeqInfoDict } from '../../components/InteractiveAlignment/types';

/**
 * Small deterministic fixture: three aligned sequences (12 columns) with one
 * gap column and clear conserved / variable positions.
 */
const sequences: PublicationSequence[] = [
    { name: 'seqA', sequence: 'MKTAYIAK-QRW' },
    { name: 'seqB', sequence: 'MKTAYLAK-QRF' },
    { name: 'seqC', sequence: 'MKTAFIAK-QRY' },
];

/** One embedded variant on seqA at alignment column 5. */
const seqInfo: SeqInfoDict = {
    seqA: {
        embedded_variants: [
            {
                alignment_start_pos: 5,
                alignment_end_pos: 5,
                seq_start_pos: 5,
                seq_end_pos: 5,
                seq_length: 12,
                variant_id: 'var-1',
                genomic_seq_id: 'chr1',
                genomic_start_pos: 100,
                genomic_end_pos: 100,
                genomic_ref_seq: 'A',
                genomic_alt_seq: 'T',
                seq_substitution_type: 'point',
                hgvs_protein: 'p.Tyr5Phe',
                molecular_consequences: ['missense_variant'],
                impact: 'MODERATE',
            },
        ],
    },
};

function opts(overrides: Partial<PublicationSvgOptions> = {}): PublicationSvgOptions {
    return { ...defaultPublicationSvgOptions(), ...overrides };
}

function viewBoxWidth(svg: string): number {
    const match = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) /);
    expect(match).not.toBeNull();
    return Number(match![1]);
}

describe('buildPublicationSvg', () => {
    it('returns a self-contained svg string', () => {
        const svg = buildPublicationSvg(sequences, seqInfo, opts());
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg.endsWith('</svg>')).toBe(true);
        expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
        // No external references.
        expect(svg).not.toContain('http://www.w3.org/1999/xlink');
        expect(svg).not.toMatch(/xlink:href|<image|url\(/);
    });

    it('includes sequence names when showLabels is on and omits them when off', () => {
        const withLabels = buildPublicationSvg(sequences, seqInfo, opts({ showLabels: true }));
        expect(withLabels).toContain('seqA');
        expect(withLabels).toContain('seqB');

        const withoutLabels = buildPublicationSvg(sequences, seqInfo, opts({ showLabels: false }));
        expect(withoutLabels).not.toContain('seqA');
    });

    it('crops to the requested region, reducing residue count and viewBox width', () => {
        const full = buildPublicationSvg(sequences, seqInfo, opts({ showLegend: false }));
        const cropped = buildPublicationSvg(
            sequences,
            seqInfo,
            opts({ regionStart: 1, regionEnd: 4, showLegend: false }),
        );

        expect(viewBoxWidth(cropped)).toBeLessThan(viewBoxWidth(full));

        // Count rendered residue letters (single-letter monospace text nodes).
        const countLetters = (svg: string): number =>
            (svg.match(/monospace" font-size="\d+" fill="#1a1a1a">[A-Z]<\/text>/g) ?? []).length;
        expect(countLetters(cropped)).toBeLessThan(countLetters(full));
    });

    it('treats start > end as the full alignment', () => {
        const full = buildPublicationSvg(sequences, seqInfo, opts({ showLegend: false }));
        const inverted = buildPublicationSvg(
            sequences,
            seqInfo,
            opts({ regionStart: 10, regionEnd: 2, showLegend: false }),
        );
        expect(viewBoxWidth(inverted)).toBe(viewBoxWidth(full));
    });

    it('draws the title when set', () => {
        const svg = buildPublicationSvg(sequences, seqInfo, opts({ title: 'My Figure' }));
        expect(svg).toContain('My Figure');
        expect(svg).toContain('font-weight="bold"');
    });

    it('adds a variant marker triangle only when showVariants is on', () => {
        const withVariants = buildPublicationSvg(sequences, seqInfo, opts({ showVariants: true }));
        expect(withVariants).toContain('<polygon');
        expect(withVariants).toContain('fill="#d62728"');

        const withoutVariants = buildPublicationSvg(sequences, seqInfo, opts({ showVariants: false }));
        expect(withoutVariants).not.toContain('fill="#d62728"');
    });

    it('changes residue fills when the color scheme changes', () => {
        const clustal = buildPublicationSvg(sequences, seqInfo, opts({ colorScheme: 'clustal', showLegend: false }));
        const hydro = buildPublicationSvg(sequences, seqInfo, opts({ colorScheme: 'hydrophobicity', showLegend: false }));
        const mono = buildPublicationSvg(sequences, seqInfo, opts({ colorScheme: 'mono', showLegend: false }));

        // Clustal uses its hydrophobic blue for M/A/etc.
        expect(clustal).toContain('#80a0f0');
        expect(hydro).not.toContain('#80a0f0');
        // Mono draws no residue fill rects for letters (only background/conservation).
        expect(mono).not.toContain('#80a0f0');
    });

    it('XML-escapes special characters in names and titles', () => {
        const trickySeqs: PublicationSequence[] = [
            { name: 'a&b<c>', sequence: 'MKT' },
        ];
        const svg = buildPublicationSvg(trickySeqs, {}, opts({ title: 'T & <U>' }));
        expect(svg).toContain('a&amp;b&lt;c&gt;');
        expect(svg).toContain('T &amp; &lt;U&gt;');
        // Raw unescaped forms must not leak into text content.
        expect(svg).not.toContain('a&b<c>');
    });

    it('is deterministic for identical inputs', () => {
        const a = buildPublicationSvg(sequences, seqInfo, opts());
        const b = buildPublicationSvg(sequences, seqInfo, opts());
        expect(a).toBe(b);
    });
});
