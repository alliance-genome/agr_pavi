# PAVI Development Tracker

**Current Phase**: Week 8 - Post-MVP Polish (Dec 31, 2025 - Jan 6, 2025)
**Branch**: `feature/pavi-overhaul`
**Overall Progress**: MVP Complete, Infrastructure Optimization Next

---

## Current Status (as of Dec 31, 2025)

### ✅ Weeks 1-7 Complete (MVP Foundation)

- [x] **Week 1**: Step Functions POC deployed
- [x] **Week 2-6**: Core alignment features implemented
- [x] **Week 7**: KANBAN-816 (allele selection), Help Center
- [x] All MVP features working end-to-end
- [x] Nightingale MSA viewer integrated
- [x] Gene/transcript/allele selection functional
- [x] Cross-species alignments working

**See**: `/docs/week1-completion-summary.md`, `/docs/week2-quick-start.md`

---

## Week 8: UI Polish & Bug Fixes (Current Week)

**Goal**: Fix known bugs and polish MVP features before infrastructure work

**See detailed plan**: `/docs/week8-development-plan.md`

### Monday (Dec 31) - Planning & Investigation
- [x] Review all backlog tickets
- [x] Create TECHNICAL-ROADMAP.md
- [x] Create week8-development-plan.md
- [ ] Update TODO.md (this file)
- [ ] Investigate KANBAN-727 (duplicate reference sequences)

### Tuesday (Jan 1) - KANBAN-727 Implementation
- [ ] Implement deduplication logic
- [ ] Test with multiple alleles on same transcript
- [ ] Verify alignment coordinates remain correct

### Wednesday (Jan 2) - KANBAN-691 Setup
- [ ] Analyze Alliance API transcript associations
- [ ] Update types to include affectedTranscriptIds
- [ ] Update serverActions to capture transcript data

### Thursday (Jan 3) - KANBAN-691 Implementation
- [ ] Create useFilteredOptions hook
- [ ] Integrate filtering into AlignmentEntry
- [ ] Add visual feedback for filtering

### Friday (Jan 4) - Testing & Polish
- [ ] Comprehensive testing of both features
- [ ] UX polish (messages, tooltips)
- [ ] Update documentation

**Week 8 Success Criteria:**
- [ ] No duplicate reference sequences in results
- [ ] Allele/transcript filtering works bidirectionally
- [ ] All tests passing
- [ ] Documentation updated

---

## Week 9-10: Infrastructure Optimization (Planned)

**Goal**: Reduce costs, improve performance, prepare for Step Functions migration

### Quick Wins (Week 9)
- [ ] **KANBAN-831**: S3 lifecycle policies (1 day)
  - Add 30-day expiration to work/ and logs/
  - Estimated savings: ~$150/year

- [ ] **KANBAN-623**: CloudWatch environment metrics (1-2 days)
  - Add PAVI_ENVIRONMENT to all deployments
  - Better troubleshooting across dev/staging/prod

- [ ] **KANBAN-830**: EFS genome caching (3-4 days)
  - Create EFS, populate with reference genomes
  - Mount in seq_retrieval tasks
  - Eliminate 30-60s download per task
  - Estimated savings: ~$200/year + time savings

### Deployment Strategy (Week 10)
- [ ] **KANBAN-832**: Define deployment strategy
  - Decision needed: Option A (Continuous) vs B (Staging) vs C (Hybrid)
  - Recommendation: Option A for solo dev
  - Strengthen CI/CD, add monitoring, document rollback

**Week 9-10 Success Criteria:**
- [ ] Storage costs capped at 30 days worth
- [ ] Environment dimension in all CloudWatch metrics
- [ ] Reference genomes cached in EFS, download time = 0
- [ ] CI/CD validates all PRs comprehensively
- [ ] Deployment strategy documented and agreed

---

## Week 11-14: Step Functions Migration (Planned)

**Goal**: Replace Nextflow with Step Functions for better AWS integration

**Note**: POC already deployed in Week 1, need production hardening

### Tasks
- [ ] Complete Step Functions state machine from POC
- [ ] Replace Nextflow invocation in API with Step Functions
- [ ] Update job status tracking to use Step Functions executions
- [ ] Full integration testing (100+ jobs)
- [ ] Performance benchmarking vs Nextflow baseline
- [ ] Documentation and runbooks

**Migration Success Criteria:**
- [ ] All Nextflow functionality replicated
- [ ] Performance equal or better than Nextflow
- [ ] Cost reduced by 30%+ (infrastructure optimizations)
- [ ] Rollback plan documented and tested

---

## Phase 2: Feature Additions (Weeks 15+)

**Goal**: Add Phase 2 features after infrastructure is optimized

### High Priority Features

1. **KANBAN-514**: Nucleotide (DNA/RNA) alignments (5-7 days)
   - Add alignment_type parameter to API
   - Implement nucleotide color scheme
   - Update UI with type selector
   - **User value**: High - enables codon analysis, UTR comparison

2. **Alliance Integration** (5-7 days)
   - URL parameter handling in PAVI
   - "Send to PAVI" buttons in Alliance website
   - Pre-population from gene/variant pages
   - **User value**: High - primary discovery mechanism

3. **KANBAN-532**: Recalculate variant effects (7-10 days)
   - Handle frameshift impact on downstream variants
   - Display original vs recalculated effects
   - **User value**: High - scientific accuracy

### Medium Priority Features

4. **Protein domain overlay** (3-5 days)
   - UniProt API integration
   - Nightingale domain track

5. **Exon boundary display** (3-4 days)
   - Coordinate mapping from Alliance API
   - Visual track in alignment

6. **Enhanced variant filtering** (5-7 days)
   - Filter by consequence type
   - Filter by clinical significance

### Phase 2 Success Criteria
- [ ] Nucleotide alignments working
- [ ] Alliance integration functional
- [ ] Variant effects scientifically accurate
- [ ] User adoption growing (metrics)

---

## Long-Term Backlog (Q2 2025+)

These are documented but not yet prioritized:

### Advanced Features
- [ ] Precomputed common ortholog alignments
- [ ] Persistent result URLs (shareable)
- [ ] Batch job submission
- [ ] Export options (PDF, PNG, data formats)
- [ ] WebSocket real-time job updates
- [ ] Multi-region deployment

### Research Directions
- [ ] ML-based conservation scoring
- [ ] 3D structural alignment overlay
- [ ] Pathway integration
- [ ] Population allele frequency data

---

## Decision Points

| Decision | Status | Recommended | Notes |
|----------|--------|-------------|-------|
| KANBAN-832 deployment strategy | Pending | Option A (Continuous) | Simpler for solo dev |
| Step Functions migration timing | Pending | Week 11-14 | After infrastructure optimized |
| Phase 2 feature priority order | Pending | 514 → Alliance → 532 | Based on user value |
| EFS vs S3 for genome caching | Pending | EFS (KANBAN-830) | Cross-job persistence |

---

## Key Documents Reference

| Document | Purpose |
|----------|---------|
| `/docs/TECHNICAL-ROADMAP.md` | Technical dependencies, architecture decisions |
| `/docs/week8-development-plan.md` | Current week detailed plan |
| `/docs/IMPLEMENTATION-PLAN-3-MONTH.md` | Original 12-week plan |
| `/docs/backlog/KANBAN-*.md` | Individual ticket specifications |
| `/docs/step-functions-design.md` | Step Functions architecture |
| `/docs/ux-roadmap-action-plan.md` | UX improvements prioritization |

---

## Progress Tracking

### Infrastructure Optimization
- [ ] KANBAN-831 (S3 lifecycle) - Not started
- [ ] KANBAN-623 (CloudWatch metrics) - Not started
- [ ] KANBAN-830 (EFS caching) - Not started
- [ ] KANBAN-832 (Deployment strategy) - Not started
- [ ] Step Functions migration - POC done, production pending

### Phase 2 Features
- [ ] KANBAN-514 (Nucleotide alignments) - Not started
- [ ] Alliance integration - Not started
- [ ] KANBAN-532 (Variant effects) - Not started
- [ ] Protein domains - Not started
- [ ] Exon boundaries - Not started
- [ ] Enhanced filtering - Not started

### Bug Fixes & Polish
- [ ] KANBAN-727 (Duplicate references) - In progress (Week 8)
- [ ] KANBAN-691 (Filter combos) - In progress (Week 8)

---

## Success Metrics

### By End of Week 8
- [ ] Zero duplicate reference sequences
- [ ] Smart allele/transcript filtering
- [ ] All E2E tests passing

### By End of Infrastructure Phase (Week 14)
- [ ] 30%+ cost reduction
- [ ] Step Functions fully operational
- [ ] Deployment pipeline robust

### By End of Phase 2 (Week 26)
- [ ] Nucleotide alignments working
- [ ] Alliance integration live
- [ ] Variant effects accurate
- [ ] User adoption metrics positive

---

## Notes & Blockers

### Week 8 Notes (Dec 31, 2025)
- Reviewed all 11 backlog tickets
- Created comprehensive technical roadmap
- Both KANBAN-727 and KANBAN-691 ready to implement (no blockers)
- Good test coverage from KANBAN-816 work

### Known Blockers
- Alliance integration requires coordination with Alliance team (external dependency)
- UniProt API integration not yet investigated (for domains)
- Public launch infrastructure not configured (AWS access)

### Risks
- Solo developer bandwidth for Step Functions migration (5-7 days continuous work)
- EFS costs need validation in dev environment first
- Phase 2 features may need to wait until Q2 if infrastructure work takes longer

---

## Quick Commands

```bash
# Validation
make run-style-checks
make run-type-checks
make run-unit-tests

# Development
cd api && make run-server-dev        # Port 8000
cd webui && make run-server-dev      # Port 3000

# Testing
pytest tests/a_unit/test_main.py::test_name -v
npm run test -- --testPathPattern="AlignmentEntry"

# Deployment
make validate-dev
make deploy-dev
```

---

## Weekly Review Questions

At end of each week:
1. What was completed this week?
2. What carried over? Why?
3. Any new blockers discovered?
4. Should next week's plan change?
5. Are success metrics still on track?

---

**Last Updated**: Dec 31, 2025
**Next Review**: End of Week 8 (Jan 4, 2025)
