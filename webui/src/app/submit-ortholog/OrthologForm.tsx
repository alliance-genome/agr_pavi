'use client';

import React, { useState, useCallback, useEffect, useMemo, createRef } from 'react';
import { useRouter } from 'next/navigation';

import { AutoComplete, AutoCompleteState } from 'primereact/autocomplete';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';

import { useGeneSearch } from '@/hooks';
import { fetchGeneInfo } from '@/app/submit/components/AlignmentEntry/serverActions';
import { GeneInfo } from '@/app/submit/components/AlignmentEntry/types';
import { submitNewPipelineJob } from '@/app/submit/components/JobSubmitForm/serverActions';
import { JobSumbissionPayloadRecord } from '@/app/submit/components/JobSubmitForm/types';

import { fetchOrthologs, OrthologInfo, OrthologStringency } from './serverActions';

import { getSpecies, getSingleGenomeLocation, gffFileUrl } from '@/utils/agrSpeciesConfig';
import { fetchTranscriptsGff, pickDefaultTranscript } from '@/utils/tabixTranscripts';
import { withManeSelect } from '@/utils/maneSelect';

import styles from './page.module.css';

const AGR_SPECIES_TAXONS = new Set([
    'NCBITaxon:9606',
    'NCBITaxon:10090',
    'NCBITaxon:10116',
    'NCBITaxon:7955',
    'NCBITaxon:7227',
    'NCBITaxon:6239',
    'NCBITaxon:559292',
    'NCBITaxon:8364',
]);

// Classify a species into a broad taxonomic group for the filter chips.
// The lookup is NCBI-taxon-id first (fast, unambiguous for the common AGR
// organisms), with a conservative substring fallback over the species name
// for everything else the API might return at lower stringency.
type SpeciesGroup = 'vertebrate' | 'invertebrate' | 'fungi' | 'plant' | 'other';

const SPECIES_GROUP_BY_TAXON: Record<string, SpeciesGroup> = {
    'NCBITaxon:9606':   'vertebrate',  // Human
    'NCBITaxon:10090':  'vertebrate',  // Mouse
    'NCBITaxon:10116':  'vertebrate',  // Rat
    'NCBITaxon:7955':   'vertebrate',  // Zebrafish
    'NCBITaxon:8364':   'vertebrate',  // X. tropicalis
    'NCBITaxon:8355':   'vertebrate',  // X. laevis
    'NCBITaxon:7227':   'invertebrate', // Fly
    'NCBITaxon:6239':   'invertebrate', // Worm
    'NCBITaxon:559292': 'fungi',       // S. cerevisiae
    'NCBITaxon:4932':   'fungi',       // S. cerevisiae (parent)
    'NCBITaxon:284812': 'fungi',       // S. pombe
};

function classifySpecies(info: { taxonId: string; species: string }): SpeciesGroup {
    const byTaxon = SPECIES_GROUP_BY_TAXON[info.taxonId];
    if (byTaxon) return byTaxon;
    const name = info.species.toLowerCase();
    // Rough-but-serviceable fallback. Order matters: check 'arabidopsis'
    // before any mammal keyword.
    if (/arabidopsis|oryza| rice | zea mays|solanum/.test(name)) return 'plant';
    if (/saccharomyces|candida|aspergillus|neurospora|schizosaccharomyces|fungi/.test(name)) return 'fungi';
    if (/drosophila|caenorhabditis|anopheles|aedes|apis mellifera|bombyx/.test(name)) return 'invertebrate';
    if (/homo|mus |rattus|danio|xenopus|gallus|canis|bos |sus scrofa|macaca|pan troglodytes|monodelphis|ovis|equus|felis/.test(name)) {
        return 'vertebrate';
    }
    return 'other';
}

const SPECIES_GROUP_LABEL: Record<SpeciesGroup, string> = {
    vertebrate: 'Vertebrate',
    invertebrate: 'Invertebrate',
    fungi: 'Fungi',
    plant: 'Plant',
    other: 'Other',
};
const SPECIES_GROUP_ORDER: SpeciesGroup[] = ['vertebrate', 'invertebrate', 'fungi', 'plant', 'other'];

interface OrthologFormProps {
    agrjBrowseDataRelease: string;
}

interface OrthologEntry extends OrthologInfo {
    selected: boolean;
}

type SubmitPhase = 'idle' | 'searching' | 'fetching-genes' | 'fetching-transcripts' | 'submitting' | 'done' | 'error';

export function OrthologForm({ agrjBrowseDataRelease }: OrthologFormProps) {
    const router = useRouter();

    // Gene search — reuse the same hook as /submit
    const geneFieldRef = createRef<AutoComplete>();
    const geneFieldStateRef = createRef<AutoCompleteState>();
    const geneSearch = useGeneSearch({}, geneFieldRef, geneFieldStateRef);

    // Ortholog state
    const [orthologs, setOrthologs] = useState<OrthologEntry[]>([]);
    const [orthologsLoading, setOrthologsLoading] = useState(false);
    const [sourceGene, setSourceGene] = useState<OrthologInfo | null>(null);
    const [includeSource, setIncludeSource] = useState(true);
    // The Alliance orthology set changes meaningfully by stringency — e.g.
    // 'all' typically returns 2-3x the stringent set with weak homologs.
    const [stringency, setStringency] = useState<OrthologStringency>('stringent');
    // Which species groups the list is currently filtered to. Starts with
    // all groups enabled so the user sees everything the API returned; the
    // chips let them narrow by broad taxonomic branch.
    const [visibleGroups, setVisibleGroups] = useState<Set<SpeciesGroup>>(
        new Set(SPECIES_GROUP_ORDER),
    );

    // Submit state
    const [phase, setPhase] = useState<SubmitPhase>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Extract a readable message from a thrown value (Error or otherwise).
    const errMsg = (e: unknown): string =>
        e instanceof Error ? e.message : String(e);

    // Auto-fetch orthologs whenever the focus gene OR stringency changes.
    // Cancellation guards against a stale response landing after a quick
    // reselect or stringency change.
    const focusGeneId = geneSearch.gene?.id;
    useEffect(() => {
        if (!focusGeneId) return;
        let cancelled = false;
        setOrthologsLoading(true);
        setError(null);
        setOrthologs([]);
        setSourceGene(null);

        fetchOrthologs(focusGeneId, stringency)
            .then((result) => {
                if (cancelled) return;
                setSourceGene(result.sourceGene);
                setOrthologs(result.orthologs.map((o) => ({
                    ...o,
                    selected: AGR_SPECIES_TAXONS.has(o.taxonId),
                })));
            })
            .catch((e) => {
                if (cancelled) return;
                setError(`Failed to fetch orthologs: ${errMsg(e)}`);
            })
            .finally(() => {
                if (!cancelled) setOrthologsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [focusGeneId, stringency]);

    const toggleOrtholog = useCallback((geneId: string) => {
        setOrthologs(prev => prev.map(o =>
            o.geneId === geneId ? { ...o, selected: !o.selected } : o
        ));
    }, []);

    const selectAll = useCallback(() => {
        setOrthologs(prev => prev.map(o => ({ ...o, selected: true })));
    }, []);

    const selectNone = useCallback(() => {
        setOrthologs(prev => prev.map(o => ({ ...o, selected: false })));
    }, []);

    const selectAgrOnly = useCallback(() => {
        setOrthologs(prev => prev.map(o => ({
            ...o, selected: AGR_SPECIES_TAXONS.has(o.taxonId),
        })));
    }, []);

    const stringencyOptions: Array<{ label: string; value: OrthologStringency }> = [
        { label: 'Stringent', value: 'stringent' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'All (any homology)', value: 'all' },
    ];

    // Per-group counts across the full ortholog list, used for the chip
    // badges. Memoized so the chip row doesn't recompute on every state tick.
    const groupCounts = useMemo(() => {
        const counts: Record<SpeciesGroup, number> = {
            vertebrate: 0, invertebrate: 0, fungi: 0, plant: 0, other: 0,
        };
        for (const o of orthologs) counts[classifySpecies(o)] += 1;
        return counts;
    }, [orthologs]);

    const visibleOrthologs = useMemo(
        () => orthologs.filter((o) => visibleGroups.has(classifySpecies(o))),
        [orthologs, visibleGroups],
    );

    const toggleGroup = useCallback((group: SpeciesGroup) => {
        setVisibleGroups((prev) => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group);
            else next.add(group);
            return next;
        });
    }, []);

    // "Selected" counts both selected orthologs and the optional source.
    // We use the full orthologs list, not visibleOrthologs: a user who
    // selected a vertebrate ortholog and then hid vertebrates in the chip
    // row still intends to submit that ortholog — hiding is only visual.
    const selectedCount = orthologs.filter(o => o.selected).length + (includeSource ? 1 : 0);


    interface BuildPayloadResult {
        record: JobSumbissionPayloadRecord | null;
        error: string | null;
    }

    // Fetch transcript data for a single gene and build payload record.
    // Returns a structured result so callers can collect failures without
    // sharing mutable state through the function object.
    async function buildPayloadForGene(gene: GeneInfo, index: number): Promise<BuildPayloadResult> {
        try {
            const speciesConfig = getSpecies(gene.species.taxonId);
            const genomeLocation = getSingleGenomeLocation(gene.genomeLocations);

            const gffUrl = gffFileUrl(speciesConfig, agrjBrowseDataRelease);

            const transcripts = await withManeSelect(
                await fetchTranscriptsGff({
                    gffUrl,
                    refseq: genomeLocation['chromosome'],
                    start: genomeLocation['start'],
                    end: genomeLocation['end'],
                    geneSymbol: gene['symbol'],
                }),
                gene.species.taxonId,
            );

            if (!transcripts || transcripts.length === 0) {
                return { record: null, error: `${gene.symbol}: no transcripts found` };
            }

            // Canonical protein-coding transcript first (see pickDefaultTranscript).
            const transcript = pickDefaultTranscript(transcripts) ?? transcripts[0];

            if (transcript.cds_regions.length === 0) {
                return { record: null, error: `${gene.symbol}: no CDS regions` };
            }

            // GFF coords are already in the final 1-based-inclusive forward frame;
            // no relative→reference / revlist transform (see tabixTranscripts.ts).
            const transcriptName = transcript.name ?? gene.symbol;

            return {
                record: {
                    unique_entry_id: `${index}_${gene.symbol}_${transcriptName}`,
                    base_seq_name: `${gene.symbol}_${transcriptName}`,
                    seq_id: genomeLocation['chromosome'],
                    seq_strand: transcript.strand === -1 ? '-' : '+',
                    exon_seq_regions: transcript.exons.map((e) => ({ start: e.start, end: e.end })),
                    cds_seq_regions: transcript.cds_regions.map((c) => ({ start: c.start, end: c.end, frame: c.phase })),
                    fasta_file_url: speciesConfig.jBrowsefastaurl,
                    variant_ids: [],
                    alt_seq_name_suffix: '_alt',
                    species: gene.species.name,
                },
                error: null,
            };
        } catch (e: unknown) {
            const msg = errMsg(e);
            console.error(`Failed to build payload for ${gene.symbol} (${gene.id}, taxon=${gene.species?.taxonId}): ${msg}`);
            return { record: null, error: `${gene.symbol}: ${msg}` };
        }
    }

    // Build the current selection (source + checked orthologs) as the common
    // shape consumed by both the CSV export and the /submit-bulk handoff.
    // Hidden-by-filter rows ARE included: the chip row is purely visual.
    const buildSelectionList = useCallback(() => {
        const list: OrthologInfo[] = [];
        if (includeSource && sourceGene) list.push(sourceGene);
        for (const o of orthologs) {
            if (o.selected) list.push({
                geneId: o.geneId, symbol: o.symbol, species: o.species, taxonId: o.taxonId,
            });
        }
        return list;
    }, [includeSource, sourceGene, orthologs]);

    // Download the current selection as a /submit-bulk-compatible CSV.
    // Headers match parseGeneListFile's HEADER_MAP: gene_id is enough on
    // its own, species + gene_symbol are included for human readability.
    const downloadSelectionCsv = useCallback(() => {
        const list = buildSelectionList();
        if (list.length === 0) return;
        const esc = (s: string) =>
            /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        const rows = ['gene_id,species,gene_symbol'];
        for (const o of list) {
            rows.push([o.geneId, o.species, o.symbol].map(esc).join(','));
        }
        const blob = new Blob([rows.join('\n') + '\n'], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pavi-orthologs-${sourceGene?.symbol ?? 'selection'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }, [buildSelectionList, sourceGene]);

    // Stash the selection in sessionStorage and navigate to /submit-bulk,
    // which has an ExampleGene-shaped import path (via BulkPreviewTable +
    // JobSubmitForm) perfect for per-gene editing before submission.
    //
    // sessionStorage key kept distinct from the /submit?edit=true stash so
    // the two flows don't trample each other.
    const openInSubmitForm = useCallback(() => {
        const list = buildSelectionList();
        if (list.length === 0) return;
        const payload = list.map((o) => ({
            geneId: o.geneId,
            geneName: o.symbol,
            species: o.species,
        }));
        try {
            sessionStorage.setItem('pavi_ortholog_handoff', JSON.stringify(payload));
        } catch (e) {
            console.error('Failed to stash ortholog handoff:', e);
            return;
        }
        router.push('/submit-bulk?from=ortholog');
    }, [buildSelectionList, router]);

    // Submit job
    const handleSubmit = useCallback(async () => {
        const selectedOrthologs = orthologs.filter(o => o.selected);
        const allGeneIds = [
            ...(includeSource && sourceGene ? [sourceGene.geneId] : []),
            ...selectedOrthologs.map(o => o.geneId),
        ];

        if (allGeneIds.length < 2) {
            setError('At least 2 sequences are required for alignment.');
            return;
        }

        setPhase('fetching-genes');
        setError(null);

        try {
            // Fetch gene info in parallel — Alliance API tolerates concurrent
            // single-gene queries fine, and N-organism orthologs sets are small.
            setStatusMessage(`Fetching gene info for ${allGeneIds.length} genes...`);
            const geneInfoResults = await Promise.all(allGeneIds.map(fetchGeneInfo));
            const geneInfos = geneInfoResults.filter((info): info is GeneInfo => Boolean(info));

            if (geneInfos.length < 2) {
                setError(`Only ${geneInfos.length} gene(s) could be resolved. Need at least 2.`);
                setPhase('error');
                return;
            }

            // Fetch transcripts and build payloads in parallel.
            setPhase('fetching-transcripts');
            setStatusMessage(`Fetching transcripts for ${geneInfos.length} genes in parallel...`);
            const buildResults = await Promise.all(
                geneInfos.map((info, i) => buildPayloadForGene(info, i))
            );
            const payloads = buildResults
                .map((r) => r.record)
                .filter((r): r is JobSumbissionPayloadRecord => r !== null);
            const failures = buildResults
                .map((r) => r.error)
                .filter((e): e is string => e !== null);

            if (payloads.length < 2) {
                setError(`Only ${payloads.length} gene(s) had valid transcripts. Need at least 2. Failed: ${failures.join(', ')}`);
                setPhase('error');
                return;
            }

            // Submit
            setPhase('submitting');
            setStatusMessage('Submitting alignment job...');
            const job = await submitNewPipelineJob(payloads);
            setPhase('done');
            router.push(`/progress?uuid=${job.uuid}`);
        } catch (e) {
            setError(`Submission failed: ${errMsg(e)}`);
            setPhase('error');
        }
        // buildPayloadForGene + errMsg are defined inline; deps list matches the values actually closed over.
    }, [orthologs, includeSource, sourceGene, router, agrjBrowseDataRelease]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="agr-page-section">
            {/* Gene Search Card */}
            <div className="agr-card">
                <div className="agr-card-header">
                    <h2>Focus Gene</h2>
                </div>
                <div className="agr-card-body">
                    <div className="field">
                        <label htmlFor="gene-search" style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                            Search for a gene to find orthologs across model organisms
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <AutoComplete
                                id="gene-search"
                                ref={geneFieldRef}
                                value={geneSearch.geneQuery}
                                suggestions={geneSearch.geneSuggestionList}
                                completeMethod={(e) => geneSearch.searchGene(e.query)}
                                field="displayName"
                                delay={700}
                                onChange={(e) => geneSearch.setGeneQuery(e.value)}
                                onSelect={(e) => {
                                    geneSearch.setSelectedGeneSuggestion(e.value);
                                    geneSearch.setGeneQuery(e.value);
                                    setError(null);
                                }}
                                onHide={() => geneSearch.autoSelectSingleGeneSuggestion()}
                                onClear={() => {
                                    geneSearch.setSelectedGeneSuggestion(undefined);
                                    geneSearch.clearGeneSuggestionList();
                                    setOrthologs([]);
                                    setSourceGene(null);
                                    setError(null);
                                }}
                                placeholder="e.g., SOD1, TP53, PITX2"
                                style={{ flex: 1 }}
                            />
                            {orthologsLoading && (
                                <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.25rem', color: 'var(--agr-primary-500)' }} aria-label="Loading orthologs" />
                            )}
                        </div>
                        {geneSearch.gene && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--agr-gray-600)' }}>
                                <i className="pi pi-check-circle" style={{ color: 'var(--agr-success)', marginRight: '0.375rem' }} />
                                <strong>{geneSearch.gene.symbol}</strong> ({geneSearch.gene.species?.name}) &mdash; {geneSearch.gene.id}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ortholog Selection Card */}
            {orthologs.length > 0 && (
                <div className="agr-card" style={{ marginTop: '1rem' }}>
                    <div className="agr-card-header">
                        <h2>Orthologs for {geneSearch.gene?.symbol} ({orthologs.length} found)</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ fontSize: '0.8125rem', color: 'var(--agr-gray-600)' }}>
                                Stringency:&nbsp;
                                <Dropdown
                                    value={stringency}
                                    options={stringencyOptions}
                                    onChange={(e) => setStringency(e.value)}
                                    disabled={orthologsLoading}
                                    style={{ minWidth: '160px' }}
                                    className="p-inputtext-sm"
                                />
                            </label>
                            <Button label="All" size="small" severity="secondary" outlined onClick={selectAll} />
                            <Button label="AGR Species" size="small" severity="secondary" outlined onClick={selectAgrOnly} />
                            <Button label="None" size="small" severity="secondary" outlined onClick={selectNone} />
                        </div>
                    </div>
                    <div className="agr-card-body" style={{ padding: 0 }}>
                        {/* Source gene */}
                        {sourceGene && (
                            <div className={styles.orthologItem} onClick={() => setIncludeSource(!includeSource)}
                                 style={{ borderBottom: '2px solid var(--agr-gray-200)', background: 'var(--agr-gray-50)' }}>
                                {/*
                                  * The row <div> has onClick to toggle, and the Checkbox fires
                                  * onChange on click too. Letting the click bubble makes the row
                                  * toggle twice (checkbox + row), netting zero change — the user
                                  * sees nothing happen when clicking the checkbox itself. Stop
                                  * propagation so only the Checkbox's own onChange runs when the
                                  * checkbox is the click target.
                                  */}
                                <span onClick={(e) => e.stopPropagation()}>
                                    <Checkbox checked={includeSource} onChange={() => setIncludeSource(!includeSource)} />
                                </span>
                                <span className={styles.orthologSymbol}>{sourceGene.symbol}</span>
                                <span className={styles.orthologSpecies}>{sourceGene.species}</span>
                                <span className={styles.orthologId}>{sourceGene.geneId}</span>
                                <span style={{ fontSize: '0.6875rem', background: 'var(--agr-primary-100)', color: 'var(--agr-primary-700)', padding: '0.125rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>SOURCE</span>
                            </div>
                        )}

                        {/* Species-group filter chips. Hidden groups don't */}
                        {/* drop selection — they just collapse from view. */}
                        <div
                            role="group"
                            aria-label="Filter by species group"
                            style={{
                                display: 'flex',
                                gap: '0.375rem',
                                flexWrap: 'wrap',
                                padding: '0.5rem 0.75rem',
                                borderBottom: '1px solid var(--agr-gray-200)',
                                background: 'var(--agr-gray-50)',
                            }}
                        >
                            {SPECIES_GROUP_ORDER.filter((g) => groupCounts[g] > 0).map((g) => {
                                const active = visibleGroups.has(g);
                                return (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => toggleGroup(g)}
                                        aria-pressed={active}
                                        style={{
                                            padding: '0.25rem 0.625rem',
                                            borderRadius: 999,
                                            border: '1px solid',
                                            borderColor: active ? 'var(--agr-primary-500, #2563eb)' : 'var(--agr-gray-300, #d1d5db)',
                                            background: active ? 'var(--agr-primary-500, #2563eb)' : 'white',
                                            color: active ? 'white' : 'var(--agr-gray-700, #374151)',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {SPECIES_GROUP_LABEL[g]}
                                        <span
                                            style={{
                                                marginLeft: '0.375rem',
                                                opacity: 0.75,
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {groupCounts[g]}
                                        </span>
                                    </button>
                                );
                            })}
                            {visibleGroups.size < SPECIES_GROUP_ORDER.filter((g) => groupCounts[g] > 0).length && (
                                <button
                                    type="button"
                                    onClick={() => setVisibleGroups(new Set(SPECIES_GROUP_ORDER))}
                                    style={{
                                        marginLeft: 'auto',
                                        fontSize: '0.75rem',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--agr-primary-600, #1d4ed8)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Show all groups
                                </button>
                            )}
                        </div>

                        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                            {visibleOrthologs.length === 0 ? (
                                <div style={{ padding: '1rem', color: 'var(--agr-gray-500)', fontStyle: 'italic' }}>
                                    No orthologs match the current species-group filter.
                                </div>
                            ) : (
                                visibleOrthologs.map(o => (
                                    <div key={o.geneId} className={styles.orthologItem} onClick={() => toggleOrtholog(o.geneId)}>
                                        {/* See source-row note above: stop propagation so the
                                            row-level onClick doesn't double-fire with Checkbox. */}
                                        <span onClick={(e) => e.stopPropagation()}>
                                            <Checkbox checked={o.selected} onChange={() => toggleOrtholog(o.geneId)} />
                                        </span>
                                        <span className={styles.orthologSymbol}>{o.symbol}</span>
                                        <span className={styles.orthologSpecies}>{o.species}</span>
                                        <span className={styles.orthologId}>{o.geneId}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="agr-card-footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                        <Button
                            label="Submit Alignment"
                            icon="pi pi-play"
                            onClick={handleSubmit}
                            disabled={selectedCount < 2 || phase !== 'idle'}
                            loading={phase !== 'idle' && phase !== 'error' && phase !== 'done'}
                            className="p-button-lg"
                        />
                        <Button
                            label="Open in Submit form"
                            icon="pi pi-arrow-right"
                            severity="secondary"
                            outlined
                            onClick={openInSubmitForm}
                            disabled={selectedCount < 1}
                            tooltip="Load the selection into the bulk-submit flow for per-gene editing"
                            tooltipOptions={{ position: 'top' }}
                        />
                        <Button
                            label="Download CSV"
                            icon="pi pi-download"
                            severity="secondary"
                            outlined
                            onClick={downloadSelectionCsv}
                            disabled={selectedCount < 1}
                            tooltip="Download the selected orthologs as a /submit-bulk-compatible CSV"
                            tooltipOptions={{ position: 'top' }}
                        />
                        <span style={{ fontSize: '0.8125rem', color: 'var(--agr-gray-500)', marginLeft: '0.75rem' }}>
                            {selectedCount} sequence{selectedCount !== 1 ? 's' : ''} selected
                        </span>
                        {statusMessage && phase !== 'idle' && phase !== 'error' && (
                            <span className={styles.statusMessage}>
                                <i className="pi pi-spin pi-spinner" style={{ marginRight: '0.5rem' }} />
                                {statusMessage}
                            </span>
                        )}
                    </div>
                    {error && <div className="agr-message agr-message-error" style={{ margin: '0.75rem' }}>{error}</div>}
                </div>
            )}

            {orthologsLoading && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--agr-gray-500)' }}>
                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }} />
                    Searching for orthologs...
                </div>
            )}
        </div>
    );
}
