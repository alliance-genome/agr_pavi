# KANBAN-691: Limit Allele and Transcript Selection to Relevant Combos

## Status
Backlog

## Summary
Filter transcript and allele selection options to only show compatible combinations based on which transcripts a variant affects.

## Requirements

1. **When allele(s) selected** → only show transcripts that overlap with those alleles
2. **When transcript(s) selected** → only show alleles that overlap with those transcripts

## Technical Analysis

### API Data Available

The Alliance API `allele-variant-detail` endpoint already provides transcript associations via the `consequence` object:

```json
{
  "allele": {
    "id": "MGI:7425320",
    "symbol": "Trp53<sup>em1Hwl</sup>"
  },
  "variant": {
    "id": "NC_000077.7:g.69477771_69477771del",
    "displayName": "NC_000077.7:g.69477771_69477771del"
  },
  "consequence": {
    "transcript": {
      "id": "ENSEMBL:ENSMUST00000005371",
      "name": "ENSMUST00000005371"
    },
    "location": "Exon 2 / 11",
    "molecularConsequences": ["frameshift_variant"],
    "impact": "HIGH"
  }
}
```

### Key Insight

No coordinate overlap calculations needed - the API already tells us which transcript each variant affects via `consequence.transcript.id`.

## Implementation Plan

### 1. Update Data Types

Modify `types.ts` to include transcript associations:

```typescript
export interface VariantInfo {
    readonly id: string,
    readonly displayName: string,
    readonly affectedTranscriptIds?: string[]  // NEW: from consequence.transcript.id
}

export interface AlleleInfo {
    readonly id: string,
    readonly displayName: string,
    variants: Map<string, VariantInfo>,
    readonly affectedTranscriptIds?: Set<string>  // NEW: union of all variant transcript IDs
}
```

### 2. Update `fetchAlleles` in `serverActions.ts`

Extract transcript associations when processing allele-variant records:

```typescript
results.forEach((result: any) => {
    const variant = {
        id: result['variant']['id'],
        displayName: result['variant']['displayName'],
        // NEW: capture affected transcript
        affectedTranscriptId: result['consequence']?.['transcript']?.['id']
    }
    // ... existing logic ...
})
```

### 3. Create Filtering Hooks

Create a new hook `useFilteredOptions.ts`:

```typescript
export function useFilteredOptions(
    allTranscripts: TranscriptInfo[],
    allAlleles: AlleleInfo[],
    selectedTranscripts: TranscriptInfo[],
    selectedAlleles: AlleleInfo[]
) {
    // Filter transcripts based on selected alleles
    const filteredTranscripts = useMemo(() => {
        if (selectedAlleles.length === 0) return allTranscripts;

        const allowedTranscriptIds = new Set<string>();
        selectedAlleles.forEach(allele => {
            allele.affectedTranscriptIds?.forEach(id => allowedTranscriptIds.add(id));
        });

        return allTranscripts.filter(t =>
            allowedTranscriptIds.has(t.id) || allowedTranscriptIds.has(t.curie)
        );
    }, [allTranscripts, selectedAlleles]);

    // Filter alleles based on selected transcripts
    const filteredAlleles = useMemo(() => {
        if (selectedTranscripts.length === 0) return allAlleles;

        const selectedTranscriptIds = new Set(
            selectedTranscripts.flatMap(t => [t.id, t.curie])
        );

        return allAlleles.filter(allele =>
            allele.affectedTranscriptIds?.some(id => selectedTranscriptIds.has(id))
        );
    }, [allAlleles, selectedTranscripts]);

    return { filteredTranscripts, filteredAlleles };
}
```

### 4. Update AlignmentEntry Component

Use the filtered options in the MultiSelect components instead of the full lists.

### 5. UX Considerations

- Show a message when options are filtered (e.g., "Showing 3 of 8 transcripts compatible with selected alleles")
- Consider adding a "Show all" toggle to override filtering
- Handle edge case where filtering results in empty options

## Files to Modify

1. `webui/src/app/submit/components/AlignmentEntry/types.ts` - Add transcript associations to types
2. `webui/src/app/submit/components/AlignmentEntry/serverActions.ts` - Extract transcript data from API
3. `webui/src/hooks/useFilteredOptions.ts` - NEW: filtering logic
4. `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx` - Use filtered options

## Testing

- Test with genes that have multiple transcripts and alleles
- Verify filtering works bidirectionally
- Test edge cases: no overlapping options, single option, etc.
- Ensure UX is clear when options are being filtered

## Related

- Uses data from Alliance API `allele-variant-detail` endpoint
- Builds on existing allele selection feature (KANBAN-816)
