# KANBAN-727: Remove Duplicate Reference Sequence Display on Result Page

## Status
Backlog

## Summary
When the same transcript is submitted multiple times with different alleles (enabled by KANBAN-816), the result page should only show one reference sequence per transcript, not duplicates.

## Problem

With KANBAN-816, users can submit the same transcript through multiple form entries with different alleles/variants. For example:

| Entry | Gene | Transcript | Allele |
|-------|------|------------|--------|
| 1 | Trp53 | NM_011640.3 | Allele A |
| 2 | Trp53 | NM_011640.3 | Allele B |
| 3 | Trp53 | NM_011640.3 | Allele C |

Currently, the result page would show:
- Reference: Trp53_NM_011640.3 (duplicate 1)
- Reference: Trp53_NM_011640.3 (duplicate 2)
- Reference: Trp53_NM_011640.3 (duplicate 3)
- Allele A variant
- Allele B variant
- Allele C variant

Expected behavior:
- Reference: Trp53_NM_011640.3 (single instance)
- Allele A variant
- Allele B variant
- Allele C variant

## Requirements

1. Display only one reference sequence per unique transcript on the result page
2. Continue displaying all variant sequences from different alleles
3. Maintain proper alignment between reference and all variants

## Technical Analysis

### Where Duplicates Originate

The duplication likely occurs in:
1. **Pipeline output** - `aligned_seq_info.json` may contain duplicate entries
2. **Result page rendering** - May not deduplicate when processing alignment results

### Pipeline Output Structure

Check `aligned_seq_info.json` structure after alignment:
```json
{
  "sequences": [
    {"name": "000_Trp53_NM_011640.3", "type": "reference", ...},
    {"name": "001_Trp53_NM_011640.3", "type": "reference", ...},  // duplicate
    {"name": "000_Trp53_NM_011640.3_alt1", "type": "variant", ...},
    {"name": "001_Trp53_NM_011640.3_alt1", "type": "variant", ...}
  ]
}
```

### Deduplication Strategy

**Option A: Pipeline-level deduplication**
- Modify `collectAndAlignSeqInfo` to merge duplicate references
- Pros: Single source of truth, cleaner output
- Cons: Requires pipeline changes, affects all consumers

**Option B: UI-level deduplication**
- Deduplicate in the result page component
- Pros: No pipeline changes, faster to implement
- Cons: Duplicates still exist in data, processing overhead

**Recommended: Option B** for initial implementation, with Option A as future optimization.

## Implementation Plan

### 1. Identify Reference Sequences

In the result page component, identify reference vs variant sequences:
- Reference sequences: base transcript without `_alt` suffix
- Variant sequences: have `_alt1`, `_alt2`, etc. suffix

### 2. Deduplicate References

```typescript
function deduplicateSequences(sequences: AlignedSequence[]): AlignedSequence[] {
    const seen = new Set<string>();
    const result: AlignedSequence[] = [];

    for (const seq of sequences) {
        // Check if this is a reference (no _alt suffix)
        const isReference = !seq.name.includes('_alt');

        if (isReference) {
            // Extract base transcript name (remove numeric prefix like "000_")
            const baseName = seq.name.replace(/^\d+_/, '');

            if (seen.has(baseName)) {
                continue; // Skip duplicate reference
            }
            seen.add(baseName);
        }

        result.push(seq);
    }

    return result;
}
```

### 3. Update Result Display Component

Apply deduplication before rendering the alignment viewer:

```typescript
// In result page component
const displaySequences = useMemo(() => {
    return deduplicateSequences(alignmentResult.sequences);
}, [alignmentResult]);
```

### 4. Handle Sequence Ordering

Ensure proper ordering after deduplication:
1. Reference sequences first (or grouped by gene)
2. Variant sequences following their reference
3. Maintain alignment row consistency

## Files to Modify

1. `webui/src/app/result/` - Result page components
2. Possibly `webui/src/components/AlignmentViewer/` - If deduplication happens at viewer level

## Edge Cases

1. **Different genes, same transcript name** - Unlikely but handle with full unique ID
2. **Alignment coordinates** - Ensure removing duplicates doesn't break alignment indexing
3. **Variant association** - Variants should still visually associate with their reference

## Testing

1. Submit same transcript with multiple alleles
2. Verify only one reference appears in results
3. Verify all variants still appear correctly
4. Check alignment visualization is correct
5. Test with multiple genes, each with duplicate transcripts

## Related

- KANBAN-816: Enable submitting same transcript with different alleles (prerequisite)
- Alignment viewer component
- Pipeline `collectAndAlignSeqInfo` step
