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

import React, { useMemo, useState } from 'react';
import { AlignmentViewer } from '@nuin/msa-canvas/react';
import { fromPavi, type PaviSequenceInfo } from '@nuin/msa-canvas/pavi';
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

    // IMPORTANT: memoize the options object. The React wrapper
    // (`mountViewer.update`) calls `viewer.setOptions(options)` whenever
    // the options prop's identity changes, and setOptions internally
    // closes any open popup menu AND overrides the current colorScheme.
    // An inline `{...}` literal would be a new reference every render,
    // which turned the Color-scheme / Export / Order dropdowns into
    // no-ops (they opened then closed in the same tick).
    const options = useMemo(
        () => ({
            theme,
            height: 820,
            colorScheme: 'clustal2',
            labelWidth: 240,
            visibility: {
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
                logo: true,
                logoToggle: true,
                modalFrequency: true,
                gapFraction: true,
                consensus: true,
                reference: true,
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
                // Suppress the kit's "+ Open alignment" button — PAVI
                // supplies the alignment from the API, so the file-upload
                // widget is confusing dead weight here.
                open: false,
            },
        }),
        [theme],
    );

    return (
        <AlignmentViewer
            alignment={alignment}
            options={options}
            className="ak-viewer"
        />
    );
}

export default CanvasAlignment;
