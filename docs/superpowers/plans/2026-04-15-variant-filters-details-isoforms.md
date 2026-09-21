# Variant Filters, Cross-Species Details & Isoform Selection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the PAVI variant data pipeline and result UI with molecular consequence filtering (Feature 4), cross-species variant detail panel with disease/phenotype data (Feature 5), and isoform selection on the submit form (Feature 6).

**Architecture:** Feature 4 is frontend-only — `molecular_consequences` already flows from the Alliance API through the JSON serialization to the API response; the TypeScript interface just ignores it. Feature 5 requires pipeline enrichment (extracting HGVS, impact, disease/phenotype from Alliance APIs) plus a new frontend detail component. Feature 6 requires a new Alliance API integration for transcript/isoform data plus submit form restructuring.

**Tech Stack:** Python 3.12 (pipeline), FastAPI (API), TypeScript/React 19/Next.js 15 (webui), Alliance of Genome Resources public API, Jest (frontend tests), pytest (backend tests)

**Dependencies between features:** Feature 4 is independent. Feature 5 depends on pipeline enrichment from Task 2. Feature 6 is fully independent of 4 and 5.

---

## Feature 4: Molecular Consequence Filter

**Current state:** The Python `Variant` class (`pipeline_components/seq_retrieval/src/variant/variant.py:58`) already stores `molecular_consequences: List[str]` with SO terms like `missense_variant`, `frameshift_variant`, `stop_gained`. The serialization layer encodes this to the `aligned_seq_info.json` output. The frontend TypeScript `EmbeddedVariant` interface (`webui/src/app/result/components/InteractiveAlignment/types.ts`) does **not** include this field, so the data is present in the API response but ignored.

### Task 1: Add molecular_consequences to TypeScript types and verify data flow

**Files:**
- Modify: `webui/src/app/result/components/InteractiveAlignment/types.ts:12-25`
- Test: `webui/src/app/result/components/__tests__/InteractiveAlignment.test.tsx`

- [ ] **Step 1: Verify the API response includes molecular_consequences**

Submit a job locally (SOD1 ALS example), then inspect the seq-info response:

```bash
# Get the UUID from the job submission, then:
curl -s http://localhost:8000/api/pipeline-job/{uuid}/result/seq-info | python3 -c "
import sys, json
data = json.load(sys.stdin)
for name, info in data.items():
    if 'embedded_variants' in info and info['embedded_variants']:
        for v in info['embedded_variants']:
            print(f\"{v.get('variant_id')}: molecular_consequences={v.get('molecular_consequences', 'MISSING')}\")"
```

Expected: Each variant prints its `molecular_consequences` list (e.g., `['missense_variant']`). If `MISSING`, the field is not being serialized and Task 2 needs to fix the pipeline serialization first.

- [ ] **Step 2: Add molecular_consequences to the TypeScript interface**

```typescript
// webui/src/app/result/components/InteractiveAlignment/types.ts
export interface EmbeddedVariant {
    alignment_start_pos: number,
    alignment_end_pos: number,
    seq_start_pos: number,
    seq_end_pos: number,
    seq_length: number,
    variant_id: string,
    genomic_seq_id: string,
    genomic_start_pos: number,
    genomic_end_pos: number,
    genomic_ref_seq: string,
    genomic_alt_seq: string,
    seq_substitution_type: string,
    molecular_consequences?: string[]
}
```

- [ ] **Step 3: Write a test for the consequence filter**

Add to `webui/src/app/result/components/__tests__/InteractiveAlignment.test.tsx`:

```typescript
describe('molecular consequence filter', () => {
    it('should filter variants by molecular consequence', () => {
        const variants: EmbeddedVariant[] = [
            { ...baseVariant, variant_id: 'v1', molecular_consequences: ['missense_variant'] },
            { ...baseVariant, variant_id: 'v2', molecular_consequences: ['frameshift_variant'] },
            { ...baseVariant, variant_id: 'v3', molecular_consequences: ['missense_variant', 'stop_gained'] },
        ];

        // Filter for missense_variant only
        const filter = new Set(['missense_variant']);
        const filtered = variants.filter(v =>
            filter.size === 0 || v.molecular_consequences?.some(mc => filter.has(mc))
        );

        expect(filtered).toHaveLength(2); // v1 and v3
        expect(filtered.map(v => v.variant_id)).toEqual(['v1', 'v3']);
    });
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd webui && npm run test -- --testPathPattern="InteractiveAlignment.test"
```

- [ ] **Step 5: Commit**

```bash
git add webui/src/app/result/components/InteractiveAlignment/types.ts \
       webui/src/app/result/components/__tests__/InteractiveAlignment.test.tsx
git commit -m "Add molecular_consequences to EmbeddedVariant type with filter test"
```

### Task 2: Build molecular consequence filter UI

**Files:**
- Modify: `webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.tsx`
- Modify: `webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.module.css`

The existing `variantTypeFilter` (filtering on `seq_substitution_type`) provides the pattern. This task adds a parallel `consequenceFilter` for molecular consequences.

- [ ] **Step 1: Add consequence filter state and computed unique consequences**

In `VirtualizedAlignment.tsx`, after the existing `variantTypeFilter` state:

```typescript
const [consequenceFilter, setConsequenceFilter] = useState<Set<string>>(new Set());

// Extract unique molecular consequences for filter UI (unfiltered source)
const uniqueConsequences = useMemo(() => {
    const consequences = new Set<string>();
    for (const [, seqInfo] of Object.entries(props.seqInfoDict)) {
        if (seqInfo.embedded_variants) {
            for (const variant of seqInfo.embedded_variants) {
                if (variant.molecular_consequences) {
                    for (const mc of variant.molecular_consequences) {
                        consequences.add(mc);
                    }
                }
            }
        }
    }
    return Array.from(consequences).sort();
}, [props.seqInfoDict]);
```

- [ ] **Step 2: Add consequence filter conditions to the three useMemos**

In `allVariantsTrackData`, `alignmentFeatures`, and `alleleInfo` useMemos, add this condition after the existing `variantTypeFilter` check:

```typescript
if (consequenceFilter.size > 0 &&
    !(variant.molecular_consequences?.some(mc => consequenceFilter.has(mc)))) continue;
```

Add `consequenceFilter` to all three dependency arrays.

Note: the consequence filter uses `some()` (OR logic) because a single variant can have multiple consequences (e.g., `['missense_variant', 'stop_gained']`). Checking a filter type matches if the variant has ANY of the checked consequences.

- [ ] **Step 3: Add consequence filter UI in the Show panel**

After the existing variant type filter block, add:

```tsx
{showVariantLocations && uniqueConsequences.length > 1 && (
    <div className={styles.variantFilters}>
        <span className={styles.filterLabel}>Consequence:</span>
        {uniqueConsequences.map(mc => (
            <label key={mc} className={styles.filterChip}>
                <input
                    type="checkbox"
                    checked={consequenceFilter.has(mc)}
                    onChange={() => {
                        const next = new Set(consequenceFilter);
                        if (next.has(mc)) next.delete(mc); else next.add(mc);
                        setConsequenceFilter(next);
                    }}
                />
                <span>{mc.replace(/_/g, ' ')}</span>
            </label>
        ))}
    </div>
)}
```

The `mc.replace(/_/g, ' ')` converts SO terms like `missense_variant` to `missense variant` for display.

- [ ] **Step 4: Build and test locally**

```bash
cd webui && rm -rf .next && PAVI_API_BASE_URL=http://localhost:8000 npm run build
```

Submit a job and verify the consequence filter appears when variants have different molecular consequences.

- [ ] **Step 5: Commit**

```bash
git add webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.tsx \
       webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.module.css
git commit -m "Add molecular consequence filter to variant location overlay"
```

---

## Feature 5: Cross-Species Variant Details Panel

**Current state:** The `PositionInfoPanel` component (`webui/src/app/result/components/PositionInfoPanel/PositionInfoPanel.tsx`) already shows some variant info on click (HGVS ID, impact tags, molecular consequence). But it lacks: HGVS protein/coding nomenclature, cross-species disease associations, and phenotype data. The Alliance API variant endpoint returns `hgvsProteinNomenclature`, `hgvsCodingNomenclature`, and `impact` in the `transcriptLevelConsequence` array, but PAVI currently only extracts `molecularConsequences`.

### Task 3: Enrich pipeline Variant class with HGVS and impact data

**Files:**
- Modify: `pipeline_components/seq_retrieval/src/variant/variant.py:56-138`
- Test: `pipeline_components/seq_retrieval/tests/a_unit/test_variant.py`

- [ ] **Step 1: Write a test for the new fields**

```python
# In pipeline_components/seq_retrieval/tests/a_unit/test_variant.py
def test_variant_stores_hgvs_and_impact():
    v = Variant(
        variant_id="test:123",
        seq_id="chr1",
        start=100,
        end=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        molecular_consequences=["missense_variant"],
        hgvs_protein="NP_000316.2:p.Leu278Ser",
        hgvs_coding="NM_000325.6:c.833T>C",
        impact="MODERATE"
    )
    assert v.hgvs_protein == "NP_000316.2:p.Leu278Ser"
    assert v.hgvs_coding == "NM_000325.6:c.833T>C"
    assert v.impact == "MODERATE"


def test_variant_hgvs_defaults_to_none():
    v = Variant(
        variant_id="test:456",
        seq_id="chr1",
        start=200,
        end=200,
        genomic_ref_seq="C",
        genomic_alt_seq="G",
    )
    assert v.hgvs_protein is None
    assert v.hgvs_coding is None
    assert v.impact is None
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd pipeline_components/seq_retrieval
.venv/bin/python -m pytest tests/a_unit/test_variant.py::test_variant_stores_hgvs_and_impact -v
```

Expected: `TypeError: __init__() got an unexpected keyword argument 'hgvs_protein'`

- [ ] **Step 3: Add fields to Variant.__init__**

In `pipeline_components/seq_retrieval/src/variant/variant.py`, add to the `__init__` signature (after `molecular_consequences`):

```python
def __init__(
    self,
    variant_id: str,
    seq_id: str,
    start: int,
    end: int,
    genomic_ref_seq: Optional[str] = None,
    genomic_alt_seq: Optional[str] = None,
    molecular_consequences: Optional[List[str]] = None,
    hgvs_protein: Optional[str] = None,
    hgvs_coding: Optional[str] = None,
    impact: Optional[str] = None,
):
```

And in the body:

```python
self.molecular_consequences = molecular_consequences or []
self.hgvs_protein = hgvs_protein
self.hgvs_coding = hgvs_coding
self.impact = impact
```

- [ ] **Step 4: Extract HGVS and impact from Alliance API response**

In `Variant.from_variant_id()` (line ~255), after extracting `molecular_consequences`:

```python
# Extract HGVS nomenclature and impact from first transcript consequence
hgvs_protein = None
hgvs_coding = None
impact = None
if transcript_consequences:
    first = transcript_consequences[0]
    hgvs_protein = first.get("hgvsProteinNomenclature")
    hgvs_coding = first.get("hgvsCodingNomenclature")
    impact = first.get("impact")

return cls(
    variant_id=variant_id,
    seq_id=variant_data["location"]["chromosome"],
    start=variant_data["location"]["start"],
    end=variant_data["location"]["end"],
    genomic_ref_seq=variant_data.get("genomicReferenceSequence"),
    genomic_alt_seq=variant_data.get("genomicVariantSequence"),
    molecular_consequences=molecular_consequences,
    hgvs_protein=hgvs_protein,
    hgvs_coding=hgvs_coding,
    impact=impact,
)
```

- [ ] **Step 5: Run tests**

```bash
.venv/bin/python -m pytest tests/a_unit/test_variant.py -v
```

- [ ] **Step 6: Commit**

```bash
git add pipeline_components/seq_retrieval/src/variant/variant.py \
       pipeline_components/seq_retrieval/tests/a_unit/test_variant.py
git commit -m "Add HGVS nomenclature and impact fields to Variant class"
```

### Task 4: Add HGVS/impact fields to TypeScript types and variant info cards

**Files:**
- Modify: `webui/src/app/result/components/InteractiveAlignment/types.ts`
- Modify: `webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.tsx`
- Modify: `webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.module.css`

- [ ] **Step 1: Extend EmbeddedVariant type**

In `types.ts`, add after `molecular_consequences`:

```typescript
export interface EmbeddedVariant {
    // ... existing fields ...
    molecular_consequences?: string[],
    hgvs_protein?: string,
    hgvs_coding?: string,
    impact?: string
}
```

- [ ] **Step 2: Add HGVS and impact to variant info cards**

In `VirtualizedAlignment.tsx`, in the `alleleInfo` useMemo, add the new fields to the pushed object:

```typescript
alleles.push({
    seqName,
    variantId: variant.variant_id,
    refSeq: variant.genomic_ref_seq || '-',
    altSeq: variant.genomic_alt_seq || '-',
    position: `${variant.genomic_seq_id}:${variant.genomic_start_pos}-${variant.genomic_end_pos}`,
    type: variant.seq_substitution_type,
    alignmentPos: variant.alignment_start_pos,
    hgvsProtein: variant.hgvs_protein || null,
    impact: variant.impact || null,
    consequences: variant.molecular_consequences || [],
});
```

Update the type definition of the `alleles` array to include:

```typescript
hgvsProtein: string | null;
impact: string | null;
consequences: string[];
```

- [ ] **Step 3: Display enriched data in the variant cards**

In the JSX variant card rendering, add the new fields below the existing variant position line:

```tsx
{allele.hgvsProtein && (
    <div className={styles.variantHgvs}>{allele.hgvsProtein}</div>
)}
{allele.consequences.length > 0 && (
    <div className={styles.variantConsequences}>
        {allele.consequences.map(mc => (
            <span key={mc} className={styles.consequenceBadge}>
                {mc.replace(/_/g, ' ')}
            </span>
        ))}
    </div>
)}
```

- [ ] **Step 4: Add CSS for new card elements**

```css
.variantHgvs {
  font-size: 0.6875rem;
  color: var(--agr-gray-600);
  font-style: italic;
  margin-top: 0.125rem;
}

.variantConsequences {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.consequenceBadge {
  font-size: 0.5625rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 3px;
  background: var(--agr-primary-100);
  color: var(--agr-primary-700);
  font-weight: 500;
}
```

- [ ] **Step 5: Build, submit a new job, verify annotations appear**

```bash
cd webui && rm -rf .next && PAVI_API_BASE_URL=http://localhost:8000 npm run build
```

Submit a new job (to get fresh pipeline output with the new fields). Verify the variant cards show HGVS protein notation and consequence badges.

- [ ] **Step 6: Commit**

```bash
git add webui/src/app/result/components/InteractiveAlignment/types.ts \
       webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.tsx \
       webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.module.css
git commit -m "Display HGVS nomenclature and molecular consequences in variant cards"
```

### Task 5: Fetch disease/phenotype data from Alliance API

**Files:**
- Create: `pipeline_components/seq_retrieval/src/variant/variant_annotations.py`
- Modify: `pipeline_components/seq_retrieval/src/variant/variant.py`
- Test: `pipeline_components/seq_retrieval/tests/a_unit/test_variant_annotations.py`

This task adds disease and phenotype annotation fetching from the Alliance API. The data comes from a DIFFERENT endpoint than the variant data — the variant's associated alleles are used to query disease/phenotype annotations.

**Alliance API endpoints used:**
- `GET /api/variant/{variant_id}` — already called; extract `alleles` field to get allele IDs
- `GET /api/allele/{allele_id}` — fetch allele details including disease annotations

- [ ] **Step 1: Write a test for the annotation data structure**

```python
# pipeline_components/seq_retrieval/tests/a_unit/test_variant_annotations.py
from variant.variant_annotations import VariantAnnotations


def test_variant_annotations_structure():
    annotations = VariantAnnotations(
        disease_associations=[
            {"disease": "Axenfeld-Rieger syndrome", "source": "OMIM", "evidence": "IAGP"}
        ],
        phenotype_associations=[
            {"phenotype": "abnormal eye pressure", "species": "Mus musculus", "source": "MGI"}
        ]
    )
    assert len(annotations.disease_associations) == 1
    assert annotations.disease_associations[0]["disease"] == "Axenfeld-Rieger syndrome"
    assert len(annotations.phenotype_associations) == 1


def test_variant_annotations_empty_by_default():
    annotations = VariantAnnotations()
    assert annotations.disease_associations == []
    assert annotations.phenotype_associations == []
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd pipeline_components/seq_retrieval
.venv/bin/python -m pytest tests/a_unit/test_variant_annotations.py -v
```

Expected: `ModuleNotFoundError: No module named 'variant.variant_annotations'`

- [ ] **Step 3: Implement VariantAnnotations class and fetcher**

```python
# pipeline_components/seq_retrieval/src/variant/variant_annotations.py
"""
Fetches disease and phenotype annotations for variants from the Alliance API.
"""

import logging
from dataclasses import dataclass, field
from typing import Any

import requests

logger = logging.getLogger(__name__)

ALLIANCE_API_BASE = "https://www.alliancegenome.org/api"


@dataclass
class VariantAnnotations:
    """Disease and phenotype annotations for a variant."""
    disease_associations: list[dict[str, Any]] = field(default_factory=list)
    phenotype_associations: list[dict[str, Any]] = field(default_factory=list)


def fetch_variant_annotations(variant_id: str) -> VariantAnnotations:
    """
    Fetch disease and phenotype annotations for a variant from the Alliance API.

    Retrieves the variant's associated alleles, then queries each allele
    for disease and phenotype annotations.

    Args:
        variant_id: Alliance variant ID

    Returns:
        VariantAnnotations with disease and phenotype lists
    """
    annotations = VariantAnnotations()

    try:
        # Fetch variant data to get associated alleles
        url = f"{ALLIANCE_API_BASE}/variant/{variant_id}"
        response = requests.get(url)
        response.raise_for_status()
        variant_data = response.json()

        # Extract allele IDs from the variant
        alleles = variant_data.get("alleles", [])
        if not alleles:
            logger.debug(f"No alleles found for variant {variant_id}")
            return annotations

        for allele_entry in alleles:
            allele_id = allele_entry.get("id")
            if not allele_id:
                continue

            try:
                allele_url = f"{ALLIANCE_API_BASE}/allele/{allele_id}"
                allele_response = requests.get(allele_url)
                allele_response.raise_for_status()
                allele_data = allele_response.json()

                # Extract disease annotations
                for disease in allele_data.get("diseases", []):
                    annotations.disease_associations.append({
                        "disease": disease.get("name", ""),
                        "disease_id": disease.get("id", ""),
                        "source": disease.get("source", ""),
                        "evidence": disease.get("evidenceCode", ""),
                        "species": allele_entry.get("species", {}).get("name", ""),
                        "allele_id": allele_id,
                        "allele_name": allele_entry.get("symbol", allele_id),
                    })

                # Extract phenotype annotations
                for phenotype in allele_data.get("phenotypes", []):
                    annotations.phenotype_associations.append({
                        "phenotype": phenotype.get("name", ""),
                        "phenotype_id": phenotype.get("id", ""),
                        "source": phenotype.get("source", ""),
                        "species": allele_entry.get("species", {}).get("name", ""),
                        "allele_id": allele_id,
                        "allele_name": allele_entry.get("symbol", allele_id),
                    })

            except requests.RequestException as e:
                logger.warning(f"Failed to fetch allele {allele_id}: {e}")

    except requests.RequestException as e:
        logger.warning(f"Failed to fetch variant annotations for {variant_id}: {e}")

    return annotations
```

**IMPORTANT:** The exact structure of the Alliance API response for alleles (`.diseases`, `.phenotypes` field names) MUST be verified against the live API before implementing. Run this first:

```bash
curl -s "https://www.alliancegenome.org/api/allele/MGI:1856697" | python3 -m json.tool | head -50
```

Adjust the field names in the implementation based on the actual response.

- [ ] **Step 4: Run tests**

```bash
.venv/bin/python -m pytest tests/a_unit/test_variant_annotations.py -v
```

- [ ] **Step 5: Commit**

```bash
git add pipeline_components/seq_retrieval/src/variant/variant_annotations.py \
       pipeline_components/seq_retrieval/tests/a_unit/test_variant_annotations.py
git commit -m "Add variant disease/phenotype annotation fetcher from Alliance API"
```

### Task 6: Integrate annotations into Variant class and seq_info output

**Files:**
- Modify: `pipeline_components/seq_retrieval/src/variant/variant.py`
- Modify: `pipeline_components/seq_retrieval/src/seq_retrieval.py`

- [ ] **Step 1: Add annotations field to Variant class**

In `variant.py`, add to `__init__`:

```python
from variant.variant_annotations import VariantAnnotations

# In __init__ signature:
    annotations: Optional["VariantAnnotations"] = None,

# In __init__ body:
    self.annotations = annotations
```

- [ ] **Step 2: Fetch annotations during variant creation**

In `seq_retrieval.py`, after the variant info fetch loop (line ~406):

```python
from variant.variant_annotations import fetch_variant_annotations

# After existing variant_info loop:
for variant_id, variant in variant_info.items():
    logger.debug(f"Fetching annotations for {variant_id}...")
    variant.annotations = fetch_variant_annotations(variant_id)
```

**Performance note:** This adds extra API calls per variant per allele. For jobs with many variants, consider using `concurrent.futures.ThreadPoolExecutor` to parallelize fetches, or adding a `--fetch-annotations` CLI flag to make it opt-in.

- [ ] **Step 3: Run full pipeline test**

```bash
cd pipeline_components/seq_retrieval
.venv/bin/python -m pytest tests/ -v --timeout=60
```

- [ ] **Step 4: Commit**

```bash
git add pipeline_components/seq_retrieval/src/variant/variant.py \
       pipeline_components/seq_retrieval/src/seq_retrieval.py
git commit -m "Integrate disease/phenotype annotations into variant pipeline"
```

### Task 7: Display disease/phenotype annotations in frontend

**Files:**
- Modify: `webui/src/app/result/components/InteractiveAlignment/types.ts`
- Modify: `webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.tsx`
- Modify: `webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.module.css`

- [ ] **Step 1: Add annotation types to TypeScript**

In `types.ts`:

```typescript
export interface VariantAnnotation {
    disease?: string;
    disease_id?: string;
    phenotype?: string;
    phenotype_id?: string;
    source?: string;
    evidence?: string;
    species?: string;
    allele_id?: string;
    allele_name?: string;
}

export interface VariantAnnotationSet {
    disease_associations: VariantAnnotation[];
    phenotype_associations: VariantAnnotation[];
}

export interface EmbeddedVariant {
    // ... existing fields ...
    annotations?: VariantAnnotationSet;
}
```

- [ ] **Step 2: Display annotations in variant cards**

In `VirtualizedAlignment.tsx`, add an expandable annotation section to each variant card:

```tsx
{allele.annotations && (
    <div className={styles.variantAnnotations}>
        {allele.annotations.disease_associations.length > 0 && (
            <div className={styles.annotationSection}>
                <span className={styles.annotationLabel}>Disease:</span>
                {allele.annotations.disease_associations.map((d, i) => (
                    <span key={i} className={styles.diseaseBadge}>
                        {d.disease} ({d.species})
                    </span>
                ))}
            </div>
        )}
        {allele.annotations.phenotype_associations.length > 0 && (
            <div className={styles.annotationSection}>
                <span className={styles.annotationLabel}>Phenotype:</span>
                {allele.annotations.phenotype_associations.map((p, i) => (
                    <span key={i} className={styles.phenotypeBadge}>
                        {p.phenotype} ({p.species})
                    </span>
                ))}
            </div>
        )}
    </div>
)}
```

- [ ] **Step 3: Add CSS**

```css
.variantAnnotations {
  margin-top: 0.375rem;
  padding-top: 0.375rem;
  border-top: 1px solid var(--agr-gray-200);
}

.annotationSection {
  margin-bottom: 0.25rem;
}

.annotationLabel {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--agr-gray-500);
  text-transform: uppercase;
  margin-right: 0.25rem;
}

.diseaseBadge {
  font-size: 0.625rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 3px;
  background: #fef2f2;
  color: #991b1b;
  margin-right: 0.25rem;
}

.phenotypeBadge {
  font-size: 0.625rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 3px;
  background: #f0fdf4;
  color: #166534;
  margin-right: 0.25rem;
}
```

- [ ] **Step 4: Build, submit a new job, verify annotations appear**

```bash
cd webui && rm -rf .next && PAVI_API_BASE_URL=http://localhost:8000 npm run build
```

- [ ] **Step 5: Commit**

```bash
git add webui/src/app/result/components/InteractiveAlignment/types.ts \
       webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.tsx \
       webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.module.css
git commit -m "Display disease and phenotype annotations in variant cards"
```

---

## Feature 6: Isoform Selection

**Current state:** The submit form (`webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx`) uses three hooks: `useGeneSearch`, `useTranscriptSelection`, and `useAlleleSelection`. Transcript selection fetches transcripts for a gene via the Alliance API. However, there is no isoform-level protein selection — the pipeline uses whatever reference transcript is available. The SAB mockup (slide 9) shows an "Add additional isoforms" expandable section per species, listing NP accessions.

### Task 8: Investigate Alliance API isoform data availability

**Files:** None (research task)

This is a prerequisite research task. The implementation depends on what the Alliance API returns.

- [ ] **Step 1: Query Alliance API for transcript/isoform data**

```bash
# Pick a well-known gene (e.g., human PITX2 from the SAB mockup)
curl -s "https://www.alliancegenome.org/api/gene/HGNC:9005" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('Keys:', list(data.keys()))
# Look for transcript/isoform related fields
for k in ['genomeLocations', 'transcripts', 'proteins', 'isoforms']:
    if k in data:
        print(f'{k}: {json.dumps(data[k], indent=2)[:500]}')
"

# Also check the transcript endpoint
curl -s "https://www.alliancegenome.org/api/gene/HGNC:9005/transcripts" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, list):
    print(f'Transcript count: {len(data)}')
    if data:
        print(f'First transcript keys: {list(data[0].keys())}')
        print(json.dumps(data[0], indent=2)[:500])
elif isinstance(data, dict):
    print(f'Keys: {list(data.keys())}')
"
```

- [ ] **Step 2: Document findings**

Record:
- Does the API return multiple protein isoforms per gene?
- What are the accession formats (NP_*, XP_*, UniProt)?
- Can we get protein sequences for specific isoforms?
- Is there a mapping from transcript to protein isoform?

- [ ] **Step 3: Decide on implementation approach**

Based on findings, choose one of:
- **Option A:** If Alliance API returns protein isoforms directly, add an isoform MultiSelect that populates from the API (similar to existing transcript selection).
- **Option B:** If Alliance API returns transcripts with protein accessions, add a secondary step that shows available proteins per transcript.
- **Option C:** If Alliance API doesn't have isoform data, use UniProt API as a fallback source.

Document the decision in a comment in this plan file.

- [ ] **Step 4: Commit research notes**

```bash
git commit --allow-empty -m "Research: Alliance API isoform data availability"
```

### Task 9: Add isoform selection to submit form

**Files:**
- Create: `webui/src/hooks/useIsoformSelection.ts`
- Modify: `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx`
- Test: `webui/src/hooks/__tests__/useIsoformSelection.test.ts`

**Note:** This task's exact implementation depends on Task 8 findings. The structure below assumes Option A (Alliance API returns protein isoforms). Adjust based on actual API response shape.

- [ ] **Step 1: Create the isoform selection hook**

```typescript
// webui/src/hooks/useIsoformSelection.ts
import { useState, useEffect } from 'react';

export interface Isoform {
    id: string;          // e.g., "NP_700476"
    label: string;       // e.g., "isoform a"
    accession: string;   // protein accession
    isReference: boolean;
}

interface UseIsoformSelectionProps {
    geneId: string | null;
    transcriptIds: string[];
}

export function useIsoformSelection({ geneId, transcriptIds }: UseIsoformSelectionProps) {
    const [isoforms, setIsoforms] = useState<Isoform[]>([]);
    const [selectedIsoformIds, setSelectedIsoformIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!geneId || transcriptIds.length === 0) {
            setIsoforms([]);
            return;
        }

        setLoading(true);
        // Fetch isoform data from Alliance API
        // Implementation depends on Task 8 findings
        fetch(`https://www.alliancegenome.org/api/gene/${geneId}/transcripts`)
            .then(res => res.json())
            .then(data => {
                // Map API response to Isoform objects
                // Exact mapping depends on Task 8 findings
                const mapped: Isoform[] = []; // TODO: map based on API shape
                setIsoforms(mapped);
            })
            .catch(err => console.error('Failed to fetch isoforms:', err))
            .finally(() => setLoading(false));
    }, [geneId, transcriptIds]);

    return { isoforms, selectedIsoformIds, setSelectedIsoformIds, loading };
}
```

- [ ] **Step 2: Add isoform MultiSelect to AlignmentEntry**

In `AlignmentEntry.tsx`, after the allele selection section, add a collapsible "Additional isoforms" section:

```tsx
{isoformSelection.isoforms.length > 0 && (
    <div className="field">
        <label htmlFor={`isoforms-${props.index}`}>
            Additional Isoforms (optional)
        </label>
        <MultiSelect
            id={`isoforms-${props.index}`}
            loading={isoformSelection.loading}
            value={isoformSelection.selectedIsoformIds}
            onChange={(e) => isoformSelection.setSelectedIsoformIds(e.value)}
            options={isoformSelection.isoforms.map(iso => ({
                label: `${iso.accession} (${iso.label})`,
                value: iso.id,
            }))}
            display="comma"
            placeholder="Select additional isoforms to include"
            style={{ width: '100%' }}
        />
    </div>
)}
```

- [ ] **Step 3: Integrate selected isoforms into job submission payload**

The selected isoform IDs need to be included in the sequence regions sent to the pipeline. This requires modifying the payload construction in `AlignmentEntry.tsx` (around the `useEffect` that builds the submission portion at line ~230).

The exact integration depends on how the pipeline handles isoform sequences — likely as additional sequence regions in the job request, similar to how allele sequences are added.

- [ ] **Step 4: Test end-to-end**

```bash
cd webui && npm run test -- --testPathPattern="AlignmentEntry.test"
```

Then build and test manually by submitting a job with a gene that has multiple isoforms.

- [ ] **Step 5: Commit**

```bash
git add webui/src/hooks/useIsoformSelection.ts \
       webui/src/hooks/__tests__/useIsoformSelection.test.ts \
       webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx
git commit -m "Add isoform selection to submit form"
```

---

## Implementation Order

```
Feature 4 (independent, frontend-only):
  Task 1 -> Task 2

Feature 5 (pipeline + frontend):
  Task 3 -> Task 4 -> Task 5 -> Task 6 -> Task 7

Feature 6 (research-dependent):
  Task 8 -> Task 9
```

Features 4 and 6 can be worked in parallel. Feature 5 Tasks 3-4 (HGVS/impact) can start before Task 5-7 (disease/phenotype) since they're additive.

## Risks and Open Questions

1. **Alliance API rate limiting:** Features 5 and 6 add extra API calls per variant/gene. If the Alliance API has rate limits, concurrent fetches could fail. Consider adding retry logic with backoff.

2. **Alliance allele endpoint schema:** Task 5's implementation assumes `.diseases` and `.phenotypes` fields on the allele response. The actual field names MUST be verified against the live API before implementing (Step 3 of Task 5 notes this).

3. **Isoform data availability:** Task 8 is research — the entire Feature 6 implementation depends on what the Alliance API actually returns for isoforms. If the API doesn't provide protein isoform data, Feature 6 may need UniProt as an alternative source.

4. **Pipeline performance:** Adding annotation fetches (Feature 5) increases pipeline runtime proportionally to the number of variants x alleles. For genes with many variants, this could be significant. Consider making it opt-in via a CLI flag or job submission option.
