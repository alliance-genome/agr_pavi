'use client';

// Fullscreen alignment viewer body — @nuin/msa-canvas powered.
//
// Replaces the previous Nightingale manager+MSA+Linegraph+Navigation
// composition. The kit's AlignmentViewer gives us a full-featured
// MSA grid, overview strip, column statistics, inspector panel and
// built-in SVG/PNG export in one component.

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { AlignmentViewer } from '@nuin/msa-canvas/react';
import { fromPavi, type PaviSequenceInfo } from '@nuin/msa-canvas/pavi';
import '@nuin/msa-canvas/style.css';

import { fetchAlignmentResults, fetchAlignmentSeqInfo } from '../result/components/AlignmentResultView/serverActions';
import type { SeqInfoDict } from '../result/components/InteractiveAlignment/types';

/**
 * Resolve the current theme (light/dark) off the `data-theme` attribute
 * our useTheme hook sets on <html>. Observed via MutationObserver so
 * the kit's palette flips immediately when the user cycles themes
 * without any JS prop update.
 */
function useAgrTheme(): 'light' | 'dark' {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof document === 'undefined') return 'light';
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    });
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const html = document.documentElement;
        const read = () =>
            setTheme(html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
        read();
        const o = new MutationObserver(read);
        o.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
        return () => o.disconnect();
    }, []);
    return theme;
}

export default function FullscreenAlignmentContent() {
    const params = useSearchParams();
    const uuid = params.get('uuid');
    const theme = useAgrTheme();

    const [alignmentResult, setAlignmentResult] = useState<string>('');
    const [seqInfoDict, setSeqInfoDict] = useState<SeqInfoDict>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!uuid) { setError('No job UUID provided.'); setLoading(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const [aln, info] = await Promise.all([
                    fetchAlignmentResults(uuid),
                    fetchAlignmentSeqInfo(uuid),
                ]);
                if (cancelled) return;
                if (!aln) { setError('Failed to load alignment data.'); setLoading(false); return; }
                setAlignmentResult(aln);
                setSeqInfoDict(info ?? {});
                setLoading(false);
            } catch (e) {
                if (!cancelled) { setError('Error loading alignment: ' + (e as Error).message); setLoading(false); }
            }
        })();
        return () => { cancelled = true; };
    }, [uuid]);

    // Build the kit's Alignment object once we have data. fromPavi
    // handles parsing + variant → annotation mapping.
    const alignment = useMemo(() => {
        if (!alignmentResult) return null;
        return fromPavi(
            alignmentResult,
            seqInfoDict as unknown as Record<string, PaviSequenceInfo>,
        );
    }, [alignmentResult, seqInfoDict]);

    if (loading) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: '100vh',
                backgroundColor: 'var(--agr-background-alt)',
                color: 'var(--agr-text-primary)',
            }}>
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', marginRight: '1rem' }} />
                Loading alignment…
            </div>
        );
    }

    if (error || !alignment) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                height: '100vh', gap: '1rem',
                backgroundColor: 'var(--agr-background-alt)',
                color: 'var(--agr-text-primary)',
            }}>
                <i className="pi pi-exclamation-triangle" style={{ fontSize: '3rem', color: 'var(--agr-danger)' }} />
                <div style={{ color: 'var(--agr-danger)', fontSize: '1.2rem' }}>{error ?? 'No data.'}</div>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh', display: 'flex', flexDirection: 'column',
            background: 'var(--agr-background)', color: 'var(--agr-text-primary)',
        }}>
            <FullscreenCanvas alignment={alignment} theme={theme} />
        </div>
    );
}

// Separate the AlignmentViewer into its own component so we can memoize
// the options object with a stable reference across renders. If the
// options literal is inlined, every render triggers viewer.setOptions,
// which closes any open toolbar dropdown and resets colorScheme — making
// the Color scheme / Export / Order selects feel broken.
function FullscreenCanvas({
    alignment, theme,
}: { alignment: ReturnType<typeof fromPavi>; theme: 'light' | 'dark' }) {
    const options = useMemo(
        () => ({
            theme,
            height: typeof window !== 'undefined' ? window.innerHeight : 900,
            colorScheme: 'clustal2',
            labelWidth: 260,
            visibility: {
                overview: true, tracks: true, inspector: true, inspectorTabs: true,
                toolbar: true, search: true, goTo: true, motif: true, order: true,
                colorScheme: true, colorMode: true, zoom: true, fit: true,
                fullscreen: true, export: true, theme: true,
                logo: true, logoToggle: true,
                modalFrequency: true, gapFraction: true, consensus: true,
                reference: true, pinReference: true,
                rowSelection: true, rowPinning: true, rowNames: true, rowSpecies: true,
                residueLetters: true, annotationMarks: true, selectionOverlay: true,
                positionTab: true, featuresTab: true, compareTab: true, colorsTab: true,
                statisticsScope: true, alphabet: true, ruler: true, labels: true,
                labelResize: true, status: true, statusSummary: true, statusDetails: true,
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
            style={{ flex: 1, minHeight: 0 }}
        />
    );
}
