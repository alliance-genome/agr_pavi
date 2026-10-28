'use client';

// Prototype swap-in for VirtualizedAlignment: renders the alignment with
// @nuin/msa-canvas's React AlignmentViewer + fromPavi() adapter instead of
// Nightingale-MSA. Gated behind the Display-mode dropdown (option
// 'canvas') and only compiled in when NEXT_PUBLIC_MSA_ENGINE is unset or
// 'canvas' — see AlignmentResultView.tsx for the dropdown wiring.
//
// The React component is pure canvas (not a Lit custom element), so the
// data race that forced our hasAutoZoomed workaround for the fullscreen
// viewer doesn't apply here.

import React, { useMemo, useState, useCallback } from 'react';
import { AlignmentViewer } from '@nuin/msa-canvas/react';
import { fromPavi, type PaviSequenceInfo } from '@nuin/msa-canvas/pavi';
import type { Viewport } from '@nuin/msa-canvas';
import '@nuin/msa-canvas/style.css';

import type { SeqInfoDict } from './types';

export interface CanvasAlignmentProps {
    readonly alignmentResult: string;
    readonly seqInfoDict: SeqInfoDict;
    readonly jobUuid?: string;
}

/**
 * Prefer the user's explicit theme (data-theme attribute on <html>) over
 * the kit's default, so a Light/Dark toggle immediately rerenders the
 * canvas with the matching palette instead of relying on
 * prefers-color-scheme.
 */
function useAgrTheme(): 'light' | 'dark' {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof document === 'undefined') return 'light';
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    });

    React.useEffect(() => {
        if (typeof document === 'undefined') return;
        const html = document.documentElement;
        const read = () =>
            setTheme(html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
        read();
        // Listen for both the attribute change (set by useTheme.applyTheme)
        // and media changes that useTheme reflects back onto the attribute.
        const observer = new MutationObserver(read);
        observer.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    return theme;
}

export function CanvasAlignment({ alignmentResult, seqInfoDict }: CanvasAlignmentProps) {
    const theme = useAgrTheme();

    // Build the kit's Alignment object once per alignment payload. The
    // fromPavi() adapter does the heavy lifting: parse Clustal text, map
    // each embedded_variant to an Annotation with mapped/unmapped status,
    // attach species to each row from seqInfoDict.
    const alignment = useMemo(
        () => fromPavi(
            alignmentResult,
            seqInfoDict as unknown as Record<string, PaviSequenceInfo>,
            // annotationInfo (hasDisease/hasPhenotype) could ride through
            // from the Alliance fetcher later; for the prototype we leave
            // it undefined so the kit just doesn't tint those rows.
        ),
        [alignmentResult, seqInfoDict],
    );

    // Track the current viewport purely for diagnostics / future overlay
    // sync (ProteinDomainsPanel + hotspot track need to listen to this
    // once they coexist with the canvas viewer).
    const [viewport, setViewport] = useState<Viewport | null>(null);
    const handleViewportChange = useCallback((v: Viewport) => setViewport(v), []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <AlignmentViewer
                alignment={alignment}
                options={{
                    theme,
                    // Larger surface — the previous 600 clipped to 8 rows
                    // on a 17-sequence alignment. 820 shows ~13 at the
                    // default row height while leaving the stats row + the
                    // inspector panel readable.
                    height: 820,
                    // Protein alignment → default to the kit's Clustal2
                    // palette so the visual read matches the existing
                    // Nightingale viewer when a user flips engines.
                    colorScheme: 'clustal2',
                    // Wider label gutter so full species-tagged row names
                    // (e.g. "APL1_WB:C42D8.8a.1_REF") don't ellipsise.
                    labelWidth: 240,
                    visibility: {
                        // Turn on every feature the kit ships with that
                        // our Nightingale wrapper doesn't currently
                        // expose. Users can hide individual pieces from
                        // the kit's own toolbar at runtime.
                        overview: true,
                        tracks: true,
                        inspector: true,
                        inspectorTabs: true,
                        toolbar: true,
                        search: true,
                        goTo: true,
                        motif: true,
                        order: true,
                        colorScheme: true,
                        colorMode: true,
                        zoom: true,
                        fit: true,
                        fullscreen: true,
                        export: true,
                        theme: true,
                        logo: true,                 // sequence-logo overlay
                        logoToggle: true,
                        modalFrequency: true,       // per-column stat bars
                        gapFraction: true,
                        consensus: true,
                        reference: true,            // highlight the pinned reference row
                        pinReference: true,
                        rowSelection: true,
                        rowPinning: true,
                        rowNames: true,
                        rowSpecies: true,
                        residueLetters: true,
                        annotationMarks: true,
                        selectionOverlay: true,
                        positionTab: true,
                        featuresTab: true,
                        compareTab: true,
                        colorsTab: true,
                        statisticsScope: true,
                        alphabet: true,
                        ruler: true,
                        labels: true,
                        labelResize: true,
                        status: true,
                        statusSummary: true,
                        statusDetails: true,
                    },
                }}
                onViewportChange={handleViewportChange}
                className="ak-viewer"
            />
            {viewport && (
                <div style={{ fontSize: '0.7rem', color: 'var(--agr-text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                    canvas viewport: cols {viewport.start}-{viewport.end} · rows {viewport.firstRow}-{viewport.lastRow}
                </div>
            )}
        </div>
    );
}

export default CanvasAlignment;
