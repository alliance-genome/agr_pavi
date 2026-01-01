# PAVI Technical Roadmap

**Last Updated**: 2025-12-31
**Current Phase**: Week 8+ (Post-MVP, Infrastructure Optimization)
**Branch**: `feature/pavi-overhaul`

---

## Executive Summary

PAVI has completed its MVP foundation (Week 1-7) including core alignment functionality, allele selection (KANBAN-816), and Help Center. The roadmap now focuses on:

1. **Immediate** (Weeks 8-9): UI polish and bug fixes
2. **Near-term** (Weeks 10-12): Infrastructure optimization and deployment strategy
3. **Mid-term** (Q1 2025): Phase 2 features and performance improvements
4. **Long-term** (Q2 2025+): Advanced features and automation

---

## Current Implementation Status

### ✅ Completed (Weeks 1-7)

| Feature | Ticket | Status | Notes |
|---------|--------|--------|-------|
| **Core Alignment Pipeline** | KANBAN-498 | ✅ Done | Nextflow, Clustal Omega, Nightingale |
| **Gene/Transcript Selection** | KANBAN-498 | ✅ Done | Multi-select with Alliance API |
| **Cross-Species Support** | KANBAN-498 | ✅ Done | All 7 model organisms |
| **Allele Selection** | KANBAN-816 | ✅ Done | Same transcript, different alleles |
| **Job Submission/Tracking** | KANBAN-498 | ✅ Done | FastAPI backend, polling frontend |
| **Nightingale Visualization** | KANBAN-498 | ✅ Done | MSA viewer, conservation coloring |
| **Help Center** | - | ✅ Done | Documentation, FAQ, glossary |
| **Step Functions POC** | - | ✅ Done | Basic state machine deployed |

### 🔄 In Progress (Week 8)

| Feature | Ticket | Status | Files Modified |
|---------|--------|--------|----------------|
| **Allele UI Polish** | - | 🔄 Testing | `AlignmentEntry.tsx`, `useAlleleSelection.ts` |
| **Example Data Loader** | - | 🔄 Refining | `ExampleDataLoader.tsx` |
| **Progress Tracking** | - | 🔄 Improving | Result page components |

### 📋 Ready to Implement (Backlog Priorities)

See detailed specifications in `/docs/backlog/` for each ticket.

---

## Implementation Roadmap by Quarter

### Q1 2025: Foundation & Optimization (Weeks 8-16)

#### Week 8-9: UI/UX Polish & Bug Fixes

**Goal**: Production-ready user experience

**Ready to implement:**
1. **KANBAN-727**: Remove duplicate reference sequences
   - Files: `webui/src/app/result/`, alignment viewer components
   - Implementation: Client-side deduplication in result display
   - Effort: 1-2 days
   - Blocker: None

2. **KANBAN-691**: Filter allele/transcript combos
   - Files: `AlignmentEntry/`, `useFilteredOptions.ts` (new)
   - Implementation: Use `consequence.transcript.id` from API
   - Effort: 2-3 days
   - Blocker: Requires testing with diverse gene sets

**Technical dependencies:**
- KANBAN-727 has no dependencies, can start immediately
- KANBAN-691 builds on current allele selection UI

#### Week 10-11: Infrastructure Optimization

**Goal**: Reduce costs and improve performance

**Ready to implement:**
1. **KANBAN-831**: S3 lifecycle policies for intermediate storage
   - Files: `shared_aws/aws_infra/`, CDK stack definitions
   - Implementation: Add lifecycle rules to work bucket
   - Effort: 1 day
   - Blocker: None
   - Impact: ~$150/year savings

2. **KANBAN-830**: Reference genome caching with EFS
   - Files: `shared_aws/aws_infra/`, `seq_retrieval/aws_infra/`, `seq_retrieval.py`
   - Implementation: Create EFS, populate, mount in tasks
   - Effort: 3-4 days
   - Blocker: Requires EFS testing, one-time genome download
   - Impact: 30-60s faster per job, reduced S3 egress

3. **KANBAN-623**: CloudWatch environment metrics
   - Files: All `aws_infra/` directories, Python metric publishing code
   - Implementation: Add `PAVI_ENVIRONMENT` variable to all deployments
   - Effort: 1-2 days
   - Blocker: None

**Technical dependencies:**
- KANBAN-831 → No dependencies, quick win
- KANBAN-830 → Should complete after KANBAN-831 (both affect S3 storage)
- KANBAN-623 → Independent, can run parallel

**Recommended order**: KANBAN-831 → KANBAN-623 → KANBAN-830

#### Week 12-14: Deployment Strategy & Step Functions Migration

**Goal**: Production-ready deployment pipeline

**Ready to implement:**
1. **KANBAN-832**: Deployment branching strategy
   - Files: `.github/workflows/`, `CONTRIBUTING.md`, `README.md`
   - Implementation: Strengthen CI/CD, add monitoring, document rollback
   - Effort: 2-3 days
   - Blocker: Decision needed on Option A vs B vs C
   - Recommendation: **Option A** (Continuous Deployment) for solo dev

2. **Step Functions Migration** (from POC to production)
   - Files: `pipeline_components/aws_infra/`, API integration
   - Implementation: Complete state machine, replace Nextflow invocation
   - Effort: 5-7 days (from 3-month plan Week 4-5)
   - Blocker: POC validated, need production hardening
   - Impact: Better AWS integration, cost optimization

**Technical dependencies:**
- KANBAN-832 decisions should be made before Step Functions migration
- Step Functions migration is major architecture change

**Recommended approach**: KANBAN-832 first, then Step Functions

#### Week 15-16: Testing & Stabilization

**Goal**: Validate optimizations and prepare for Phase 2

- End-to-end testing of infrastructure changes
- Performance benchmarking (compare to baseline)
- Cost analysis (verify savings)
- Documentation updates

---

### Q1 2025 (Late) / Q2 2025: Phase 2 Features (Weeks 17-26)

#### High-Value Features

**Ready to implement:**
1. **KANBAN-514**: Nucleotide (DNA/RNA) alignments
   - Files: `seq_retrieval.py`, `protein-msa.nf`, API models, JobSubmitForm
   - Implementation: Add `--seqtype=DNA` flag, nucleotide color scheme
   - Effort: 5-7 days
   - Blocker: None
   - User value: **High** - enables codon-level analysis, UTR comparison

2. **KANBAN-532**: Recalculate variant effects
   - Files: Result page components, `variantEffects.ts` (new utility)
   - Implementation: Hybrid approach - backend provides sequences, frontend recalculates
   - Effort: 7-10 days
   - Blocker: Complex logic, needs comprehensive testing
   - User value: **High** - scientifically accurate variant annotations

**Technical dependencies:**
- KANBAN-514 has no blockers, can start after Q1 optimizations
- KANBAN-532 is complex, recommend starting after KANBAN-514

#### Phase 2 Epic Implementation

**KANBAN-500** features (not yet broken into tickets):

| Feature | Effort | Blocker | Priority |
|---------|--------|---------|----------|
| Protein domain overlay | 3-5 days | Need UniProt API integration | Medium |
| Exon boundary display | 3-4 days | Coordinate mapping logic | Medium |
| Enhanced variant filtering | 5-7 days | UI/UX design needed | Medium |
| Alliance website integration | 5-7 days | Coordination with Alliance team | High |
| CloudWatch metrics collection | 2-3 days | Depends on KANBAN-623 | Medium |

**Recommended order:**
1. KANBAN-514 (nucleotide alignments)
2. Alliance website integration (high user value)
3. KANBAN-532 (variant effects)
4. Protein domains + exon boundaries (together)
5. Enhanced filtering (iterative improvement)

---

## Technical Dependencies & Blockers

### Dependency Graph

```
KANBAN-727 ──┐
KANBAN-691 ──┼──> Week 8-9 UI Polish
             │
KANBAN-831 ──┐
KANBAN-623 ──┼──> Week 10-11 Infrastructure
KANBAN-830 ──┘     (KANBAN-830 after 831)
             │
             └──> Step Functions Migration
                  (Week 12-14)
                       │
                       ├──> KANBAN-514 (Nucleotide)
                       │
                       ├──> Alliance Integration
                       │
                       └──> KANBAN-532 (Variant Effects)
                            (Complex, do last)
```

### External Dependencies

| Feature | External Dependency | Status |
|---------|-------------------|--------|
| Alliance Integration | Alliance website team coordination | Not started |
| Protein Domains | UniProt API integration | Not investigated |
| Public Launch | AWS public access configuration | Not started |

### Decision Points Required

1. **KANBAN-832**: Which deployment strategy? (Recommend Option A)
2. **Step Functions Migration**: When to cutover from Nextflow?
3. **Phase 2 Timing**: Start features before or after Step Functions?

**Recommendation**: Complete infrastructure optimization (Weeks 10-14) before Phase 2 features

---

## Architecture Decisions Needed

### 1. Step Functions Migration Timing

**Question**: When to fully replace Nextflow with Step Functions?

**Options**:
- **Option A**: Migrate during Week 12-14 (before Phase 2)
  - Pro: Clean architecture for new features
  - Con: Larger change window
- **Option B**: Defer to Q2 after Phase 2
  - Pro: Deliver features faster
  - Con: Build on legacy architecture

**Recommendation**: **Option A** - Better foundation for Phase 2

### 2. EFS vs. Nextflow Cache

**Question**: How to cache reference genomes?

**Decided**: EFS (KANBAN-830 spec) for cross-job persistence

**Validation needed**: Cost analysis in dev environment first

### 3. Variant Effect Calculation

**Question**: Where to recalculate variant effects?

**Options** (from KANBAN-532):
- Client-side: Fast but complex frontend logic
- Server-side: Centralized but less interactive
- Hybrid: Backend provides sequences, frontend calculates

**Recommendation**: **Hybrid** approach (specified in KANBAN-532)

### 4. Testing Strategy

**Question**: How much testing before public launch?

**Requirements** (from KANBAN-832):
- Unit tests: 80%+ coverage
- Integration tests: API endpoints
- E2E tests: Submit → Results flow

**Action needed**: Audit current test coverage

---

## File Modification Roadmap

### Immediate (Weeks 8-9)

```
webui/src/app/result/
├── deduplicateSequences.ts         # NEW - KANBAN-727
└── components/AlignmentViewer/     # MODIFY - KANBAN-727

webui/src/hooks/
└── useFilteredOptions.ts           # NEW - KANBAN-691

webui/src/app/submit/components/AlignmentEntry/
├── types.ts                        # MODIFY - KANBAN-691
├── serverActions.ts                # MODIFY - KANBAN-691
└── AlignmentEntry.tsx              # MODIFY - KANBAN-691
```

### Infrastructure (Weeks 10-11)

```
shared_aws/aws_infra/
├── cdk_classes/
│   └── s3_bucket.py                # MODIFY - KANBAN-831 lifecycle
│   └── efs_filesystem.py           # NEW - KANBAN-830
└── cdk_app.py                      # MODIFY - add EFS

pipeline_components/seq_retrieval/
├── aws_infra/
│   └── cdk_app.py                  # MODIFY - mount EFS
└── src/seq_retrieval.py            # MODIFY - use local genomes

api/aws_infra/
└── cdk_classes/                    # MODIFY - PAVI_ENVIRONMENT
```

### Step Functions (Weeks 12-14)

```
pipeline_components/aws_infra/
├── step_functions_state_machine.json  # EXTEND from POC
└── cdk_classes/
    └── step_functions.py              # PRODUCTION CDK

api/src/
├── job_service.py                  # MODIFY - call Step Functions
└── main.py                         # MODIFY - update endpoints
```

### Phase 2 (Weeks 17+)

```
# KANBAN-514
pipeline_components/seq_retrieval/src/seq_retrieval.py  # nucleotide mode
pipeline_components/alignment/protein-msa.nf            # --seqtype param
api/src/main.py                                         # alignment_type field
webui/src/app/submit/components/JobSubmitForm/         # type selector

# KANBAN-532
webui/src/lib/variantEffects.ts                        # NEW utility
webui/src/app/result/components/VariantEffectDisplay/  # NEW component
```

---

## Implementation Checklists

### Before Starting Any Ticket

- [ ] Read full ticket specification in `/docs/backlog/KANBAN-XXX-*.md`
- [ ] Identify all files that need modification
- [ ] Check for dependencies on other tickets
- [ ] Review existing code patterns in affected areas
- [ ] Run `make run-unit-tests` to establish baseline

### After Implementing

- [ ] Write/update unit tests for new code
- [ ] Run full test suite (`make run-unit-tests`, `make run-type-checks`)
- [ ] Test manually with example data
- [ ] Update relevant documentation
- [ ] Consider adding to `/docs/week*-completion-summary.md`

### Before Merging to Main

- [ ] All CI checks passing
- [ ] Code reviewed (if working with team)
- [ ] Documentation updated
- [ ] E2E tests passing (if UI changes)
- [ ] Performance benchmarked (if infrastructure changes)

---

## API Contracts

### Job Submission

**Current** (Protein only):
```typescript
POST /api/pipeline-job/
{
  seq_regions: Array<{
    unique_entry_id: string,
    chromosome: string,
    start: number,
    end: number,
    strand: string,
    species: string,
    assembly: string,
    sequence_type: "protein",
    // ... metadata
  }>
}
```

**After KANBAN-514** (Nucleotide support):
```typescript
POST /api/pipeline-job/
{
  alignment_type: "protein" | "nucleotide",  // NEW
  seq_regions: [...same...]
}
```

**After Step Functions Migration**:
```typescript
// Same request, different backend implementation
// Response may include Step Functions execution ARN
```

### Result Retrieval

**Current**:
```
GET /api/pipeline-job/{uuid}/result/alignment  → alignment-output.aln
GET /api/pipeline-job/{uuid}/result/seq-info   → aligned_seq_info.json
```

**After KANBAN-727** (Deduplication):
- Backend API unchanged
- Frontend applies deduplication to `aligned_seq_info.json`

**After KANBAN-532** (Variant effects):
- Backend returns protein sequences in `aligned_seq_info.json`
- Frontend calculates recalculated effects client-side

---

## Performance Targets

| Metric | Current | Target (Post-Optimization) |
|--------|---------|---------------------------|
| Reference genome download | 30-60s per task | 0s (EFS cache) |
| Job submission to start | <5s | <2s (Step Functions) |
| Sequence retrieval (5 genes) | ~2min | ~1min (EFS + Fargate Spot) |
| Full alignment (10 sequences) | ~3min | ~2min (optimized) |
| Result page load | <2s | <1s (deduplicated data) |

**Validation**: Run benchmarks before and after KANBAN-830 (EFS)

---

## Success Metrics

### Week 8-9 (UI Polish)
- [ ] No duplicate reference sequences in any test alignment
- [ ] Allele/transcript filtering works bidirectionally
- [ ] Example data loads correctly

### Week 10-11 (Infrastructure)
- [ ] S3 lifecycle policies active, storage capped at 30 days
- [ ] CloudWatch shows Environment dimension in all metrics
- [ ] EFS mounted and accessible in dev environment
- [ ] Reference genomes cached, download time = 0

### Week 12-14 (Deployment & Step Functions)
- [ ] CI/CD validates all PRs (tests, types, lint)
- [ ] Step Functions state machine handles all Nextflow cases
- [ ] Rollback procedure documented and tested
- [ ] Cost reduced by 30% (from infrastructure optimizations)

### Phase 2 (Features)
- [ ] Users can submit nucleotide alignments
- [ ] Variant effects recalculated correctly for frameshift cases
- [ ] Alliance website integration functional
- [ ] Phase 2 features adopted by users (metrics)

---

## Cost Optimization Summary

| Change | Estimated Savings | Status |
|--------|------------------|--------|
| KANBAN-831 (S3 lifecycle) | ~$150/year | Ready to implement |
| KANBAN-830 (EFS caching) | ~$200/year (S3 egress) | Ready to implement |
| Step Functions migration | ~30% total infra | POC complete |
| Fargate Spot (from 3-month plan) | ~70% compute | Not started |
| **Total** | **~40% reduction** | **Partial** |

**Validation needed**: Deploy to dev, monitor AWS Cost Explorer for 2 weeks

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation | Contingency |
|------|-----------|-------------|
| EFS cost higher than expected | Start with dev environment, monitor | Revert to S3 downloads |
| Step Functions limitations | POC validates approach | Keep Nextflow as fallback |
| Performance regression | Benchmark before/after | Optimize specific bottlenecks |
| Breaking changes in Phase 2 | Feature flags for new features | Gradual rollout |

### Operational Risks

| Risk | Mitigation | Contingency |
|------|-----------|-------------|
| Solo developer burnout | Realistic weekly goals | Extend timeline if needed |
| Production issues | Strong testing, monitoring | Quick rollback capability |
| Alliance integration delays | External dependency tracking | Build standalone first |

---

## Long-Term Vision (Q2 2025+)

### Advanced Features (Beyond Current Backlog)

- **Precomputed alignments**: Cache common ortholog sets
- **Batch job submission**: Multiple alignments at once
- **Result sharing**: Persistent URLs for alignment results
- **Export options**: PDF, PNG, data formats
- **Real-time updates**: WebSocket instead of polling
- **Multi-region deployment**: DR and performance

### Research Directions

- **ML-based conservation**: Beyond Clustal scores
- **Structural alignment**: 3D protein structure overlay
- **Pathway integration**: Link variants to pathways
- **Population data**: Allele frequencies from databases

---

## Appendix: Quick Reference

### Key Documentation

- **Backlog Details**: `/docs/backlog/KANBAN-XXX-*.md`
- **Step Functions Design**: `/docs/step-functions-design.md`
- **UX Roadmap**: `/docs/ux-roadmap-action-plan.md`
- **3-Month Plan**: `/docs/IMPLEMENTATION-PLAN-3-MONTH.md`

### Command Quick Reference

```bash
# Validation
make run-style-checks
make run-type-checks
make run-unit-tests

# Development
make run-server-dev        # API (port 8000)
make run-server-dev        # WebUI (port 3000)

# Testing
pytest tests/a_unit/test_main.py::test_name -v
npm run test -- --testPathPattern="AlignmentEntry"

# Deployment
make validate-dev          # CDK diff
make deploy-dev            # Deploy to AWS
```

### Critical Files

**Backend:**
- `api/src/job_service.py` - Pipeline orchestration
- `pipeline_components/seq_retrieval/src/seq_retrieval.py` - Sequence extraction
- `*/aws_infra/cdk_app.py` - Infrastructure definitions

**Frontend:**
- `webui/src/app/submit/components/JobSubmitForm/` - Job submission
- `webui/src/app/result/` - Alignment display
- `webui/src/hooks/` - Reusable UI logic

---

**Version**: 1.0
**Maintained by**: Engineering Lead
**Review Cadence**: Update after each major milestone
