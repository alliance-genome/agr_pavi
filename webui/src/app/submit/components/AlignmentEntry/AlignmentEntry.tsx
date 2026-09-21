'use client';

import { FloatLabel } from 'primereact/floatlabel';
import { AutoComplete, AutoCompleteState, AutoCompletePassThroughMethodOptions } from 'primereact/autocomplete';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import React, { createRef, FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGeneSearch, useTranscriptSelection, useAlleleSelection } from '@/hooks';
import { AlignmentEntryStatus, AlleleInfo } from './types';
import { useAlleleFilters } from './useAlleleFilters';
import { AlleleFilterPanel } from './AlleleFilterPanel';
import { JobSumbissionPayloadRecord, InputPayloadPart, InputPayloadDispatchAction } from '../JobSubmitForm/types';
import { TranscriptViewerDialog } from '../TranscriptViewer';
import { lookupVariantByHgvs, searchVariants, searchAllelesByName } from './serverActions';
import { looksLikeHgvs, looksLikeGenomicPosition, normalizeHgvs } from './hgvs';

// Note: dynamic import of stage vs main src is currently not possible on client nor server (2024/07/25).
import { getSingleGenomeLocation } from '@/utils/agrSpeciesConfig';

export interface AlignmentEntryProps {
    readonly index: number;
    readonly agrjBrowseDataRelease: string;
    readonly dispatchInputPayloadPart: React.Dispatch<InputPayloadDispatchAction>;
    readonly initialGeneId?: string;
    readonly initialAlleleIds?: string[];
    readonly initialTranscriptNames?: string[];
}

// Helper to safely access variants regardless of Map vs plain object (server action serialization)
const getVariantKeys = (variants: AlleleInfo['variants']): string[] =>
    variants instanceof Map ? Array.from(variants.keys()) : Object.keys(variants as unknown as Record<string, unknown>);

const getVariantValues = (variants: AlleleInfo['variants']): { id: string; displayName: string }[] =>
    variants instanceof Map ? Array.from(variants.values()) : Object.values(variants as unknown as Record<string, { id: string; displayName: string }>);

const getVariantCount = (variants: AlleleInfo['variants']): number =>
    variants instanceof Map ? variants.size : Object.keys(variants as unknown as Record<string, unknown>).length;

// Allele display helpers
const alleleDisplayText = (alleleInfo: AlleleInfo) => {
    let text = alleleInfo.id;
    if (alleleInfo.id !== alleleInfo.displayName) {
        text += ` - ${alleleInfo.displayName}`;
    }
    return text;
};

const variantsDisplayText = (alleleInfo: AlleleInfo) => {
    let text = '';
    const count = getVariantCount(alleleInfo.variants);
    if (count > 1) {
        text = `(${count} variants)`;
    } else {
        const variant = getVariantValues(alleleInfo.variants).pop();
        if (variant?.displayName !== alleleInfo.displayName) {
            text += `(${variant?.displayName})`;
        }
    }
    return text;
};

const alleleOptionFilterValue = (alleleInfo: AlleleInfo) => {
    const alleleText = alleleDisplayText(alleleInfo);
    const variantText = variantsDisplayText(alleleInfo);
    return `${alleleText} | ${variantText}`;
};

/**
 * Normalizes chromosome IDs to match FASTA file sequence IDs.
 *
 * Different species have different chromosome naming conventions in their FASTA files
 * that may not match what the Alliance API returns. This function normalizes the format.
 *
 * @param chromosome - Chromosome ID from Alliance API (e.g., "Chr5", "Chr6L")
 * @param taxonId - NCBI taxon ID for the species
 * @returns Normalized chromosome ID matching FASTA file format
 */
const normalizeChromosomeId = (chromosome: string, _taxonId: string): string => {
    // As of Alliance 8.3.0, Xenopus assemblies were updated to v10.0/v10.1:
    // - X. tropicalis: JBrowse and FASTA both use Chr1, Chr2, etc.
    // - X. laevis: JBrowse and FASTA both use Chr1L, Chr2L, etc.
    // No normalization needed for current species.
    return chromosome;
};

export const AlignmentEntry: FunctionComponent<AlignmentEntryProps> = (props: AlignmentEntryProps) => {
    const [setupCompleted, setSetupCompleted] = useState<boolean>(false);
    const [transcriptViewerVisible, setTranscriptViewerVisible] = useState(false);
    const [variantSearchStatus, setVariantSearchStatus] = useState<string | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const searchReqIdRef = useRef(0);
    // Captures the Alleles MultiSelect's internal filter-reset callback (see
    // the `filterTemplate` wiring below) so a successful text-search add can
    // clear the typed filter text programmatically. The installed PrimeReact
    // version (10.9.7) exposes neither a controlled `filterValue` prop nor a
    // `resetFilter()` method on the component ref; the only supported hook
    // into the internal reset is the `filterOptions.reset` callback handed
    // to a custom `filterTemplate` render.
    const alleleFilterResetRef = useRef<(() => void) | undefined>(undefined);

    // Refs for form elements
    const geneMessageRef: React.RefObject<Message | null> = createRef();
    const geneFieldRef = createRef<AutoComplete>();
    const geneFieldStateRef = createRef<AutoCompleteState>();
    const transcriptMultiselectRef: React.RefObject<MultiSelect | null> = createRef();
    const alleleMultiselectRef: React.RefObject<MultiSelect | null> = createRef();

    // Callback to update parent about status changes
    const updateInputPayloadPart = useCallback(
        (newProperties: Partial<InputPayloadPart>) => {
            const dispatchAction: InputPayloadDispatchAction = {
                type: 'UPDATE',
                index: props.index,
                value: newProperties,
            };
            props.dispatchInputPayloadPart(dispatchAction);
        },
        [] // eslint-disable-line react-hooks/exhaustive-deps
    );

    const handleStatusChange = useCallback(
        (status: AlignmentEntryStatus) => {
            updateInputPayloadPart({
                status,
                payloadPart: status === AlignmentEntryStatus.PROCESSING ? undefined : undefined,
            });
        },
        [updateInputPayloadPart]
    );

    // Use custom hooks for gene, transcript, and allele selection
    const geneSearch = useGeneSearch(
        {
            onStatusChange: handleStatusChange,
            initialGeneId: props.initialGeneId,
            setupCompleted,
        },
        geneFieldRef,
        geneFieldStateRef
    );

    const transcriptSelection = useTranscriptSelection(
        {
            gene: geneSearch.gene,
            agrjBrowseDataRelease: props.agrjBrowseDataRelease,
            onStatusChange: handleStatusChange,
            setupCompleted,
            initialGeneId: props.initialGeneId,
            initialTranscriptNames: props.initialTranscriptNames,
        },
        transcriptMultiselectRef
    );

    const alleleSelection = useAlleleSelection(
        {
            gene: geneSearch.gene,
            setupCompleted,
            initialAlleleIds: props.initialAlleleIds,
        },
        alleleMultiselectRef
    );

    const alleleFilters = useAlleleFilters(alleleSelection.alleleList);
    const { setSetFilter: setAlleleFilter, filters: activeAlleleFilters, filteredAlleles } = alleleFilters;

    // Debounced search-as-you-type / paste-to-lookup for the Alleles filter
    // box: a genomic HGVS string is resolved directly; anything else (3+
    // chars) runs a best-effort text search. Found alleles are merged into
    // alleleList via addAlleles (preserving the in-progress selection).
    // Latest-wins guard (searchReqIdRef) so a slow earlier response can't
    // clobber a newer one.
    const handleAlleleFilter = useCallback((rawValue: string) => {
        const gene = geneSearch.gene;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        const value = normalizeHgvs(rawValue ?? '');
        if (!gene || value.length < 3) { setVariantSearchStatus(null); return; }
        // A bare position number can't be resolved (no accession) and the
        // search index doesn't match it — guide the user to the full HGVS
        // instead of a doomed lookup/search that would just say "No matches".
        if (!looksLikeHgvs(value) && looksLikeGenomicPosition(value)) {
            setVariantSearchStatus('Enter the full HGVS (e.g. NC_000068.8:g.105521966G>T) to add a specific variant');
            return;
        }
        searchDebounceRef.current = setTimeout(async () => {
            const reqId = ++searchReqIdRef.current;
            setVariantSearchStatus('Searching…');
            try {
                if (looksLikeHgvs(value)) {
                    const found = await lookupVariantByHgvs(gene.id, value);
                    if (reqId !== searchReqIdRef.current) return;
                    if (found) { alleleSelection.addAlleles([found]); setVariantSearchStatus('Added — select it below'); }
                    else setVariantSearchStatus('No match for this gene');
                } else {
                    const species = gene.species?.name ?? '';
                    // Look up by allele NAME (e.g. "n1046") and by free-text
                    // variant search in parallel; the allele-name index carries
                    // the HGVS directly, so a name resolves to a real variant.
                    const [alleleHits, variantHits] = await Promise.all([
                        searchAllelesByName(gene.id, gene.symbol, species, value),
                        searchVariants(gene.id, gene.symbol, species, value),
                    ]);
                    if (reqId !== searchReqIdRef.current) return;
                    // Prefer named-allele hits (nicer labels); drop a bare-HGVS
                    // variant hit whose HGVS a named allele already covers.
                    const covered = new Set<string>();
                    alleleHits.forEach((a) => getVariantKeys(a.variants).forEach((k) => covered.add(k)));
                    const hits = [
                        ...alleleHits,
                        ...variantHits.filter((v) => !getVariantKeys(v.variants).some((k) => covered.has(k))),
                    ];
                    if (hits.length) {
                        alleleSelection.addAlleles(hits);
                        // If the typed text still matches an added result
                        // (e.g. an allele name like "n1046" — the added allele
                        // is labeled n1046), KEEP the filter so it shows as the
                        // single result. Otherwise clear it, since HGVS-labeled
                        // variant-search hits won't match a free-text query and
                        // would be hidden behind it. Clearing re-enters
                        // handleAlleleFilter('') synchronously (via onFilter),
                        // which resets the status to null — so set the status
                        // message afterwards to make it the one that sticks.
                        const q = value.toLowerCase();
                        const stillMatches = hits.some((h) =>
                            h.displayName?.toLowerCase().includes(q) ||
                            getVariantKeys(h.variants).some((k) => k.toLowerCase().includes(q)));
                        if (!stillMatches) alleleFilterResetRef.current?.();
                        setVariantSearchStatus(`${hits.length} match(es) added`);
                    }
                    else setVariantSearchStatus('No matches');
                }
            } catch {
                if (reqId === searchReqIdRef.current) setVariantSearchStatus('Search unavailable');
            }
        }, 350);
    }, [geneSearch.gene, alleleSelection.addAlleles]); // eslint-disable-line react-hooks/exhaustive-deps

    // Clear any pending debounced search on unmount.
    useEffect(() => () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); }, []);

    // Auto-dismiss the variant-search status so a terminal message
    // ("Added — select it below", "N match(es) added", "No match…") doesn't
    // linger in the UI. "Searching…" is left alone — it's replaced by its result.
    useEffect(() => {
        if (!variantSearchStatus || variantSearchStatus === 'Searching…') return;
        const t = setTimeout(() => setVariantSearchStatus(null), 5000);
        return () => clearTimeout(t);
    }, [variantSearchStatus]);

    // Auto-filter alleles to those affecting the currently selected transcript(s).
    // Use curie (Alliance-API-aligned identifier) rather than JBrowse internal id.
    const selectedTranscriptCuries = useMemo(
        () => transcriptSelection.selectedTranscriptsInfo
            .map((t) => t.curie)
            .filter((c): c is string => Boolean(c)),
        [transcriptSelection.selectedTranscriptsInfo]
    );
    const transcriptCuriesKey = selectedTranscriptCuries.join('|');

    useEffect(() => {
        setAlleleFilter('transcriptIds', selectedTranscriptCuries);
    }, [transcriptCuriesKey, setAlleleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    // Safety net: if curie-based transcript filter wipes out all alleles
    // (likely an ID-format mismatch with consequence.transcriptId), clear it.
    const transcriptFilterCount = activeAlleleFilters.transcriptIds.size;
    const filteredAlleleCount = filteredAlleles.length;
    const totalAlleleCount = alleleSelection.alleleList.length;
    useEffect(() => {
        if (transcriptFilterCount > 0 && totalAlleleCount > 0 && filteredAlleleCount === 0) {
            console.warn(
                '[AlignmentEntry] Selected transcript curie(s) not found in allele consequence data; clearing transcript filter.',
                { curies: Array.from(activeAlleleFilters.transcriptIds) }
            );
            setAlleleFilter('transcriptIds', []);
        }
    }, [transcriptFilterCount, filteredAlleleCount, totalAlleleCount, setAlleleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    // Options for the allele MultiSelect. Start from the (transcript-)filtered
    // list, then add back any currently-selected allele the filter excluded:
    // a MultiSelect can't render a chip label for a selected value missing
    // from its options, so a pre-selected allele that doesn't match the
    // auto-picked transcript would otherwise show as "null".
    const alleleOptions = useMemo(() => {
        const shown = alleleFilters.filteredAlleles;
        const includedIds = new Set(shown.map((r) => r.id));

        const selectedButHidden = alleleSelection.alleleList.filter(
            (r) => alleleSelection.selectedAlleleIds.includes(r.id) && !includedIds.has(r.id)
        );
        selectedButHidden.forEach((r) => includedIds.add(r.id));

        // A just-added lookup/search allele may not have a consequence
        // matching the active transcript/consequence filters (lookup
        // consequences carry a transcript NAME, not the curie the filter
        // compares against; search alleles carry no consequences at all),
        // and it isn't selected yet either, so neither `shown` nor
        // `selectedButHidden` would include it. Exempt any user-added
        // (non-'gene'-sourced) allele from those filters so it's always
        // reachable right after being added.
        const userAddedButHidden = alleleSelection.alleleList.filter(
            (r) => r.source && r.source !== 'gene' && !includedIds.has(r.id)
        );
        userAddedButHidden.forEach((r) => includedIds.add(r.id));

        return [...shown, ...selectedButHidden, ...userAddedButHidden].map((r) => ({
            key: r.id,
            chipLabel: r.displayName,
            filterValue: alleleOptionFilterValue(r),
            allele: r,
        }));
    }, [alleleFilters.filteredAlleles, alleleSelection.alleleList, alleleSelection.selectedAlleleIds]);

    // Register callback to reset dependent selections when gene changes
    useEffect(() => {
        geneSearch.onGeneChange(() => {
            transcriptSelection.resetSelection();
            alleleSelection.resetSelection();
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Payload calculation
    const payloadPortion = useCallback(
        (gene_info: NonNullable<typeof geneSearch.gene>, transcripts_info: typeof transcriptSelection.selectedTranscriptsInfo, alleles_info: typeof alleleSelection.selectedAllelesInfo) => {
            const portion: JobSumbissionPayloadRecord[] = [];

            transcripts_info.forEach((transcript) => {
                let alt_seq_name_suffix: string = `_alt${props.index + 1}`;
                if (alleles_info.length > 0) {
                    let identifiable_suffix: string = '';
                    for (const allele of alleles_info) {
                        if (allele.id !== allele.displayName) {
                            if (allele.displayName.length < allele.id.length) {
                                identifiable_suffix += `_${allele.displayName}`;
                            } else {
                                identifiable_suffix += `_${allele.id}`;
                            }
                        } else {
                            identifiable_suffix = '';
                            break;
                        }
                    }
                    // Prevent identifiable suffixes that are too long
                    if (identifiable_suffix && identifiable_suffix.length < 30) {
                        alt_seq_name_suffix = identifiable_suffix;
                    }
                }

                let unique_entry_id = `${String(props.index).padStart(3, '0')}_${gene_info.symbol}_${transcript.name}`;
                if (alleles_info.length > 0) {
                    unique_entry_id += alt_seq_name_suffix;
                }

                // Get strand from gene's genomeLocations, or fallback to transcript strand
                const genomeLocation = getSingleGenomeLocation(gene_info.genomeLocations);
                const geneStrand = genomeLocation['strand'];
                // Convert transcript strand (1 or -1) to string format ("+" or "-")
                const transcriptStrand = transcript.strand === 1 ? '+' : '-';
                const seqStrand = geneStrand || transcriptStrand;

                // Normalize chromosome ID to match FASTA file format
                const normalizedChromosome = normalizeChromosomeId(
                    genomeLocation['chromosome'],
                    gene_info.species.taxonId
                );

                portion.push({
                    unique_entry_id: unique_entry_id,
                    base_seq_name: `${gene_info.symbol}_${transcript.name}`,
                    fasta_file_url: transcriptSelection.fastaFileUrl!,
                    seq_id: normalizedChromosome,
                    seq_strand: seqStrand,
                    exon_seq_regions: transcript.exons.map((e) => ({
                        start: e.refStart,
                        end: e.refEnd,
                    })),
                    cds_seq_regions: transcript.cds_regions.map((e) => ({
                        start: e.refStart,
                        end: e.refEnd,
                        frame: e.phase,
                    })),
                    variant_ids: alleles_info.map((a) => getVariantKeys(a.variants)).flat(),
                    alt_seq_name_suffix: alt_seq_name_suffix,
                    species: gene_info.species.name,
                });
            });

            return portion;
        },
        [transcriptSelection.fastaFileUrl, props.index] // eslint-disable-line react-hooks/exhaustive-deps
    );

    // Calculate input payload part on update of gene, transcript and allele selection
    useEffect(() => {
        if (geneSearch.gene !== undefined && transcriptSelection.selectedTranscriptsInfo.length > 0) {
            console.log('Calculating payload portion...');

            const portion = payloadPortion(
                geneSearch.gene,
                transcriptSelection.selectedTranscriptsInfo,
                alleleSelection.selectedAllelesInfo
            );
            console.log('AlignmentEntry portion is', portion);

            if (portion === undefined || portion.length < 1) {
                updateInputPayloadPart({
                    status: AlignmentEntryStatus.FAILED_PROCESSING,
                    payloadPart: undefined,
                });
            } else {
                updateInputPayloadPart({
                    status: AlignmentEntryStatus.READY,
                    payloadPart: portion,
                    formInput: {
                        geneId: geneSearch.gene.id,
                        transcriptNames: transcriptSelection.selectedTranscriptsInfo.map((t) => t.name),
                        alleleIds: [...alleleSelection.selectedAlleleIds],
                    },
                });
            }
        }
    }, [
        geneSearch.gene,
        transcriptSelection.selectedTranscriptsInfo,
        alleleSelection.selectedAllelesInfo,
        alleleSelection.selectedAlleleIds,
        payloadPortion,
        updateInputPayloadPart,
    ]);

    // Component mount/unmount
    useEffect(() => {
        console.log(`AlignmentEntry with index ${props.index} mounted.`);
        const initInputPayloadPart: InputPayloadPart = {
            index: props.index,
            status: AlignmentEntryStatus.PENDING_INPUT,
            payloadPart: undefined,
        };
        props.dispatchInputPayloadPart({ type: 'ADD', index: props.index, value: initInputPayloadPart });
        setSetupCompleted(true);

        return props.dispatchInputPayloadPart.bind(undefined, {
            type: 'DELETE',
            index: props.index,
            value: initInputPayloadPart,
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Allele option template for dropdown
    const alleleOptionTemplate = (option: { allele: AlleleInfo }) => {
        const alleleInfo = option.allele;
        const variantCount = getVariantCount(alleleInfo.variants);
        const variantLabel = variantCount === 1
            ? getVariantValues(alleleInfo.variants)[0]?.displayName
            : `${variantCount} variants`;

        // Genomic HGVS names can get very long (large indels / insertions);
        // truncate them with an ellipsis so one allele can't blow out the row
        // width, and expose the full value via the native title tooltip.
        const ellipsis: React.CSSProperties = {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        };
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, maxWidth: '100%' }}>
                <span style={{ fontWeight: 500, display: 'block', maxWidth: 'min(60ch, 70vw)', ...ellipsis }} title={alleleInfo.displayName}>
                    {alleleInfo.displayName}
                </span>
                <span style={{
                    fontSize: '0.85rem',
                    color: 'var(--agr-text-secondary, #6c757d)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: 0,
                    maxWidth: 'min(60ch, 70vw)'
                }}>
                    {alleleInfo.id !== alleleInfo.displayName && (
                        <span style={ellipsis} title={alleleInfo.id}>{alleleInfo.id}</span>
                    )}
                    <span style={{
                        padding: '2px 6px',
                        backgroundColor: 'var(--agr-gray-100, #f1f3f5)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                    }}>
                        {variantLabel}
                    </span>
                </span>
            </div>
        );
    };

    // A resolved gene with an empty transcript list means the JBrowse NCList
    // track data isn't available for this species' assembly/release (e.g.
    // zebrafish on GRCz12tu, which only ships GFF) — or the fetch errored.
    // Either way there's nothing to select, so tell the user instead of
    // leaving a silent empty dropdown.
    const noTranscriptsAvailable =
        !!geneSearch.gene &&
        !transcriptSelection.transcriptListLoading &&
        transcriptSelection.transcriptList.length === 0;

    return (
        <div className="p-inputgroup" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', width: '100%' }}>
            {/* 1. Gene Selection (required) */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <FloatLabel>
                    <AutoComplete
                        id={`gene-${props.index}`}
                        placeholder="e.g. HGNC:620"
                        ref={geneFieldRef}
                        pt={{
                            root: (options: AutoCompletePassThroughMethodOptions) => {
                                geneFieldStateRef.current = options.state;
                            },
                        }}
                        style={{ width: '100%' }}
                        delay={700}
                        suggestions={geneSearch.geneSuggestionList}
                        completeMethod={(e) => geneSearch.searchGene(e.query)}
                        value={geneSearch.geneQuery}
                        onChange={(e) => geneSearch.setGeneQuery(e.value)}
                        onClear={() => {
                            geneSearch.setSelectedGeneSuggestion(undefined);
                            geneSearch.clearGeneSuggestionList();
                        }}
                        onSelect={(e) => {
                            geneSearch.setSelectedGeneSuggestion(e.value);
                            geneSearch.setGeneQuery(e.value);
                        }}
                        onHide={() => geneSearch.autoSelectSingleGeneSuggestion()}
                        field="displayName"
                    />
                    <label htmlFor={`gene-${props.index}`}>Gene</label>
                </FloatLabel>
                <Message
                    severity="error"
                    ref={geneMessageRef}
                    pt={{ root: { style: { display: geneSearch.geneMessageDisplay } } }}
                    text="Failed to find gene, correct input and try again."
                />
            </div>

            {/* 2. Transcript Selection (required) */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <FloatLabel>
                    <MultiSelect
                        id={`transcripts-${props.index}`}
                        loading={transcriptSelection.transcriptListLoading}
                        emptyMessage={
                            !geneSearch.gene
                                ? 'Select a gene first'
                                : noTranscriptsAvailable
                                    ? 'No transcript models available for this assembly'
                                    : 'Select transcript(s)'
                        }
                        ref={transcriptMultiselectRef}
                        display="comma"
                        filter
                        maxSelectedLabels={3}
                        style={{ width: '100%' }}
                        value={transcriptSelection.selectedTranscriptIds}
                        onChange={(e) => transcriptSelection.setSelectedTranscriptIds(e.value)}
                        onFocus={() => transcriptSelection.setTranscriptListFocused(true)}
                        onBlur={() => transcriptSelection.setTranscriptListFocused(false)}
                        onHide={() => transcriptSelection.setTranscriptListOpened(false)}
                        onShow={() => transcriptSelection.setTranscriptListOpened(true)}
                        itemTemplate={(option: { key: string; value: string; label: string; proteinAccession?: string }) => (
                            <span>
                                {option.label}
                                {option.proteinAccession && (
                                    <span style={{ color: 'var(--agr-text-secondary, #6c757d)', marginLeft: '0.4rem', fontSize: '0.85rem' }}>
                                        ({option.proteinAccession})
                                    </span>
                                )}
                            </span>
                        )}
                        options={transcriptSelection.transcriptList.map((r) => {
                            return {
                                key: r.id,
                                value: r.id,
                                label: r.name,
                                proteinAccession: r.proteinAccession,
                            };
                        })}
                    />
                    <label htmlFor={`transcripts-${props.index}`}>Transcripts</label>
                </FloatLabel>
                {noTranscriptsAvailable && (
                    <small
                        role="alert"
                        style={{
                            display: 'block',
                            marginTop: '0.35rem',
                            color: 'var(--agr-danger, #b3261e)',
                            lineHeight: 1.3,
                        }}
                    >
                        No transcript models are available for this gene in the current genome
                        assembly, so it can&rsquo;t be aligned yet.
                    </small>
                )}
            </div>
            <Button
                label="View transcripts"
                icon="pi pi-chart-bar"
                className="p-button-text p-button-sm"
                type="button"
                disabled={!geneSearch.gene}
                onClick={() => setTranscriptViewerVisible(true)}
                aria-label="View transcripts"
            />
            <TranscriptViewerDialog
                visible={transcriptViewerVisible}
                gene={geneSearch.gene}
                release={props.agrjBrowseDataRelease}
                onHide={() => setTranscriptViewerVisible(false)}
            />

            {/* 3. Allele Selection (optional) */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <FloatLabel>
                    <MultiSelect
                        id={`alleles-${props.index}`}
                        loading={alleleSelection.alleleListLoading}
                        loadingIcon={<i className="pi pi-spin pi-spinner" />}
                        disabled={!geneSearch.gene}
                        ref={alleleMultiselectRef}
                        display="comma"
                        maxSelectedLabels={3}
                        style={{ width: '100%' }}
                        filter
                        filterBy="filterValue"
                        filterTemplate={(options) => {
                            // Not a visual override: `options.element` is the
                            // library's own default filter input, returned
                            // unchanged. This purely taps `filterOptions.reset`
                            // (the only way this PrimeReact version exposes a
                            // programmatic filter-clear) so it can be invoked
                            // later from handleAlleleFilter.
                            alleleFilterResetRef.current = options.filterOptions?.reset;
                            // PrimeReact's type declarations mistakenly type
                            // `element` as HTMLDivElement; at runtime it's the
                            // already-built JSX for the default filter input.
                            return options.element as unknown as React.ReactNode;
                        }}
                        onFilter={(e) => handleAlleleFilter(e.filter)}
                        emptyMessage={!geneSearch.gene ? "Select a gene first" : (alleleSelection.alleleListLoading || alleleSelection.alleleList.length === 0 && !alleleSelection.alleleListLoaded) ? "Loading alleles..." : alleleFilters.activeCount > 0 ? "No alleles match filters" : "No alleles with variants found"}
                        value={alleleSelection.selectedAlleleIds}
                        onChange={(e) => alleleSelection.setSelectedAlleleIds(e.value)}
                        itemTemplate={alleleOptionTemplate}
                        optionLabel="chipLabel"
                        optionValue="key"
                        onFocus={() => alleleSelection.setAlleleListFocused(true)}
                        onBlur={() => alleleSelection.setAlleleListFocused(false)}
                        onHide={() => alleleSelection.setAlleleListOpened(false)}
                        onShow={() => {
                            alleleSelection.setAlleleListOpened(true);
                            alleleSelection.loadAllelesOnDemand();
                        }}
                        options={alleleOptions}
                    />
                    <label htmlFor={`alleles-${props.index}`}>
                        Alleles
                        <span style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.75rem',
                            color: 'var(--agr-text-muted, #6c757d)',
                            fontWeight: 'normal'
                        }}>
                            (optional)
                        </span>
                        {alleleSelection.alleleListLoading && (
                            <span style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.75rem',
                                color: 'var(--agr-text-muted, #6c757d)',
                                fontStyle: 'italic',
                            }}>
                                <i className="pi pi-spin pi-spinner" style={{ fontSize: '0.7rem', marginRight: '0.25rem' }} />
                                loading…
                            </span>
                        )}
                        {!alleleSelection.alleleListLoading && alleleSelection.alleleList.length > 0 && (
                            <span style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.75rem',
                                color: alleleFilters.activeCount > 0
                                    ? 'var(--agr-primary, #2563eb)'
                                    : 'var(--agr-text-muted, #6c757d)',
                                fontWeight: alleleFilters.activeCount > 0 ? 600 : 'normal',
                            }}>
                                {alleleFilters.activeCount > 0
                                    ? `${alleleFilters.filteredAlleles.length} of ${alleleSelection.alleleList.length}`
                                    : `${alleleSelection.alleleList.length} available`}
                            </span>
                        )}
                        {variantSearchStatus && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--agr-text-muted, #6c757d)' }}>
                                {variantSearchStatus}
                            </span>
                        )}
                    </label>
                </FloatLabel>
            </div>

            {/* 4. Allele filters (per-row) */}
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
                <AlleleFilterPanel
                    filters={alleleFilters.filters}
                    options={alleleFilters.options}
                    activeCount={alleleFilters.activeCount}
                    setSetFilter={alleleFilters.setSetFilter}
                    setBoolFilter={alleleFilters.setBoolFilter}
                    clearFilters={alleleFilters.clearFilters}
                    disabled={!geneSearch.gene || alleleSelection.alleleList.length === 0}
                />
            </div>
        </div>
    );
};
