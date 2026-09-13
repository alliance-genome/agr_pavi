'use client';

import { useCallback, useEffect, useState, RefObject } from 'react';
import { MultiSelect } from 'primereact/multiselect';
import { fetchTranscripts } from 'generic-sequence-panel';
import NCListFeature from 'generic-sequence-panel/dist/NCListFeature';
import { Feature, dedupe, revlist } from '@/app/submit/components/AlignmentEntry/utils';
import { GeneInfo, TranscriptInfo, FeatureStrand, AlignmentEntryStatus } from '@/app/submit/components/AlignmentEntry/types';

// Note: dynamic import of stage vs main src is currently not possible on client nor server
import { getSpecies, getSingleGenomeLocation, resolveJBrowseRelease } from '@/utils/agrSpeciesConfig';

export interface UseTranscriptSelectionOptions {
    gene: GeneInfo | undefined;
    agrjBrowseDataRelease: string;
    onStatusChange?: (_status: AlignmentEntryStatus, _payloadPart?: undefined) => void;
    setupCompleted?: boolean;
    initialGeneId?: string;
    initialTranscriptNames?: string[];
}

// Map transcript names (as they appear in the file / MultiSelect label,
// e.g. "ENST00000269305.9") to the transcript feature ids the selection
// state uses. Preserves transcriptList order; names not present are dropped.
export function selectInitialTranscriptIds(
    transcriptList: Feature[],
    names: string[]
): string[] {
    const wanted = new Set(names);
    return transcriptList
        .filter((t) => wanted.has(t.get('name') as string))
        .map((t) => t.id());
}

export interface UseTranscriptSelectionResult {
    // State
    transcriptList: Feature[];
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

// Convert relative positions (to parent feature) to absolute positions (to chromosome/contig)
function jBrowseSubfeatureRelToRefPos(
    subfeatureList: Array<Record<string, unknown>>,
    featureStrand: FeatureStrand,
    parentRefStart: number,
    parentRefEnd: number
): Array<Record<string, unknown>> {
    return subfeatureList.map((subfeat) => {
        const newSubfeat = { ...subfeat };
        const start = subfeat['start'] as number;
        const end = subfeat['end'] as number;

        if (featureStrand === -1) {
            newSubfeat['refStart'] = parentRefEnd - start;
            newSubfeat['refEnd'] = parentRefEnd - end + 1;
        } else {
            newSubfeat['refStart'] = parentRefStart + start + 1;
            newSubfeat['refEnd'] = parentRefStart + end;
        }

        return newSubfeat;
    });
}

export function useTranscriptSelection(
    options: UseTranscriptSelectionOptions,
    transcriptMultiselectRef: RefObject<MultiSelect | null>
): UseTranscriptSelectionResult {
    const { gene, agrjBrowseDataRelease, onStatusChange, setupCompleted, initialGeneId, initialTranscriptNames } = options;

    // Transcript state
    const [transcriptList, setTranscriptList] = useState<Feature[]>([]);
    const [transcriptListLoading, setTranscriptListLoading] = useState(true);
    // True when a transcript fetch errored (e.g. the JBrowse NCList track data
    // doesn't exist for this species' assembly/release — see zebrafish on
    // GRCz12tu, which only ships GFF, not NCList). Distinct from "loaded but
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

                    const transcript = transcriptList.find((r) => r.id() === transcriptId);
                    if (!transcript) {
                        console.error(`No transcript found for transcript ID ${transcriptId}`);
                        onStatusChange?.(AlignmentEntryStatus.FAILED_PROCESSING);
                    } else {
                        console.log(`Found transcript ${transcript}.`);
                        console.log(`Fetching exon info for transcript ${transcript}...`);

                        const feature: any = new NCListFeature(transcript).toJSON();
                        console.debug('Transcript feature:', feature);

                        const { subfeatures = [] } = feature;

                        const children = subfeatures
                            .sort((a: { start: number }, b: { start: number }) => a.start - b.start)
                            .map((sub: any) => ({
                                ...sub,
                                start: sub.start - feature.start,
                                end: sub.end - feature.start,
                            }));

                        let exons: any[] = dedupe(children.filter((sub: { type: string }) => sub.type === 'exon'));
                        let cds_regions: any[] = dedupe(children.filter((sub: { type: string }) => sub.type === 'CDS'));

                        const transcript_length = transcript.get('end') - transcript.get('start');
                        if (feature.strand === -1) {
                            exons = revlist(exons, transcript_length);
                            cds_regions = revlist(cds_regions, transcript_length);
                        }

                        // Convert relative positions (to transcript) to absolute positions (to chromosome/contig)
                        exons = jBrowseSubfeatureRelToRefPos(
                            exons,
                            feature.strand,
                            transcript.get('start'),
                            transcript.get('end')
                        );
                        cds_regions = jBrowseSubfeatureRelToRefPos(
                            cds_regions,
                            feature.strand,
                            transcript.get('start'),
                            transcript.get('end')
                        );

                        console.log(`transcript ${transcript.get('name')} resulted in exons:`, exons);
                        console.log(`transcript ${transcript.get('name')} resulted in cds regions:`, cds_regions);

                        const rawProteinAccession =
                            (transcript.get('Protein_id') as string | undefined) ||
                            (transcript.get('protein_id') as string | undefined) ||
                            (feature['Protein_id'] as string | undefined) ||
                            (feature['protein_id'] as string | undefined);
                        const proteinAccession =
                            rawProteinAccession && rawProteinAccession !== 'None'
                                ? rawProteinAccession
                                : undefined;

                        const transcriptInfo: TranscriptInfo = {
                            id: transcript.id(),
                            curie: (transcript.get('curie') as string) ?? '',
                            name: (transcript.get('name') as string) ?? '',
                            strand: feature.strand as FeatureStrand,
                            proteinAccession,
                            exons: exons.map((e) => ({ refStart: e.refStart as number, refEnd: e.refEnd as number })),
                            cds_regions: cds_regions.map((e) => ({
                                refStart: e.refStart as number,
                                refEnd: e.refEnd as number,
                                phase: e.phase as 0 | 1 | 2,
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

                const jBrowsenclistbaseurl = speciesConfig.jBrowsenclistbaseurltemplate.replace(
                    '{release}',
                    resolveJBrowseRelease(speciesConfig, agrjBrowseDataRelease)
                );

                const genomeLocation = getSingleGenomeLocation(gene.genomeLocations);

                try {
                    const transcripts = await fetchTranscripts({
                        refseq: genomeLocation['chromosome'],
                        start: genomeLocation['start'],
                        end: genomeLocation['end'],
                        gene: gene['symbol'],
                        urltemplate: speciesConfig.jBrowseurltemplate,
                        nclistbaseurl: jBrowsenclistbaseurl,
                    });
                    console.log('transcripts received:', transcripts);

                    // Define transcripts list
                    setTranscriptList(transcripts);
                } catch (e) {
                    // fetchTranscripts rejects when the NCList track data can't be
                    // read (e.g. a 404 because this assembly/release has no NCList
                    // tracks published). Surface it instead of leaving a silent
                    // empty dropdown.
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
                    (t) => t.get('name')?.includes('canonical') || t.get('is_canonical') === true
                ) || transcriptList[0];
            if (canonicalTranscript) {
                setSelectedTranscriptIds([canonicalTranscript.id()]);
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
