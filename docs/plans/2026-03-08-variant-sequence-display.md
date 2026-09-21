# Variant Sequence Display — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Visually distinguish variant (alt) sequences from reference sequences in the alignment viewer, grouping alt rows beneath their parent reference with distinct styling.

**Architecture:** Add `is_alt_sequence`, `parent_sequence_name`, and `variant_summary` fields to SeqInfo in the pipeline so the WebUI can detect and style alt rows. The WebUI will sort sequences to group alts below their parent ref, indent alt labels, add a colored left border, and display a variant summary badge.

**Tech Stack:** Python 3.12 (pipeline), TypeScript/React (WebUI), Nightingale MSA components, CSS Modules

---

## Task 1: Add alt-sequence metadata fields to Python SeqInfo

**Files:**
- Modify: `pipeline_components/seq_retrieval/src/seq_info/seq_info.py`
- Test: `pipeline_components/seq_retrieval/tests/unit/seq_info/test_seq_info.py`

**Step 1: Write the failing test**

Add to `test_seq_info.py`:

```python
def test_seq_info_initiation_with_alt_metadata():
    """
    Test that SeqInfo correctly stores alt-sequence metadata fields.
    """
    seq_info = SeqInfo(
        sequence="ATG",
        is_alt_sequence=True,
        parent_sequence_name="TP53_NM_000546.6_ref",
        variant_summary="p.R175H (substitution)"
    )
    assert seq_info.is_alt_sequence is True
    assert seq_info.parent_sequence_name == "TP53_NM_000546.6_ref"
    assert seq_info.variant_summary == "p.R175H (substitution)"


def test_seq_info_default_alt_metadata():
    """
    Test that alt-sequence metadata defaults to None/False when not provided.
    """
    seq_info = SeqInfo(sequence="ATG")
    assert seq_info.is_alt_sequence is False
    assert seq_info.parent_sequence_name is None
    assert seq_info.variant_summary is None


def test_seq_info_from_dict_with_alt_metadata():
    """
    Test that SeqInfo.from_dict correctly loads alt-sequence metadata.
    """
    seq_info = SeqInfo.from_dict({
        "sequence": "ATG",
        "is_alt_sequence": True,
        "parent_sequence_name": "TP53_NM_000546.6_ref",
        "variant_summary": "p.R175H (substitution)"
    })
    assert seq_info.is_alt_sequence is True
    assert seq_info.parent_sequence_name == "TP53_NM_000546.6_ref"
    assert seq_info.variant_summary == "p.R175H (substitution)"


def test_seq_info_from_dict_without_alt_metadata():
    """
    Test that SeqInfo.from_dict works without alt-sequence metadata (backward compatible).
    """
    seq_info = SeqInfo.from_dict({"sequence": "ATG"})
    assert seq_info.is_alt_sequence is False
    assert seq_info.parent_sequence_name is None
    assert seq_info.variant_summary is None
```

**Step 2: Run tests to verify they fail**

Run: `cd pipeline_components/seq_retrieval && .venv/bin/python -m pytest tests/unit/seq_info/test_seq_info.py -v -k "alt_metadata"`
Expected: FAIL — `SeqInfo.__init__` does not accept `is_alt_sequence`, `parent_sequence_name`, `variant_summary`

**Step 3: Implement the new fields in SeqInfo**

In `seq_info.py`, modify the `SeqInfo` class:

1. Add class-level attributes:
   ```python
   is_alt_sequence: bool
   """Whether this sequence is an alternative (variant) sequence."""
   parent_sequence_name: Optional[str]
   """The name of the parent reference sequence this alt sequence derives from."""
   variant_summary: Optional[str]
   """Human-readable summary of the variant(s) in this alt sequence."""
   ```

2. Update `__init__` to accept and store these fields:
   ```python
   def __init__(
       self,
       sequence: Optional[str] = None,
       embedded_variants: Optional[...] = None,
       error: Optional[str] = None,
       species: Optional[str] = None,
       is_alt_sequence: bool = False,
       parent_sequence_name: Optional[str] = None,
       variant_summary: Optional[str] = None,
   ):
       # ... existing attribute assignments ...
       self.is_alt_sequence = is_alt_sequence
       self.parent_sequence_name = parent_sequence_name if parent_sequence_name is not None else None
       self.variant_summary = variant_summary if variant_summary is not None else None
   ```

   Note: Unlike the existing optional fields which only set the attribute when provided (using `if x is not None`), `is_alt_sequence` always defaults to `False` and the other two always default to `None`. This ensures backward compatibility — existing SeqInfo objects will have these attributes set.

3. Update `from_dict` to parse the new fields:
   ```python
   # After existing field parsing:
   is_alt_sequence: bool = False
   parent_sequence_name: Optional[str] = None
   variant_summary: Optional[str] = None

   if "is_alt_sequence" in seq_info_dict:
       if not isinstance(seq_info_dict["is_alt_sequence"], bool):
           raise TypeError("is_alt_sequence must be a boolean")
       is_alt_sequence = seq_info_dict["is_alt_sequence"]
   if "parent_sequence_name" in seq_info_dict:
       if not isinstance(seq_info_dict["parent_sequence_name"], str):
           raise TypeError("parent_sequence_name must be a string")
       parent_sequence_name = seq_info_dict["parent_sequence_name"]
   if "variant_summary" in seq_info_dict:
       if not isinstance(seq_info_dict["variant_summary"], str):
           raise TypeError("variant_summary must be a string")
       variant_summary = seq_info_dict["variant_summary"]

   return cls(
       sequence=sequence,
       embedded_variants=embedded_variants,
       error=error,
       species=species,
       is_alt_sequence=is_alt_sequence,
       parent_sequence_name=parent_sequence_name,
       variant_summary=variant_summary,
   )
   ```

**Step 4: Run tests to verify they pass**

Run: `cd pipeline_components/seq_retrieval && .venv/bin/python -m pytest tests/unit/seq_info/test_seq_info.py -v`
Expected: ALL PASS (new tests + existing tests)

**Step 5: Run full unit test suite to check for regressions**

Run: `cd pipeline_components/seq_retrieval && make run-unit-tests`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add pipeline_components/seq_retrieval/src/seq_info/seq_info.py \
      pipeline_components/seq_retrieval/tests/unit/seq_info/test_seq_info.py
git commit -m "feat: add alt-sequence metadata fields to SeqInfo"
```

---

## Task 2: Populate alt-sequence metadata in seq_retrieval write_output

**Files:**
- Modify: `pipeline_components/seq_retrieval/src/seq_retrieval.py`
- Test: `pipeline_components/seq_retrieval/tests/unit/test_write_output.py` (NEW)

**Step 1: Write the failing test**

Create `pipeline_components/seq_retrieval/tests/unit/test_write_output.py`:

```python
"""
Unit testing for write_output function in seq_retrieval
"""

import json
import os
import tempfile
import logging

from log_mgmt import get_logger, set_log_level
from seq_info import SeqInfo
from variant import SeqEmbeddedVariant, SeqEmbeddedVariantsList, Variant, SeqSubstitutionType

logger = get_logger(name=__name__)
set_log_level(logging.DEBUG)


def _make_variant() -> Variant:
    """Create a minimal Variant for testing."""
    return Variant(
        variant_id="test:g.100A>T",
        genomic_seq_id="chr1",
        genomic_start_pos=100,
        genomic_end_pos=100,
        genomic_ref_seq="A",
        genomic_alt_seq="T",
        seq_substitution_type=SeqSubstitutionType.SUBSTITUTION,
    )


def _make_embedded_variant() -> SeqEmbeddedVariant:
    """Create a minimal SeqEmbeddedVariant for testing."""
    return SeqEmbeddedVariant(
        variant=_make_variant(),
        seq_start_pos=5,
        seq_end_pos=5,
        embedded_ref_seq_len=1,
        embedded_alt_seq_len=1,
    )


def test_write_output_sets_alt_metadata(tmp_path):
    """
    Test that write_output sets is_alt_sequence, parent_sequence_name,
    and variant_summary on the alt SeqInfo when variants are present.
    """
    from seq_retrieval import write_output

    embedded = _make_embedded_variant()
    variants_list = SeqEmbeddedVariantsList([embedded])
    alt_info = SeqInfo(embedded_variants=variants_list, species="Homo sapiens")

    # Change to tmp_path so output files land there
    old_cwd = os.getcwd()
    os.chdir(tmp_path)
    try:
        write_output(
            unique_entry_id="test_entry",
            base_seq_name="TP53_NM_000546.6",
            output_type="protein",
            variants_flag=True,
            alt_seq_name_suffix="_alt1",
            ref_seq="MAGTK",
            alt_seq="MAGTK",
            ref_info=SeqInfo(species="Homo sapiens"),
            alt_info=alt_info,
        )

        # Read the seq info JSON output
        with open("test_entry-seqinfo.json", "r") as f:
            seq_info_output = json.loads(f.read())

        alt_key = "TP53_NM_000546.6_alt1"
        assert alt_key in seq_info_output
        assert seq_info_output[alt_key]["is_alt_sequence"] is True
        assert seq_info_output[alt_key]["parent_sequence_name"] == "TP53_NM_000546.6_ref"

        ref_key = "TP53_NM_000546.6_ref"
        assert ref_key in seq_info_output
        assert seq_info_output[ref_key].get("is_alt_sequence", False) is False
    finally:
        os.chdir(old_cwd)


def test_write_output_no_alt_metadata_without_variants(tmp_path):
    """
    Test that write_output does NOT set alt metadata when there are no variants.
    """
    from seq_retrieval import write_output

    ref_info = SeqInfo(species="Homo sapiens")

    old_cwd = os.getcwd()
    os.chdir(tmp_path)
    try:
        write_output(
            unique_entry_id="test_entry_novar",
            base_seq_name="TP53_NM_000546.6",
            output_type="protein",
            variants_flag=False,
            alt_seq_name_suffix="_alt1",
            ref_seq="MAGTK",
            alt_seq=None,
            ref_info=ref_info,
            alt_info=None,
        )

        with open("test_entry_novar-seqinfo.json", "r") as f:
            seq_info_output = json.loads(f.read())

        ref_key = "TP53_NM_000546.6"
        assert ref_key in seq_info_output
        assert seq_info_output[ref_key].get("is_alt_sequence", False) is False
    finally:
        os.chdir(old_cwd)
```

**Step 2: Run test to verify it fails**

Run: `cd pipeline_components/seq_retrieval && .venv/bin/python -m pytest tests/unit/test_write_output.py -v -k "alt_metadata"`
Expected: FAIL — `is_alt_sequence` not present in JSON output

**Step 3: Modify write_output to set alt metadata**

In `seq_retrieval.py`, in the `write_output` function, after line ~246 (`indexed_seq_info[ref_seq_name] = ref_info`), modify the alt_info assignment:

```python
if variants_flag:
    if alt_info is not None:
        alt_info.is_alt_sequence = True
        alt_info.parent_sequence_name = ref_seq_name
        # Build variant summary from embedded variants
        if hasattr(alt_info, 'embedded_variants') and alt_info.embedded_variants:
            variant_summaries = []
            for v in alt_info.embedded_variants:
                variant_summaries.append(f"{v.variant_id} ({v.seq_substitution_type.value if hasattr(v.seq_substitution_type, 'value') else v.seq_substitution_type})")
            alt_info.variant_summary = "; ".join(variant_summaries)
    indexed_seq_info[alt_seq_name] = alt_info
```

**Step 4: Run tests to verify they pass**

Run: `cd pipeline_components/seq_retrieval && .venv/bin/python -m pytest tests/unit/test_write_output.py -v`
Expected: ALL PASS

**Step 5: Run full unit test suite**

Run: `cd pipeline_components/seq_retrieval && make run-unit-tests`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add pipeline_components/seq_retrieval/src/seq_retrieval.py \
      pipeline_components/seq_retrieval/tests/unit/test_write_output.py
git commit -m "feat: populate alt-sequence metadata in write_output"
```

---

## Task 3: Update TypeScript SeqInfo interface

**Files:**
- Modify: `webui/src/app/result/components/InteractiveAlignment/types.ts`

**Step 1: Update the TypeScript interface**

Add the new fields to the `SeqInfo` interface:

```typescript
export interface SeqInfo {
    embedded_variants?: EmbeddedVariant[],
    error?: string,
    species?: string,
    is_alt_sequence?: boolean,
    parent_sequence_name?: string,
    variant_summary?: string
}
```

**Step 2: Run type-check to ensure no regressions**

Run: `cd webui && npx tsc --noEmit --strict`
Expected: PASS (new optional fields don't break existing code)

**Step 3: Commit**

```bash
git add webui/src/app/result/components/InteractiveAlignment/types.ts
git commit -m "feat: add alt-sequence metadata fields to TypeScript SeqInfo"
```

---

## Task 4: Add alt row grouping and detection logic

**Files:**
- Create: `webui/src/app/result/utils/groupAlignmentRows.ts`
- Create: `webui/src/app/result/utils/__tests__/groupAlignmentRows.test.ts`

**Step 1: Write the failing test**

Create `webui/src/app/result/utils/__tests__/groupAlignmentRows.test.ts`:

```typescript
import { groupAlignmentRows, AlignmentRow } from '../groupAlignmentRows';
import { SeqInfoDict } from '../../components/InteractiveAlignment/types';

describe('groupAlignmentRows', () => {
    test('returns rows unchanged when no alt sequences', () => {
        const rows = [
            { sequence: 'MAGTK', name: 'seq1' },
            { sequence: 'MAGT-', name: 'seq2' },
        ];
        const seqInfo: SeqInfoDict = {
            seq1: {},
            seq2: {},
        };

        const result = groupAlignmentRows(rows, seqInfo);
        expect(result.map(r => r.name)).toEqual(['seq1', 'seq2']);
        expect(result.every(r => !r.isAlt)).toBe(true);
    });

    test('groups alt rows below their parent reference', () => {
        const rows = [
            { sequence: 'MAGTK', name: 'gene1_ref' },
            { sequence: 'MAGTK', name: 'gene1_alt1' },
            { sequence: 'MAGT-', name: 'gene2_ref' },
        ];
        const seqInfo: SeqInfoDict = {
            gene1_ref: {},
            gene1_alt1: {
                is_alt_sequence: true,
                parent_sequence_name: 'gene1_ref',
                variant_summary: 'test:g.100A>T (substitution)',
            },
            gene2_ref: {},
        };

        const result = groupAlignmentRows(rows, seqInfo);

        // Alt should appear right after its parent
        expect(result[0].name).toBe('gene1_ref');
        expect(result[1].name).toBe('gene1_alt1');
        expect(result[1].isAlt).toBe(true);
        expect(result[1].parentName).toBe('gene1_ref');
        expect(result[1].variantSummary).toBe('test:g.100A>T (substitution)');
        expect(result[2].name).toBe('gene2_ref');
    });

    test('handles multiple alts for same parent', () => {
        const rows = [
            { sequence: 'MAGTK', name: 'ref1' },
            { sequence: 'MAGTK', name: 'alt1a' },
            { sequence: 'MAGTK', name: 'alt1b' },
            { sequence: 'MAGT-', name: 'ref2' },
        ];
        const seqInfo: SeqInfoDict = {
            ref1: {},
            alt1a: { is_alt_sequence: true, parent_sequence_name: 'ref1' },
            alt1b: { is_alt_sequence: true, parent_sequence_name: 'ref1' },
            ref2: {},
        };

        const result = groupAlignmentRows(rows, seqInfo);
        expect(result[0].name).toBe('ref1');
        expect(result[1].name).toBe('alt1a');
        expect(result[2].name).toBe('alt1b');
        expect(result[3].name).toBe('ref2');
    });

    test('gracefully handles missing parent', () => {
        const rows = [
            { sequence: 'MAGTK', name: 'orphan_alt' },
        ];
        const seqInfo: SeqInfoDict = {
            orphan_alt: { is_alt_sequence: true, parent_sequence_name: 'missing_ref' },
        };

        const result = groupAlignmentRows(rows, seqInfo);
        expect(result[0].name).toBe('orphan_alt');
        expect(result[0].isAlt).toBe(true);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `cd webui && npm run test -- --testPathPattern="groupAlignmentRows" --verbose`
Expected: FAIL — module not found

**Step 3: Implement groupAlignmentRows**

Create `webui/src/app/result/utils/groupAlignmentRows.ts`:

```typescript
import { SeqInfoDict } from '../components/InteractiveAlignment/types';

export interface AlignmentRow {
    sequence: string;
    name: string;
    isAlt: boolean;
    parentName?: string;
    variantSummary?: string;
}

interface RawRow {
    sequence: string;
    name: string;
}

/**
 * Groups alignment rows so alt sequences appear directly below their parent reference.
 * Adds isAlt, parentName, and variantSummary metadata to each row.
 */
export function groupAlignmentRows(
    rows: RawRow[],
    seqInfoDict: SeqInfoDict
): AlignmentRow[] {
    // Separate refs and alts
    const refRows: AlignmentRow[] = [];
    const altsByParent: Map<string, AlignmentRow[]> = new Map();
    const orphanAlts: AlignmentRow[] = [];

    for (const row of rows) {
        const info = seqInfoDict[row.name];
        const isAlt = info?.is_alt_sequence === true;

        const alignmentRow: AlignmentRow = {
            ...row,
            isAlt,
            parentName: isAlt ? info?.parent_sequence_name : undefined,
            variantSummary: isAlt ? info?.variant_summary : undefined,
        };

        if (!isAlt) {
            refRows.push(alignmentRow);
        } else if (alignmentRow.parentName) {
            const existing = altsByParent.get(alignmentRow.parentName) || [];
            existing.push(alignmentRow);
            altsByParent.set(alignmentRow.parentName, existing);
        } else {
            orphanAlts.push(alignmentRow);
        }
    }

    // Interleave: ref followed by its alts
    const result: AlignmentRow[] = [];
    for (const ref of refRows) {
        result.push(ref);
        const alts = altsByParent.get(ref.name) || [];
        result.push(...alts);
    }

    // Append any orphan alts at the end
    result.push(...orphanAlts);

    return result;
}
```

**Step 4: Run test to verify it passes**

Run: `cd webui && npm run test -- --testPathPattern="groupAlignmentRows" --verbose`
Expected: ALL PASS

**Step 5: Run full test suite**

Run: `cd webui && npm run test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add webui/src/app/result/utils/groupAlignmentRows.ts \
      webui/src/app/result/utils/__tests__/groupAlignmentRows.test.ts
git commit -m "feat: add alt row grouping utility for alignment display"
```

---

## Task 5: Add alt row styling CSS

**Files:**
- Modify: `webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.module.css`

**Step 1: Add alt row CSS classes**

Append to the CSS module file:

```css
/* ============================================
   Alt Sequence Row Styling
   ============================================ */

.altRowIndicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  margin-left: 1rem;
  border-left: 3px solid #ef4444;
  background: rgba(239, 68, 68, 0.04);
  font-size: 0.75rem;
  color: var(--agr-gray-600);
}

.altRowLabel {
  font-weight: 600;
  color: #dc2626;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.altVariantBadge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 4px;
  font-size: 0.6875rem;
  color: var(--agr-gray-700);
  font-family: var(--agr-font-mono, 'Roboto Mono', monospace);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.altGroupSeparator {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.15) 10%, rgba(239, 68, 68, 0.15) 90%, transparent 100%);
  margin: 0.125rem 0;
}
```

**Step 2: Commit**

```bash
git add webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.module.css
git commit -m "feat: add CSS styles for alt sequence row display"
```

---

## Task 6: Integrate alt row grouping into VirtualizedAlignment

**Files:**
- Modify: `webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.tsx`

**Step 1: Import and use groupAlignmentRows**

At the top, add import:
```typescript
import { groupAlignmentRows, AlignmentRow } from '../../utils/groupAlignmentRows';
```

**Step 2: Update fullAlignmentData to use grouped rows**

Replace the existing `fullAlignmentData` memo (lines ~67-74) with one that applies grouping:

```typescript
// Parse alignment data and group alt rows below parents
const groupedAlignmentData = useMemo<AlignmentRow[]>(() => {
    if (!props.alignmentResult) return [];
    const parsedAlignment = parse(props.alignmentResult);
    const rawRows = parsedAlignment['alns'].map((aln: { id: string; seq: string }) => ({
        sequence: aln.seq,
        name: aln.id
    }));
    return groupAlignmentRows(rawRows, props.seqInfoDict);
}, [props.alignmentResult, props.seqInfoDict]);
```

Then update all references from `fullAlignmentData` → `groupedAlignmentData` throughout the component. The `AlignmentRow` type extends the existing `{sequence, name}` shape so all existing code continues to work.

**Step 3: Add alt row visual indicators in the variant info panel**

In the species legend section (~line 471), add alt sequence count:

```typescript
{/* Alt sequence indicator */}
{groupedAlignmentData.some(r => r.isAlt) && (
    <div className={styles.altRowIndicator}>
        <span className={styles.altRowLabel}>Variant</span>
        <span>{groupedAlignmentData.filter(r => r.isAlt).length} variant sequence{groupedAlignmentData.filter(r => r.isAlt).length !== 1 ? 's' : ''}</span>
    </div>
)}
```

**Step 4: Run type-check**

Run: `cd webui && npx tsc --noEmit --strict`
Expected: PASS

**Step 5: Run tests**

Run: `cd webui && npm run test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.tsx
git commit -m "feat: integrate alt row grouping into alignment viewer"
```

---

## Task 7: Update mock data with alt sequence entries

**Files:**
- Modify: `webui/src/utils/mockData.ts`

**Step 1: Add alt sequence data to mockAlignedSeqInfo**

Update `mockAlignedSeqInfo` to include alt-sequence metadata so the mock API returns data that exercises the new feature:

```typescript
export const mockAlignedSeqInfo = {
    'BRCA1_HUMAN_ref': {
        species: 'Homo sapiens',
    },
    'BRCA1_HUMAN_alt1': {
        species: 'Homo sapiens',
        is_alt_sequence: true,
        parent_sequence_name: 'BRCA1_HUMAN_ref',
        variant_summary: 'rs28897672 (substitution)',
        embedded_variants: [
            {
                alignment_start_pos: 25,
                alignment_end_pos: 25,
                seq_start_pos: 25,
                seq_end_pos: 25,
                seq_length: 1,
                variant_id: 'rs28897672',
                genomic_seq_id: 'chr17',
                genomic_start_pos: 43094464,
                genomic_end_pos: 43094464,
                genomic_ref_seq: 'G',
                genomic_alt_seq: 'A',
                seq_substitution_type: 'substitution'
            }
        ]
    },
    'BRCA1_MOUSE': {
        species: 'Mus musculus',
    },
};
```

Also update `mockAlignmentResult` to include the alt sequence row in the Clustal output.

**Step 2: Run tests**

Run: `cd webui && npm run test`
Expected: ALL PASS (mock data tests may need minor adjustments)

**Step 3: Commit**

```bash
git add webui/src/utils/mockData.ts
git commit -m "feat: add alt sequence entries to mock data"
```

---

## Task 8: Add VirtualizedAlignment test for alt row rendering

**Files:**
- Modify: `webui/src/app/result/components/__tests__/InteractiveAlignment.test.tsx`

**Step 1: Add test for alt row detection**

Add a new test to the existing test file:

```typescript
describe('VirtualizedAlignment alt row handling', () => {
    const mockAlignmentWithAlt = `CLUSTAL O(1.2.4) multiple sequence alignment

ref1        PRTL        4
alt1        P-TL        3
ref2        PKT-        3
`;

    const mockSeqInfoWithAlt = {
        ref1: {},
        alt1: {
            is_alt_sequence: true,
            parent_sequence_name: 'ref1',
            variant_summary: 'test:g.100A>T (substitution)',
            embedded_variants: [
                {
                    alignment_start_pos: 2,
                    alignment_end_pos: 2,
                    seq_start_pos: 2,
                    seq_end_pos: 2,
                    seq_length: 1,
                    variant_id: 'test:g.100A>T',
                    genomic_seq_id: 'chr1',
                    genomic_start_pos: 100,
                    genomic_end_pos: 100,
                    genomic_ref_seq: 'A',
                    genomic_alt_seq: 'T',
                    seq_substitution_type: 'substitution',
                },
            ],
        },
        ref2: {},
    };

    test('renders with alt sequence info without crashing', () => {
        const { container } = render(
            <VirtualizedAlignment
                alignmentResult={mockAlignmentWithAlt}
                seqInfoDict={mockSeqInfoWithAlt}
            />
        );
        expect(container).toBeInTheDocument();
    });
});
```

Note: You'll need to add `import VirtualizedAlignment from '../InteractiveAlignment/VirtualizedAlignment';` and add the same mocks as the existing InteractiveAlignment tests.

**Step 2: Run the test**

Run: `cd webui && npm run test -- --testPathPattern="InteractiveAlignment" --verbose`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add webui/src/app/result/components/__tests__/InteractiveAlignment.test.tsx
git commit -m "test: add alt row rendering test for VirtualizedAlignment"
```

---

## Task 9: Run full validation suite

**Step 1: Python pipeline checks**

```bash
cd pipeline_components/seq_retrieval
make run-style-checks
make run-type-checks
make run-unit-tests
```

Expected: ALL PASS

**Step 2: WebUI checks**

```bash
cd webui
make run-style-checks
make run-type-checks
make run-unit-tests
```

Expected: ALL PASS

**Step 3: Final commit (if any lint/type fixes needed)**

```bash
git add -A
git commit -m "fix: address lint and type-check issues"
```

---

## Dependencies Between Tasks

```
Task 1 (SeqInfo fields) ──► Task 2 (write_output) ──► Task 3 (TS types)
                                                           │
                                                           ▼
                                                      Task 4 (grouping util)
                                                           │
                                                           ▼
                                              Task 5 (CSS) + Task 6 (integration)
                                                           │
                                                           ▼
                                              Task 7 (mock data) + Task 8 (tests)
                                                           │
                                                           ▼
                                                      Task 9 (validation)
```

Tasks 1-3 are strictly sequential (each builds on the previous).
Tasks 4 and 5 can run in parallel after Task 3.
Task 6 depends on Tasks 4 and 5.
Tasks 7 and 8 can run in parallel after Task 6.
Task 9 is the final validation gate.
