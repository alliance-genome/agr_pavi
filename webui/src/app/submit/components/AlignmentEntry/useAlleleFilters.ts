import { useCallback, useMemo, useState } from 'react'

import { AlleleInfo, VariantConsequence, VariantInfo } from './types'

const variantValues = (variants: AlleleInfo['variants']): VariantInfo[] =>
    variants instanceof Map
        ? Array.from(variants.values())
        : Object.values(variants as unknown as Record<string, VariantInfo>)

export interface AlleleFilters {
    consequences: Set<string>
    impacts: Set<string>
    transcriptIds: Set<string>
    sift: Set<string>
    polyphen: Set<string>
    hasDisease: boolean | null
    hasPhenotype: boolean | null
}

export type AlleleFilterField = keyof AlleleFilters

export interface AlleleFilterOptions {
    consequences: string[]
    impacts: string[]
    transcripts: Array<{ id: string; name: string }>
    sift: string[]
    polyphen: string[]
}

const emptyFilters = (): AlleleFilters => ({
    consequences: new Set(),
    impacts: new Set(),
    transcriptIds: new Set(),
    sift: new Set(),
    polyphen: new Set(),
    hasDisease: null,
    hasPhenotype: null,
})

const consequenceMatches = (cons: VariantConsequence, filters: AlleleFilters): boolean => {
    if (filters.consequences.size > 0
        && !cons.molecularConsequences.some(mc => filters.consequences.has(mc))) {
        return false
    }
    if (filters.impacts.size > 0 && (!cons.impact || !filters.impacts.has(cons.impact))) {
        return false
    }
    if (filters.transcriptIds.size > 0
        && (!cons.transcriptId || !filters.transcriptIds.has(cons.transcriptId))) {
        return false
    }
    if (filters.sift.size > 0 && (!cons.sift || !filters.sift.has(cons.sift))) {
        return false
    }
    if (filters.polyphen.size > 0 && (!cons.polyphen || !filters.polyphen.has(cons.polyphen))) {
        return false
    }
    return true
}

const alleleMatches = (allele: AlleleInfo, filters: AlleleFilters): boolean => {
    if (filters.hasDisease !== null && allele.hasDisease !== filters.hasDisease) return false
    if (filters.hasPhenotype !== null && allele.hasPhenotype !== filters.hasPhenotype) return false

    const hasConsequenceFilters = filters.consequences.size > 0
        || filters.impacts.size > 0
        || filters.transcriptIds.size > 0
        || filters.sift.size > 0
        || filters.polyphen.size > 0
    if (!hasConsequenceFilters) return true

    for (const variant of variantValues(allele.variants)) {
        const cons = variant.consequences ?? []
        if (cons.some(c => consequenceMatches(c, filters))) return true
    }
    return false
}

const collectOptions = (alleles: AlleleInfo[]): AlleleFilterOptions => {
    const consequences = new Set<string>()
    const impacts = new Set<string>()
    const sift = new Set<string>()
    const polyphen = new Set<string>()
    const transcripts = new Map<string, string>()

    for (const allele of alleles) {
        for (const variant of variantValues(allele.variants)) {
            const cons = variant.consequences ?? []
            for (const c of cons) {
                (c.molecularConsequences ?? []).forEach(mc => consequences.add(mc))
                if (c.impact) impacts.add(c.impact)
                if (c.sift) sift.add(c.sift)
                if (c.polyphen) polyphen.add(c.polyphen)
                if (c.transcriptId) {
                    transcripts.set(c.transcriptId, c.transcriptName ?? c.transcriptId)
                }
            }
        }
    }

    return {
        consequences: Array.from(consequences).sort(),
        impacts: ['HIGH', 'MODERATE', 'LOW', 'MODIFIER'].filter(i => impacts.has(i)),
        transcripts: Array.from(transcripts, ([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        sift: Array.from(sift).sort(),
        polyphen: Array.from(polyphen).sort(),
    }
}

const countActive = (filters: AlleleFilters): number => {
    let n = 0
    if (filters.consequences.size > 0) n++
    if (filters.impacts.size > 0) n++
    if (filters.transcriptIds.size > 0) n++
    if (filters.sift.size > 0) n++
    if (filters.polyphen.size > 0) n++
    if (filters.hasDisease !== null) n++
    if (filters.hasPhenotype !== null) n++
    return n
}

export interface UseAlleleFiltersResult {
    filters: AlleleFilters
    options: AlleleFilterOptions
    activeCount: number
    filteredAlleles: AlleleInfo[]
    setSetFilter: (_field: 'consequences' | 'impacts' | 'transcriptIds' | 'sift' | 'polyphen', _values: Iterable<string>) => void
    setBoolFilter: (_field: 'hasDisease' | 'hasPhenotype', _value: boolean | null) => void
    clearFilters: () => void
}

export function useAlleleFilters(alleles: AlleleInfo[]): UseAlleleFiltersResult {
    const [filters, setFilters] = useState<AlleleFilters>(() => emptyFilters())

    const options = useMemo(() => collectOptions(alleles), [alleles])

    const filteredAlleles = useMemo(
        () => alleles.filter(a => alleleMatches(a, filters)),
        [alleles, filters]
    )

    const activeCount = useMemo(() => countActive(filters), [filters])

    const setSetFilter = useCallback(
        (field: 'consequences' | 'impacts' | 'transcriptIds' | 'sift' | 'polyphen', values: Iterable<string>) => {
            setFilters(prev => ({ ...prev, [field]: new Set(values) }))
        },
        []
    )

    const setBoolFilter = useCallback(
        (field: 'hasDisease' | 'hasPhenotype', value: boolean | null) => {
            setFilters(prev => ({ ...prev, [field]: value }))
        },
        []
    )

    const clearFilters = useCallback(() => setFilters(emptyFilters()), [])

    return { filters, options, activeCount, filteredAlleles, setSetFilter, setBoolFilter, clearFilters }
}
