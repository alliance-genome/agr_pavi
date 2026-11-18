// Self-contained SVG renderer for a protein alignment window.
//
// Avoids depending on the Nightingale internals (which render to canvas
// and don't expose a clean "export view" hook). We own the data, we can
// draw it ourselves: one group of <text> per sequence, residues colored
// by a tiny Clustal palette, label column on the left, position ruler
// on top.
//
// Output is a single self-contained SVG string the caller can wrap in
// a Blob and download, or inline into a report.

const CLUSTAL_COLORS: Record<string, string> = {
    A: '#80a0f0', I: '#80a0f0', L: '#80a0f0', M: '#80a0f0',
    F: '#80a0f0', W: '#80a0f0', V: '#80a0f0',
    K: '#f01505', R: '#f01505',
    D: '#c048c0', E: '#c048c0',
    N: '#15c015', Q: '#15c015', S: '#15c015', T: '#15c015',
    C: '#f08080',
    G: '#f09048',
    P: '#c0c000',
    H: '#15a4a4', Y: '#15a4a4',
};

const ESC: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
};

function esc(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

export interface AlignmentSvgOptions {
    readonly sequences: Array<{ name: string; sequence: string }>;
    /** 1-based start column, inclusive. Default 1. */
    readonly startCol?: number;
    /** 1-based end column, inclusive. Default = full length. */
    readonly endCol?: number;
    /** Pixel width of each residue cell. Default 16. */
    readonly cellWidth?: number;
    /** Pixel height of each sequence row. Default 20. */
    readonly cellHeight?: number;
    /** Font family for residues (monospace keeps widths predictable). */
    readonly fontFamily?: string;
    /** Toggle Clustal-style background colouring. Default true. */
    readonly colored?: boolean;
    /** Document title stamped into the SVG for provenance. */
    readonly title?: string;
}

export function renderAlignmentSvg(opts: AlignmentSvgOptions): string {
    const {
        sequences,
        cellWidth = 16,
        cellHeight = 20,
        fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        colored = true,
        title = 'PAVI alignment',
    } = opts;

    const seqLen = sequences.reduce((m, s) => Math.max(m, s.sequence.length), 0);
    const startCol = Math.max(1, opts.startCol ?? 1);
    const endCol = Math.min(seqLen, opts.endCol ?? seqLen);
    const colCount = Math.max(0, endCol - startCol + 1);

    // Label column: enough space for the longest name at ~0.6x font width.
    const maxNameLen = sequences.reduce((m, s) => Math.max(m, s.name.length), 0);
    const labelCharWidth = Math.round(cellWidth * 0.55);
    const labelWidth = Math.max(80, maxNameLen * labelCharWidth + 12);
    const rulerHeight = 20;
    const paddingX = 8;
    const paddingY = 8;

    const gridWidth = colCount * cellWidth;
    const svgWidth = paddingX * 2 + labelWidth + gridWidth;
    const svgHeight = paddingY * 2 + rulerHeight + sequences.length * cellHeight;

    const parts: string[] = [];
    parts.push(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" ` +
        `width="${svgWidth}" height="${svgHeight}" font-family="${esc(fontFamily)}">`,
    );
    parts.push(`<title>${esc(title)}</title>`);
    parts.push(`<desc>Columns ${startCol}-${endCol} of ${sequences.length} sequences</desc>`);
    // White background so the SVG prints cleanly without theming assumptions.
    parts.push(`<rect width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/>`);

    // --- Ruler ---
    // Tick labels every 10 columns; a mid-mark every 5 for visual rhythm.
    const rulerY = paddingY + rulerHeight;
    parts.push(
        `<g transform="translate(${paddingX + labelWidth},${paddingY})" ` +
        `fill="#6b7280" font-size="${Math.round(cellHeight * 0.5)}">`,
    );
    for (let c = startCol; c <= endCol; c++) {
        const x = (c - startCol) * cellWidth + cellWidth / 2;
        if (c === startCol || c === endCol || c % 10 === 0) {
            parts.push(
                `<text x="${x.toFixed(1)}" y="${rulerHeight - 4}" text-anchor="middle">${c}</text>`,
            );
            parts.push(
                `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${rulerHeight - 2}" y2="${rulerHeight}" stroke="#d1d5db"/>`,
            );
        } else if (c % 5 === 0) {
            parts.push(
                `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${rulerHeight - 1}" y2="${rulerHeight}" stroke="#e5e7eb"/>`,
            );
        }
    }
    parts.push('</g>');

    // --- Rows ---
    const fontSize = Math.round(cellHeight * 0.65);
    for (let r = 0; r < sequences.length; r++) {
        const { name, sequence } = sequences[r];
        const rowY = rulerY + r * cellHeight;
        // Label column
        parts.push(
            `<text x="${paddingX + labelWidth - 6}" y="${rowY + cellHeight * 0.72}" ` +
            `text-anchor="end" font-size="${fontSize}" fill="#2563eb" font-weight="600">${esc(name)}</text>`,
        );

        // Backgrounds (grouped per color to keep the file compact)
        if (colored) {
            const byColor: Record<string, string[]> = {};
            for (let c = startCol; c <= endCol; c++) {
                const ch = sequence[c - 1];
                if (!ch || ch === '-' || ch === '.') continue;
                const color = CLUSTAL_COLORS[ch.toUpperCase()];
                if (!color) continue;
                const x = paddingX + labelWidth + (c - startCol) * cellWidth;
                (byColor[color] ??= []).push(`M ${x} ${rowY} h ${cellWidth} v ${cellHeight} h -${cellWidth} Z`);
            }
            for (const [color, paths] of Object.entries(byColor)) {
                parts.push(`<path d="${paths.join(' ')}" fill="${color}" fill-opacity="0.45"/>`);
            }
        }

        // Residue letters
        parts.push(`<g font-size="${fontSize}" fill="#111827" text-anchor="middle">`);
        for (let c = startCol; c <= endCol; c++) {
            const ch = sequence[c - 1] ?? '';
            if (!ch) continue;
            const x = paddingX + labelWidth + (c - startCol) * cellWidth + cellWidth / 2;
            parts.push(
                `<text x="${x.toFixed(1)}" y="${(rowY + cellHeight * 0.72).toFixed(1)}">${esc(ch)}</text>`,
            );
        }
        parts.push('</g>');
    }

    parts.push('</svg>');
    return parts.join('');
}
