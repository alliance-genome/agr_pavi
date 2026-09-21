/**
 * Pure, dependency-free SVG generator for publication-quality figures of a
 * protein multiple-sequence alignment.
 *
 * The generator takes already-parsed, gapped aligned sequences plus the
 * variant metadata dictionary and returns a complete, self-contained
 * `<svg>...</svg>` string with no external references. Output is fully
 * deterministic (no randomness, no time-dependence), so it can be snapshot
 * tested and diffed.
 *
 * This module intentionally has NO npm dependencies (in particular it does not
 * import clustal-js). Parsing happens in the dialog; this file only renders.
 */

import { SeqInfoDict } from '../components/InteractiveAlignment/types';

/**
 * A single aligned sequence: a display name plus its gapped aligned string.
 */
export interface PublicationSequence {
    name: string;
    sequence: string;
}

export type PublicationColorScheme = 'clustal' | 'hydrophobicity' | 'conservation' | 'mono';
export type PublicationBackground = 'white' | 'transparent';

/**
 * All knobs that drive {@link buildPublicationSvg}.
 */
export interface PublicationSvgOptions {
    /** Residue coloring strategy. */
    colorScheme: PublicationColorScheme;
    /** Render a per-column conservation row beneath the alignment. */
    showConservation: boolean;
    /** Render sequence names on the left. */
    showLabels: boolean;
    /** Render a position ruler with ticks every 10 columns. */
    showRuler: boolean;
    /** Render a small color-scheme key. */
    showLegend: boolean;
    /** Render downward triangles above columns holding any embedded variant. */
    showVariants: boolean;
    /** 1-based inclusive first column to render (default: 1). */
    regionStart?: number;
    /** 1-based inclusive last column to render (default: full width). */
    regionEnd?: number;
    /** Optional figure title drawn at the top. */
    title?: string;
    /** Figure background. */
    background: PublicationBackground;
    /** Residue cell width/height in px (drives overall size). */
    cellSize: number;
}

/**
 * Sensible defaults for {@link PublicationSvgOptions}.
 */
export function defaultPublicationSvgOptions(): PublicationSvgOptions {
    return {
        colorScheme: 'clustal',
        showConservation: true,
        showLabels: true,
        showRuler: true,
        showLegend: true,
        showVariants: true,
        title: '',
        background: 'white',
        cellSize: 18,
    };
}

/* -------------------------------------------------------------------------- */
/* Color maps                                                                 */
/* -------------------------------------------------------------------------- */

const GAP_FILL = '#f4f4f4';
const GAP_TEXT = '#9aa0a6';

/**
 * Canonical ClustalX residue color scheme, grouped by physico-chemical class.
 * Colors are the widely-published ClustalX defaults.
 */
const CLUSTAL_COLORS: Readonly<Record<string, string>> = {
    // Hydrophobic
    A: '#80a0f0', I: '#80a0f0', L: '#80a0f0', M: '#80a0f0',
    F: '#80a0f0', W: '#80a0f0', V: '#80a0f0',
    // Cysteine
    C: '#f08080',
    // Positive charge
    K: '#f01505', R: '#f01505',
    // Negative charge
    E: '#c048c0', D: '#c048c0',
    // Polar
    N: '#15c015', Q: '#15c015', S: '#15c015', T: '#15c015',
    // Glycine
    G: '#f09048',
    // Proline
    P: '#c0c000',
    // Aromatic
    H: '#15a4a4', Y: '#15a4a4',
};

/**
 * Kyte-Doolittle hydropathy values (range roughly -4.5 .. 4.5).
 */
const KYTE_DOOLITTLE: Readonly<Record<string, number>> = {
    I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8,
    G: -0.4, T: -0.7, S: -0.8, W: -0.9, Y: -1.3, P: -1.6,
    H: -3.2, E: -3.5, Q: -3.5, D: -3.5, N: -3.5, K: -3.9, R: -4.5,
};

/** Clustal "strong" similarity groups (score > 0.5). */
const STRONG_GROUPS: readonly string[] = [
    'STA', 'NEQK', 'NHQK', 'NDEQ', 'QHRK', 'MILV', 'MILF', 'HY', 'FYW',
];

/** Clustal "weak" similarity groups (score <= 0.5). */
const WEAK_GROUPS: readonly string[] = [
    'CSA', 'ATV', 'SAG', 'STNK', 'STPA', 'SGND', 'SNDEQK', 'NDEQHK',
    'NEQHRK', 'FVLIM', 'HFY',
];

function isGap(residue: string): boolean {
    return residue === '-' || residue === '.' || residue === ' ';
}

/**
 * Linearly interpolate between two hex colors. `t` is clamped to [0, 1].
 */
function lerpColor(from: string, to: string, t: number): string {
    const clamped = Math.max(0, Math.min(1, t));
    const parse = (hex: string): [number, number, number] => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
    const [r1, g1, b1] = parse(from);
    const [r2, g2, b2] = parse(to);
    const mix = (a: number, b: number): string => {
        const v = Math.round(a + (b - a) * clamped);
        return v.toString(16).padStart(2, '0');
    };
    return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`;
}

/* -------------------------------------------------------------------------- */
/* XML escaping                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Escape a string for safe inclusion in XML text or attribute content.
 */
export function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/* -------------------------------------------------------------------------- */
/* Conservation                                                               */
/* -------------------------------------------------------------------------- */

interface ColumnStat {
    /** Clustal conservation mark for this column: '*', ':', '.', or ''. */
    mark: string;
    /** Fraction of non-gap residues that match the most common residue (0..1). */
    identity: number;
}

function allResiduesShareGroup(residues: string[], groups: readonly string[]): boolean {
    return groups.some((group) => residues.every((r) => group.includes(r)));
}

/**
 * Compute per-column conservation statistics across the (cropped) columns.
 */
function computeColumnStats(rows: string[], colCount: number): ColumnStat[] {
    const stats: ColumnStat[] = [];
    for (let col = 0; col < colCount; col++) {
        const residues: string[] = [];
        for (const row of rows) {
            const residue = (row[col] ?? '-').toUpperCase();
            if (!isGap(residue)) {
                residues.push(residue);
            }
        }

        if (residues.length === 0) {
            stats.push({ mark: '', identity: 0 });
            continue;
        }

        const counts = new Map<string, number>();
        for (const r of residues) {
            counts.set(r, (counts.get(r) ?? 0) + 1);
        }
        const maxCount = Math.max(...counts.values());
        const identity = maxCount / residues.length;

        // A column with gaps cannot be fully conserved.
        const hasGap = residues.length < rows.length;

        let mark = '';
        const uniqueResidues = Array.from(counts.keys());
        if (!hasGap && uniqueResidues.length === 1) {
            mark = '*';
        } else if (!hasGap && allResiduesShareGroup(uniqueResidues, STRONG_GROUPS)) {
            mark = ':';
        } else if (!hasGap && allResiduesShareGroup(uniqueResidues, WEAK_GROUPS)) {
            mark = '.';
        }

        stats.push({ mark, identity });
    }
    return stats;
}

/* -------------------------------------------------------------------------- */
/* Fill resolution                                                            */
/* -------------------------------------------------------------------------- */

function residueFill(
    residue: string,
    colScheme: PublicationColorScheme,
    columnIdentity: number,
): string {
    const upper = residue.toUpperCase();
    if (isGap(upper)) {
        return GAP_FILL;
    }
    switch (colScheme) {
        case 'clustal':
            return CLUSTAL_COLORS[upper] ?? '#ffffff';
        case 'hydrophobicity': {
            const value = KYTE_DOOLITTLE[upper];
            if (value === undefined) return '#ffffff';
            // Map -4.5..4.5 onto blue (hydrophilic) -> red (hydrophobic).
            const t = (value + 4.5) / 9;
            return lerpColor('#3b6fb5', '#e34a33', t);
        }
        case 'conservation':
            // Teal ramp: white (variable) -> teal (conserved).
            return lerpColor('#ffffff', '#0f7d7d', columnIdentity);
        case 'mono':
            return 'none';
        default:
            return '#ffffff';
    }
}

/* -------------------------------------------------------------------------- */
/* Main entry point                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Build a complete, self-contained SVG figure string for the given alignment.
 */
export function buildPublicationSvg(
    sequences: PublicationSequence[],
    seqInfo: SeqInfoDict,
    options: PublicationSvgOptions,
): string {
    const cell = Math.max(6, Math.round(options.cellSize));
    const seqs = sequences ?? [];
    const seqCount = seqs.length;

    const fullWidth = seqs.reduce((max, s) => Math.max(max, s.sequence.length), 0);

    // Resolve crop region (1-based inclusive) into 0-based [startIdx, endIdx).
    let startCol = 1;
    let endCol = fullWidth;
    if (
        typeof options.regionStart === 'number' &&
        typeof options.regionEnd === 'number' &&
        options.regionStart <= options.regionEnd
    ) {
        startCol = Math.max(1, Math.min(options.regionStart, fullWidth || 1));
        endCol = Math.max(startCol, Math.min(options.regionEnd, fullWidth || 1));
    }
    const startIdx = startCol - 1;
    const colCount = Math.max(0, endCol - startCol + 1);

    // Crop each row to the region.
    const croppedRows = seqs.map((s) => {
        const padded = s.sequence.padEnd(fullWidth, '-');
        return padded.slice(startIdx, startIdx + colCount);
    });

    // Layout constants.
    const margin = Math.round(cell * 0.9);
    const labelFontSize = Math.max(9, Math.min(Math.round(cell * 0.62), 14));
    const residueFontSize = Math.max(7, Math.round(cell * 0.6));
    const titleFontSize = Math.max(12, Math.round(cell * 0.95));
    const smallFontSize = Math.max(7, Math.round(cell * 0.5));

    // Label column width.
    let labelWidth = 0;
    if (options.showLabels && seqCount > 0) {
        const maxNameLen = seqs.reduce((max, s) => Math.max(max, s.name.length), 0);
        labelWidth = Math.round(maxNameLen * labelFontSize * 0.62) + 14;
    }

    const gridLeft = margin + labelWidth;
    const gridWidth = colCount * cell;

    // Vertical bands (top to bottom).
    let y = margin;

    const titleText = (options.title ?? '').trim();
    let titleY = 0;
    if (titleText) {
        titleY = y + titleFontSize;
        y += Math.round(titleFontSize * 1.6);
    }

    let variantY = 0;
    const variantRowHeight = Math.round(cell * 0.9);
    if (options.showVariants) {
        variantY = y;
        y += variantRowHeight;
    }

    let rulerY = 0;
    const rulerRowHeight = Math.round(cell * 1.2);
    if (options.showRuler) {
        rulerY = y;
        y += rulerRowHeight;
    }

    const gridTop = y;
    const gridHeight = seqCount * cell;
    y += gridHeight;

    let conservationY = 0;
    const conservationRowHeight = Math.round(cell * 1.1);
    if (options.showConservation) {
        conservationY = y;
        y += conservationRowHeight;
    }

    let legendY = 0;
    const legendRowHeight = Math.round(cell * 1.4);
    let legendItems: { color: string; label: string }[] = [];
    if (options.showLegend) {
        legendItems = legendForScheme(options.colorScheme);
        legendY = y + Math.round(cell * 0.4);
        y += legendRowHeight + Math.round(cell * 0.4);
    }

    const totalWidth = gridLeft + gridWidth + margin;
    const totalHeight = y + margin;

    const columnStats = computeColumnStats(croppedRows, colCount);
    const variantColumns = options.showVariants
        ? collectVariantColumns(seqInfo, startCol, endCol)
        : new Set<number>();

    const parts: string[] = [];
    parts.push(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" ` +
        `viewBox="0 0 ${totalWidth} ${totalHeight}" font-family="Arial, Helvetica, sans-serif">`,
    );

    // Background.
    if (options.background === 'white') {
        parts.push(`<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#ffffff"/>`);
    }

    // Title.
    if (titleText) {
        parts.push(
            `<text x="${gridLeft}" y="${titleY}" font-size="${titleFontSize}" ` +
            `font-weight="bold" fill="#1a1a1a">${escapeXml(titleText)}</text>`,
        );
    }

    // Ruler.
    if (options.showRuler && colCount > 0) {
        parts.push(
            renderRuler(gridLeft, rulerY, rulerRowHeight, cell, colCount, startCol, smallFontSize),
        );
    }

    // Variant triangles.
    if (options.showVariants && variantColumns.size > 0) {
        for (const col of variantColumns) {
            const cx = gridLeft + (col - startCol) * cell + cell / 2;
            const top = variantY + Math.round(variantRowHeight * 0.1);
            const size = Math.round(cell * 0.5);
            const half = size / 2;
            const apexY = top + size;
            parts.push(
                `<polygon points="${fmt(cx - half)},${top} ${fmt(cx + half)},${top} ` +
                `${fmt(cx)},${apexY}" fill="#d62728"/>`,
            );
        }
    }

    // Residue grid.
    for (let r = 0; r < seqCount; r++) {
        const rowY = gridTop + r * cell;
        const row = croppedRows[r];

        // Labels.
        if (options.showLabels) {
            parts.push(
                `<text x="${gridLeft - 8}" y="${rowY + cell / 2}" text-anchor="end" ` +
                `dominant-baseline="central" font-size="${labelFontSize}" fill="#1a1a1a">` +
                `${escapeXml(seqs[r].name)}</text>`,
            );
        }

        for (let c = 0; c < colCount; c++) {
            const residue = row[c] ?? '-';
            const x = gridLeft + c * cell;
            const gap = isGap(residue);
            const fill = residueFill(residue, options.colorScheme, columnStats[c].identity);

            if (fill !== 'none') {
                parts.push(
                    `<rect x="${x}" y="${rowY}" width="${cell}" height="${cell}" fill="${fill}"/>`,
                );
            }

            if (!gap) {
                parts.push(
                    `<text x="${fmt(x + cell / 2)}" y="${fmt(rowY + cell / 2)}" ` +
                    `text-anchor="middle" dominant-baseline="central" ` +
                    `font-family="'Courier New', monospace" font-size="${residueFontSize}" ` +
                    `fill="#1a1a1a">${escapeXml(residue.toUpperCase())}</text>`,
                );
            } else {
                parts.push(
                    `<text x="${fmt(x + cell / 2)}" y="${fmt(rowY + cell / 2)}" ` +
                    `text-anchor="middle" dominant-baseline="central" ` +
                    `font-family="'Courier New', monospace" font-size="${residueFontSize}" ` +
                    `fill="${GAP_TEXT}">-</text>`,
                );
            }
        }
    }

    // Conservation row.
    if (options.showConservation && colCount > 0) {
        for (let c = 0; c < colCount; c++) {
            const stat = columnStats[c];
            const x = gridLeft + c * cell;
            // Shaded bar keyed on identity.
            const barFill = lerpColor('#ffffff', '#3d6b6b', stat.identity);
            parts.push(
                `<rect x="${x}" y="${conservationY}" width="${cell}" ` +
                `height="${conservationRowHeight}" fill="${barFill}"/>`,
            );
            if (stat.mark) {
                parts.push(
                    `<text x="${fmt(x + cell / 2)}" y="${fmt(conservationY + conservationRowHeight / 2)}" ` +
                    `text-anchor="middle" dominant-baseline="central" ` +
                    `font-family="'Courier New', monospace" font-size="${residueFontSize}" ` +
                    `font-weight="bold" fill="#1a1a1a">${escapeXml(stat.mark)}</text>`,
                );
            }
        }
        if (options.showLabels) {
            parts.push(
                `<text x="${gridLeft - 8}" y="${fmt(conservationY + conservationRowHeight / 2)}" ` +
                `text-anchor="end" dominant-baseline="central" font-size="${labelFontSize}" ` +
                `fill="#555555">conservation</text>`,
            );
        }
    }

    // Legend.
    if (options.showLegend && legendItems.length > 0) {
        const swatch = Math.round(cell * 0.7);
        let lx = gridLeft;
        const ly = legendY;
        for (const item of legendItems) {
            if (item.color === 'none') {
                parts.push(
                    `<rect x="${lx}" y="${ly}" width="${swatch}" height="${swatch}" ` +
                    `fill="#ffffff" stroke="#999999"/>`,
                );
            } else {
                parts.push(
                    `<rect x="${lx}" y="${ly}" width="${swatch}" height="${swatch}" fill="${item.color}"/>`,
                );
            }
            const labelX = lx + swatch + 4;
            parts.push(
                `<text x="${labelX}" y="${fmt(ly + swatch / 2)}" dominant-baseline="central" ` +
                `font-size="${smallFontSize}" fill="#333333">${escapeXml(item.label)}</text>`,
            );
            lx = labelX + item.label.length * smallFontSize * 0.6 + 14;
        }
    }

    parts.push('</svg>');
    return parts.join('');
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Format a number for SVG coordinate output, trimming needless decimals.
 */
function fmt(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * Union of alignment columns (1-based) that carry at least one embedded
 * variant, restricted to the [startCol, endCol] region.
 */
function collectVariantColumns(seqInfo: SeqInfoDict, startCol: number, endCol: number): Set<number> {
    const columns = new Set<number>();
    for (const info of Object.values(seqInfo ?? {})) {
        for (const variant of info.embedded_variants ?? []) {
            const col = variant.alignment_start_pos;
            if (typeof col === 'number' && col >= startCol && col <= endCol) {
                columns.add(col);
            }
        }
    }
    return columns;
}

/**
 * Render the position ruler: a baseline plus ticks/labels every 10 columns.
 */
function renderRuler(
    gridLeft: number,
    rulerY: number,
    rulerHeight: number,
    cell: number,
    colCount: number,
    startCol: number,
    fontSize: number,
): string {
    const baselineY = rulerY + rulerHeight - 1;
    const segments: string[] = [];
    segments.push(
        `<line x1="${gridLeft}" y1="${baselineY}" x2="${gridLeft + colCount * cell}" ` +
        `y2="${baselineY}" stroke="#888888" stroke-width="1"/>`,
    );
    // First column, then every column whose 1-based position is a multiple of 10.
    for (let c = 0; c < colCount; c++) {
        const pos = startCol + c;
        const isTick = pos === startCol || pos % 10 === 0;
        if (!isTick) continue;
        const x = gridLeft + c * cell + cell / 2;
        segments.push(
            `<line x1="${fmt(x)}" y1="${baselineY - 4}" x2="${fmt(x)}" y2="${baselineY}" ` +
            `stroke="#888888" stroke-width="1"/>`,
        );
        segments.push(
            `<text x="${fmt(x)}" y="${baselineY - 6}" text-anchor="middle" ` +
            `font-size="${fontSize}" fill="#555555">${pos}</text>`,
        );
    }
    return segments.join('');
}

/**
 * Legend entries for the given color scheme.
 */
function legendForScheme(scheme: PublicationColorScheme): { color: string; label: string }[] {
    switch (scheme) {
        case 'clustal':
            return [
                { color: '#80a0f0', label: 'Hydrophobic' },
                { color: '#f01505', label: 'Positive' },
                { color: '#c048c0', label: 'Negative' },
                { color: '#15c015', label: 'Polar' },
                { color: '#f09048', label: 'Glycine' },
                { color: '#c0c000', label: 'Proline' },
                { color: '#15a4a4', label: 'Aromatic' },
                { color: '#f08080', label: 'Cysteine' },
            ];
        case 'hydrophobicity':
            return [
                { color: '#3b6fb5', label: 'Hydrophilic' },
                { color: '#b58a74', label: 'Neutral' },
                { color: '#e34a33', label: 'Hydrophobic' },
            ];
        case 'conservation':
            return [
                { color: '#ffffff', label: 'Variable' },
                { color: '#88bcbc', label: 'Partial' },
                { color: '#0f7d7d', label: 'Conserved' },
            ];
        case 'mono':
            return [{ color: 'none', label: 'No coloring' }];
        default:
            return [];
    }
}
