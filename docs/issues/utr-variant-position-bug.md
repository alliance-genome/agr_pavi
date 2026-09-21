# Bug: 3' UTR variant incorrectly shown at protein position 1 for minus strand gene

## Bug Description

Variants located in the 3' UTR are being incorrectly displayed at amino acid position 1 in the alignment viewer, when they should either:
1. Not be shown (since they don't affect the protein sequence)
2. Or be properly indicated as UTR variants with correct transcript positioning

## Example Case

**Variant:** rs868096125
**Gene:** SHH (Sonic Hedgehog) - Human
**Strand:** Minus (-)
**Genomic Position:** chr7:155800076

### Alliance API Data for rs868096125:
```json
{
  "location": {
    "chromosome": "7",
    "start": 155800076,
    "end": 155800076
  },
  "transcriptLevelConsequence": [
    {
      "molecularConsequences": ["3_prime_UTR_variant"],
      "cdnaStartPosition": "4554",
      "hgvsCodingNomenclature": "ENSEMBL:ENST00000297261.7:c.*2824C>A"
    }
  ]
}
```

### Key Observations:
1. **The variant is a 3' UTR variant** (`molecularConsequences: ["3_prime_UTR_variant"]`)
2. **HGVS notation `c.*2824C>A`** - the `*` indicates 2824 nucleotides past the stop codon (in 3' UTR)
3. **cDNA position is 4554** - near the END of the transcript
4. **SHH is on the minus strand** - position calculations need strand-aware reversal

### Current Behavior:
- Variant is displayed at **alignment position 1** (beginning)
- The human sequences show all dashes at position 1 (signal peptide region)
- User cannot see where the actual variant is in relation to the protein

### Expected Behavior:
- Either exclude 3' UTR variants from protein alignments entirely
- Or correctly calculate the position relative to the coding sequence boundaries
- Or clearly indicate the variant is in a non-coding region

## Technical Analysis

### Relevant Code Paths:

1. **`pipeline_components/seq_retrieval/src/seq_region/seq_region.py` lines 164-188**: Position calculation for variants
   - Handles strand-aware position conversion
   - Uses `to_rel_position()` which reverses for minus strand

2. **`pipeline_components/seq_retrieval/src/seq_region/translated_seq_region.py`**: Handles CDS vs exon distinction
   - Lines 449-462: Different handling for minus strand coding region start

3. **`pipeline_components/seq_retrieval/src/variant/variant.py` line 196-208**: Fetches variant from Alliance API
   - Only uses genomic coordinates, not transcript-level consequence data

### Potential Issues:

1. **UTR variants not filtered**: When a variant falls in exon regions but outside CDS regions, it may still be embedded
2. **Position defaulting to 1**: If position calculation fails or returns unexpected value, it might default to position 1
3. **Multi-exon position accumulation**: For minus strand genes with multiple exons, the relative position accumulation might be incorrect

## Reproduction Steps

1. Go to PAVI submit page
2. Submit an alignment for human SHH gene with variant rs868096125
3. Observe the result page shows "1 variant" at position 1
4. Note that position 1 shows dashes for human sequences

## Test Job
UUID: `1c9d8485-b441-439e-ac22-da92eda57f59`
URL: https://dev-pavi.alliancegenome.org/result?uuid=1c9d8485-b441-439e-ac22-da92eda57f59

## Suggested Fix Approaches

1. **Filter UTR variants for protein output**: Check if variant falls within CDS boundaries before embedding
2. **Use transcript-level consequence data**: The Alliance API provides `molecularConsequences` - use this to determine if variant affects protein
3. **Validate variant position after calculation**: Add sanity checks that position falls within expected range

## Labels
- bug
- seq_retrieval
- pipeline

## Reporter
Reported via user feedback on 2026-02-25
