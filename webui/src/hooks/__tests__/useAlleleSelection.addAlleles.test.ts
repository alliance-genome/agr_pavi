import { renderHook, act } from '@testing-library/react';
import { useAlleleSelection } from '../useAlleleSelection';
import type { AlleleInfo } from '@/app/submit/components/AlignmentEntry/types';

const mkAllele = (id: string, source: AlleleInfo['source'] = 'search'): AlleleInfo => ({
    id, displayName: id, variants: new Map(), hasDisease: false, hasPhenotype: false, source,
});

// A ref object shaped like createRef<MultiSelect>() — the hook only calls .current?.show().
const msRef = { current: { show: () => {} } } as any;

describe('useAlleleSelection.addAlleles', () => {
    const gene = { id: 'MGI:97490', symbol: 'Pax6', species: {}, genomeLocations: [] } as any;

    it('merges new alleles into alleleList and dedups by id', () => {
        const { result } = renderHook(() => useAlleleSelection({ gene, setupCompleted: true }, msRef));
        act(() => result.current.addAlleles([mkAllele('v1'), mkAllele('v2')]));
        act(() => result.current.addAlleles([mkAllele('v2'), mkAllele('v3')])); // v2 dup
        expect(result.current.alleleList.map(a => a.id)).toEqual(['v1', 'v2', 'v3']);
    });

    it('preserves an existing selection when new alleles are appended', () => {
        const { result } = renderHook(() => useAlleleSelection({ gene, setupCompleted: true }, msRef));
        act(() => result.current.addAlleles([mkAllele('v1')]));
        act(() => result.current.setSelectedAlleleIds(['v1']));
        act(() => result.current.addAlleles([mkAllele('v2')])); // append must NOT clear selection
        expect(result.current.selectedAlleleIds).toContain('v1');
        expect(result.current.alleleList.map(a => a.id)).toEqual(['v1', 'v2']);
    });

    it('promotes an existing gene allele when a search re-surfaces it (so it can override the transcript filter)', () => {
        const { result } = renderHook(() => useAlleleSelection({ gene, setupCompleted: true }, msRef));
        // A gene-loaded allele (would be hidden by an active transcript filter).
        act(() => result.current.addAlleles([mkAllele('n1046', 'gene')]));
        expect(result.current.alleleList.find(a => a.id === 'n1046')?.source).toBe('gene');
        // The user explicitly searches for it -> its source is promoted so
        // alleleOptions exempts it from the filter; no duplicate is added.
        act(() => result.current.addAlleles([mkAllele('n1046', 'search')]));
        expect(result.current.alleleList.map(a => a.id)).toEqual(['n1046']);
        expect(result.current.alleleList.find(a => a.id === 'n1046')?.source).toBe('search');
    });
});
