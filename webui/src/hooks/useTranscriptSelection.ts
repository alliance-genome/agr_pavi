'use client';

import { useCallback, useEffect, useState, RefObject } from 'react';
import { MultiSelect } from 'primereact/multiselect';
import { GeneInfo, TranscriptInfo, AlignmentEntryStatus } from '@/app/submit/components/AlignmentEntry/types';

import { getSpecies, getSingleGenomeLocation, gffFileUrl } from '@/utils/agrSpeciesConfig';
import { fetchTranscriptsGff, GffTranscript } from '@/utils/tabixTranscripts';

export interface UseTranscriptSelectionOptions {
    gene: GeneInfo | undefined;
    agrjBrowseDataRelease: string;
    onStatusChange?: (_status: AlignmentEntryStatus, _payloadPart?: undefined) => void;
    setupCompleted?: boolean;
    initialGeneId?: string;
    initialTranscriptNames?: string[];
}

// Map transcript names (as they appear in the file / MultiSelect label,
// e.g. "ENST00000269305.9") to the transcript ids the selection state uses.
// Preserves transcriptList order; names not present are dropped.
export function selectInitialTranscriptIds(
    transcriptList: GffTranscript[],
    names: string[]
): string[] {
    const wanted = new Set(names);
    return transcriptList
        .filter((t) => wanted.has(t.name))
        .map((t) => t.id);
}

export interface UseTranscriptSelectionResult {
    // State
    transcriptList: GffTranscript[];
    transcriptListLoading: boolean;
    transcriptLoadFailed: boolean;
    selectedTranscriptIds: string[];
    selectedTranscriptsInfo: TranscriptInfo[];
    transcriptListFocused: boolean;
    transcriptListOpened: boolean;
    fastaFileUrl: string | undefined;

    // Actions
    setSelectedTranscriptIds: (_ids: string[]) => void;
    setTranscriptListFocused: (_focused: boolean) => void;
    setTranscriptListOpened: (_opened: boolean) => void;
    resetSelection: () => void;
}

export function useTranscriptSelection(
    options: UseTranscriptSelectionOptions,
    transcriptMultiselectRef: RefObject<MultiSelect | null>
): UseTranscriptSelectionResult {
    const { gene, agrjBrowseDataRelease, onStatusChange, setupCompleted, initialGeneId, initialTranscriptNames } = options;

    // Transcript state
    const [transcriptList, setTranscriptList] = useState<GffTranscript[]>([]);
    const [transcriptListLoading, setTranscriptListLoading] = useState(true);
    // True when a transcript fetch errored (e.g. the tabix GFF / index could not
    // be read for this species' assembly/release). Distinct from "loaded but
    // empty" so the UI can explain the difference.
    const [transcriptLoadFailed, setTranscriptLoadFailed] = useState(false);
    const [selectedTranscriptIds, setSelectedTranscriptIds] = useState<string[]>([]);
    const [selectedTranscriptsInfo, setSelectedTranscriptsInfo] = useState<TranscriptInfo[]>([]);
    const [transcriptListFocused, setTranscriptListFocused] = useState(false);
    const [transcriptListOpened, setTranscriptListOpened] = useState(false);
    const [fastaFileUrl, setFastaFileUrl] = useState<string>();

    const resetSelection = useCallback(() => {
        setTranscriptListLoading(true);
        setSelectedTranscriptIds([]);
        setSelectedTranscriptsInfo([]);
    }, []);

    const processTranscriptEntry = useCallback(
        async (transcriptIds: string[]) => {
            onStatusChange?.(AlignmentEntryStatus.PROCESSING);

            const transcriptsInfo: TranscriptInfo[] = [];

            if (transcriptIds.length < 1) {
                console.log('No transcripts selected, pending input.');
                onStatusChange?.(AlignmentEntryStatus.PENDING_INPUT);
                setSelectedTranscriptsInfo([]);
            } else if (transcriptList.length < 1) {
                console.log('Transcript list is empty, clearing prior selected transcripts info.');
                setSelectedTranscriptsInfo([]);
            } else {
                console.log(`selected transcripts (${transcriptIds.length}): ${transcriptIds}`);
                console.log('Fetching exon info for selected transcripts...');

                transcriptIds.forEach((transcriptId) => {
                    console.log(`Finding transcript for ID ${transcriptId}...`);

                    const transcript = transcriptList.find((r) => r.id === transcriptId);
                    if (!transcript) {
                        console.error(`No transcript found for transcript ID ${transcriptId}`);
                        onStatusChange?.(AlignmentEntryStatus.FAILED_PROCESSING);
                    } else {
                        // GFF exon/CDS coordinates are already in the final frame
                        // (1-based inclusive, forward-genomic, per-CDS phase, strand
                        // carried separately) — the same frame the pipeline expects.
                        // No NCList relative→reference transform is applied here.
                        const transcriptInfo: TranscriptInfo = {
                            id: transcript.id,
                            curie: transcript.curie ?? '',
                            name: transcript.name ?? '',
                            strand: transcript.strand,
                            proteinAccession: transcript.proteinAccession,
                            exons: transcript.exons.map((e) => ({ refStart: e.start, refEnd: e.end })),
                            cds_regions: transcript.cds_regions.map((c) => ({
                                refStart: c.start,
                                refEnd: c.end,
                                phase: c.phase,
                            })),
                        };

                        transcriptsInfo.push(transcriptInfo);
                    }
                });

                setSelectedTranscriptsInfo(transcriptsInfo);
            }
        },
        [transcriptList, onStatusChange]
    );

    // Handle transcriptList updates once gene object has been saved
    useEffect(() => {
        async function updateTranscriptList() {
            console.log(`Updating transcript list for gene object: ${gene}`);

            if (gene) {
                setTranscriptLoadFailed(false);
                setTranscriptListLoading(true);

                const speciesConfig = getSpecies(gene.species.taxonId);
                console.log('speciesConfig:', speciesConfig);

                setFastaFileUrl(speciesConfig.jBrowsefastaurl);

                const gffUrl = gffFileUrl(speciesConfig, agrjBrowseDataRelease);
                const genomeLocation = getSingleGenomeLocation(gene.genomeLocations);

                try {
                    const transcripts = await fetchTranscriptsGff({
                        gffUrl,
                        refseq: genomeLocation['chromosome'],
                        start: genomeLocation['start'],
                        end: genomeLocation['end'],
                        geneSymbol: gene['symbol'],
                    });
                    console.log('transcripts received:', transcripts);

                    // Define transcripts list
                    setTranscriptList(transcripts);
                } catch (e) {
                    // fetchTranscriptsGff rejects when the tabix GFF / index can't
                    // be read (e.g. a 404, or no GFF configured for the species).
                    // Surface it instead of leaving a silent empty dropdown.
                    console.error(`Failed to fetch transcripts for ${gene.symbol}:`, e);
                    setTranscriptLoadFailed(true);
                    setTranscriptList([]);
                    setTranscriptListLoading(false);
                }
            }
        }

        if (gene !== undefined) {
            updateTranscriptList();
        } else {
            setTranscriptLoadFailed(false);
            setTranscriptList([]);
        }
    }, [gene, agrjBrowseDataRelease]);

    // Update transcriptList loading status and open selection panel once transcriptList object has been saved
    useEffect(() => {
        console.log(`New transcript list loaded.`);
        if (selectedTranscriptIds.length > 0) {
            console.log('Clearing prior selected transcript ids.');
            setSelectedTranscriptIds([]);
        }
        setTranscriptListLoading(false);
        if (transcriptList.length > 0) {
            const select_menu = transcriptMultiselectRef.current;
            if (select_menu && transcriptListFocused) {
                console.log(`Opening transcript panel.`);
                transcriptMultiselectRef.current?.show();
            }
        }
    }, [transcriptList]); // eslint-disable-line react-hooks/exhaustive-deps

    // Process transcript entry once transcript selection panel gets closed
    useEffect(() => {
        if (setupCompleted === true && transcriptListFocused === false && transcriptListOpened === false) {
            processTranscriptEntry(selectedTranscriptIds);
        }
    }, [setupCompleted, selectedTranscriptIds, transcriptListFocused, transcriptListOpened, processTranscriptEntry]);

    // Select initial transcripts once the list has loaded: explicit names
    // from the caller take priority; otherwise fall back to the canonical
    // (or first) transcript, preserving the prior initialGeneId behavior.
    useEffect(() => {
        if ((initialGeneId || initialTranscriptNames?.length) && !transcriptListLoading && transcriptList.length > 0 && selectedTranscriptIds.length === 0) {
            if (initialTranscriptNames && initialTranscriptNames.length > 0) {
                const matched = selectInitialTranscriptIds(transcriptList, initialTranscriptNames);
                if (matched.length > 0) {
                    setSelectedTranscriptIds(matched);
                    return;
                }
            }
            const canonicalTranscript =
                transcriptList.find(
                    (t) => t.name?.includes('canonical') || t.isCanonical === true
                ) || transcriptList[0];
            if (canonicalTranscript) {
                setSelectedTranscriptIds([canonicalTranscript.id]);
            }
        }
    }, [initialGeneId, initialTranscriptNames, transcriptListLoading, transcriptList, selectedTranscriptIds.length]);

    return {
        // State
        transcriptList,
        transcriptListLoading,
        transcriptLoadFailed,
        selectedTranscriptIds,
        selectedTranscriptsInfo,
        transcriptListFocused,
        transcriptListOpened,
        fastaFileUrl,

        // Actions
        setSelectedTranscriptIds,
        setTranscriptListFocused,
        setTranscriptListOpened,
        resetSelection,
    };
}
