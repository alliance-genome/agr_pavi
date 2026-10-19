import { renderAlignmentSvg } from '../alignmentSvg';

describe('renderAlignmentSvg', () => {
    const seqs = [
        { name: 'HUMAN_TP53', sequence: 'MEEPQSDPSVEPPL' },
        { name: 'MOUSE_Trp53', sequence: 'MTAMEESQSDIS--' },
    ];

    it('emits a self-contained <svg> with correct viewBox dimensions', () => {
        const svg = renderAlignmentSvg({ sequences: seqs });
        expect(svg).toMatch(/^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
        // viewBox dims scale with column count × cellWidth plus label pad.
        expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
        // Fully closed root — no stray children left outside.
        expect(svg).toMatch(/<\/svg>$/);
    });

    it('renders every residue as a <text> and labels the sequence names', () => {
        const svg = renderAlignmentSvg({ sequences: seqs });
        // Residues are drawn as individual <text>: M appears 2x (once per seq).
        const mCount = (svg.match(/>M</g) ?? []).length;
        expect(mCount).toBeGreaterThanOrEqual(2);
        // Both sequence labels are present.
        expect(svg).toContain('>HUMAN_TP53</text>');
        expect(svg).toContain('>MOUSE_Trp53</text>');
    });

    it('escapes HTML-dangerous characters in sequence names', () => {
        const svg = renderAlignmentSvg({
            sequences: [{ name: '<script>alert(1)</script>', sequence: 'MM' }],
        });
        // Raw tag must not survive; the escaped form must be present.
        expect(svg).not.toContain('<script>alert(1)</script>');
        expect(svg).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('skips gap characters when drawing coloured backgrounds', () => {
        const svg = renderAlignmentSvg({
            sequences: [{ name: 'g', sequence: 'A--M' }],
            colored: true,
        });
        // One fill colour for A (#80a0f0) and one for M (same colour).
        // There should be a single <path> fill="#80a0f0" grouping both.
        expect(svg).toMatch(/fill="#80a0f0"/);
        // The gap positions must not have been drawn — count MoveTo
        // commands: 2 residues → 2 M commands in the path.
        const paths = svg.match(/<path d="([^"]+)" fill="#80a0f0"/);
        expect(paths).not.toBeNull();
        const d = paths![1];
        const mCount = (d.match(/M /g) ?? []).length;
        expect(mCount).toBe(2);
    });

    it('honours startCol/endCol to crop the output', () => {
        const svg = renderAlignmentSvg({
            sequences: seqs,
            startCol: 2,
            endCol: 4,
        });
        // Column count is 3; width = labelWidth + 3*cellWidth + padding.
        // Column labels we expect: 2 and 4 (via start/end), not 1 or 14.
        expect(svg).toContain('>2</text>');
        expect(svg).toContain('>4</text>');
        expect(svg).not.toContain('>14</text>');
    });

    it('is well-formed XML (parseable in jsdom DOMParser)', () => {
        const svg = renderAlignmentSvg({ sequences: seqs });
        const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
        // DOMParser flags errors via a <parsererror> element inside the result.
        const errs = doc.getElementsByTagName('parsererror');
        expect(errs.length).toBe(0);
        // Root element should be <svg>.
        expect(doc.documentElement.tagName.toLowerCase()).toBe('svg');
    });
});
