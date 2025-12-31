'use client';

import { useCallback, useEffect, useState, RefObject } from 'react';
import { MultiSelect } from 'primereact/multiselect';
import { GeneInfo, AlleleInfo } from '@/app/submit/components/AlignmentEntry/types';
import { fetchAlleles } from '@/app/submit/components/AlignmentEntry/serverActions';

export interface UseAlleleSelectionOptions {
    gene: GeneInfo | undefined;
    setupCompleted?: boolean;
}

export interface UseAlleleSelectionResult {
    // State
    alleleList: AlleleInfo[];
    alleleListLoading: boolean;
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
}

export function useAlleleSelection(
    options: UseAlleleSelectionOptions,
    alleleMultiselectRef: RefObject<MultiSelect | null>
): UseAlleleSelectionResult {
    const { gene, setupCompleted } = options;

    // Allele state
    const [alleleList, setAlleleList] = useState<AlleleInfo[]>([]);
    const [alleleListLoading, setAlleleListLoading] = useState(false);
    const [selectedAlleleIds, setSelectedAlleleIds] = useState<string[]>([]);
    const [selectedAllelesInfo, setSelectedAllelesInfo] = useState<AlleleInfo[]>([]);
    const [alleleListFocused, setAlleleListFocused] = useState(false);
    const [alleleListOpened, setAlleleListOpened] = useState(false);

    const resetSelection = useCallback(() => {
        setAlleleList([]);
        setSelectedAlleleIds([]);
        setSelectedAllelesInfo([]);
    }, []);

    // Lazy-load alleles on demand (when dropdown is opened)
    const loadAllelesOnDemand = useCallback(async () => {
        if (gene && alleleList.length === 0 && !alleleListLoading) {
            console.log(`Lazy-loading alleles for gene: ${gene.id}`);
            setAlleleListLoading(true);
            try {
                const alleles = await fetchAlleles(gene.id);
                console.log(`${alleles.length} alleles received.`);
                setAlleleList(alleles);
            } catch (e) {
                console.error('Error loading alleles:', e);
            } finally {
                setAlleleListLoading(false);
            }
        }
    }, [gene, alleleList.length, alleleListLoading]);

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
        if (selectedAlleleIds.length > 0) {
            console.log('Clearing prior selected allele ids.');
            setSelectedAlleleIds([]);
        }
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

    return {
        // State
        alleleList,
        alleleListLoading,
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
    };
}
