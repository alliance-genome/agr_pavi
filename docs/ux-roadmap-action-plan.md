# PAVI UX Roadmap: Action Plan
## Practical Implementation Guide

**Date**: 2025-12-23
**Full Analysis**: See `ux-prioritized-roadmap.md`

---

## Quick Decision Framework

When prioritizing work, use this hierarchy:

```
1. Can users access PAVI? (Public access infrastructure)
2. Is the data accurate? (Bug fixes)
3. Can users submit successfully? (Form usability)
4. Is it accessible to everyone? (WCAG compliance)
5. Can users understand results? (Results improvements)
6. Is it fast enough? (Performance)
7. Is it polished? (UX refinements)
8. Does it have advanced features? (Post-launch enhancements)
```

---

## The Critical 6 (Pre-Launch Blockers)

These MUST be done before any public announcement:

### 1. Public Access Infrastructure
**Items**: KANBAN-609, KANBAN-775
**Why**: Users literally cannot reach the app
**Action**: Configure AWS for public access, remove authentication
**Time**: 2-3 days
**Owner**: You (infrastructure work)

### 2. Critical Data Bug
**Item**: KANBAN-522 (Seqpanel refseq coordinates)
**Why**: Wrong scientific data = zero credibility
**Action**: Debug seqpanel, fix coordinate mapping, test thoroughly
**Time**: 3-5 days
**Owner**: You (backend investigation)

### 3. Landing Page
**Items**: Week 1.3 of UI plan
**Why**: No clear entry point or explanation of what PAVI does
**Action**: Create home page with value prop, examples, "Start New Alignment" button
**Time**: 2-3 days
**Owner**: You (frontend development)

### 4. Website Link
**Item**: KANBAN-776
**Why**: Primary discovery mechanism
**Action**: Add prominent link on Alliance Genome main site
**Time**: 1 day
**Owner**: You (if you control main site) or coordinate

### 5. Form Help
**Items**: Week 2.2 of UI plan
**Why**: Form too complex without guidance
**Action**: Add tooltips to every form field, "Try an example" button
**Time**: 2-3 days
**Owner**: You (frontend development)

### 6. Baseline Accessibility
**Items**: Week 3 subset (keyboard, ARIA, contrast)
**Why**: Legal compliance, ethical requirement
**Action**: Add keyboard navigation, ARIA labels, fix color contrast
**Time**: 3-4 days
**Owner**: You (frontend development)

**Total Time**: ~15-20 days of focused work

---

## Work Phases

### Phase 0: Foundation (Days 1-5)
**Goal**: Remove technical blockers

```bash
# Day 1-2: Infrastructure
- Configure public AWS access (KANBAN-609, 775)
- Test public URL accessibility
- Set up monitoring

# Day 3-5: Critical Bug
- Investigate KANBAN-522 refseq bug
- Fix coordinate mapping
- Create test cases
- Verify with known good data
```

---

### Phase 1: Minimum Viable Public Interface (Days 6-15)
**Goal**: Usable by new users without help

```bash
# Day 6-8: Navigation and Landing
- Create header with logo, nav menu
- Build landing page with value prop
- Add footer with links
- Define design system tokens (colors, spacing, typography)

# Day 9-11: Form Usability
- Build HelpTooltip component
- Add tooltips to all form fields
- Create "Try an Example" button with demo data
- Implement basic inline validation

# Day 12-15: Accessibility Baseline
- Add keyboard navigation support
- Implement skip links
- Add ARIA labels and landmarks
- Fix critical color contrast issues
- Test with keyboard-only navigation
```

**Checkpoint**: Can a new user discover PAVI, understand it, and successfully submit a job using only keyboard?

---

### Phase 2: Core Experience Polish (Days 16-25)
**Goal**: Professional quality, transparent progress

```bash
# Day 16-18: Progress Improvements
- Replace generic spinner with step-by-step progress
- Show current step and estimated time
- Add detailed status messages
- Implement better error messages

# Day 19-21: Job Management
- Create /jobs page with history
- Add basic job list with status
- Enable returning to previous results
- Implement job search/filter

# Day 22-25: Results Improvements
- Add results summary panel (stats, quality)
- Convert display mode dropdown to tabs
- Add basic export options (FASTA, CSV)
- Improve failure display with clear messages
```

**Checkpoint**: Users understand status, can manage multiple jobs, and export results.

---

### Phase 3: Performance and Help (Days 26-35)
**Goal**: Fast, self-service experience

```bash
# Day 26-28: Performance
- Add skeleton loading states
- Implement code splitting for visualizations
- Optimize images to WebP
- Monitor and optimize Web Vitals

# Day 29-32: Help System
- Create /help page with searchable docs
- Write FAQ content
- Link errors to help articles
- Add feedback widget

# Day 33-35: Final Polish
- Mobile optimization (test on 375px)
- Add micro-animations (button hovers, etc.)
- Final accessibility audit
- Cross-browser testing
- Performance testing with large datasets
```

**Checkpoint**: Ready for public announcement.

---

## What to Defer (Post-Launch)

### Don't Work On These Until Core Experience is Solid

**KANBAN-514: Nucleotide Alignments**
- Major feature requiring new pipeline component
- Defer to Weeks 9-12 post-launch
- Reason: Get protein alignments right first

**KANBAN-523: Source Transcript Sequences**
- Niche use case, significant backend work
- Defer to Weeks 13-16 post-launch
- Reason: Validate actual user demand first

**KANBAN-515: Gene Table Integration**
- Nice-to-have integration
- Defer to Weeks 9-12 post-launch
- Reason: Manual gene entry works fine

**KANBAN-728: Overlapping Indel Variants**
- Edge case, complex logic
- Defer to Weeks 9-12 post-launch
- Reason: Affects minority of submissions

---

## Quick Wins (When You Have 1-2 Hours)

These are high-impact, low-effort improvements you can knock out quickly:

**30-Minute Wins**:
- Add "Skip to main content" link
- Implement custom 404 page
- Add copy-to-clipboard for job URLs
- Add character counters to text inputs
- Create job status badges (colored pills)

**1-Hour Wins**:
- Add breadcrumb navigation component
- Implement toast notifications for success/error
- Add loading spinners to async operations
- Create "Clear form" button with confirmation
- Add export button tooltips

**2-Hour Wins**:
- Build "Try an Example" feature
- Create keyboard shortcut help modal (press ?)
- Add progress percentage calculation
- Implement "Was this helpful?" widget
- Build help tooltip component

**Total Quick Wins Impact**: Collectively these make the app feel much more polished with minimal time investment.

---

## Implementation Sequence (Recommended)

### Week 1: Get Public
```
Day 1-2:  Public access infrastructure
Day 3:    Landing page structure
Day 4:    Navigation header and footer
Day 5:    Website link + design tokens
```

### Week 2: Make Usable
```
Day 6:    Help tooltip component
Day 7:    Deploy tooltips to form fields
Day 8:    "Try an example" feature
Day 9:    Form validation improvements
Day 10:   Form state persistence
```

### Week 3: Make Accessible
```
Day 11:   Keyboard navigation + skip links
Day 12:   ARIA labels and landmarks
Day 13:   Fix color contrast issues
Day 14:   Form accessibility
Day 15:   Automated accessibility testing
```

### Week 4: Progress and Jobs
```
Day 16:   Enhanced progress UI
Day 17:   Job history page
Day 18:   Real-time WebSocket updates
Day 19:   Error handling improvements
Day 20:   Job sharing and export
```

### Week 5: Results Polish
```
Day 21:   Results summary panel
Day 22:   Display mode tabs
Day 23:   Export menu
Day 24:   Failure display improvements
Day 25:   Additional export formats
```

### Week 6: Performance
```
Day 26:   Skeleton loading states
Day 27:   Code splitting and lazy loading
Day 28:   Image optimization
Day 29:   Performance monitoring
Day 30:   Load testing and optimization
```

### Week 7: Help System
```
Day 31:   Help center page structure
Day 32:   FAQ content writing
Day 33:   Error-to-help linking
Day 34:   Feedback widget
Day 35:   Help search functionality
```

### Week 8: Launch Ready
```
Day 36:   Mobile optimization
Day 37:   Micro-animations
Day 38:   Final accessibility audit
Day 39:   Cross-browser testing
Day 40:   Documentation and launch prep
```

---

## Testing Checklist

### Before Each Phase Ends
```bash
# Functional Testing
□ Happy path works (submit → progress → results)
□ Error paths handled gracefully
□ All links navigate correctly
□ Forms validate properly
□ Exports download successfully

# Accessibility Testing
□ Keyboard navigation works (Tab, Enter, Esc)
□ Screen reader announces properly (test with VoiceOver)
□ Color contrast passes WCAG AA (use axe DevTools)
□ Focus indicators visible
□ No axe violations (critical or serious)

# Performance Testing
□ Lighthouse score > 90 for Performance
□ LCP < 2.5s
□ No console errors
□ Network tab shows reasonable request count
□ Memory doesn't leak during long sessions

# Cross-Browser Testing
□ Chrome (latest)
□ Firefox (latest)
□ Safari (latest)
□ Mobile Safari (iOS)
□ Chrome Android
```

---

## Development Workflow

### Daily Workflow
```bash
# Morning
1. Check which phase you're in
2. Pick highest priority item from that phase
3. Create feature branch: git checkout -b feature/item-name

# During Development
4. Write component with TypeScript
5. Add unit tests (Jest + React Testing Library)
6. Test manually with keyboard-only navigation
7. Run: make run-style-checks
8. Run: make run-type-checks
9. Run: make run-unit-tests

# End of Day
10. Commit with descriptive message
11. Push to remote
12. Deploy to staging if phase checkpoint reached
```

### When Stuck
1. Check the detailed UI plan (pavi-webui-8week-ux-improvement-plan.md)
2. Look at existing components for patterns
3. Review PrimeReact documentation
4. Test in browser frequently (don't wait until "done")
5. Focus on accessibility from the start (easier than retrofitting)

---

## Common Pitfalls to Avoid

### Don't Do These Things
❌ Skip accessibility until the end (retrofit is painful)
❌ Build custom components when PrimeReact has them
❌ Ignore TypeScript errors ("I'll fix it later")
❌ Skip keyboard testing (affects 20% of users)
❌ Add features not in the plan (scope creep kills timelines)
❌ Optimize performance prematurely (profile first)
❌ Write help docs at the end (write alongside features)
❌ Test only in Chrome (Firefox and Safari differ significantly)

### Do These Things Instead
✅ Design with accessibility from the start
✅ Use PrimeReact components, customize as needed
✅ Fix TypeScript errors immediately
✅ Test keyboard navigation for every interactive element
✅ Stick to the plan; defer new ideas to Phase 2
✅ Profile first, then optimize hotspots
✅ Write help content as you build features
✅ Test in Firefox and Safari regularly

---

## File Organization Reference

### New Files You'll Create
```
webui/src/
├── app/
│   ├── components/           # Shared components
│   │   ├── Header.tsx       # Week 1
│   │   ├── Footer.tsx       # Week 1
│   │   ├── Breadcrumbs.tsx  # Week 1
│   │   ├── SkipLinks.tsx    # Week 3
│   │   └── HelpTooltip.tsx  # Week 2
│   ├── (home)/              # Landing page route
│   │   └── page.tsx         # Week 1
│   ├── jobs/                # Job management
│   │   └── page.tsx         # Week 4
│   └── help/                # Help center
│       └── page.tsx         # Week 7
├── styles/
│   ├── tokens.css           # Design system (Week 1)
│   ├── focus.css            # Focus indicators (Week 3)
│   └── animations.css       # Micro-interactions (Week 8)
└── hooks/
    ├── useJobHistory.ts     # Week 4
    └── useRealtimeUpdates.ts # Week 4
```

---

## Success Metrics (Simple)

Track these to know if you're making progress:

### Week 3 Checkpoint (Pre-Launch Readiness)
- Can you complete the form using only Tab, Enter, Esc, and Space?
- Does axe DevTools show 0 critical violations?
- Can you explain what PAVI does to someone in 30 seconds using the landing page?
- Is the critical bug (KANBAN-522) fixed and tested?

### Week 6 Checkpoint (Soft Launch Readiness)
- Can you submit, monitor, and view results without confusion?
- Does the progress display show meaningful status (not just a spinner)?
- Can you find and access previous jobs?
- Does Lighthouse show Performance > 80?

### Week 8 Checkpoint (Public Launch Readiness)
- Can you complete the entire workflow on a mobile phone (375px)?
- Does a third-party accessibility audit show WCAG 2.1 AA compliance?
- Can you find help for common errors without leaving the app?
- Does Lighthouse show Performance > 90, Accessibility = 100?

---

## When You're Ready to Launch

### Soft Launch (Week 6)
1. Deploy to public URL
2. Share link with 5-10 trusted users
3. Monitor error logs and analytics
4. Collect feedback via email or form
5. Fix critical issues discovered
6. Iterate based on feedback

### Public Launch (Week 8)
1. Announce on Alliance Genome blog
2. Post to relevant mailing lists
3. Share on social media
4. Monitor support requests
5. Watch analytics for usage patterns
6. Plan Phase 2 based on actual user behavior

---

## Phase 2 Planning (Post-Launch)

After successful public launch, prioritize based on:

1. **User feedback**: What are people actually asking for?
2. **Analytics**: Which features are people using/ignoring?
3. **Support tickets**: What's causing confusion?
4. **Technical debt**: What needs refactoring?

Then tackle deferred backlog items:
- KANBAN-728 (Indel overlaps) if users encounter it
- KANBAN-515 (Gene table integration) if requested
- KANBAN-514 (Nucleotide alignments) as major feature
- KANBAN-523 (Source transcripts) if validated demand

---

## Your Daily Question

At the start of each work session, ask:

**"What's the smallest thing I can build today that moves PAVI closer to a successful public launch?"**

Focus on that. Ship it. Move to the next thing.

---

## Resources

### Key Documentation
- Full roadmap: `ux-prioritized-roadmap.md`
- Detailed UI plan: `pavi-webui-8week-ux-improvement-plan.md`
- UI plan summary: `pavi-webui-improvement-plan-summary.md`
- Project conventions: `CLAUDE.md`

### Essential Tools
- Accessibility testing: axe DevTools browser extension
- Performance testing: Lighthouse in Chrome DevTools
- Screen reader testing: VoiceOver (Mac) or NVDA (Windows)
- Design reference: Alliance Genome website for branding

### Quick Commands
```bash
# Development
make run-server-dev              # Start Next.js dev server

# Validation
make run-style-checks            # ESLint
make run-type-checks             # TypeScript compiler
make run-unit-tests              # Jest tests

# Build
make container-image             # Build Docker container
```

---

**This is your practical guide. The full roadmap has all the details and rationale. This document tells you what to build and in what order.**

**Start with Phase 0 (days 1-5). Everything else depends on public access and data accuracy.**
