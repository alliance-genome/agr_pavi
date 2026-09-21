'use client';

import { useCallback, useEffect, useState, RefObject } from 'react';
import { MultiSelect } from 'primereact/multiselect';
import { GeneInfo, AlleleInfo, AlleleSource } from '@/app/submit/components/AlignmentEntry/types';
import { fetchAlleles } from '@/app/submit/components/AlignmentEntry/serverActions';

export interface UseAlleleSelectionOptions {
    gene: GeneInfo | undefined;
    setupCompleted?: boolean;
    initialAlleleIds?: string[];
}

export interface UseAlleleSelectionResult {
    // State
    alleleList: AlleleInfo[];
    alleleListLoading: boolean;
    alleleListLoaded: boolean;
    selectedAlleleIds: string[];
    selectedAllelesInfo: AlleleInfo[];
    alleleListFocused: boolean;
    alleleListOpened: boolean;

    // Actions
    setSelectedAlleleIds: (_ids: string[]) => void;
    setAlleleListFocused: (_focused: boolean) => void;
    setAlleleListOpened: (_opened: boolean) => void;
    loadAllelesOnDemand: () => Promise<void>;
    resetSelection: () => void;
    addAlleles: (_newAlleles: AlleleInfo[]) => void;
}

export function useAlleleSelection(
    options: UseAlleleSelectionOptions,
    alleleMultiselectRef: RefObject<MultiSelect | null>
): UseAlleleSelectionResult {
    const { gene, setupCompleted, initialAlleleIds } = options;

    // Allele state
    const [alleleList, setAlleleList] = useState<AlleleInfo[]>([]);
    const [alleleListLoading, setAlleleListLoading] = useState(false);
    const [selectedAlleleIds, setSelectedAlleleIds] = useState<string[]>([]);
    const [selectedAllelesInfo, setSelectedAllelesInfo] = useState<AlleleInfo[]>([]);
    const [alleleListFocused, setAlleleListFocused] = useState(false);
    const [alleleListOpened, setAlleleListOpened] = useState(false);
    const [alleleListLoaded, setAlleleListLoaded] = useState(false);
    const [initialSelectionApplied, setInitialSelectionApplied] = useState(false);

    const resetSelection = useCallback(() => {
        setAlleleList([]);
        setSelectedAlleleIds([]);
        setSelectedAllelesInfo([]);
        setAlleleListLoaded(false);
        setInitialSelectionApplied(false);
    }, []);

    // Lazy-load alleles on demand (when dropdown is opened)
    const loadAllelesOnDemand = useCallback(async () => {
        if (gene && alleleList.length === 0 && !alleleListLoading) {
            console.log(`Lazy-loading alleles for gene: ${gene.id}`);
            setAlleleListLoading(true);  // Set immediately before any async work
            try {
                // Forward the catalog-supplied initialAlleleIds so the
                // server-side paginator keeps fetching past the distinct-cap
                // until every required allele has been seen — otherwise
                // heavily-annotated genes (e.g. Trp53) silently truncate the
                // curated alleles we want to pre-select.
                const alleles = await fetchAlleles(gene.id, initialAlleleIds ?? []);
                console.log(`${alleles.length} alleles received.`);
                setAlleleList(alleles);
                setAlleleListLoaded(true);
            } catch (e) {
                console.error('Error loading alleles:', e);
            } finally {
                setAlleleListLoading(false);
            }
        }
    }, [gene, alleleList.length, alleleListLoading, initialAlleleIds]);

    // Merge newly found alleles (e.g. from HGVS search) into alleleList,
    // deduping by id. Used to add alleles found past the fetch cap without
    // discarding the alleles already loaded or the user's in-progress selection.
    const addAlleles = useCallback((newAlleles: AlleleInfo[]) => {
        if (!newAlleles || newAlleles.length === 0) return;
        setAlleleList((prev) => {
            const existing = new Map(prev.map((a) => [a.id, a]));
            const additions = newAlleles.filter((a) => !existing.has(a.id));
            // An allele the user explicitly searched for (source 'lookup' or
            // 'search') must override the transcript/consequence auto-filter.
            // If it's already loaded as a gene allele, promote its source so
            // alleleOptions exempts it from the filter (the source!=='gene'
            // branch there) — otherwise a name/HGVS search reports "added"
            // while the filter keeps it hidden.
            const promote = new Map<string, AlleleSource>();
            for (const a of newAlleles) {
                if (a.source && a.source !== 'gene' && existing.get(a.id)?.source === 'gene') {
                    promote.set(a.id, a.source);
                }
            }
            if (additions.length === 0 && promote.size === 0) return prev;
            const updated = promote.size === 0
                ? prev
                : prev.map((a) => (promote.has(a.id) ? { ...a, source: promote.get(a.id) } : a));
            return additions.length === 0 ? updated : [...updated, ...additions];
        });
    }, []);

    const processAlleleEntry = useCallback(
        async (alleleIds: string[]) => {
            if (alleleList.length > 0) {
                console.log(`Processing selected alleles: ${alleleIds}`);
                // Convert alleleList into map keyed by allele ID
                const allelesMap = new Map<string, AlleleInfo>();
                alleleList.forEach((allele) => {
                    allelesMap.set(allele.id, allele);
                });

                const alleleEntryInfo: AlleleInfo[] = [];
                alleleIds.forEach((alleleId) => {
                    const allele = allelesMap.get(alleleId);
                    if (allele) {
                        alleleEntryInfo.push(allele);
                    } else {
                        console.error(`Selected allele not found: ${alleleId}`);
                    }
                });

                setSelectedAllelesInfo(alleleEntryInfo);
            } else {
                console.log('Allele list is empty, clearing prior selected alleles info.');
                setSelectedAllelesInfo([]);
            }
        },
        [alleleList]
    );

    // Update alleleList loading status once alleleList object has been saved
    useEffect(() => {
        console.log(`New allele list loaded.`);
        // Drop only selections no longer present in the list. A fresh gene
        // load (new list shares no ids) clears everything as before; an
        // append (addAlleles) preserves the in-progress selection.
        setSelectedAlleleIds((prev) => {
            const kept = prev.filter((id) => alleleList.some((a) => a.id === id));
            return kept.length === prev.length ? prev : kept;
        });
        setAlleleListLoading(false);
        if (alleleList.length > 0) {
            const select_menu = alleleMultiselectRef.current;
            if (select_menu && alleleListFocused) {
                console.log(`Opening allele panel.`);
                alleleMultiselectRef.current?.show();
            }
        }
    }, [alleleList]); // eslint-disable-line react-hooks/exhaustive-deps

    // Process allele entry once allele selection panel gets closed
    useEffect(() => {
        if (setupCompleted === true && alleleListFocused === false && alleleListOpened === false) {
            processAlleleEntry(selectedAlleleIds);
        }
    }, [setupCompleted, selectedAlleleIds, alleleListFocused, alleleListOpened, processAlleleEntry]);

    // Reset allele list when gene changes
    useEffect(() => {
        if (gene === undefined) {
            setAlleleList([]);
            setSelectedAlleleIds([]);
            setSelectedAllelesInfo([]);
        }
    }, [gene]);

    // Auto-load alleles when we have initial allele IDs
    useEffect(() => {
        if (gene && initialAlleleIds && initialAlleleIds.length > 0 && !initialSelectionApplied && alleleList.length === 0 && !alleleListLoading) {
            console.log(`Auto-loading alleles for initial selection: ${initialAlleleIds.join(', ')}`);
            loadAllelesOnDemand();
        }
    }, [gene, initialAlleleIds, initialSelectionApplied, alleleList.length, alleleListLoading, loadAllelesOnDemand]);

    // Apply initial allele selection once alleles are loaded
    useEffect(() => {
        if (initialAlleleIds && initialAlleleIds.length > 0 && alleleList.length > 0 && !initialSelectionApplied) {
            console.log(`Applying initial allele selection: ${initialAlleleIds.join(', ')}`);
            // Filter to only include valid allele IDs that exist in the loaded list
            const validAlleleIds = initialAlleleIds.filter(id => alleleList.some(a => a.id === id));
            if (validAlleleIds.length > 0) {
                console.log(`Valid allele IDs found: ${validAlleleIds.join(', ')}`);
                setSelectedAlleleIds(validAlleleIds);
                // Also process and set selectedAllelesInfo
                const allelesInfo = validAlleleIds
                    .map(id => alleleList.find(a => a.id === id))
                    .filter((a): a is AlleleInfo => a !== undefined);
                setSelectedAllelesInfo(allelesInfo);
            } else {
                console.warn(`No matching alleles found for initial IDs: ${initialAlleleIds.join(', ')}`);
            }
            setInitialSelectionApplied(true);
        }
    }, [initialAlleleIds, alleleList, initialSelectionApplied]);

    return {
        // State
        alleleList,
        alleleListLoading,
        alleleListLoaded,
        selectedAlleleIds,
        selectedAllelesInfo,
        alleleListFocused,
        alleleListOpened,

        // Actions
        setSelectedAlleleIds,
        setAlleleListFocused,
        setAlleleListOpened,
        loadAllelesOnDemand,
        resetSelection,
        addAlleles,
    };
}
