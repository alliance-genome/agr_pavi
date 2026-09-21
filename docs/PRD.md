# Product Requirements Document: PAVI
## Proteins Annotations and Variants Inspector

**Document Version:** 2.0
**Date:** 2025-12-31
**Status:** Active - Comprehensive Backlog Integration
**Owner:** PAVI Product Team

---

## 1. Context & Why Now

- **Research community gap**: Protein variant analysis tools lack intuitive visualization combining cross-species ortholog comparisons with variant annotations
- **Alliance infrastructure maturity**: AGR data federation now supports 7 model organisms with comprehensive variant, transcript, and protein domain data
- **Competitive positioning**: No existing public tool provides one-click alignment visualization with embedded variant sequences across species
- **Technical foundation established**: MVP successfully deployed with Clustal Omega integration and Nightingale visualization proving viability
- **Step Functions migration opportunity**: AWS Step Functions migration enables 30-40% cost reduction while improving reliability and observability

**Why This Initiative Is Critical**

1. Fills unique niche: comparative genomics with variant context that existing tools (NCBI BLAST, Ensembl) don't provide
2. Leverages Alliance's core strength: integrated cross-species data at scale
3. Enables translational research: clinicians can assess novel variant conservation without bioinformatics expertise
4. Establishes PAVI as flagship Alliance public tool, demonstrating value beyond data repository

---

## 2. Users & Jobs to Be Done (JTBD)

### Primary User: Comparative Genomics Researcher

**As a** comparative genomics researcher
**I need to** align protein sequences from orthologs and paralogs with variant annotations overlaid
**So that** I can identify functionally conserved regions, assess variant impact in evolutionary context, and prioritize candidates for functional validation

**Current Pain**: Manual alignment in desktop tools (Jalview, ClustalX), then separate variant lookup in databases, then manual cross-referencing

### Secondary User: Clinical Bioinformatician

**As a** clinical bioinformatician
**I need to** quickly determine if a novel patient variant falls in a conserved domain across species
**So that** I can prioritize variants for functional studies and assess likely pathogenicity based on evolutionary conservation

**Current Pain**: Time-consuming workflow across multiple tools (UCSC Browser, NCBI, manual alignment)

### Tertiary User: Model Organism Database Curator

**As a** MOD curator
**I need to** link gene pages to protein alignments showing variants
**So that** our users can explore comparative analysis without leaving our ecosystem

**Current Pain**: No embeddable alignment tool; users must leave site and manually construct queries

---

## 3. Business Goals & Success Metrics

### BG1: Establish PAVI as Go-To Alignment Tool for Researchers

- **Leading Indicator**: 500 unique users in first 3 months post-public-launch
- **Leading Indicator**: 50+ alignment jobs/day by month 3
- **Lagging Indicator**: 2,000+ unique users by month 6
- **Lagging Indicator**: Featured in 2+ publications by month 12

### BG2: Achieve Production-Grade Reliability and Performance

- **Leading Indicator**: 99.5% uptime SLO maintained in staging (weeks 9-11)
- **Leading Indicator**: MTTR < 4 hours for staging incidents
- **Lagging Indicator**: 99.5% uptime maintained for 6 months post-launch
- **Lagging Indicator**: Zero data loss incidents

### BG3: Reduce Infrastructure Costs by 30%

- **Leading Indicator**: Dev environment cost reduction measured by week 8
- **Leading Indicator**: Staging runs on Fargate Spot by week 9
- **Lagging Indicator**: Production monthly AWS costs ≤ $2,100 (down from $3,000)
- **Lagging Indicator**: No cost overrun incidents in first 6 months

### BG4: Enable Public Discoverability via Alliance Integration

- **Leading Indicator**: Integration links added to 5 MOD gene pages by week 14
- **Leading Indicator**: API endpoint documented by week 12
- **Lagging Indicator**: 30% of traffic from external referrals by month 6
- **Lagging Indicator**: 3+ external tools integrate PAVI API by month 12

---

## 4. Functional Requirements

### Phase 1: MVP (Current State - Mostly Complete)

**FR1: Protein Sequence Alignment**
- Acceptance Criteria:
  - Align amino acid sequences using Clustal Omega
  - Support multiple sequences in single alignment (2-50 sequences)
  - Handle sequences from any Alliance organism (7 species)
  - Display conservation coloring via Nightingale MSA viewer

**FR2: Gene and Transcript Selection**
- Acceptance Criteria:
  - Search genes by ID or symbol via Alliance API
  - Select specific transcripts per gene (multi-select UI)
  - Support cross-species selection (orthologs and paralogs)
  - Pre-populate from URL parameters (deeplink support)

**FR3: Variant Integration**
- Acceptance Criteria:
  - Select variants overlapping selected transcripts
  - Embed variant sequences into transcript protein sequences
  - Include both reference and variant sequences in alignment
  - Track variant positions in aligned coordinates

**FR4: Job Submission and Tracking**
- Acceptance Criteria:
  - Submit alignment job via web form
  - Poll job status every 2 seconds (DynamoDB)
  - Display progress timeline with 4 steps (retrieve → align → annotate → format)
  - Show estimated time remaining based on historical averages

**FR5: Interactive Results Display**
- Acceptance Criteria:
  - Nightingale MSA viewer with zoom, pan, and color schemes
  - Export alignment (FASTA, Clustal, PNG, SVG, CSV)
  - Display conservation scores per position
  - Show variant annotations on hover

### Phase 2: Enhanced Features (KANBAN-500)

**FR6: Nucleotide (Transcript) Alignment Support (KANBAN-514)**
- Acceptance Criteria:
  - UI toggle between "Protein Alignment" and "Transcript Alignment"
  - Extract exon sequences for transcript alignment (not just CDS)
  - Use MAFFT or Clustal Omega with `--seqtype=DNA` flag
  - Nucleotide-specific color scheme (A=green, T=red, G=yellow, C=blue)
  - Support incomplete ORFs with alternative codon tables (Standard, Vertebrate Mitochondrial, Yeast, etc.)
  - Validation: Submit nucleotide job, verify DNA visualization renders correctly

**FR7: Alliance Website Integration**
- Acceptance Criteria:
  - Gene pages on alliancegenome.org include "Align in PAVI" button
  - Deeplink format: `https://pavi.alliancegenome.org/submit?gene={HGNC_ID}&orthologs={ortholog_ids}`
  - Pre-population of gene and ortholog fields from URL parameters
  - Breadcrumb navigation: "← Back to AGR Gene Page"
  - Entry points: gene page orthologs section, gene page variant table, variant detail page

**FR8: Enhanced Variant Annotations**
- Acceptance Criteria:
  - Display molecular consequences (missense, nonsense, frameshift, etc.)
  - Show clinical significance (pathogenic, benign, VUS)
  - Link disease/phenotype associations (OMIM, HP terms)
  - Filter variants by consequence type, significance, or disease association
  - Tooltip shows detailed variant info on hover/click

**FR9: Protein Domain and Exon Boundary Visualization**
- Acceptance Criteria:
  - Fetch protein domain annotations from UniProt (via Alliance API)
  - Overlay domain boundaries on alignment (Nightingale track)
  - Fetch exon coordinates from transcript structure (Alliance API)
  - Map genomic exon coordinates to alignment positions
  - Display exon boundaries with visual separators or color bands

**FR10: Sequence and Variant Filtering**
- Acceptance Criteria:
  - Hide/show individual sequences in alignment display
  - Filter by species or sequence similarity threshold
  - Filter variants by molecular consequence (dropdown)
  - Filter variants by clinical significance (checkboxes)
  - Filter variants by disease/phenotype association (search)

**FR11: Usage Metrics Collection (KANBAN-623)**
- Acceptance Criteria:
  - Publish CloudWatch metrics: `JobSubmissionRate`, `JobSuccessRate`, `JobDurationMs`
  - Add `Environment` dimension to all metrics (dev, staging, prod)
  - Track business metrics: `UniqueUsers`, `SpeciesFrequency`, `AlignmentLengthDistribution`
  - Create CloudWatch dashboard with key metrics
  - Set up alerts: error rate > 1%, job failure rate > 5%, p95 latency > 1s

### Phase 3: Optimization & Quality

**FR12: Recalculate Variant Effects Based on Embedded Sequences (KANBAN-532)**
- Acceptance Criteria:
  - When variant embedded upstream causes frameshift, recalculate downstream variant effects
  - When variant embedded upstream introduces stop codon, mark downstream variants as "downstream of stop"
  - Display recalculated effect with warning badge and tooltip showing original effect
  - Handle cumulative frameshifts (multiple indels may restore reading frame)
  - Validation: Submit job with frameshift variant, verify downstream effects recalculated correctly

**FR13: Limit Allele/Transcript Selection to Compatible Combos (KANBAN-691)**
- Acceptance Criteria:
  - When alleles selected, only show transcripts overlapping those alleles
  - When transcripts selected, only show alleles overlapping those transcripts
  - Extract `consequence.transcript.id` from Alliance API `allele-variant-detail` endpoint
  - Display filter message: "Showing 3 of 8 transcripts compatible with selected alleles"
  - Provide "Show all" toggle to override filtering

**FR14: Remove Duplicate Reference Sequences (KANBAN-727)**
- Acceptance Criteria:
  - When same transcript submitted with multiple alleles, show only one reference sequence
  - Continue displaying all variant sequences (one per allele)
  - Deduplicate based on base transcript name (ignore numeric prefix like "000_")
  - Maintain proper alignment between reference and variants
  - Validation: Submit same transcript with 3 alleles, verify only 1 reference displayed

**FR15: Optimize Reference Genome File Caching (KANBAN-830)**
- Acceptance Criteria:
  - Create EFS filesystem in VPC
  - Pre-populate EFS with reference genomes (GRCh38, GRCm39, etc.) ~10 GB total
  - Mount EFS in ECS task definitions (read-only)
  - Update `seq_retrieval.py` to check local path before downloading
  - Eliminate redundant downloads (5 tasks × 2.8 GB → 1 download × 2.8 GB)
  - Validation: Monitor EFS access logs, verify no S3 downloads for cached genomes

**FR16: Optimize Intermediate Storage with Lifecycle Policies (KANBAN-831)**
- Acceptance Criteria:
  - Configure S3 lifecycle policy: delete work/ prefix after 30 days
  - Configure S3 lifecycle policy: delete logs/ prefix after 30 days
  - Keep results/ prefix for 90 days (longer retention for final outputs)
  - Transition to Standard-IA after 7 days (optional cost optimization)
  - Validation: Verify old work directories deleted after 30 days, storage costs capped

### Infrastructure & Deployment

**FR17: Deployment and Branching Strategy (KANBAN-832)**
- Acceptance Criteria:
  - **Option A (Recommended)**: Continuous deployment on single `main` branch
  - All PRs require: tests pass, type-check pass, lint pass, code review approved
  - Comprehensive unit tests (80%+ coverage), integration tests, E2E tests
  - Feature flags for incomplete features (environment variable based)
  - Quick rollback capability (git revert or redeploy previous container tag)
  - **Alternative Option B**: Add permanent `develop` branch with staging deployment
  - Validation: Deploy to dev, verify CI gates prevent broken code from merging

**FR18: Step Functions Pipeline Migration (Week 1-5)**
- Acceptance Criteria:
  - Step Functions state machine defines 4-step workflow (retrieve → align → annotate → format)
  - All transitions logged to CloudWatch with timestamps
  - Error states trigger rollback and DynamoDB failure writes
  - Migration tested with 100+ successful executions in dev environment
  - Cost per job tracked in CloudWatch metrics, verified 30% lower than baseline

**FR19: AWS Batch on Fargate Spot (Week 5)**
- Acceptance Criteria:
  - `seq_retrieval` and `alignment` components run on Batch Fargate Spot
  - Spot interruptions handled gracefully with automatic retry (max 3 attempts)
  - Fallback to On-Demand Fargate after 2 Spot failures (cost increase acceptable for < 5% of jobs)
  - Validation: Simulate Spot interruption, verify retry logic works

**FR20: DynamoDB Job Tracking (Week 2)**
- Acceptance Criteria:
  - Jobs table with partition key `job_id` (UUID) and sort key `timestamp`
  - Attributes: `status`, `user_id`, `gene_ids`, `created_at`, `updated_at`, `result_s3_path`
  - GSI on `user_id` for "My Jobs" queries
  - TTL enabled (180 days) for automatic expired job cleanup
  - All status transitions written within 500ms

**FR21: ECS Fargate API Deployment (Week 4)**
- Acceptance Criteria:
  - FastAPI application runs on Fargate with autoscaling (min 2, max 8 tasks)
  - ALB health checks pass (HTTP 200 on `/health`)
  - API latency p95 < 500ms under load (500 concurrent requests)
  - Zero downtime deployments via blue/green with ECS task replacement

**FR22: AWS Amplify Web UI Hosting (Week 3)**
- Acceptance Criteria:
  - Next.js application builds via Amplify with SSG for home/help pages
  - Environment variables (`PAVI_API_BASE_URL`) configurable per environment
  - CloudFront CDN serves static assets with cache headers
  - Deployment completes in < 10 minutes on git push to main

### User Experience & Accessibility

**FR23: Persistent Navigation (Week 2)**
- Acceptance Criteria:
  - Header includes Alliance logo, "Submit", "My Jobs", "Help", dark mode toggle
  - Footer includes links to GitHub, Documentation, Contact, AGR homepage
  - Breadcrumbs show current location (e.g., "Home > Submit > Results")
  - Mobile hamburger menu functional on <768px viewports
  - All navigation keyboard accessible (Tab, Enter, Escape)

**FR24: Home Page with Onboarding (Week 3)**
- Acceptance Criteria:
  - Headline: "Align and visualize protein sequences with genomic variants"
  - Three-step quick start guide with icons (Select Genes → Submit → View Results)
  - "Try an example" button pre-populates form with demo data (human BRCA1 orthologs)
  - Recent jobs list (if user has history) with "Resume" links
  - Page loads in < 1 second (LCP < 1s)

**FR25: Redesigned Submit Form with Progressive Disclosure (Week 6)**
- Acceptance Criteria:
  - Form introduction panel explains purpose and links to documentation
  - Help tooltips (?) next to each field label with examples
  - Real-time validation with green checkmark or inline error (< 500ms delay on blur)
  - "Try an example" populates with 3 species × 1 transcript × 2 alleles
  - Form state persists to localStorage (recoverable after accidental navigation)
  - Multi-select UI shows count badge: "3 of 8 transcripts selected"

**FR26: Design System with WCAG AA Compliance (Week 3)**
- Acceptance Criteria:
  - CSS custom properties for spacing (4px base), typography, colors
  - Color contrast ≥ 4.5:1 for all text/background pairs (verified with axe)
  - Alliance blue (#2196F3) as primary brand color
  - Semantic colors for success/warning/error with both color and icon indicators
  - Design tokens documented in Storybook or design doc

**FR27: "My Jobs" Page with History Management (Week 8)**
- Acceptance Criteria:
  - Table view with sortable columns (Date, Status, Genes, Duration)
  - Filterable by status (Completed, Failed, Running, Pending)
  - Search by gene name or job ID (client-side filter)
  - Quick actions: "View Results", "Resubmit", "Delete"
  - Pagination for > 50 jobs
  - Job history persists in localStorage + DynamoDB (if user has session ID)

**FR28: Real-Time Progress Tracking (Week 6)**
- Acceptance Criteria:
  - Progress timeline shows 4 steps with completion checkmarks
  - Current step highlighted with spinner and label (e.g., "Step 2: Aligning sequences")
  - Estimated time remaining based on historical average (displayed if > 10s remaining)
  - DynamoDB polling interval: 2 seconds (reduced from 10 seconds)
  - Browser notification permission requested on first job submission
  - Push notification on job completion (if permission granted)

**FR29: Enhanced Results Display (Week 8)**
- Acceptance Criteria:
  - Summary card shows: # sequences aligned, alignment length, # variants, processing time
  - Visualization mode selector as prominent tabs (Interactive | Text | Legacy)
  - Toolbar with: zoom controls, export dropdown, fullscreen button, color scheme selector
  - Position info panel shows residue conservation and variant details on click
  - Export formats: FASTA, Clustal, PNG, SVG, CSV (data table)
  - Failure display uses accordion with severity badges (Error | Warning | Info)

**FR30: Frontend Performance Optimization (Week 3, 11)**
- Acceptance Criteria:
  - React Virtuoso used for sequence list (only renders visible rows)
  - Nightingale MSA lazy-loaded (code-split, loaded on "Interactive" tab select)
  - Skeleton screens shown during all loading states (form fields, job progress, results)
  - Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1 (measured via Lighthouse CI)
  - 500 sequences render at 60 FPS (verified via Chrome DevTools Performance)

**FR31: WCAG 2.1 AA Accessibility Compliance (Week 10)**
- Acceptance Criteria:
  - Skip links: "Skip to main content", "Skip to results"
  - All interactive elements keyboard operable (Tab order logical, focus visible)
  - ARIA landmarks (main, nav, contentinfo) and live regions for dynamic content
  - Screen reader testing passes with NVDA (Windows) and VoiceOver (macOS)
  - Zero critical/serious violations in automated axe audit
  - All form fields have associated labels (aria-label or <label>)
  - Color not sole indicator (icons + labels used for success/error states)

**FR32: Comprehensive Help System (Week 9)**
- Acceptance Criteria:
  - Searchable help center at `/help` with categorized articles
  - FAQ section with 10+ common questions answered
  - Guided tour on first visit (Shepherd.js) with "Skip tour" option
  - Inline tooltips link to relevant help articles
  - Error messages include "Learn more" links to troubleshooting docs
  - Feedback widget on every page ("Was this helpful?")

**FR33: Mobile Optimization (Week 11)**
- Acceptance Criteria:
  - Submit form usable on 375px viewport (iPhone SE)
  - Results viewer provides simplified mobile view (vertical scroll, no pinch-zoom)
  - Touch targets ≥ 44×44px for all interactive elements
  - Mobile navigation tested on iOS Safari and Chrome Android
  - Alignment visualization shows warning on mobile: "Best viewed on desktop"

---

## 5. Non-Functional Requirements

### Performance

**NFR1: API Response Time**
- p50 < 200ms, p95 < 500ms, p99 < 1000ms (measured at ALB)
- Load testing with 500 concurrent users sustained for 5 minutes

**NFR2: Pipeline Execution Time**
- Median job time < 90 seconds for 5 sequences × 300 AA alignment
- 95th percentile < 3 minutes for 20 sequences × 500 AA alignment
- No regression vs. current Nextflow baseline (measured with same test fixtures)

**NFR3: Frontend Performance**
- Lighthouse Performance score ≥ 90 on desktop, ≥ 80 on mobile (3G throttled)
- First Contentful Paint (FCP) < 1.5s
- Time to Interactive (TTI) < 3.5s
- Total bundle size < 500KB (gzipped, measured with webpack-bundle-analyzer)

### Scale

**NFR4: Concurrent User Capacity**
- Support 200 concurrent users without degradation (API autoscaling tested)
- Queue up to 1,000 jobs simultaneously in AWS Batch (Fargate Spot capacity)

**NFR5: Data Volume Limits**
- Maximum 50 sequences per alignment job
- Maximum 2,000 amino acids per sequence
- Maximum 500 variants per sequence
- Frontend pagination for job history > 1,000 jobs

### SLOs/SLAs

**NFR6: Availability**
- 99.5% uptime monthly (measured via CloudWatch Synthetics canaries)
- Max 3.6 hours downtime per month tolerated
- Maintenance windows: Sundays 02:00-04:00 UTC (announced 48h prior)

**NFR7: Error Budget**
- 5xx error rate < 0.5% of total requests
- Job failure rate < 2% (excluding user input errors)
- Data loss incidents: zero tolerance (RTO=4h, RPO=1h)

### Privacy

**NFR8: Data Retention & Anonymity**
- Job results retained 180 days (enforced via DynamoDB TTL)
- No PII collected (no email, no login required)
- Session IDs (UUIDs) not linkable to individuals
- User IP addresses not logged (CloudFront logs disabled)

**NFR9: Data Access Controls**
- Job results accessible only via job ID (UUID v4, 128-bit entropy)
- No job listing/enumeration endpoint (prevents job discovery)
- S3 bucket policies enforce authenticated access (signed URLs for downloads)

### Security

**NFR10: Authentication & Authorization**
- API endpoints behind API Gateway with rate limiting (10 req/min per IP for submit)
- DDoS protection via AWS Shield Standard (included with CloudFront)
- No API keys required for public access (anonymous usage model)

**NFR11: Input Validation**
- Gene IDs validated against AGR API (prevents injection via malformed IDs)
- File uploads rejected (all data retrieved from AGR/MOD APIs)
- SQL injection not applicable (DynamoDB NoSQL, parameterized queries)
- XSS prevention via React escaping (no `dangerouslySetInnerHTML` except sanitized)

**NFR12: Secrets Management**
- API keys stored in AWS Secrets Manager (e.g., AGR API key)
- Environment variables injected at runtime (not hardcoded in images)
- Container images scanned for vulnerabilities (Trivy on build, block on HIGH/CRITICAL)

### Observability

**NFR13: Logging**
- Structured JSON logs to CloudWatch (API: FastAPI uvicorn, Pipeline: Step Functions)
- Log retention: 30 days (API), 90 days (Pipeline execution history)
- Error logs include: `job_id`, `error_code`, `stack_trace`, `input_params`

**NFR14: Metrics**
- CloudWatch custom metrics: `JobSubmissionRate`, `JobSuccessRate`, `JobDurationMs`
- Business metrics: `UniqueUsers`, `AlignmentLengthDistribution`, `SpeciesFrequency`
- Cost metrics: `BatchCostPerJob`, `S3StorageCost`, `DataTransferCost`

**NFR15: Alerting**
- PagerDuty integration for P0/P1 incidents (API down, database unavailable)
- Slack notifications for P2/P3 (elevated error rate, cost anomalies)
- Alerts triggered on: error rate > 1%, p95 latency > 1s, job failure rate > 5%

**NFR16: Tracing**
- AWS X-Ray enabled on API (trace job lifecycle: submit → Step Functions → Batch → DynamoDB)
- Trace sampling: 100% for errors, 5% for successful requests

---

## 6. Scope Definition

### In Scope - Phase 1 (MVP - Current State)

**Core Features**
- Protein sequence alignment (Clustal Omega)
- Gene/transcript/variant selection
- Cross-species ortholog and paralog support
- Job submission and progress tracking
- Interactive results visualization (Nightingale)
- Export in multiple formats (FASTA, Clustal, PNG, SVG)

**Infrastructure**
- Nextflow pipeline on ECS (current state)
- FastAPI backend on ECS
- Next.js frontend (manual deployment)
- S3 result storage
- Basic CloudWatch logging

### In Scope - Phase 2 (Enhanced Features)

**Features**
- Nucleotide (transcript) alignment support (KANBAN-514)
- Incomplete ORF translation with alternative codon tables
- Alliance website integration via deeplinks
- Enhanced variant annotations (molecular consequences, clinical significance, disease associations)
- Protein domain and exon boundary visualization
- Sequence and variant filtering
- Usage metrics collection (KANBAN-623)
- Recalculated variant effects for embedded sequences (KANBAN-532)
- Filter allele/transcript combos to compatible pairs (KANBAN-691)
- Remove duplicate reference sequences (KANBAN-727)

**Infrastructure**
- Step Functions pipeline migration
- AWS Batch on Fargate Spot
- DynamoDB job tracking
- ECS Fargate API deployment
- AWS Amplify Web UI hosting
- Reference genome file caching via EFS (KANBAN-830)
- S3 lifecycle policies for intermediate storage (KANBAN-831)

**UX Improvements**
- Home page with onboarding
- Progressive disclosure submit form
- "My Jobs" page with history
- Real-time progress tracking with notifications
- Enhanced results display
- Comprehensive help system
- WCAG 2.1 AA accessibility compliance
- Mobile optimization

**Operational**
- CloudWatch dashboards and alarms
- Deployment and branching strategy (KANBAN-832)
- Security code audit
- Performance benchmarking
- Runbooks for incident response

### Out of Scope (Deferred to Phase 3+)

**Authentication & Collaboration**
- User accounts and login
- Persistent job history in database (localStorage only for Phase 1-2)
- Job sharing with colleagues (read-only links)
- Comments/annotations on alignments

**Advanced Features**
- Phylogenetic tree visualization
- Custom alignment parameters (gap penalties, substitution matrices)
- Batch job submission via CSV upload
- Public API for programmatic access
- Comparison view (side-by-side alignments)

**Integrations**
- Webhook notifications for job completion
- Email alerts for long-running jobs
- Integration with external tools (BLAST, InterPro, AlphaFold)

**Infrastructure**
- Multi-region deployment (US-East-1 only initially)
- WebSocket real-time updates (polling acceptable initially)
- Advanced caching strategies (CloudFront basic caching sufficient)

### Future Considerations (2026+)

**User Features**
- User authentication via ORCID or institutional SSO
- Database-backed job history (replace localStorage)
- Collaborative workspaces with shared alignments
- Publication-ready figure generation with citation management

**Technical Enhancements**
- Machine learning for variant pathogenicity prediction
- 3D protein structure overlay (AlphaFold integration)
- Integration marketplace (BLAST, InterPro, PDB)
- Multi-region deployment for global low-latency access
- Enterprise features: SSO, audit logs, custom resource allocation

---

## 7. Rollout Plan

### Phase 1: MVP Completion (Weeks 1-4)

**Week 1-2: Infrastructure POC**
- Deploy Step Functions POC in dev environment
- Create DynamoDB jobs table with GSI
- Wire FastAPI to Step Functions
- **Gate 1**: E2E test passes (API → Step Functions → Batch → DynamoDB)

**Week 3-4: Pipeline Migration**
- Migrate `seq_retrieval` to Batch Fargate Spot
- Migrate `alignment` to Batch Fargate Spot
- Implement Spot retry logic (max 3 attempts)
- **Gate 2**: 100% pipeline success rate across 10 test runs

### Phase 2: UX Enhancement (Weeks 5-8)

**Week 5-6: Core UX**
- Redesign submit form with progressive disclosure
- Create "My Jobs" page with history
- Implement real-time progress tracking
- **Gate 3**: Form completion rate > 90% in user testing

**Week 7-8: Accessibility & Help**
- Implement WCAG 2.1 AA compliance
- Create comprehensive help system
- Mobile optimization
- **Gate 4**: Zero critical/serious axe violations

### Phase 3: Feature Enhancements (Weeks 9-12)

**Week 9-10: Nucleotide Alignment & Domains**
- Implement transcript alignment support (KANBAN-514)
- Add protein domain visualization
- Add exon boundary display
- **Gate 5**: Nucleotide alignment end-to-end test passes

**Week 11-12: Variant Enhancements**
- Recalculate variant effects (KANBAN-532)
- Filter allele/transcript combos (KANBAN-691)
- Enhanced variant annotations (consequences, clinical significance)
- **Gate 6**: Variant effect recalculation unit tests pass

### Phase 4: Optimization (Weeks 13-14)

**Week 13: Storage Optimization**
- Reference genome caching via EFS (KANBAN-830)
- S3 lifecycle policies (KANBAN-831)
- Remove duplicate reference sequences (KANBAN-727)
- **Gate 7**: Storage costs reduced by 30%

**Week 14: Metrics & Monitoring**
- CloudWatch metrics collection (KANBAN-623)
- Create monitoring dashboards
- Set up alerting (PagerDuty, Slack)
- **Gate 8**: All metrics publishing correctly

### Phase 5: Public Launch Preparation (Weeks 15-16)

**Week 15: Alliance Integration**
- Add "Align in PAVI" links to AGR gene pages
- Test deeplink pre-population
- Final E2E and performance regression testing
- **Gate 9**: All integration tests pass

**Week 16: Production Deployment**
- Deploy production CDK stacks
- Canary rollout (10% → 25% → 50% → 100% traffic over 5 days)
- Public announcement (blog, social media, mailing list)
- **Gate 10**: 100% traffic, zero critical incidents, SLOs maintained

### Rollback Criteria

**Rollback Triggers** (any triggers immediate revert):
- Error rate > 1% sustained for > 30 minutes
- p95 latency > 1s sustained for > 30 minutes
- Job failure rate > 5% over any 1-hour period
- Data corruption detected (alignment results incorrect)

**Rollback Procedure**:
1. Route 53 DNS revert to previous environment (< 5 minutes)
2. CloudFront cache invalidation
3. Monitor metrics for stabilization
4. Root cause analysis and fix before retry

---

## 8. Dependencies & Risks

### Critical Dependencies

**TD1: AGR API Availability (CRITICAL)**
- **Dependency**: Gene, transcript, and allele data retrieval via AGR API
- **Risk**: API downtime or schema changes break PAVI data retrieval
- **Mitigation**: Implement circuit breaker pattern with fallback to cached data; coordinate schema changes with AGR platform team
- **Owner**: AGR Platform Team (notify 2 weeks prior to schema changes)

**TD2: MOD API Stability (HIGH)**
- **Dependency**: Source transcript sequences from model organism databases
- **Risk**: MOD APIs have inconsistent availability or rate limiting
- **Mitigation**: Retry logic with exponential backoff; cache transcript data in S3 for 30 days
- **Owner**: PAVI Team (build resilient clients)

**TD3: AWS Batch Quota Limits (MEDIUM)**
- **Dependency**: AWS account quotas for Fargate Spot vCPUs (default: 256 vCPUs)
- **Risk**: Quota exhaustion during high load prevents job execution
- **Mitigation**: Request quota increase to 1,024 vCPUs before Week 8; CloudWatch alarm at 70% usage
- **Owner**: PAVI Team (submit AWS support ticket)

**TD4: Alliance Infrastructure (CRITICAL)**
- **Dependency**: AWS Organization access for production deployment
- **Risk**: IAM permission issues or VPC configuration delays deployment
- **Mitigation**: Request production AWS account access by Week 1; validate CDK deployment in dev account first
- **Owner**: Alliance DevOps Team (provision accounts by Week 8)

### Technical Risks

**TR1: Fargate Spot Interruptions Exceed Retry Budget (HIGH)**
- **Probability**: 30%
- **Impact**: User-facing job failures, degraded experience
- **Mitigation**: Checkpoint/resume logic in alignment step; fallback to On-Demand Fargate after 2 Spot failures
- **Owner**: PAVI Team (implement by Week 5)

**TR2: DynamoDB Hot Partition on `job_id` PK (MEDIUM)**
- **Probability**: 20%
- **Impact**: Slow `/status` API responses during peak usage
- **Mitigation**: Use DynamoDB on-demand mode (auto-scales); client-side caching (2s); add DAX cluster if latency exceeds SLO
- **Owner**: PAVI Team (monitor read capacity Week 15+)

**TR3: Nightingale MSA Rendering Breaks on Edge Cases (MEDIUM)**
- **Probability**: 25%
- **Impact**: White screen on results page, user cannot view alignment
- **Mitigation**: Error boundary in React (fallback to text view); client-side validation (block > 50 sequences); contribute fixes to Nightingale upstream
- **Owner**: PAVI Team (implement error boundary by Week 8)

**TR4: S3 Result Storage Costs Exceed Budget (LOW)**
- **Probability**: 15%
- **Impact**: Budget overrun, need to reduce retention period
- **Mitigation**: Enable S3 Intelligent-Tiering; reduce TTL to 90 days if costs exceed $400/month; implement gzip compression
- **Owner**: PAVI Team (monitor S3 costs weekly)

### User Experience Risks

**TR5: Users Overwhelmed by Form Complexity (MEDIUM)**
- **Probability**: 30%
- **Impact**: Low completion rate, high bounce rate on submit page
- **Mitigation**: User testing with 5 non-expert users (Week 6); simplify to "Quick Mode" vs "Advanced Mode" if testing fails; add video tutorial
- **Owner**: PAVI Team + UX Consultant (testing Week 6)

**TR6: Mobile Users Frustrated by Limited Functionality (MEDIUM)**
- **Probability**: 25%
- **Impact**: Negative reviews, accessibility complaints
- **Mitigation**: Display prominent message: "For best experience, view results on desktop"; provide simplified mobile view; add "Email me results" option (deferred)
- **Owner**: PAVI Team (implement messaging Week 11)

### Timeline Risks

**TR7: Integration Testing Surfaces Late-Stage Bugs (HIGH)**
- **Probability**: 50%
- **Impact**: 1-2 week delay, missed launch window
- **Mitigation**: Run Cypress tests continuously from Week 4; implement smoke tests in dev environment; add 1-week buffer in schedule
- **Owner**: PAVI Team (implement continuous testing)

**TR8: Security Audit Identifies Critical Issues (MEDIUM)**
- **Probability**: 25%
- **Impact**: Launch delay, emergency patching
- **Mitigation**: Run Trivy scans in CI starting Week 1; schedule external security audit for Week 10 (not Week 13); prioritize security fixes (P0)
- **Owner**: PAVI Team + Security Consultant (schedule audit Week 1)

---

## 9. Release Criteria

### Launch Readiness Checklist

**Infrastructure**
- [ ] Production CDK stacks deployed (Step Functions, Batch, DynamoDB, ECS, Amplify)
- [ ] Route 53 DNS configured: `pavi.alliancegenome.org`
- [ ] CloudWatch dashboards operational
- [ ] PagerDuty integration tested
- [ ] AWS Budget alerts configured ($2,500/month threshold)

**Application**
- [ ] API deployed to ECS Fargate (min 2 tasks, autoscaling to 8)
- [ ] WebUI deployed to Amplify (production branch: `main`)
- [ ] Step Functions executing successfully (10+ test runs)
- [ ] AWS Batch compute environments operational
- [ ] DynamoDB jobs table created with TTL (180 days)
- [ ] S3 buckets configured (Intelligent-Tiering enabled)

**Testing**
- [ ] All Cypress E2E tests pass (100% pass rate)
- [ ] Load testing complete: 500 concurrent users, p95 < 500ms
- [ ] Security audit complete: zero HIGH/CRITICAL issues
- [ ] Accessibility audit complete: zero critical/serious axe violations
- [ ] Performance benchmarks meet targets: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Mobile testing complete: iOS Safari, Chrome Android functional

**Operational**
- [ ] Runbook created (10+ incident scenarios documented)
- [ ] On-call rotation established (2 team members)
- [ ] Rollback procedure tested (Route 53 revert, 100% → 0% traffic)
- [ ] Monitoring dashboards reviewed (team walkthrough complete)
- [ ] Backup/restore procedure tested (S3, DynamoDB point-in-time recovery)

**Documentation**
- [ ] README updated with production deployment instructions
- [ ] Help center published with 10+ articles (FAQ, troubleshooting)
- [ ] API documentation published (Swagger/OpenAPI spec)
- [ ] Keyboard shortcuts documented in help center
- [ ] Accessibility statement published (`/accessibility`)
- [ ] Architecture Decision Records (ADRs) written (5+ key decisions)

**Compliance**
- [ ] WCAG 2.1 AA compliance verified (axe audit, screen reader testing)
- [ ] Data retention policy documented (180 days, DynamoDB TTL)
- [ ] Privacy policy updated (anonymous usage, no PII collection)
- [ ] Security headers enforced (CSP, HSTS, X-Frame-Options)
- [ ] Rate limiting implemented (10 jobs/hour per session ID)
- [ ] AWS Config rules enabled (S3 encryption, public access blocked)

**Integration**
- [ ] AGR gene pages include "View Protein Alignment" links (5 MODs minimum)
- [ ] Deeplink pre-population tested (HGNC ID → form field)
- [ ] Breadcrumb navigation functional ("← Back to AGR Gene Page")
- [ ] AGR frontend team coordination complete (deployment confirmed)

**Communication**
- [ ] Launch announcement blog post drafted
- [ ] Social media posts prepared (Twitter, LinkedIn)
- [ ] AGR mailing list notification scheduled
- [ ] MOD coordinators notified (email with integration instructions)
- [ ] User feedback widget operational

**Cost**
- [ ] Staging costs analyzed (verify 30% reduction vs baseline)
- [ ] Production cost projections reviewed ($2,100/month target)
- [ ] Cost allocation tags applied (all resources tagged)
- [ ] Weekly cost review scheduled (team lead)

### Success Metrics (3 Months Post-Launch)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Unique Users** | 500+ | Google Analytics (privacy-respecting) |
| **Daily Active Jobs** | 50+ | CloudWatch custom metric |
| **Infrastructure Cost** | ≤ $2,100/month | AWS Cost Explorer |
| **API p95 Latency** | < 500ms | CloudWatch Metrics (ALB) |
| **Frontend LCP** | < 2.5s | Lighthouse CI |
| **Job Success Rate** | ≥ 98% | DynamoDB job table query |
| **Form Completion Rate** | ≥ 90% | Amplitude or Plausible events |
| **Uptime (SLO)** | 99.5% | CloudWatch Synthetics |

---

## Appendix A: Technical Architecture

### Current Architecture (Pre-Migration)

```
User Browser → Next.js WebUI (EC2/Manual) → ALB → FastAPI (ECS)
    ↓
FastAPI → Nextflow (ECS) → seq_retrieval (ECS) → S3
                         → alignment (ECS) → S3
```

**Issues**:
- Nextflow not designed for long-running orchestration on ECS
- No job state persistence (in-memory only)
- Manual WebUI deployment
- No autoscaling

### Target Architecture (Post-Migration)

```
User Browser → CloudFront → Amplify (Next.js) → API Gateway → ALB → FastAPI (ECS Fargate x2-8)
    ↓
FastAPI → Step Functions → seq_retrieval (Batch Fargate Spot) → S3
                        → alignment (Batch Fargate Spot) → S3
                        → DynamoDB (job state)
    ↓
CloudWatch ← Step Functions, API, Batch (logs, metrics, traces)
```

**Improvements**:
- Step Functions replaces Nextflow (managed orchestration)
- DynamoDB persists job state (survives API restarts)
- Amplify automates WebUI deployment
- ECS Fargate autoscales API (2-8 tasks based on load)
- Batch Fargate Spot reduces compute costs by ~30%
- CloudFront CDN improves global performance

---

## Appendix B: Backlog Ticket Mapping

| Epic/Ticket | Description | Phase | Status |
|-------------|-------------|-------|--------|
| **KANBAN-432** | Master Epic - PAVI Transcript/Protein Alignment Tool | All | Ongoing |
| **KANBAN-498** | Phase 1 MVP | Phase 1 | In Progress |
| **KANBAN-500** | Phase 2 - Enhanced Features | Phase 2 | Backlog |
| **KANBAN-514** | Nucleotide (Transcript) Alignment Support | Phase 2 | Backlog |
| **KANBAN-532** | Recalculate Variant Effects for Embedded Sequences | Phase 2 | Backlog |
| **KANBAN-623** | CloudWatch Environment Metrics | Phase 4 | Backlog |
| **KANBAN-691** | Limit Allele/Transcript Combos to Compatible Pairs | Phase 2 | Backlog |
| **KANBAN-727** | Remove Duplicate Reference Sequences | Phase 3 | Backlog |
| **KANBAN-830** | Optimize Reference Genome Download/Storage (EFS) | Phase 4 | Backlog |
| **KANBAN-831** | Optimize Intermediate Storage (S3 Lifecycle) | Phase 4 | Backlog |
| **KANBAN-832** | Deployment and Branching Strategy | Phase 1 | Backlog |

---

## Appendix C: Open Questions

**Q1: Should we implement result caching at API or CDN level?**
- **Recommendation**: No caching initially (Option C), add post-launch if usage data shows benefit
- **Decision Needed By**: Week 4
- **Owner**: PAVI Tech Lead

**Q2: How long should job results persist in S3?**
- **Recommendation**: Match DynamoDB TTL (180 days) for consistency
- **Decision Needed By**: Week 2
- **Owner**: PAVI Tech Lead

**Q3: Should we support user accounts at launch or defer?**
- **Recommendation**: Anonymous-only for launch (Option B), add accounts in Phase 3
- **Status**: DECIDED - Option B
- **Owner**: Product Manager

**Q4: What should "Quick Mode" vs "Advanced Mode" entail?**
- **Recommendation**: Decide based on user testing completion rates (Week 6)
- **Decision Needed By**: Week 6
- **Owner**: PAVI UX Designer + Product Manager

**Q5: What SLO should we commit to post-launch?**
- **Recommendation**: 99.5% uptime (standard for bioinformatics tools)
- **Decision Needed By**: Week 8
- **Owner**: PAVI Product Manager + Alliance Leadership

**Q6: Should we enable AWS X-Ray tracing in production?**
- **Recommendation**: 5% sampling (Option A) sufficient for debugging
- **Decision Needed By**: Week 12
- **Owner**: PAVI Tech Lead

**Q7: What rate limiting policy should we enforce?**
- **Recommendation**: 10 jobs/hour per session ID initially, adjust based on usage patterns Week 17+
- **Decision Needed By**: Week 13
- **Owner**: PAVI Product Manager

---

**Document Changelog**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-23 | Product Team | Initial unified PRD from public launch document |
| 2.0 | 2025-12-31 | Product Team | Comprehensive backlog integration (KANBAN-432, 498, 500, 514, 532, 623, 691, 727, 830, 831, 832) |

---

**End of Product Requirements Document**
