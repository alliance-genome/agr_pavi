'use client';

import React, { useState, useCallback, useEffect, createRef } from 'react';
import { useRouter } from 'next/navigation';

import { AutoComplete, AutoCompleteState } from 'primereact/autocomplete';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';

import { useGeneSearch } from '@/hooks';
import { fetchGeneInfo } from '@/app/submit/components/AlignmentEntry/serverActions';
import { GeneInfo } from '@/app/submit/components/AlignmentEntry/types';
import { submitNewPipelineJob } from '@/app/submit/components/JobSubmitForm/serverActions';
import { JobSumbissionPayloadRecord } from '@/app/submit/components/JobSubmitForm/types';

import { fetchOrthologs, OrthologInfo } from './serverActions';

import { getSpecies, getSingleGenomeLocation, gffFileUrl } from '@/utils/agrSpeciesConfig';
import { fetchTranscriptsGff } from '@/utils/tabixTranscripts';

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

    // Submit state
    const [phase, setPhase] = useState<SubmitPhase>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Extract a readable message from a thrown value (Error or otherwise).
    const errMsg = (e: unknown): string =>
        e instanceof Error ? e.message : String(e);

    // Auto-fetch orthologs whenever the focus gene changes.
    // Cancellation guards against a stale response landing after a quick
    // gene reselect.
    const focusGeneId = geneSearch.gene?.id;
    useEffect(() => {
        if (!focusGeneId) return;
        let cancelled = false;
        setOrthologsLoading(true);
        setError(null);
        setOrthologs([]);
        setSourceGene(null);

        fetchOrthologs(focusGeneId)
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
    }, [focusGeneId]);

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

            const transcripts = await fetchTranscriptsGff({
                gffUrl,
                refseq: genomeLocation['chromosome'],
                start: genomeLocation['start'],
                end: genomeLocation['end'],
                geneSymbol: gene['symbol'],
            });

            if (!transcripts || transcripts.length === 0) {
                return { record: null, error: `${gene.symbol}: no transcripts found` };
            }

            // Pick the first protein-coding transcript (with CDS), else the first.
            const transcript = transcripts.find((t) => t.cds_regions.length > 0) ?? transcripts[0];

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
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
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
                                <Checkbox checked={includeSource} onChange={() => setIncludeSource(!includeSource)} />
                                <span className={styles.orthologSymbol}>{sourceGene.symbol}</span>
                                <span className={styles.orthologSpecies}>{sourceGene.species}</span>
                                <span className={styles.orthologId}>{sourceGene.geneId}</span>
                                <span style={{ fontSize: '0.6875rem', background: 'var(--agr-primary-100)', color: 'var(--agr-primary-700)', padding: '0.125rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>SOURCE</span>
                            </div>
                        )}

                        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                            {orthologs.map(o => (
                                <div key={o.geneId} className={styles.orthologItem} onClick={() => toggleOrtholog(o.geneId)}>
                                    <Checkbox checked={o.selected} onChange={() => toggleOrtholog(o.geneId)} />
                                    <span className={styles.orthologSymbol}>{o.symbol}</span>
                                    <span className={styles.orthologSpecies}>{o.species}</span>
                                    <span className={styles.orthologId}>{o.geneId}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="agr-card-footer">
                        <Button
                            label="Submit Alignment"
                            icon="pi pi-play"
                            onClick={handleSubmit}
                            disabled={selectedCount < 2 || phase !== 'idle'}
                            loading={phase !== 'idle' && phase !== 'error' && phase !== 'done'}
                            className="p-button-lg"
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
