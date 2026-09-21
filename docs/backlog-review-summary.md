# PAVI Backlog Review Summary

**Date**: December 31, 2025
**Reviewer**: Claude Code
**Purpose**: Analyze all backlog tickets and update development roadmap

---

## What Was Completed

I reviewed all 11 backlog tickets and existing documentation to create comprehensive planning resources:

### 1. Technical Roadmap Created
**File**: `/docs/TECHNICAL-ROADMAP.md`

Complete technical planning document with:
- Current implementation status (MVP complete, Week 8 in progress)
- All backlog tickets analyzed and prioritized
- Technical dependencies mapped (dependency graph included)
- Architecture decisions documented
- File modification roadmap for each ticket
- Performance targets and success metrics
- Cost optimization summary (~40% reduction potential)
- Risk mitigation strategies

**Key insights**:
- KANBAN-816 (allele selection) complete - good foundation for Week 8 work
- KANBAN-727 and KANBAN-691 ready to implement (no blockers)
- Infrastructure optimization (KANBAN-831, 830, 623) should happen before Step Functions migration
- Phase 2 features well-specified but should wait until Q1 infrastructure work complete

### 2. Week 8 Development Plan
**File**: `/docs/week8-development-plan.md`

Detailed day-by-day plan for current week:
- **Mon**: Planning and KANBAN-727 investigation
- **Tue**: KANBAN-727 implementation (deduplication)
- **Wed**: KANBAN-691 setup (types and API)
- **Thu**: KANBAN-691 implementation (filtering hook)
- **Fri**: Testing and UX polish

Both tickets are UI polish work, no backend changes needed.

### 3. Updated TODO.md
**File**: `/docs/TODO.md`

Modernized task tracker:
- Reflects actual progress (Weeks 1-7 complete)
- Week 8 current tasks outlined
- Weeks 9-14 infrastructure plan mapped
- Phase 2 features prioritized by user value
- Decision points documented
- Success metrics defined per phase

---

## Backlog Ticket Analysis

### Ready to Implement (Week 8-9)

#### KANBAN-727: Remove Duplicate Reference Sequences
**Status**: Ready, no blockers
**Effort**: 1-2 days
**Approach**: Client-side deduplication in result display
**Files**:
- NEW: `webui/src/app/result/utils/deduplicateSequences.ts`
- MODIFY: Result page components

**Implementation**: Filter out duplicate reference sequences (same transcript name) while keeping all variant sequences.

#### KANBAN-691: Limit Allele/Transcript Combinations
**Status**: Ready, no blockers
**Effort**: 2-3 days
**Approach**: Use `consequence.transcript.id` from Alliance API
**Files**:
- NEW: `webui/src/hooks/useFilteredOptions.ts`
- MODIFY: `AlignmentEntry/types.ts`, `serverActions.ts`, `AlignmentEntry.tsx`

**Implementation**: Bidirectional filtering - transcripts filter when alleles selected, alleles filter when transcripts selected.

### Infrastructure Optimization (Week 9-11)

#### KANBAN-831: S3 Lifecycle Policies
**Status**: Ready, no blockers
**Effort**: 1 day
**Savings**: ~$150/year
**Approach**: Add 30-day expiration to work/ and logs/ prefixes
**Files**: `shared_aws/aws_infra/` CDK stack

**Implementation**: CDK lifecycle rules for automatic deletion.

#### KANBAN-623: CloudWatch Environment Metrics
**Status**: Ready, no blockers
**Effort**: 1-2 days
**Approach**: Add `PAVI_ENVIRONMENT` variable to all deployments
**Files**: All `aws_infra/` directories, Python metric publishing code

**Implementation**: Tag all metrics with environment dimension.

#### KANBAN-830: EFS Genome Caching
**Status**: Ready, needs cost validation
**Effort**: 3-4 days
**Savings**: ~$200/year + 30-60s per job
**Approach**: Create EFS, populate, mount in seq_retrieval tasks
**Files**: `shared_aws/aws_infra/`, `seq_retrieval/aws_infra/`, `seq_retrieval.py`

**Implementation**: Persistent genome storage across all jobs.

#### KANBAN-832: Deployment Strategy
**Status**: Decision needed
**Effort**: 2-3 days
**Recommendation**: Option A (Continuous Deployment)
**Files**: `.github/workflows/`, `CONTRIBUTING.md`, `README.md`

**Implementation**: Strengthen CI/CD, add monitoring, document rollback.

### Phase 2 Features (Weeks 15+)

#### KANBAN-514: Nucleotide Alignments
**Status**: Well-specified, no blockers
**Effort**: 5-7 days
**User Value**: High
**Files**: `seq_retrieval.py`, `protein-msa.nf`, API models, JobSubmitForm

**Implementation**: Add `--seqtype=DNA` parameter, nucleotide color scheme.

#### KANBAN-532: Recalculate Variant Effects
**Status**: Well-specified, complex
**Effort**: 7-10 days
**User Value**: High (scientific accuracy)
**Files**: Result components, new `variantEffects.ts` utility

**Implementation**: Hybrid approach - backend provides sequences, frontend calculates effects.

#### Alliance Integration (KANBAN-500 subset)
**Status**: Well-specified, external dependency
**Effort**: 5-7 days
**User Value**: High
**Files**: PAVI WebUI, Alliance website (external)

**Implementation**: URL parameter handling, "Send to PAVI" buttons.

#### Protein Domains & Exon Boundaries (KANBAN-500 subset)
**Status**: Not yet broken into tickets
**Effort**: 6-9 days combined
**User Value**: Medium
**Dependencies**: UniProt API integration

**Implementation**: Nightingale tracks for domains and exons.

---

## Implementation Priorities (Next 6 Weeks)

### Week 8 (Current): UI Polish
- **KANBAN-727**: Remove duplicate reference sequences (1-2 days)
- **KANBAN-691**: Filter allele/transcript combinations (2-3 days)

### Week 9: Infrastructure Quick Wins
1. **KANBAN-831**: S3 lifecycle policies (1 day)
2. **KANBAN-623**: CloudWatch environment metrics (1-2 days)
3. **KANBAN-830**: EFS genome caching (3-4 days)

**Recommended order**: 831 → 623 → 830 (incremental risk)

### Week 10: Deployment Strategy
- **KANBAN-832**: Define branching/deployment approach (2-3 days)
  - **Recommended**: Option A (Continuous Deployment)
  - Strengthen CI/CD, add monitoring
  - Document rollback procedures

### Week 11-14: Step Functions Migration
- Production hardening of Week 1 POC
- Replace Nextflow invocation completely
- 100+ job testing, performance benchmarking
- **Goal**: 30% cost reduction

---

## Phase 2 Features (After Infrastructure)

Prioritized by user value:

1. **KANBAN-514** (5-7 days): Nucleotide alignments
   - High user value, no dependencies

2. **Alliance Integration** (5-7 days): Website integration
   - High user value, external coordination needed

3. **KANBAN-532** (7-10 days): Recalculate variant effects
   - High scientific value, complex implementation

4. **Domains + Exons** (6-9 days): Visualization enhancements

---

## Key Architecture Decisions Needed

| Decision | Status | Recommendation | Timeline |
|----------|--------|----------------|----------|
| Deployment strategy (KANBAN-832) | Pending | Option A (Continuous) | Week 10 |
| Step Functions migration timing | Pending | Week 11-14 | After infrastructure |
| Phase 2 priority order | Pending | 514 → Alliance → 532 | Q1 2025 |
| EFS genome caching | Pending | Yes, validate in dev first | Week 9 |

---

## Technical Dependencies Mapped

```
Week 8: KANBAN-727, 691 (parallel, no dependencies)
  ↓
Week 9: KANBAN-831 → 623 → 830 (sequential recommended)
  ↓
Week 10: KANBAN-832 (depends on team decision)
  ↓
Week 11-14: Step Functions migration (builds on POC)
  ↓
Phase 2: 514 → Alliance → 532 (priority order)
```

### Dependency Details

**KANBAN-830 (EFS) depends on:**
- KANBAN-831 (S3 lifecycle) - Should clean up storage first
- None technically, but sequential reduces operational complexity

**Step Functions Migration depends on:**
- KANBAN-832 decision - Deployment strategy affects migration approach
- Infrastructure optimization complete - Better foundation

**Phase 2 features depend on:**
- Step Functions migration complete - Stable backend architecture
- KANBAN-514 has no dependencies, can start earlier if needed

---

## Files to Watch

### Week 8 Modifications
```
webui/src/app/result/utils/
└── deduplicateSequences.ts                      # NEW - KANBAN-727

webui/src/app/result/
└── [result page component].tsx                  # MODIFY - KANBAN-727

webui/src/hooks/
└── useFilteredOptions.ts                        # NEW - KANBAN-691

webui/src/app/submit/components/AlignmentEntry/
├── types.ts                                     # MODIFY - KANBAN-691
├── serverActions.ts                             # MODIFY - KANBAN-691
└── AlignmentEntry.tsx                           # MODIFY - KANBAN-691
```

### Week 9-10 Modifications
```
shared_aws/aws_infra/
├── cdk_classes/
│   └── s3_bucket.py                            # MODIFY - KANBAN-831
│   └── efs_filesystem.py                       # NEW - KANBAN-830
└── cdk_app.py                                  # MODIFY - add EFS

pipeline_components/seq_retrieval/
├── aws_infra/
│   └── cdk_app.py                              # MODIFY - mount EFS
└── src/seq_retrieval.py                        # MODIFY - use local genomes

api/aws_infra/
└── cdk_classes/                                # MODIFY - PAVI_ENVIRONMENT

.github/workflows/                              # MODIFY - KANBAN-832
CONTRIBUTING.md                                 # NEW - KANBAN-832
```

### Week 11-14 Modifications
```
pipeline_components/aws_infra/
├── step_functions_state_machine.json           # EXTEND from POC
└── cdk_classes/
    └── step_functions.py                       # PRODUCTION CDK

api/src/
├── job_service.py                              # MODIFY - call Step Functions
└── main.py                                     # MODIFY - update endpoints
```

---

## Success Metrics

### Week 8
- [ ] Zero duplicate references in results
- [ ] Allele/transcript filtering working
- [ ] All tests passing

### Week 14 (End Infrastructure)
- [ ] 30%+ cost reduction achieved
- [ ] Step Functions operational
- [ ] Deployment pipeline robust

### Week 26 (End Phase 2)
- [ ] Nucleotide alignments live
- [ ] Alliance integration functional
- [ ] Variant effects accurate

---

## Cost Optimization Summary

| Change | Estimated Savings | Effort | Week |
|--------|------------------|--------|------|
| KANBAN-831 (S3 lifecycle) | ~$150/year | 1 day | 9 |
| KANBAN-830 (EFS caching) | ~$200/year + time | 3-4 days | 9 |
| Step Functions migration | ~30% total infra | 5-7 days | 11-14 |
| Fargate Spot | ~70% compute | TBD | Future |
| **Total** | **~40% reduction** | **~12 days** | **9-14** |

**Validation needed**: Deploy to dev, monitor AWS Cost Explorer for 2 weeks

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| EFS cost higher than expected | Medium | Medium | Validate in dev first, monitor costs |
| Step Functions limitations | Low | High | POC validated approach, keep Nextflow fallback |
| Performance regression | Medium | Medium | Benchmark before/after, optimize bottlenecks |
| Breaking changes in Phase 2 | Low | Medium | Feature flags, gradual rollout |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Solo developer burnout | Medium | High | Realistic weekly goals, extend timeline if needed |
| Production issues | Low | High | Strong testing, monitoring, quick rollback |
| Alliance integration delays | Medium | Medium | Build standalone first, external dependency |

---

## Next Steps

1. ✅ **Complete**: Documentation review and roadmap creation
2. **Today**: Start KANBAN-727 investigation
3. **This Week**: Complete KANBAN-727 and KANBAN-691
4. **Next Week**: Infrastructure optimization (831, 623, 830)
5. **Week 10**: Make KANBAN-832 decision
6. **Weeks 11-14**: Step Functions migration
7. **Q1 2025**: Phase 2 feature development

---

## Resources Created

All documentation now in `/docs/`:

| File | Purpose | Audience |
|------|---------|----------|
| `TECHNICAL-ROADMAP.md` | Comprehensive technical plan, dependencies, architecture | Engineering team |
| `week8-development-plan.md` | Day-by-day plan for current week | Current developer |
| `TODO.md` | Updated task tracker with progress | Project management |
| `backlog/KANBAN-*.md` | 11 detailed ticket specifications | Implementation reference |
| `backlog-review-summary.md` | This document - executive summary | All stakeholders |

---

## Recommendations

### Immediate (Week 8)
1. Complete KANBAN-727 and KANBAN-691 as planned
2. Maintain momentum on UI polish before infrastructure work
3. No changes to current plan needed

### Near-term (Weeks 9-11)
1. Implement infrastructure optimizations in recommended order (831 → 623 → 830)
2. Make KANBAN-832 deployment strategy decision by Week 10
3. Validate EFS costs in dev environment before production deployment

### Mid-term (Weeks 11-14)
1. Prioritize Step Functions migration for cost savings
2. Run comprehensive benchmarks before and after
3. Document lessons learned for future migrations

### Long-term (Q1 2025+)
1. Start Phase 2 features only after infrastructure stable
2. Coordinate with Alliance team for website integration early
3. Consider user feedback loop before committing to feature priority order

---

**Review Date**: December 31, 2025
**Next Review**: End of Week 8 (January 4, 2025)
**Maintained by**: Engineering Lead
