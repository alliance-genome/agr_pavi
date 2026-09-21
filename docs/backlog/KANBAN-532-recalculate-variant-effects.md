# KANBAN-532: Display Recalculated Variant Effects Based on Variant-Embedded Sequences

## Status
Backlog

## Summary
Recalculate and display corrected variant effects for all variants when one or more variants are embedded into a transcript sequence, as the embedding can alter the reading frame and protein outcome.

## Problem

When a variant is embedded into a transcript sequence:
1. The amino acid sequence changes based on the variant
2. This altered sequence can change the effect of OTHER variants on the same transcript
3. Current variant annotations are based on the reference sequence only
4. Displaying original annotations on variant-embedded sequences may be incorrect

### Example Scenario

```
Reference:    ATG GAA TTT CCC AAA ...
              Met Glu Phe Pro Lys

Variant A (position 4): G>T (Glu→Stop in reference)
Variant B (position 7): T>A (Phe→Tyr in reference)

With Variant A embedded (frameshift):
Sequence:    ATG TAA TTT CCC AAA ...
             Met STOP ...

→ Variant B at position 7 is now AFTER a stop codon
→ Its effect is no longer "Phe→Tyr" but "no effect" (downstream of stop)
```

### Another Example: Frameshift Impact

```
Reference:        ATG GAA TTT CCC AAA GGG ...
                  Met Glu Phe Pro Lys Gly

Variant A: Insert "A" at position 4 (frameshift)
Variant B: Position 10, C>T (Pro→Leu in reference)

With Variant A embedded:
Sequence:         ATG AGA ATT TCC CAA AGG G...
                  Met Arg Ile Ser Gln Arg ...

→ Variant B at position 10 now falls on different codon
→ Original effect "Pro→Leu" is wrong
→ Actual effect depends on new reading frame
```

## Solution

Recalculate variant effects for all displayed variants based on the actual embedded sequence rather than the reference.

### Approach Options

#### Option A: Client-Side Recalculation
Calculate effects in the browser using sequence data.

```typescript
interface RecalculatedEffect {
  originalEffect: string;      // From annotation database
  recalculatedEffect: string;  // Based on embedded sequence
  isChanged: boolean;          // Flag if effect differs
  reason?: string;             // "frameshift", "stop_gained_upstream", etc.
}

function recalculateVariantEffect(
  variant: Variant,
  embeddedSequence: string,
  referenceSequence: string,
  embeddedVariants: Variant[]
): RecalculatedEffect {
  // 1. Check if any upstream variant causes frameshift
  // 2. Check if any upstream variant introduces stop codon
  // 3. Recalculate codon and amino acid at variant position
  // 4. Determine new effect
}
```

**Pros:**
- No backend changes needed
- Real-time updates as user selects variants
- Flexible visualization

**Cons:**
- Complex logic in frontend
- Need translation tables in JS
- Potentially slow for many variants

#### Option B: Backend Recalculation
Calculate effects during pipeline execution or API response.

```python
# In alignment pipeline or API
def recalculate_effects(
    sequence_with_variants: str,
    variants_to_annotate: List[Variant],
    embedded_variants: List[Variant]
) -> List[AnnotatedVariant]:
    """Recalculate variant effects based on modified sequence."""
    for variant in variants_to_annotate:
        # Map variant position to embedded sequence
        adjusted_pos = map_position(variant.position, embedded_variants)

        # Get codon context from embedded sequence
        codon = get_codon_at_position(sequence_with_variants, adjusted_pos)

        # Calculate amino acid change
        ref_aa = translate_codon(codon)
        alt_codon = apply_variant(codon, variant)
        alt_aa = translate_codon(alt_codon)

        variant.recalculated_effect = f"{ref_aa}{adjusted_pos}{alt_aa}"
```

**Pros:**
- Centralized logic
- Can leverage existing bioinformatics libraries
- Easier to test

**Cons:**
- Requires API changes
- Less interactive

#### Option C: Hybrid Approach (Recommended)
Backend provides translated sequences; frontend calculates effects.

```
Backend:
  - Returns aligned protein sequence for each variant-embedded transcript
  - Provides position mapping between reference and embedded

Frontend:
  - Uses pre-computed sequences to determine effects
  - Highlights differences from original annotations
```

## Technical Implementation

### Data Structures

```typescript
// Extended sequence info with recalculated effects
interface AlignedSequenceInfo {
  sequenceId: string;
  embeddedVariants: Variant[];

  // New fields
  proteinSequence: string;  // Translated from embedded nucleotide
  positionMapping: Map<number, number>;  // ref_pos → embedded_pos

  variantAnnotations: {
    variantId: string;
    originalEffect: MolecularConsequence;
    recalculatedEffect: MolecularConsequence;
    effectChanged: boolean;
    changeReason: 'frameshift' | 'upstream_stop' | 'codon_context' | null;
  }[];
}
```

### Position Mapping

```typescript
// Map reference position to position in variant-embedded sequence
function mapPosition(
  refPosition: number,
  embeddedVariants: Variant[]
): number {
  let offset = 0;

  for (const variant of embeddedVariants.sort((a, b) => a.position - b.position)) {
    if (variant.position >= refPosition) break;

    if (variant.type === 'insertion') {
      offset += variant.altAllele.length - variant.refAllele.length;
    } else if (variant.type === 'deletion') {
      offset -= variant.refAllele.length - variant.altAllele.length;
    }
    // SNVs don't change positions
  }

  return refPosition + offset;
}
```

### Effect Recalculation Logic

```typescript
function determineRecalculatedEffect(
  variant: Variant,
  embeddedSequence: string,
  embeddedVariants: Variant[]
): MolecularConsequence {
  // Check for upstream stop codon from embedded variants
  const upstreamStop = findUpstreamStopCodon(embeddedSequence, variant.position);
  if (upstreamStop) {
    return {
      type: 'downstream_of_stop',
      original: variant.consequence,
      note: `Upstream stop at position ${upstreamStop}`
    };
  }

  // Check for frameshift from embedded variants
  const frameshift = calculateFrameshift(embeddedVariants, variant.position);
  if (frameshift !== 0) {
    return recalculateInNewFrame(variant, embeddedSequence, frameshift);
  }

  // No frameshift - recalculate in same frame with new context
  return recalculateInSameFrame(variant, embeddedSequence);
}
```

### UI Display

```tsx
// Show original vs recalculated effect
<VariantAnnotation variant={variant}>
  {variant.effectChanged ? (
    <Tooltip content={`Original: ${variant.originalEffect}`}>
      <Badge severity="warning">
        {variant.recalculatedEffect}
        <Icon name="info-circle" />
      </Badge>
    </Tooltip>
  ) : (
    <Badge>{variant.originalEffect}</Badge>
  )}
</VariantAnnotation>
```

## Visualization Considerations

### Indicating Changed Effects

| Scenario | Visual Indicator |
|----------|------------------|
| Effect unchanged | Normal display |
| Effect changed (same type) | Warning badge + tooltip with original |
| Effect nullified (downstream of stop) | Strikethrough + explanation |
| Effect altered by frameshift | Different color + frameshift indicator |

### Example Display

```
Aligned Sequences:
  Reference:    MEKTFPL...
  With Var A:   MEKTFPL...
  With Var B:   MEK*---... (stop at position 4)

Variant Annotations:
  ┌─────────────────────────────────────────────────┐
  │ Position 10: p.Pro10Leu                         │
  │   On Reference: Pro→Leu (missense)              │
  │   On "With Var B": ⚠️ Downstream of stop codon  │
  └─────────────────────────────────────────────────┘
```

## Edge Cases

1. **Multiple frameshifts**: Cumulative effect may restore reading frame
2. **Overlapping variants**: Two variants affecting same codon
3. **Splice variants**: May completely change transcript structure
4. **Start codon loss**: All downstream effects meaningless
5. **Complex indels**: Multiple position shifts

## Files to Modify

### Backend
1. `pipeline_components/seq_retrieval/src/seq_retrieval.py` - Include translated sequences
2. `api/src/job_service.py` - Return position mappings

### Frontend
3. `webui/src/app/result/` - Add effect recalculation logic
4. `webui/src/components/` - New VariantEffectDisplay component
5. `webui/src/lib/variantEffects.ts` - Effect calculation utilities

## Testing

1. Single variant embedding - verify no effect change
2. Frameshift variant upstream - verify downstream effects recalculated
3. Stop-gain variant upstream - verify downstream marked as nullified
4. Multiple embedded variants - verify cumulative effects
5. Insertion/deletion position mapping accuracy

## Related

- KANBAN-816 (Same transcript with different alleles)
- KANBAN-500 (Phase 2 - Enhanced variant annotations)
- Sequence Ontology for consequence terms
