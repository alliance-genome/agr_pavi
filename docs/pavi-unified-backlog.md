# PAVI Unified Backlog: Jira + UI Plan + PRD

**Last Updated**: 2025-12-23
**Timeline**: 16 weeks to public launch
**Related Docs**:
- `prd-pavi-public-launch-unified.md` (full PRD)
- `pavi-webui-8week-ux-improvement-plan.md` (detailed UI plan)
- `ux-prioritized-roadmap.md` (UX priorities)

---

## Priority Legend

| Priority | Meaning | Timeline |
|----------|---------|----------|
| **P0** | Launch blocker - must complete | Weeks 1-8 |
| **P1** | Launch polish - should complete | Weeks 9-14 |
| **P2** | Post-launch - nice to have | Weeks 15+ |
| **P3** | Deferred - future phase | Phase 2+ |

---

## Unified Backlog by Priority

### P0: Launch Blockers (Weeks 1-8)

#### Infrastructure & Public Access

| # | Jira | Summary | Type | Week | Dependencies |
|---|------|---------|------|------|--------------|
| 1 | **KANBAN-609** | Enable public access to PAVI | Feature | 1-2 | None |
| 2 | **KANBAN-775** | Make PAVI website publicly accessible | Story | 2-3 | KANBAN-609 |
| 3 | **KANBAN-774** | Secure PAVI code | Story | 3-4 | KANBAN-775 |

#### Critical Bug Fix

| # | Jira | Summary | Type | Week | Dependencies |
|---|------|---------|------|------|--------------|
| 4 | **KANBAN-522** | AGR Seqpanel reports refseq sequences matching genomic coordinates rather than as reported by refseq | Bug | 2 | None |

#### UI Foundation (from 8-Week Plan)

| # | Source | Summary | Type | Week | Dependencies |
|---|--------|---------|------|------|--------------|
| 5 | UI-W1 | Header/Footer navigation with Alliance branding | UX | 1 | None |
| 6 | UI-W1 | Breadcrumb navigation | UX | 1 | #5 |
| 7 | UI-W1 | Design system tokens (spacing, typography, colors) | UX | 1 | None |
| 8 | UI-W1 | Home/landing page with value proposition | UX | 1-2 | #5 |
| 9 | UI-W1 | Workflow stepper component | UX | 2 | #5 |

#### Form Experience (from 8-Week Plan)

| # | Source | Summary | Type | Week | Dependencies |
|---|--------|---------|------|------|--------------|
| 10 | UI-W2 | Form introduction panel with help | UX | 3 | #8 |
| 11 | UI-W2 | Progressive disclosure for complex fields | UX | 3 | #10 |
| 12 | UI-W2 | Inline validation with clear error messages | UX | 3-4 | #10 |
| 13 | UI-W2 | "Try an example" quick-start feature | UX | 4 | #10 |
| 14 | UI-W2 | Help tooltips on all form fields | UX | 4 | #10 |
| 15 | UI-W2 | Form state persistence (localStorage) | UX | 4 | None |

#### Accessibility (from 8-Week Plan)

| # | Source | Summary | Type | Week | Dependencies |
|---|--------|---------|------|------|--------------|
| 16 | UI-W3 | Skip links for keyboard navigation | A11y | 5 | #5 |
| 17 | UI-W3 | ARIA landmarks and live regions | A11y | 5 | None |
| 18 | UI-W3 | Color contrast fixes (WCAG AA) | A11y | 5 | #7 |
| 19 | UI-W3 | Keyboard navigation for all components | A11y | 5-6 | None |
| 20 | UI-W3 | Screen reader testing (NVDA, VoiceOver) | A11y | 6 | #17 |

#### Progress & Results (from 8-Week Plan)

| # | Source | Summary | Type | Week | Dependencies |
|---|--------|---------|------|------|--------------|
| 21 | UI-W4 | Progress timeline with step indicators | UX | 6 | None |
| 22 | UI-W4 | Estimated time remaining display | UX | 6 | #21 |
| 23 | UI-W5 | Results summary panel with statistics | UX | 7 | None |
| 24 | UI-W5 | Visualization mode tabs (not dropdown) | UX | 7 | #23 |
| 25 | UI-W5 | Export options (FASTA, PNG, CSV) | UX | 7-8 | #23 |

#### Website Discovery

| # | Jira | Summary | Type | Week | Dependencies |
|---|------|---------|------|------|--------------|
| 26 | **KANBAN-776** | Add link to PAVI on public website | Story | 8 | KANBAN-775 |

---

### P1: Launch Polish (Weeks 9-14)

#### Job Management (from 8-Week Plan)

| # | Source | Summary | Type | Week | Dependencies |
|---|--------|---------|------|------|--------------|
| 27 | UI-W4 | "My Jobs" page with history and search | UX | 9 | None |
| 28 | UI-W4 | Job status badges and quick actions | UX | 9 | #27 |
| 29 | UI-W4 | Browser notifications for job completion | UX | 9 | None |
| 30 | UI-W4 | Job sharing (copy link) | UX | 10 | #27 |

#### AWS Tagging & Monitoring

| # | Jira | Summary | Type | Week | Dependencies |
|---|------|---------|------|------|--------------|
| 31 | **KANBAN-693** | Add environment-specific AWS resource tagging | Task | 9 | None |
| 32 | **KANBAN-696** | Add cost-allocation tags to additional AWS resources | Task | 9 | KANBAN-693 |
| 33 | **KANBAN-623** | Add environment-name to PAVI Cloudwatch metrics info | Task | 10 | KANBAN-693 |

#### Help System (from 8-Week Plan)

| # | Source | Summary | Type | Week | Dependencies |
|---|--------|---------|------|------|--------------|
| 34 | UI-W7 | Help center page with search | UX | 10 | None |
| 35 | UI-W7 | FAQ section (10+ entries) | UX | 10 | #34 |
| 36 | UI-W7 | Guided tour for first-time users | UX | 11 | #34 |
| 37 | UI-W7 | Feedback widget | UX | 11 | None |

#### Performance & Mobile (from 8-Week Plan)

| # | Source | Summary | Type | Week | Dependencies |
|---|--------|---------|------|------|--------------|
| 38 | UI-W6 | Skeleton screens for loading states | UX | 11 | None |
| 39 | UI-W6 | Code splitting and lazy loading | Perf | 11 | None |
| 40 | UI-W8 | Mobile optimization (375px viewport) | UX | 12 | None |
| 41 | UI-W8 | Touch targets (44x44px minimum) | A11y | 12 | #40 |

#### DevOps

| # | Jira | Summary | Type | Week | Dependencies |
|---|------|---------|------|------|--------------|
| 42 | **KANBAN-832** | Create testing/development deployment and branching strategy | Story | 10 | None |
| 43 | **KANBAN-648** | Prevent dependabot python subdependency update proposals | Task | 11 | None |

#### Polish (from 8-Week Plan)

| # | Source | Summary | Type | Week | Dependencies |
|---|--------|---------|------|------|--------------|
| 44 | UI-W8 | Micro-interactions and animations | UX | 13 | None |
| 45 | UI-W8 | Custom 404 page | UX | 13 | None |
| 46 | UI-W8 | Final accessibility audit | A11y | 14 | All above |
| 47 | UI-W8 | Cross-browser testing | QA | 14 | All above |

---

### P2: Post-Launch (Weeks 15+)

#### AWS Optimization

| # | Jira | Summary | Type | Week | Dependencies |
|---|------|---------|------|------|--------------|
| 48 | **KANBAN-549** | Optimise PAVI AWS resource allocation and usage | Story | 15 | Launch |
| 49 | **KANBAN-831** | Optimise processing job intermediate result storage | Task | 16 | Launch |
| 50 | **KANBAN-830** | Optimise reference genome file download and storage | Task | 16 | Launch |

#### Website Integration

| # | Jira | Summary | Type | Week | Dependencies |
|---|------|---------|------|------|--------------|
| 51 | **KANBAN-515** | Enable access to PAVI through public website gene orthology and paralogy tables | Feature | 17 | KANBAN-776 |

---

### P3: Deferred (Phase 2+)

#### Advanced Pipeline Features

| # | Jira | Summary | Type | Phase | Dependencies |
|---|------|---------|------|-------|--------------|
| 52 | **KANBAN-514** | Enable transcript sequence (nucleotide) alignments | Feature | 2 | None |
| 53 | **KANBAN-523** | Enable usage of source transcript sequences | Feature | 2 | KANBAN-514 |
| 54 | **KANBAN-728** | Support indel alleles with overlapping variants | Story | 2 | None |
| 55 | **KANBAN-531** | Investigate and implement translation of incomplete open reading frames | Story | 2 | None |
| 56 | **KANBAN-530** | Investigate and implement use of alternative codon tables | Story | 2 | KANBAN-531 |

#### Epics (Tracking Only)

| # | Jira | Summary | Type | Phase | Status |
|---|------|---------|------|-------|--------|
| 57 | **KANBAN-498** | PAVI MVP (aka phase 1) | Epic | 1 | In Progress |
| 58 | **KANBAN-500** | PAVI phase 2 | Epic | 2 | Backlog |

---

## Timeline View

```
Week 1-2:   [KANBAN-609] Public Access + [UI-W1] Foundation
Week 2:     [KANBAN-522] Bug Fix (data accuracy)
Week 2-3:   [KANBAN-775] Website Publicly Accessible
Week 3-4:   [KANBAN-774] Security + [UI-W2] Form UX
Week 5-6:   [UI-W3] Accessibility Compliance
Week 6-7:   [UI-W4] Progress Tracking + [UI-W5] Results Display
Week 8:     [KANBAN-776] Website Link
Week 9-10:  [UI-W4] Job Management + [KANBAN-693/696/623] AWS Tagging
Week 10-11: [UI-W7] Help System + [KANBAN-832] DevOps Strategy
Week 11-12: [UI-W6] Performance + [UI-W8] Mobile
Week 13-14: [UI-W8] Polish + Final Testing
Week 15-16: Canary Launch → Full Production
Week 17+:   [KANBAN-549/831/830] Optimizations
```

---

## Sprint Mapping

### Sprint 1 (Week 1-2): Foundation
- KANBAN-609: Public access infrastructure
- KANBAN-522: Data accuracy bug fix
- UI-W1: Header, footer, design tokens, home page

### Sprint 2 (Week 3-4): Security & Form UX
- KANBAN-775: Public accessibility
- KANBAN-774: Security hardening
- UI-W2: Form redesign with help and validation

### Sprint 3 (Week 5-6): Accessibility
- UI-W3: Full accessibility remediation
- Screen reader testing

### Sprint 4 (Week 7-8): Progress & Results
- UI-W4: Progress tracking (partial)
- UI-W5: Results display improvements
- KANBAN-776: Website discovery link

### Sprint 5 (Week 9-10): Job Management & AWS
- UI-W4: My Jobs page
- KANBAN-693, KANBAN-696, KANBAN-623: AWS tagging
- KANBAN-832: DevOps strategy

### Sprint 6 (Week 11-12): Help & Performance
- UI-W7: Help system
- UI-W6: Performance optimization
- UI-W8: Mobile optimization

### Sprint 7 (Week 13-14): Polish & Testing
- UI-W8: Final polish
- Integration testing
- Accessibility regression testing

### Sprint 8 (Week 15-16): Launch
- Canary deployment (10% → 25% → 50% → 75% → 100%)
- Public announcement
- Decommission old infrastructure

---

## Jira Ticket Summary

### Included in Phase 1 (P0-P1)

| Ticket | Summary | Priority | Week |
|--------|---------|----------|------|
| KANBAN-609 | Enable public access to PAVI | P0 | 1-2 |
| KANBAN-775 | Make PAVI website publicly accessible | P0 | 2-3 |
| KANBAN-774 | Secure PAVI code | P0 | 3-4 |
| KANBAN-522 | Seqpanel refseq bug fix | P0 | 2 |
| KANBAN-776 | Add link to PAVI on public website | P0 | 8 |
| KANBAN-693 | Environment-specific AWS tagging | P1 | 9 |
| KANBAN-696 | Cost-allocation tags | P1 | 9 |
| KANBAN-623 | CloudWatch metrics environment | P1 | 10 |
| KANBAN-832 | Testing/deployment strategy | P1 | 10 |
| KANBAN-648 | Dependabot subdependency | P1 | 11 |

### Deferred to Phase 2 (P2-P3)

| Ticket | Summary | Reason for Deferral |
|--------|---------|---------------------|
| KANBAN-549 | AWS resource optimization | Post-launch optimization |
| KANBAN-831 | Job storage optimization | Post-launch optimization |
| KANBAN-830 | Genome download optimization | Post-launch optimization |
| KANBAN-515 | Gene orthology table integration | Requires KANBAN-776 first |
| KANBAN-514 | Nucleotide alignments | Significant scope |
| KANBAN-523 | Source transcript sequences | Depends on KANBAN-514 |
| KANBAN-728 | Overlapping indel variants | Complex feature |
| KANBAN-531 | Incomplete ORF translation | Research required |
| KANBAN-530 | Alternative codon tables | Research required |

---

## UI Plan Items Summary

### Week 1: Foundation (8 items)
- Header with Alliance branding
- Footer with links
- Breadcrumb navigation
- Workflow stepper
- Design system tokens
- Home page
- Page layouts
- Semantic HTML structure

### Week 2: Form UX (6 items)
- Form introduction panel
- Progressive disclosure
- Inline validation
- "Try an example" feature
- Multi-select improvements
- Form state persistence

### Week 3: Accessibility (7 items)
- Skip links
- Keyboard navigation
- ARIA landmarks
- Color contrast fixes
- Screen reader support
- Motion preferences
- Testing documentation

### Week 4: Progress Tracking (5 items)
- Progress timeline
- Estimated time remaining
- Real-time updates
- Job history page
- Error handling

### Week 5: Results Display (6 items)
- Summary panel
- Visualization tabs
- Export options
- Failure display
- Position info panel
- Responsive design

### Week 6: Performance (6 items)
- Skeleton screens
- Code splitting
- Lazy loading
- Image optimization
- Web Vitals monitoring
- Offline support

### Week 7: Help System (6 items)
- Help center
- FAQ section
- Guided tours
- Troubleshooting wizard
- Feedback widget
- System status

### Week 8: Polish (7 items)
- Mobile optimization
- Micro-interactions
- Animations
- Final accessibility pass
- Browser testing
- Custom 404
- Documentation

---

## Quick Reference: What's What

| Category | Jira Items | UI Plan Items | Total |
|----------|------------|---------------|-------|
| P0 (Launch Blockers) | 5 | 21 | 26 |
| P1 (Launch Polish) | 5 | 15 | 20 |
| P2 (Post-Launch) | 4 | 0 | 4 |
| P3 (Deferred) | 8 | 0 | 8 |
| **Total** | **22** | **36** | **58** |

---

## Success Criteria

### Launch Ready (Week 16)
- [ ] All P0 items complete
- [ ] 80%+ of P1 items complete
- [ ] Zero critical accessibility violations
- [ ] Performance targets met (LCP < 2.5s, FPS > 60)
- [ ] Security audit passed
- [ ] 5+ user testing sessions completed

### Post-Launch Targets (Month 3)
- 500+ monthly active users
- 98%+ job success rate
- < 5 support tickets/week
- 99.5% uptime SLO

---

**Related Documents**:
- Full PRD: `prd-pavi-public-launch-unified.md`
- Detailed UI Plan: `pavi-webui-8week-ux-improvement-plan.md`
- UX Priorities: `ux-prioritized-roadmap.md`
- UX Action Plan: `ux-roadmap-action-plan.md`
