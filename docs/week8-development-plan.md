# PAVI Week 8 Development Plan

**Dates**: Dec 31, 2025 - Jan 6, 2025
**Phase**: Post-MVP Polish & Bug Fixes
**Branch**: `feature/pavi-overhaul`

---

## Week 7 Completion Summary

### ✅ Completed
- [x] KANBAN-816: Same transcript with different alleles (Done)
- [x] Allele selection UI improvements and comprehensive tests
- [x] Help Center with documentation, FAQ, and glossary
- [x] Skeleton loading states for better UX
- [x] AlignmentEntry refactored into maintainable hooks
- [x] Step Functions POC deployed to AWS

### 🔄 Carry-Over Items
- Progress tracking improvements (still has rough edges)
- Example data loader refinement
- Full E2E testing of allele selection feature

---

## Week 8 Goals

**Primary Objective**: Polish MVP features and fix known bugs before infrastructure work

**Success Criteria**:
- [ ] Zero duplicate reference sequences in alignment results
- [ ] Allele/transcript filtering working bidirectionally
- [ ] Example data loader fully functional
- [ ] All E2E tests passing
- [ ] Backlog reviewed and roadmap documented

---

## Monday (Dec 31): Roadmap & Planning

### Morning: Documentation (You)
**Goal**: Update project documentation with current state

**Tasks**:
- [x] Review all backlog tickets (11 files in `/docs/backlog/`)
- [x] Create `/docs/TECHNICAL-ROADMAP.md` with:
  - Current implementation status
  - Technical dependencies between tickets
  - Recommended implementation order
  - Architecture decisions needed
- [x] Create this week's plan
- [ ] Update `/docs/TODO.md` to reflect new priorities

**Estimated**: 3-4 hours

### Afternoon: KANBAN-727 Investigation
**Goal**: Understand duplicate reference sequence bug

**Tasks**:
- [ ] Read `/docs/backlog/KANBAN-727-remove-duplicate-reference-sequences.md`
- [ ] Submit test alignment with same transcript + 3 different alleles
- [ ] Inspect `aligned_seq_info.json` to confirm duplicate entries
- [ ] Identify where deduplication should occur:
  - [ ] Check pipeline output structure
  - [ ] Identify result page component that renders sequences
  - [ ] Determine if issue is in data or display

**Files to examine**:
- `webui/src/app/result/` (result page components)
- `webui/src/components/AlignmentViewer/` (if applicable)
- Test alignment outputs from API

**Estimated**: 2-3 hours

---

## Tuesday (Jan 1): KANBAN-727 Implementation

### Morning: Write Deduplication Logic
**Goal**: Implement reference sequence deduplication

**Tasks**:
- [ ] Create `webui/src/app/result/utils/deduplicateSequences.ts`:
  ```typescript
  function deduplicateSequences(sequences: AlignedSequence[]): AlignedSequence[] {
    const seen = new Set<string>();
    const result: AlignedSequence[] = [];

    for (const seq of sequences) {
      const isReference = !seq.name.includes('_alt');

      if (isReference) {
        const baseName = seq.name.replace(/^\d+_/, '');
        if (seen.has(baseName)) continue;
        seen.add(baseName);
      }

      result.push(seq);
    }

    return result;
  }
  ```
- [ ] Apply deduplication in result page component
- [ ] Handle sequence ordering (references first, variants after)

**Estimated**: 2-3 hours

### Afternoon: Test & Validate
**Goal**: Verify deduplication works correctly

**Tasks**:
- [ ] Test with same transcript + multiple alleles
- [ ] Verify only one reference appears
- [ ] Verify all variant sequences still appear
- [ ] Check alignment visualization is correct
- [ ] Test edge cases:
  - [ ] Multiple genes, each with duplicate transcripts
  - [ ] Single gene, single transcript (no duplicates)
  - [ ] Different transcripts from same gene (should NOT deduplicate)

**Test data**:
- Trp53 with 3 alleles (from KANBAN-816 tests)
- Mixed species alignment
- Single reference case

**Estimated**: 2-3 hours

---

## Wednesday (Jan 2): KANBAN-691 Investigation & Setup

### Morning: API Data Analysis
**Goal**: Understand transcript associations in API response

**Tasks**:
- [ ] Read `/docs/backlog/KANBAN-691-limit-allele-transcript-combos.md`
- [ ] Inspect Alliance API `allele-variant-detail` response:
  ```json
  {
    "consequence": {
      "transcript": {
        "id": "ENSEMBL:ENSMUST00000005371",
        "name": "ENSMUST00000005371"
      }
    }
  }
  ```
- [ ] Verify `serverActions.ts` currently captures this data
- [ ] Test with gene that has:
  - Multiple transcripts
  - Multiple alleles
  - Not all alleles affect all transcripts

**Good test gene**: Mouse Trp53 (multiple isoforms and alleles)

**Estimated**: 2 hours

### Afternoon: Type Definitions
**Goal**: Add transcript association types

**Tasks**:
- [ ] Update `webui/src/app/submit/components/AlignmentEntry/types.ts`:
  ```typescript
  export interface VariantInfo {
    readonly id: string;
    readonly displayName: string;
    readonly affectedTranscriptIds?: string[];  // NEW
  }

  export interface AlleleInfo {
    readonly id: string;
    readonly displayName: string;
    variants: Map<string, VariantInfo>;
    readonly affectedTranscriptIds?: Set<string>;  // NEW
  }
  ```
- [ ] Update `serverActions.ts` to populate `affectedTranscriptIds`:
  ```typescript
  const variant = {
    id: result['variant']['id'],
    displayName: result['variant']['displayName'],
    affectedTranscriptId: result['consequence']?.['transcript']?.['id']
  };
  ```

**Estimated**: 2 hours

---

## Thursday (Jan 3): KANBAN-691 Filtering Implementation

### Morning: Create Filtering Hook
**Goal**: Implement bidirectional filtering logic

**Tasks**:
- [ ] Create `webui/src/hooks/useFilteredOptions.ts`:
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

      const allowedIds = new Set<string>();
      selectedAlleles.forEach(allele => {
        allele.affectedTranscriptIds?.forEach(id => allowedIds.add(id));
      });

      return allTranscripts.filter(t =>
        allowedIds.has(t.id) || allowedIds.has(t.curie)
      );
    }, [allTranscripts, selectedAlleles]);

    // Filter alleles based on selected transcripts
    const filteredAlleles = useMemo(() => {
      if (selectedTranscripts.length === 0) return allAlleles;

      const selectedIds = new Set(
        selectedTranscripts.flatMap(t => [t.id, t.curie])
      );

      return allAlleles.filter(allele =>
        allele.affectedTranscriptIds?.some(id => selectedIds.has(id))
      );
    }, [allAlleles, selectedTranscripts]);

    return { filteredTranscripts, filteredAlleles };
  }
  ```

**Estimated**: 2-3 hours

### Afternoon: UI Integration
**Goal**: Use filtered options in AlignmentEntry

**Tasks**:
- [ ] Update `AlignmentEntry.tsx`:
  ```typescript
  const { filteredTranscripts, filteredAlleles } = useFilteredOptions(
    transcripts,
    alleles,
    selectedTranscripts,
    selectedAlleles
  );
  ```
- [ ] Pass filtered options to MultiSelect components
- [ ] Add visual indicator when filtering is active:
  - "Showing 3 of 8 transcripts compatible with selected alleles"
  - Consider "Show all" toggle to override filtering

**Files to modify**:
- `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx`

**Estimated**: 2 hours

---

## Friday (Jan 4): KANBAN-691 Testing & Polish

### Morning: Comprehensive Testing
**Goal**: Validate filtering works correctly

**Test cases**:
1. **Select allele first**
   - [ ] Only compatible transcripts shown
   - [ ] Count displayed correctly
   - [ ] Can still select transcripts

2. **Select transcript first**
   - [ ] Only compatible alleles shown
   - [ ] Can still select alleles

3. **Bidirectional filtering**
   - [ ] Select allele → transcripts filtered
   - [ ] Select transcript → alleles filtered further
   - [ ] Deselect allele → transcripts expand again

4. **Edge cases**
   - [ ] No overlapping options (should show message)
   - [ ] Single option after filtering
   - [ ] All options compatible (no filtering effect)

**Test data**:
- Gene with 5+ transcripts and 3+ alleles
- Gene where not all alleles affect all transcripts

**Estimated**: 3 hours

### Afternoon: UX Polish
**Goal**: Make filtering clear and user-friendly

**Tasks**:
- [ ] Add filtering indicator message component
- [ ] Consider adding tooltip explaining why options are filtered
- [ ] Update Help Center with filtering explanation
- [ ] Test keyboard navigation with filtered lists
- [ ] Verify accessibility (screen reader announces filtered state)

**Estimated**: 2 hours

---

## Weekend (Jan 5-6): Buffer & Integration Testing

### Optional Work (if ahead of schedule)

**Saturday**:
- [ ] Run full E2E test suite
- [ ] Fix any failing tests from this week's changes
- [ ] Update tests for new deduplication and filtering features
- [ ] Performance testing with large datasets

**Sunday**:
- [ ] Review all code from this week
- [ ] Write/update documentation
- [ ] Update `TECHNICAL-ROADMAP.md` if priorities changed
- [ ] Plan Week 9 (Infrastructure optimization)

### If Behind Schedule

Focus on completing KANBAN-727 and KANBAN-691 fully rather than rushing to next features.

---

## Testing Checklist

### KANBAN-727 (Deduplication)
- [ ] Submit same transcript with 3 different alleles
- [ ] Only one reference sequence in results
- [ ] All 3 variant sequences present
- [ ] Alignment coordinates correct
- [ ] Works with multiple genes

### KANBAN-691 (Filtering)
- [ ] Transcript filtering works when alleles selected
- [ ] Allele filtering works when transcripts selected
- [ ] Bidirectional filtering works correctly
- [ ] Clear visual feedback when filtering active
- [ ] Edge cases handled gracefully

### Integration
- [ ] Both features work together
- [ ] No regression in other features
- [ ] Performance acceptable
- [ ] Accessibility maintained

---

## Files Modified This Week

```
webui/src/app/result/utils/
└── deduplicateSequences.ts                      # NEW - KANBAN-727

webui/src/app/result/
└── [result page component].tsx                  # MODIFY - apply deduplication

webui/src/hooks/
└── useFilteredOptions.ts                        # NEW - KANBAN-691

webui/src/app/submit/components/AlignmentEntry/
├── types.ts                                     # MODIFY - add transcript associations
├── serverActions.ts                             # MODIFY - capture transcript IDs
└── AlignmentEntry.tsx                           # MODIFY - use filtered options

webui/src/app/help/
└── [...sections...]                             # MODIFY - document filtering feature

docs/
├── TECHNICAL-ROADMAP.md                         # NEW
├── week8-development-plan.md                    # NEW (this file)
└── TODO.md                                      # UPDATE
```

---

## Blockers & Risks

### Known Blockers
None currently - both tickets are ready to implement.

### Potential Risks

| Risk | Mitigation |
|------|------------|
| API doesn't always provide transcript ID | Add fallback, log warning |
| Deduplication breaks alignment coordinates | Test thoroughly, verify with known data |
| Filtering removes all options | Show clear message, allow override |
| Performance with large datasets | Test with 50+ sequences, optimize if needed |

---

## Next Week Preview (Week 9)

**Focus**: Infrastructure optimization (KANBAN-831, 830, 623)

**Goal**: Reduce costs and improve performance before Step Functions migration

**Tentative plan**:
1. KANBAN-831: S3 lifecycle policies (1 day)
2. KANBAN-623: CloudWatch environment metrics (1-2 days)
3. KANBAN-830: EFS genome caching (3-4 days)

**Decision needed**: Confirm deployment strategy (KANBAN-832) before Week 10

---

## Success Criteria for Week 8

At end of week, PAVI should have:

- [x] Documented technical roadmap for Q1 2025
- [ ] No duplicate reference sequences in any alignment
- [ ] Smart filtering of transcript/allele options
- [ ] All tests passing
- [ ] Clean, maintainable code for both features
- [ ] Updated documentation

**If all criteria met**: Week 8 successful, proceed to infrastructure optimization

**If criteria not met**: Extend polish phase, defer infrastructure work

---

## Daily Standup Questions

Ask yourself each morning:

1. **What did I complete yesterday?**
2. **What will I work on today?**
3. **Any blockers?**

Document answers in commit messages or daily notes.

---

## Code Quality Reminders

Before any commit:
- [ ] `make run-style-checks` passes
- [ ] `make run-type-checks` passes
- [ ] `make run-unit-tests` passes
- [ ] Manual testing with example data
- [ ] Git commit message explains "why" not just "what"

Before PR (end of week):
- [ ] All tests passing
- [ ] No console errors
- [ ] Accessibility verified
- [ ] Performance acceptable
- [ ] Documentation updated

---

**Week 8 Motto**: "Polish the foundation before building higher"

**Estimated total effort**: 15-20 hours
**Buffer**: 3-5 hours for unexpected issues
**Carry-over capacity**: 2-3 hours for Week 9 prep
