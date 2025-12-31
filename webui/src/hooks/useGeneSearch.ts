'use client';

import { useCallback, useEffect, useState, RefObject } from 'react';
import { AutoComplete, AutoCompleteState } from 'primereact/autocomplete';
import { GeneInfo, GeneSuggestion, AlignmentEntryStatus } from '@/app/submit/components/AlignmentEntry/types';
import { fetchGeneInfo, fetchGeneSuggestionsAutocomplete } from '@/app/submit/components/AlignmentEntry/serverActions';

export interface UseGeneSearchOptions {
    onStatusChange?: (_status: AlignmentEntryStatus, _payloadPart?: undefined) => void;
    initialGeneId?: string;
    setupCompleted?: boolean;
}

export interface UseGeneSearchResult {
    // State
    gene: GeneInfo | undefined;
    geneQuery: string | GeneSuggestion | undefined;
    geneSuggestionList: GeneSuggestion[];
    selectedGeneSuggestion: GeneSuggestion | undefined;
    geneMessageDisplay: string;

    // Actions
    searchGene: (_query: string) => Promise<void>;
    setGeneQuery: (_query: string | GeneSuggestion | undefined) => void;
    setSelectedGeneSuggestion: (_suggestion: GeneSuggestion | undefined) => void;
    clearGeneSuggestionList: () => void;
    autoSelectSingleGeneSuggestion: () => void;

    // For handling transcripts/alleles reset
    resetDependentSelections: () => void;
    onGeneChange: (_callback: () => void) => void;
}

export function useGeneSearch(
    options: UseGeneSearchOptions,
    geneFieldRef: RefObject<AutoComplete | null>,
    geneFieldStateRef: RefObject<AutoCompleteState | null>
): UseGeneSearchResult {
    const { onStatusChange, initialGeneId, setupCompleted } = options;

    // Gene state
    const [gene, setGene] = useState<GeneInfo>();
    const [geneQuery, setGeneQuery] = useState<string | GeneSuggestion>();
    const [geneSuggestionList, setGeneSuggestionList] = useState<GeneSuggestion[]>([]);
    const [selectedGeneSuggestion, setSelectedGeneSuggestion] = useState<GeneSuggestion>();
    const [geneMessageDisplay, setGeneMessageDisplay] = useState('none');

    // Callback for when gene changes (to reset transcripts/alleles)
    const [geneChangeCallback, setGeneChangeCallback] = useState<(() => void) | null>(null);

    const searchGene = useCallback(async (queryStr: string) => {
        console.log('Searching for gene:', queryStr);
        const geneSuggestions: GeneSuggestion[] = [];

        // Try exact matching on ID
        const idMatch = await fetchGeneInfo(queryStr);
        if (idMatch) {
            geneSuggestions.push({
                id: idMatch.id,
                displayName: `${idMatch.symbol} (${idMatch.species.shortName})`
            });
        }

        // Add autocomplete suggestions
        let autocompleteSuggestions: GeneSuggestion[] = [];
        try {
            autocompleteSuggestions = await fetchGeneSuggestionsAutocomplete(queryStr);
        } catch (e) {
            console.error(`Error received while requesting autocomplete suggestions: ${e}.`);
            setGeneMessageDisplay('initial');
            return;
        }

        if (autocompleteSuggestions && autocompleteSuggestions.length > 0) {
            geneSuggestions.push(...autocompleteSuggestions);
        }

        console.log(`${geneSuggestions.length} gene suggestions received.`);
        if (geneSuggestions.length === 0) {
            setGeneMessageDisplay('initial');
        }
        setGeneSuggestionList(geneSuggestions);
    }, []);

    const autoSelectSingleGeneSuggestion = useCallback(() => {
        // Autoselect single gene suggestion if no prior selection was made
        console.log('Evaluating autoselecting single gene suggestion...');
        if (geneQuery === undefined || geneQuery === '') {
            console.log('No gene query detected. Skipping autoselecting single gene suggestion.');
            return;
        }
        if (selectedGeneSuggestion === undefined && geneSuggestionList.length === 1) {
            console.log('Autoselecting single gene suggestion:', geneSuggestionList[0]);
            setSelectedGeneSuggestion(geneSuggestionList[0]);
            setGeneQuery(geneSuggestionList[0]);
            geneFieldRef.current?.hide();
        }
        // Reset gene autocomplete text to prior selection if prior selection was made and field is not in focus
        else if (
            selectedGeneSuggestion !== undefined &&
            geneQuery !== selectedGeneSuggestion.displayName &&
            !geneFieldStateRef.current?.focused
        ) {
            setGeneQuery(selectedGeneSuggestion);
        }
    }, [geneSuggestionList, selectedGeneSuggestion, geneQuery, geneFieldRef, geneFieldStateRef]);

    const processGeneEntry = useCallback(
        async (geneId: string | undefined) => {
            if (geneId === undefined) {
                console.log(`Processing undefined gene entry.`);
                if (gene !== undefined) {
                    // Clear prior gene selection
                    console.log(`Clearing prior gene selection.`);
                    onStatusChange?.(AlignmentEntryStatus.PENDING_INPUT);
                    setGeneMessageDisplay('none');
                    setGene(undefined);
                }
                return;
            } else if (geneId === gene?.id) {
                // Prevent processing the same gene twice
                console.log(`Gene field value unchanged, skipping processing for ${geneId}.`);
                return;
            }

            onStatusChange?.(AlignmentEntryStatus.PROCESSING);

            if (geneId) {
                console.log('Fetching gene info for geneID', geneId, '...');
                // Trigger reset of dependent selections
                geneChangeCallback?.();

                const geneInfo: GeneInfo | undefined = await fetchGeneInfo(geneId);
                if (geneInfo) {
                    onStatusChange?.(AlignmentEntryStatus.PENDING_INPUT);
                    console.log('Gene info received:', geneInfo);
                    setGeneMessageDisplay('none');
                    setGene(geneInfo);
                } else {
                    console.log('Error while receiving gene info: undefined geneInfo returned.');
                    onStatusChange?.(AlignmentEntryStatus.FAILED_PROCESSING);
                    setGeneMessageDisplay('initial');
                    setGene(undefined);
                }
            } else {
                onStatusChange?.(AlignmentEntryStatus.PENDING_INPUT);
                setGene(undefined);
            }
        },
        [gene, onStatusChange, geneChangeCallback]
    );

    const clearGeneSuggestionList = useCallback(() => {
        setGeneSuggestionList([]);
    }, []);

    const resetDependentSelections = useCallback(() => {
        // This is called by the parent to reset transcript/allele selections
        // when gene changes
    }, []);

    const onGeneChange = useCallback((callback: () => void) => {
        setGeneChangeCallback(() => callback);
    }, []);

    // When a new geneSuggestionList is received but the gene field is not focused,
    // evaluate the geneAutocompleteList to determine if an autoSelection should be made
    useEffect(() => {
        if (!geneFieldStateRef.current?.focused) {
            autoSelectSingleGeneSuggestion();
        }
    }, [geneSuggestionList]); // eslint-disable-line react-hooks/exhaustive-deps

    // Process gene entry on gene selection
    useEffect(() => {
        // Process and store gene object if gene input was selected
        console.log('Processing gene selection:', selectedGeneSuggestion);
        processGeneEntry(selectedGeneSuggestion !== undefined ? selectedGeneSuggestion.id : undefined);
    }, [selectedGeneSuggestion, processGeneEntry]);

    // Handle initialGeneId prop - auto-search and select when provided
    useEffect(() => {
        if (setupCompleted && initialGeneId && !selectedGeneSuggestion) {
            console.log(`Processing initialGeneId: ${initialGeneId}`);
            setGeneQuery(initialGeneId);
            searchGene(initialGeneId);
        }
    }, [setupCompleted, initialGeneId]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        // State
        gene,
        geneQuery,
        geneSuggestionList,
        selectedGeneSuggestion,
        geneMessageDisplay,

        // Actions
        searchGene,
        setGeneQuery,
        setSelectedGeneSuggestion,
        clearGeneSuggestionList,
        autoSelectSingleGeneSuggestion,
        resetDependentSelections,
        onGeneChange,
    };
}
