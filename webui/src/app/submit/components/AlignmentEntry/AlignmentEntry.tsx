'use client';

import { FloatLabel } from 'primereact/floatlabel';
import { AutoComplete, AutoCompleteState, AutoCompletePassThroughMethodOptions } from 'primereact/autocomplete';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import React, { createRef, FunctionComponent, useCallback, useEffect, useState } from 'react';

import { useGeneSearch, useTranscriptSelection, useAlleleSelection } from '@/hooks';
import { AlignmentEntryStatus, AlleleInfo } from './types';
import { JobSumbissionPayloadRecord, InputPayloadPart, InputPayloadDispatchAction } from '../JobSubmitForm/types';

// Note: dynamic import of stage vs main src is currently not possible on client nor server (2024/07/25).
import { getSingleGenomeLocation } from 'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js';

export interface AlignmentEntryProps {
    readonly index: number;
    readonly agrjBrowseDataRelease: string;
    readonly dispatchInputPayloadPart: React.Dispatch<InputPayloadDispatchAction>;
    readonly initialGeneId?: string;
}

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
    if (alleleInfo.variants.size > 1) {
        text = `(${alleleInfo.variants.size} variants)`;
    } else {
        const variant = Array.from(alleleInfo.variants.values()).pop();
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

export const AlignmentEntry: FunctionComponent<AlignmentEntryProps> = (props: AlignmentEntryProps) => {
    const [setupCompleted, setSetupCompleted] = useState<boolean>(false);

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
        },
        transcriptMultiselectRef
    );

    const alleleSelection = useAlleleSelection(
        {
            gene: geneSearch.gene,
            setupCompleted,
        },
        alleleMultiselectRef
    );

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

                portion.push({
                    unique_entry_id: unique_entry_id,
                    base_seq_name: `${gene_info.symbol}_${transcript.name}`,
                    fasta_file_url: transcriptSelection.fastaFileUrl!,
                    seq_id: genomeLocation['chromosome'],
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
                    variant_ids: alleles_info.map((a) => Array.from(a.variants.keys())).flat(),
                    alt_seq_name_suffix: alt_seq_name_suffix,
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
                });
            }
        }
    }, [
        geneSearch.gene,
        transcriptSelection.selectedTranscriptsInfo,
        alleleSelection.selectedAllelesInfo,
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
        const variantCount = alleleInfo.variants.size;
        const variantLabel = variantCount === 1
            ? Array.from(alleleInfo.variants.values())[0]?.displayName
            : `${variantCount} variants`;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 500 }}>{alleleInfo.displayName}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--agr-text-secondary, #6c757d)' }}>
                    {alleleInfo.id !== alleleInfo.displayName && (
                        <span style={{ marginRight: '0.5rem' }}>{alleleInfo.id}</span>
                    )}
                    <span style={{
                        padding: '2px 6px',
                        backgroundColor: 'var(--agr-gray-100, #f1f3f5)',
                        borderRadius: '4px',
                        fontSize: '0.75rem'
                    }}>
                        {variantLabel}
                    </span>
                </span>
            </div>
        );
    };

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
                        ref={transcriptMultiselectRef}
                        display="chip"
                        filter
                        maxSelectedLabels={2}
                        style={{ width: '100%' }}
                        value={transcriptSelection.selectedTranscriptIds}
                        onChange={(e) => transcriptSelection.setSelectedTranscriptIds(e.value)}
                        onFocus={() => transcriptSelection.setTranscriptListFocused(true)}
                        onBlur={() => transcriptSelection.setTranscriptListFocused(false)}
                        onHide={() => transcriptSelection.setTranscriptListOpened(false)}
                        onShow={() => transcriptSelection.setTranscriptListOpened(true)}
                        options={transcriptSelection.transcriptList.map((r) => ({
                            key: r.id(),
                            value: r.id(),
                            label: r.get('name'),
                        }))}
                    />
                    <label htmlFor={`transcripts-${props.index}`}>Transcripts</label>
                </FloatLabel>
            </div>

            {/* 3. Allele Selection (optional) */}
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <FloatLabel>
                    <MultiSelect
                        id={`alleles-${props.index}`}
                        loading={alleleSelection.alleleListLoading}
                        disabled={!geneSearch.gene}
                        ref={alleleMultiselectRef}
                        display="chip"
                        maxSelectedLabels={2}
                        style={{ width: '100%' }}
                        filter
                        filterBy="filterValue"
                        emptyMessage={geneSearch.gene ? "No alleles with variants found" : "Select a gene first"}
                        value={alleleSelection.selectedAlleleIds}
                        onChange={(e) => alleleSelection.setSelectedAlleleIds(e.target.value)}
                        itemTemplate={alleleOptionTemplate}
                        optionLabel="chipLabel"
                        optionValue="key"
                        onFocus={() => alleleSelection.setAlleleListFocused(true)}
                        onBlur={() => alleleSelection.setAlleleListFocused(false)}
                        onHide={() => alleleSelection.setAlleleListOpened(false)}
                        onShow={async () => {
                            alleleSelection.setAlleleListOpened(true);
                            await alleleSelection.loadAllelesOnDemand();
                        }}
                        options={alleleSelection.alleleList.map((r) => ({
                            key: r['id'],
                            chipLabel: r['displayName'],
                            filterValue: alleleOptionFilterValue(r),
                            allele: r,
                        }))}
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
                    </label>
                </FloatLabel>
            </div>
        </div>
    );
};
