# Product Requirements Document: AGR PAVI Technology Stack Overhaul

**Document Version:** 1.0
**Date:** 2025-12-17
**Product:** Alliance of Genome Resources - Proteins Annotations and Variants Inspector (AGR PAVI)
**Author:** Product Management

---

## 1. Context & Why Now

- **Technology-Goal Mismatch Crisis:** Current stakeholder analysis indicates fundamental concerns that the existing technology stack (Next.js/React frontend, FastAPI backend, Nextflow pipeline) does not align with what PAVI is trying to achieve across all architectural layers.

- **Bioinformatics Ecosystem Evolution:** The bioinformatics workflow management landscape has consolidated significantly in 2025, with [Nextflow adoption growing to 43% citation share](https://link.springer.com/article/10.1186/s13059-025-03673-9) while [Snakemake declined from 27% to 17% usage](https://sagc-bioinformatics.github.io/nextflow-vs-snakemake-2025/snakemake/), indicating clear industry direction that must inform technology decisions.

- **Performance Requirements at Scale:** As AGR data volume increases, the current monorepo architecture faces scalability challenges in handling large-scale batch processing while maintaining interactive visualization performance, particularly given [React's documented performance issues with large bioinformatics datasets](https://www.syncfusion.com/blogs/post/render-large-datasets-in-react).

- **Maintainability and Developer Experience:** The current multi-language, multi-framework stack (TypeScript/React, Python/FastAPI, Groovy/Nextflow, AWS CDK Python) creates cognitive overhead and recruitment challenges for a specialized bioinformatics development team.

- **Cloud Cost Optimization:** AWS infrastructure costs for Elastic Beanstalk, ECS managed environments, and Nextflow AWS Batch orchestration warrant evaluation against more modern serverless and container-native alternatives that could reduce operational overhead by 30-50%.

---

## 2. Users & Jobs to Be Done (JTBD)

### Primary Users

**Bioinformatics Researchers**
- As a bioinformatics researcher, I need to interactively explore protein variants and their structural annotations so that I can identify functionally significant mutations.
- As a researcher, I need to batch process multiple protein sequences through alignment pipelines so that I can conduct comparative genomics analysis at scale.
- As a non-programmer researcher, I need an intuitive visualization interface so that I can interpret complex protein data without writing code.

**Computational Biologists**
- As a computational biologist, I need to integrate PAVI data with external tools via API so that I can incorporate protein analysis into larger bioinformatics workflows.
- As a computational biologist, I need reproducible pipeline results so that my research findings can be validated and published.

### Secondary Users

**AGR Developers/Maintainers**
- As an AGR developer, I need a maintainable technology stack so that I can add features and fix bugs efficiently.
- As a developer, I need clear separation between interactive and batch workloads so that I can optimize each independently.
- As a DevOps engineer, I need infrastructure-as-code that deploys reliably so that I can maintain high availability with minimal manual intervention.

**External Tool Developers**
- As an external tool developer, I need stable API contracts so that I can build integrations that won't break with PAVI updates.
- As a tool developer, I need comprehensive API documentation so that I can understand how to consume PAVI data programmatically.

---

## 3. Business Goals & Success Metrics

### Business Goals

1. **Achieve technology-goal alignment** by selecting technologies that directly support interactive visualization AND batch processing workloads.
2. **Reduce infrastructure costs by 30%** through optimized cloud resource utilization and elimination of over-provisioned services.
3. **Improve developer velocity by 40%** through simplified technology stack and improved developer experience.
4. **Maintain 99.5% uptime** for interactive features while supporting unlimited scale for batch processing.
5. **Enable future extensibility** for new data types (e.g., protein-protein interactions, structural predictions) without architectural refactoring.

### Success Metrics

#### Leading Indicators (Early Signals)
- Developer onboarding time reduced from 2 weeks to 3 days
- Pipeline execution time for standard workflows reduced by 25%
- Infrastructure provisioning time reduced from 20 minutes to <5 minutes
- Code complexity metrics (cyclomatic complexity) reduced by 30%
- Test execution time reduced by 50%

#### Lagging Indicators (Ultimate Success)
- Monthly AWS infrastructure costs reduced from baseline by 30% within 6 months of deployment
- Developer feature delivery velocity increased by 40% (measured in story points/sprint) within 3 months
- User-reported performance issues reduced by 60% within first quarter post-launch
- API consumer satisfaction score (via surveys) increased to 4.5/5.0 within 6 months
- Zero architecture-driven outages in first year post-overhaul

---

## 4. Functional Requirements

### FR1: Frontend Technology Selection
**Requirement:** Replace or retain Next.js/React frontend based on analysis of interactive visualization requirements vs. framework capabilities.

**Acceptance Criteria:**
- Selected technology must support rendering of Nightingale protein visualization components (Web Components based)
- Must handle visualization of alignments with 100+ sequences without frame drops (<60 FPS)
- Must support server-side rendering for SEO and initial load performance
- Must provide type safety through TypeScript or equivalent
- Must support virtualization for large datasets (1000+ protein variants)

### FR2: Backend API Technology Selection
**Requirement:** Evaluate and potentially replace FastAPI backend to better align with job orchestration requirements.

**Acceptance Criteria:**
- Must support async I/O for external data source integrations (UniProt, Ensembl, Alliance APIs)
- Must handle 1000+ concurrent job submission requests without degradation
- Must provide automatic API documentation (OpenAPI/Swagger)
- Must support WebSocket connections for real-time job status updates
- Must achieve <100ms response time for status check endpoints (p95)

### FR3: Pipeline Orchestration Technology Selection
**Requirement:** Evaluate Nextflow vs. alternatives (AWS Step Functions, Snakemake, native AWS orchestration) for bioinformatics pipeline execution.

**Acceptance Criteria:**
- Must support DAG-based workflow definition with conditional logic
- Must integrate natively with AWS Batch or equivalent compute service
- Must provide job-level retry and error handling
- Must support workflow versioning and reproducibility
- Must scale from 1 to 1000+ concurrent pipeline executions
- Must provide execution logs and monitoring integrated with CloudWatch or equivalent

### FR4: Data Storage Architecture
**Requirement:** Define optimal storage strategy for transient pipeline outputs, result caching, and metadata persistence.

**Acceptance Criteria:**
- Pipeline input/output artifacts stored in S3 with lifecycle policies (30-day retention for intermediate files)
- Job metadata stored in database with <50ms query latency (p95)
- Result caching mechanism reduces redundant pipeline executions by 40%
- Storage costs scale linearly with usage (no over-provisioned capacity)

### FR5: Interactive vs. Batch Workload Separation
**Requirement:** Architecturally separate interactive user-facing components from batch processing components.

**Acceptance Criteria:**
- Frontend can be scaled independently from pipeline execution capacity
- API backend can handle user requests even when batch processing is at maximum capacity
- Pipeline failures do not impact interactive user experience
- Clear cost attribution between interactive (always-on) and batch (on-demand) components

### FR6: Migration Path & Backward Compatibility
**Requirement:** Define phased migration strategy that maintains service availability during transition.

**Acceptance Criteria:**
- Zero-downtime migration plan with rollback capability at each phase
- Existing API contracts maintained or versioned (v1 deprecated, v2 introduced)
- Existing result URLs remain accessible for 12 months post-migration
- Data export capability for users to retrieve historical results before deprecation

### FR7: Developer Experience & Maintainability
**Requirement:** Optimize technology stack for developer productivity and long-term maintainability.

**Acceptance Criteria:**
- Maximum of 2 primary programming languages (e.g., TypeScript + Python OR Python + Rust)
- All services support local development without AWS credentials (using LocalStack or mocks)
- CI/CD pipeline completes in <10 minutes for standard PRs
- Comprehensive typing coverage (>90% in TypeScript, type hints in Python)
- Documentation covers architecture decisions and technology trade-offs

---

## 5. Non-Functional Requirements

### Performance
- **Frontend:** Initial page load <2 seconds, interactive visualization initialization <1 second
- **API:** p50 response time <100ms, p95 <500ms, p99 <1s for read operations
- **Pipeline:** Sequence retrieval + alignment for 10 sequences completes in <5 minutes
- **Database:** Query latency p95 <50ms, p99 <200ms

### Scale
- **Concurrent Users:** Support 500 concurrent interactive users without degradation
- **Pipeline Throughput:** Support 10,000 pipeline job submissions per day
- **Data Volume:** Handle protein sequences up to 100KB, alignment visualizations up to 1000 sequences
- **Storage Growth:** Accommodate 1TB/month data growth with automatic lifecycle management

### SLOs/SLAs
- **Availability:** 99.5% uptime for interactive components (max 3.6 hours downtime/month)
- **Pipeline SLA:** 95% of pipelines complete within 2x expected runtime
- **API Error Rate:** <0.5% error rate for non-client-caused errors
- **Data Durability:** 99.999999999% durability for stored results (S3 standard)

### Privacy
- **Data Retention:** Pipeline execution logs retained for 90 days, results retained for 1 year
- **PII Handling:** No personally identifiable information collected or stored
- **Data Isolation:** User job submissions isolated (no cross-user data leakage)
- **Compliance:** GDPR-compliant data handling (EU users can request data deletion)

### Security
- **Authentication:** Support OAuth 2.0 / OIDC for API access (optional for public features)
- **Authorization:** Role-based access control (RBAC) for administrative functions
- **Encryption:** TLS 1.3 for data in transit, AES-256 for data at rest in S3
- **Secrets Management:** AWS Secrets Manager for credentials, no secrets in code/config
- **Vulnerability Management:** Automated dependency scanning, critical CVEs patched within 48 hours

### Observability
- **Logging:** Structured JSON logs with correlation IDs across all services
- **Metrics:** CloudWatch metrics for all services (requests/sec, error rates, latency percentiles)
- **Tracing:** Distributed tracing for request flows across API → Pipeline → Storage
- **Alerting:** PagerDuty integration for critical errors (error rate >2%, latency >2s, availability <99%)
- **Dashboards:** Real-time operational dashboards for SRE team (Grafana or CloudWatch)

---

## 6. Scope Definition

### In Scope

- **Technology Stack Evaluation:** Comprehensive analysis of frontend, backend, and pipeline technologies
- **Gap Analysis:** Detailed assessment of current technology limitations vs. product goals
- **Alternative Technology Proposals:** 3-5 alternative architectures with trade-off analysis
- **Cost Modeling:** Projected infrastructure costs for each proposed architecture
- **Migration Strategy:** Phased rollout plan with risk mitigation
- **Prototype Development:** Proof-of-concept implementations for 2-3 critical technology choices
- **Developer Experience Assessment:** Developer surveys and onboarding time measurements

### Out of Scope

- **UI/UX Redesign:** Visual design and user experience improvements (separate initiative)
- **New Feature Development:** Feature additions beyond what's required to validate technology choices
- **Data Model Changes:** Schema changes to stored data (unless required by technology migration)
- **Third-Party Integrations:** New external API integrations (e.g., additional protein databases)
- **Mobile Application:** Native mobile apps (web responsive design remains in scope)
- **Internationalization:** Multi-language support (English-only for this phase)

### Future Considerations

- **Real-time Collaboration Features:** WebSocket-based collaborative protein annotation (Q3 2026)
- **ML/AI Integration:** Protein function prediction models integrated into pipeline (Q4 2026)
- **Workflow Marketplace:** User-contributed custom pipeline workflows (2027)
- **GraphQL API:** Alternative to REST API for flexible data queries (2027)
- **Edge Computing:** CloudFront edge functions for global latency reduction (2027)

---

## 7. Technology Stack Analysis & Proposals

### 7.1 Frontend Technology

#### Current State: Next.js 15 + React 19 + PrimeReact + Nightingale

**Strengths:**
- Server-side rendering (SSR) for SEO and initial load performance
- Modern React 19 features (concurrent rendering, transitions)
- Nightingale web components provide excellent protein visualization
- Strong TypeScript integration

**Weaknesses:**
- [React performance issues with large datasets](https://www.syncfusion.com/blogs/post/render-large-datasets-in-react) (1000+ variants require virtualization)
- PrimeReact component library may be overweight for specialized bioinformatics UI
- Next.js App Router complexity for simple data fetching patterns
- Server component hydration overhead for interactive visualizations

**Proposed Alternatives:**

**Option A: Retain Next.js + Optimize (Recommended for Stability)**
- Implement virtualization with `@tanstack/react-virtual` for large datasets
- Replace PrimeReact with lighter headless UI library (Radix UI)
- Optimize Nightingale component integration with `useMemo` and code-splitting
- **Trade-offs:** Incremental improvement, maintains existing knowledge base, lower migration risk

**Option B: Migrate to SvelteKit + Svelte 5**
- Svelte's compiled approach eliminates virtual DOM overhead
- Native reactive primitives better suited for real-time data updates
- Smaller bundle sizes (40-60% reduction vs. React)
- Nightingale web components integrate seamlessly with Svelte
- **Trade-offs:** Team reskilling required, smaller ecosystem, migration effort 6-8 weeks

**Option C: Migrate to Solid.js + SolidStart**
- Fine-grained reactivity provides better performance than React for data-heavy UIs
- Similar JSX syntax reduces learning curve
- Excellent TypeScript support
- **Trade-offs:** Smaller ecosystem, fewer bioinformatics examples, higher risk

**Recommendation:** **Option A (Retain Next.js + Optimize)** unless performance testing demonstrates that optimization cannot achieve acceptable performance (<60 FPS with 500+ sequences), in which case pivot to **Option B (SvelteKit)**.

### 7.2 Backend API Technology

#### Current State: FastAPI 0.120 + Python 3.12

**Strengths:**
- [FastAPI handles 15,000+ rps](https://fastapi.tiangolo.com/benchmarks/) vs. Flask's 3,000 rps
- ASGI async support excellent for I/O-bound bioinformatics API calls
- Automatic OpenAPI documentation
- Pydantic validation provides type safety
- Strong adoption in [ML/AI APIs (20% usage in 2025)](https://blog.jetbrains.com/pycharm/2025/02/django-flask-fastapi/)

**Weaknesses:**
- FastAPI primarily suited for request-response, less ideal for long-running job orchestration
- Current implementation couples job management with API serving
- Python GIL limitations for CPU-bound tasks (not a major issue given workload)

**Proposed Alternatives:**

**Option A: Retain FastAPI + Decouple Job Management (Recommended)**
- Keep FastAPI for REST API layer (job submission, status checks, result retrieval)
- Move job orchestration to AWS Step Functions (see pipeline section)
- Add WebSocket endpoint for real-time status updates using `fastapi.websockets`
- **Trade-offs:** Moderate refactoring, maintains Python expertise, clear separation of concerns

**Option B: Migrate to Go + Gin/Fiber**
- Superior performance for high-concurrency APIs (30,000+ rps)
- Single binary deployments, faster cold starts
- Strong AWS SDK support
- **Trade-offs:** Team reskilling, loss of Python bioinformatics ecosystem integration, 8-12 week migration

**Option C: Serverless (AWS Lambda + API Gateway)**
- Zero ops overhead, pay-per-request pricing
- Auto-scaling, no capacity planning
- Cold start latency (1-2 seconds for Python) acceptable for job submission
- **Trade-offs:** AWS lock-in, debugging complexity, less suitable for WebSocket real-time updates

**Recommendation:** **Option A (Retain FastAPI + Decouple)** - FastAPI's async capabilities and Pydantic validation are well-suited for bioinformatics APIs. The issue is not FastAPI itself, but the conflation of API serving with job orchestration.

### 7.3 Pipeline Orchestration Technology

#### Current State: Nextflow 24+ on AWS Batch

**Strengths:**
- [Industry-leading adoption in bioinformatics (43% citation share)](https://link.springer.com/article/10.1186/s13059-025-03673-9)
- DSL designed specifically for data pipelines
- Built-in support for containerization (Docker/Singularity)
- Excellent AWS Batch integration

**Weaknesses:**
- Groovy DSL learning curve for Python-focused team
- Nextflow itself requires compute resources (control plane)
- Complexity for simple two-step pipelines (seq_retrieval → alignment)
- Over-engineered for current PAVI pipeline simplicity

**Proposed Alternatives:**

**Option A: Migrate to AWS Step Functions + AWS Batch (Recommended)**
- [Step Functions designed for orchestration, Batch for compute](https://aws.amazon.com/blogs/compute/orchestrating-high-performance-computing-with-aws-step-functions-and-aws-batch/)
- Visual workflow editor accessible to non-Groovy developers
- Serverless orchestration (no control plane to manage)
- Native integration with CloudWatch, EventBridge
- [Proven pattern for genomics pipelines](https://github.com/aws-samples/aws-batch-genomics)
- **Trade-offs:** AWS lock-in, loss of nf-core pipeline portability, migration effort 4-6 weeks

**Option B: Retain Nextflow + Simplify**
- Keep Nextflow for pipeline definition
- Simplify AWS Batch configuration
- Invest in team Groovy/Nextflow training
- **Trade-offs:** Maintains portability, team must learn Groovy, complexity remains

**Option C: Migrate to Snakemake**
- Python-native workflow definition (familiar to team)
- [Strong for single-machine and small-to-medium workflows](https://sagc-bioinformatics.github.io/nextflow-vs-snakemake-2025/snakemake/)
- **Trade-offs:** [Declining adoption vs. Nextflow](https://sagc-bioinformatics.github.io/nextflow-vs-snakemake-2025/snakemake/), less suited for cloud-scale workflows, DAG scalability issues

**Option D: AWS HealthOmics Workflows**
- Purpose-built for genomics/proteomics pipelines
- Supports Nextflow and WDL workflow definitions
- Fully managed, no infrastructure to maintain
- **Trade-offs:** Newer service (less mature), potential cost premium, lock-in

**Recommendation:** **Option A (AWS Step Functions + AWS Batch)** - For PAVI's relatively simple pipeline (sequence retrieval → alignment → metadata merge), Step Functions provides orchestration with minimal operational overhead. This aligns with the team's Python expertise and eliminates the Groovy learning requirement. The loss of Nextflow portability is acceptable given PAVI's AWS-native architecture.

### 7.4 Infrastructure Deployment

#### Current State: AWS CDK (Python) + Elastic Beanstalk + ECS

**Strengths:**
- Infrastructure-as-code (IaC) provides reproducibility
- CDK Python aligns with API language
- Elastic Beanstalk simplifies deployment

**Weaknesses:**
- Elastic Beanstalk adds abstraction layer and cost overhead
- ECS managed environments less cost-effective than Fargate/Lambda for variable workloads
- Monolithic CDK stacks across components create deployment coupling

**Proposed Alternatives:**

**Option A: Retain AWS CDK + Modernize Compute (Recommended)**
- Keep CDK for IaC (maintains existing code)
- Replace Elastic Beanstalk with:
  - **Frontend:** AWS Amplify Hosting (SSR Next.js native support) OR CloudFront + S3 (static export)
  - **API:** ECS Fargate with Application Load Balancer (pay-per-use vs. always-on EC2)
  - **Pipeline:** Step Functions + AWS Batch (as discussed)
- **Trade-offs:** Moderate refactoring, significant cost reduction (30-40%), improved scalability

**Option B: Migrate to Terraform**
- Industry-standard IaC with broader community support
- Better module ecosystem for reusable components
- **Trade-offs:** Migration effort 8-10 weeks, loss of CDK high-level constructs, multi-cloud portability not needed

**Option C: AWS SAM for Serverless Components**
- Simplified CloudFormation for Lambda + API Gateway
- Excellent local development experience (SAM CLI)
- **Trade-offs:** Split between CDK (containers) and SAM (serverless), tooling fragmentation

**Recommendation:** **Option A (Retain CDK + Modernize Compute)** - CDK Python is well-suited for this project. The issue is the compute layer (Elastic Beanstalk, always-on ECS), not the IaC framework. Modernizing compute infrastructure provides cost savings without requiring IaC rewrite.

---

## 8. Rollout Plan

### Phase 1: Analysis & Prototyping (Weeks 1-6)

**Milestones:**
- Week 2: Complete technology deep-dive analysis (frontend performance benchmarking)
- Week 4: Build Step Functions proof-of-concept for seq_retrieval → alignment workflow
- Week 6: Performance testing report comparing current vs. proposed architectures

**Guardrails:**
- If POC pipeline execution time >2x current Nextflow implementation, halt Step Functions migration
- If frontend optimization cannot achieve 60 FPS with 500 sequences, escalate to SvelteKit evaluation

**Deliverables:**
- Technology decision document with stakeholder sign-off
- Cost projection model (current vs. proposed, 12-month forecast)
- Migration architecture document

### Phase 2: Backend Decoupling (Weeks 7-12)

**Milestones:**
- Week 8: API layer separated from job orchestration (FastAPI exposes job submission/status endpoints)
- Week 10: Step Functions workflow deployed to dev environment
- Week 12: Integration testing complete (API → Step Functions → AWS Batch)

**Guardrails:**
- If API latency increases >20% during refactoring, pause and investigate bottleneck
- If Step Functions workflow error rate >5% in dev testing, conduct root cause analysis before proceeding

**Success Gates:**
- All existing API integration tests pass with new architecture
- Step Functions workflow completes successfully for 100 consecutive test runs
- API response time p95 <500ms maintained

### Phase 3: Infrastructure Modernization (Weeks 13-18)

**Milestones:**
- Week 14: Frontend deployed to AWS Amplify OR CloudFront+S3 (staging)
- Week 16: API migrated from Elastic Beanstalk to ECS Fargate (staging)
- Week 18: Staging environment fully operational with new infrastructure

**Guardrails:**
- If staging deployment fails twice, roll back and reassess deployment automation
- If staging infrastructure costs >110% of projected costs, investigate before prod migration

**Success Gates:**
- Staging environment passes all E2E tests
- Load testing demonstrates 500 concurrent users supported
- Infrastructure costs in staging within 10% of projections

### Phase 4: Production Migration (Weeks 19-22)

**Milestones:**
- Week 19: Blue/green deployment preparation (parallel prod environment)
- Week 20: 10% traffic routed to new infrastructure (canary deployment)
- Week 21: 50% traffic to new infrastructure
- Week 22: 100% traffic cutover, old infrastructure decommissioned

**Guardrails:**
- If error rate >1% in canary deployment, roll back immediately
- If user-reported issues >5 in first 24 hours, pause rollout
- If any SLO violated during migration, roll back and investigate

**Kill-Switch Criteria:**
- Critical API failures affecting >10% of requests
- Data loss or corruption detected
- Security vulnerability in new infrastructure
- User-reported issues indicating broken functionality not caught by tests

**Success Gates:**
- Zero critical incidents during migration
- All SLOs maintained throughout rollout
- Cost reduction targets achieved (30% infrastructure cost reduction)
- Developer feedback indicates improved experience (survey results)

### Phase 5: Optimization & Monitoring (Weeks 23-26)

**Milestones:**
- Week 23: Performance tuning based on production metrics
- Week 24: Cost optimization (right-sizing, reserved capacity where applicable)
- Week 25: Documentation finalized (architecture, runbooks, developer guides)
- Week 26: Retrospective and lessons learned

**Success Gates:**
- All leading indicator metrics achieved (developer onboarding <3 days, pipeline execution 25% faster)
- CloudWatch dashboards and alarms configured
- On-call runbooks completed and tested

---

## 9. Risks & Open Questions

### Technical Risks

**Risk 1: Step Functions Orchestration Complexity**
- **Description:** Step Functions may not handle complex conditional logic or dynamic parallelization as elegantly as Nextflow DSL.
- **Mitigation:** Build POC with most complex anticipated workflow (multi-variant processing with conditional alignment). If Step Functions state machine becomes unwieldy (>20 states), reconsider Nextflow retention.
- **Probability:** Medium | **Impact:** High

**Risk 2: Frontend Performance Optimization Insufficient**
- **Description:** Optimizing React/Next.js may not achieve acceptable performance for large alignments (1000+ sequences).
- **Mitigation:** Establish performance baseline and target in Phase 1. If optimization cannot close gap to <60 FPS, pivot to SvelteKit migration. Budget 4 additional weeks for framework migration.
- **Probability:** Medium | **Impact:** Medium

**Risk 3: AWS Amplify Hosting Limitations**
- **Description:** Amplify hosting may not support advanced Next.js features (middleware, ISR) or may have deployment issues.
- **Mitigation:** Test Amplify deployment in Phase 3 staging. Fallback option: ECS Fargate container deployment for Next.js. Budget 2 additional weeks for fallback.
- **Probability:** Low | **Impact:** Low

**Risk 4: Data Migration Challenges**
- **Description:** Existing pipeline results stored in S3 may have schema incompatibilities with new pipeline output format.
- **Mitigation:** Design backward-compatible result schema. Implement data migration script with validation. Maintain read support for legacy format for 12 months.
- **Probability:** Medium | **Impact:** Medium

### Business/Market Risks

**Risk 5: Developer Resistance to Change**
- **Description:** Team may resist abandoning Nextflow given its bioinformatics industry adoption.
- **Mitigation:** Involve team in technology evaluation (Phase 1). Emphasize alignment with Python expertise and reduced operational complexity. Provide Nextflow → Step Functions migration training.
- **Probability:** Medium | **Impact:** Medium

**Risk 6: Cost Projections Inaccurate**
- **Description:** Actual AWS costs under new architecture may exceed projections due to unforeseen usage patterns.
- **Mitigation:** Implement detailed CloudWatch cost allocation tags. Monitor costs weekly during Phase 3-4. Establish cost alerts at 80% and 100% of budget. Implement auto-scaling policies to prevent runaway costs.
- **Probability:** Medium | **Impact:** High

**Risk 7: External API Dependencies**
- **Description:** Changes to external data sources (UniProt, Ensembl) during migration may cause integration failures.
- **Mitigation:** Pin API versions where possible. Implement adapter pattern for external APIs to isolate changes. Monitor external API status during migration.
- **Probability:** Low | **Impact:** Medium

### Open Questions Requiring Further Investigation

**Q1: WebSocket Support for Real-Time Updates**
- **Question:** Does the current user base require real-time job status updates (WebSocket), or is polling acceptable?
- **Investigation Needed:** User interview with 10-15 active users. Analyze API logs for status endpoint polling frequency.
- **Decision Deadline:** End of Phase 1

**Q2: Internationalization Requirements**
- **Question:** Is multi-language support required in next 24 months? (Affects framework selection)
- **Investigation Needed:** AGR strategic roadmap review. User geographic distribution analysis.
- **Decision Deadline:** Before Phase 2 kickoff

**Q3: Machine Learning Pipeline Integration**
- **Question:** Are ML-based protein function prediction models planned for integration? (Affects pipeline architecture)
- **Investigation Needed:** Roadmap review with scientific advisory board. Technical feasibility study for AlphaFold/ESMFold integration.
- **Decision Deadline:** Before Phase 3 (may influence Step Functions state machine design)

**Q4: Multi-Region Deployment**
- **Question:** Is multi-region deployment required for global latency reduction and disaster recovery?
- **Investigation Needed:** User latency analysis by geography. Cost modeling for multi-region architecture.
- **Decision Deadline:** Before Phase 4 (affects infrastructure deployment strategy)

**Q5: Nightingale Component Upgrades**
- **Question:** Are upcoming Nightingale library updates (v6.x) likely to introduce breaking changes requiring architecture flexibility?
- **Investigation Needed:** Review Nightingale roadmap. Contact EBI maintainers for compatibility guidance.
- **Decision Deadline:** End of Phase 1 (may affect frontend framework decision)

**Q6: Result Caching Strategy**
- **Question:** What percentage of pipeline requests are duplicates that could be served from cache?
- **Investigation Needed:** Analyze 90 days of pipeline job submissions for duplicate input patterns. Model cache hit rate and storage costs.
- **Decision Deadline:** Before Phase 2 (affects API design and S3 lifecycle policies)

---

## 10. Cost Analysis

### Current Architecture (Baseline Monthly Costs)

| Component | Service | Estimated Cost |
|-----------|---------|----------------|
| Web UI | Elastic Beanstalk (t3.medium always-on) | $35/month |
| API | Elastic Beanstalk (t3.medium always-on) | $35/month |
| Pipeline Orchestration | ECS Managed Environment | $25/month |
| AWS Batch Compute | ECS Fargate (average 1000 jobs/month, 5min/job) | $150/month |
| Data Storage | S3 Standard (500GB, 1-year retention) | $12/month |
| Data Transfer | CloudFront + Data Transfer Out | $20/month |
| Database | (Not currently used, placeholder) | $0/month |
| Monitoring | CloudWatch Logs + Metrics | $15/month |
| **Total** | | **~$292/month** |

### Proposed Architecture (Projected Monthly Costs)

| Component | Service | Estimated Cost |
|-----------|---------|----------------|
| Web UI | AWS Amplify Hosting (SSR) | $15/month |
| API | ECS Fargate (2 tasks, 0.5 vCPU, scale to zero) | $20/month |
| Pipeline Orchestration | AWS Step Functions (1000 executions) | $0.30/month |
| AWS Batch Compute | AWS Batch on Fargate Spot (same workload, 70% discount) | $45/month |
| Data Storage | S3 Standard (200GB active) + Glacier (300GB archive) | $6/month |
| Data Transfer | CloudFront + Data Transfer Out | $20/month |
| Database | DynamoDB (on-demand, metadata only) | $5/month |
| Monitoring | CloudWatch Logs + Metrics | $15/month |
| **Total** | | **~$126/month** |

**Cost Savings:** $166/month (57% reduction)
**Annual Savings:** ~$2,000/year
**3-Year Savings:** ~$6,000 (offsets migration effort costs)

**Notes:**
- Spot instance pricing for AWS Batch provides 70% discount for interruptible workloads (acceptable for retryable pipeline jobs)
- S3 lifecycle policies move inactive results to Glacier after 90 days
- DynamoDB on-demand pricing scales with usage (job metadata only, low read/write volume)
- Amplify Hosting includes CDN, eliminating separate CloudFront costs for frontend
- ECS Fargate API can scale to zero during low-traffic periods (nights/weekends)

---

## 11. Technology Decision Matrix

| Criteria | Weight | Next.js (Current) | SvelteKit | Solid.js |
|----------|--------|-------------------|-----------|----------|
| Performance (Large Datasets) | 25% | 6/10 | 9/10 | 9/10 |
| Developer Familiarity | 20% | 9/10 | 4/10 | 5/10 |
| Ecosystem/Libraries | 15% | 9/10 | 7/10 | 6/10 |
| TypeScript Support | 10% | 10/10 | 10/10 | 10/10 |
| SSR/SEO Support | 10% | 10/10 | 9/10 | 8/10 |
| Migration Effort | 10% | 10/10 | 5/10 | 4/10 |
| Bundle Size | 5% | 6/10 | 9/10 | 8/10 |
| Community/Support | 5% | 10/10 | 8/10 | 7/10 |
| **Weighted Score** | | **8.05/10** | **7.20/10** | **6.95/10** |

**Recommendation:** Retain Next.js with performance optimization. If optimization fails in Phase 1 testing, pivot to SvelteKit.

---

| Criteria | Weight | FastAPI (Current) | Go + Gin | AWS Lambda |
|----------|--------|-------------------|----------|------------|
| Performance (Async I/O) | 20% | 9/10 | 10/10 | 7/10 |
| Developer Familiarity | 25% | 9/10 | 3/10 | 7/10 |
| Bioinformatics Ecosystem | 20% | 10/10 | 4/10 | 8/10 |
| Operational Simplicity | 15% | 7/10 | 6/10 | 10/10 |
| Type Safety | 10% | 8/10 | 10/10 | 8/10 |
| Documentation (OpenAPI) | 5% | 10/10 | 7/10 | 6/10 |
| WebSocket Support | 5% | 9/10 | 10/10 | 3/10 |
| **Weighted Score** | | **8.75/10** | **6.25/10** | **7.55/10** |

**Recommendation:** Retain FastAPI, decouple job orchestration to Step Functions.

---

| Criteria | Weight | Nextflow (Current) | Step Functions | Snakemake |
|----------|--------|-------------------|----------------|-----------|
| Bioinformatics Adoption | 15% | 10/10 | 5/10 | 7/10 |
| Developer Familiarity | 25% | 4/10 | 7/10 | 8/10 |
| AWS Integration | 20% | 8/10 | 10/10 | 6/10 |
| Operational Simplicity | 20% | 5/10 | 10/10 | 6/10 |
| Workflow Complexity Support | 10% | 10/10 | 7/10 | 8/10 |
| Scalability | 10% | 9/10 | 10/10 | 6/10 |
| **Weighted Score** | | **6.95/10** | **8.45/10** | **7.05/10** |

**Recommendation:** Migrate to AWS Step Functions + AWS Batch for orchestration simplicity and team Python alignment.

---

## 12. Final Recommended Architecture

### Target State Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER REQUESTS                              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   CloudFront CDN       │
                    │   (Global Edge Cache)  │
                    └───────────┬───────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
       ┌────────▼────────┐           ┌─────────▼─────────┐
       │  AWS Amplify     │           │  Application      │
       │  (Next.js SSR)   │           │  Load Balancer    │
       └─────────────────┘           └─────────┬─────────┘
                                               │
                                      ┌────────▼────────┐
                                      │  ECS Fargate    │
                                      │  (FastAPI API)  │
                                      └────────┬────────┘
                                               │
                        ┌──────────────────────┼──────────────────────┐
                        │                      │                      │
               ┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
               │  DynamoDB       │   │  AWS Step       │   │  S3 Bucket      │
               │  (Job Metadata) │   │  Functions      │   │  (Pipeline I/O) │
               └─────────────────┘   │  (Orchestrator) │   └─────────────────┘
                                     └────────┬────────┘
                                              │
                                     ┌────────▼────────┐
                                     │  AWS Batch      │
                                     │  (ECS Fargate   │
                                     │   Spot)         │
                                     └────────┬────────┘
                                              │
                                     ┌────────▼────────┐
                                     │  Pipeline       │
                                     │  Containers:    │
                                     │  - seq_retrieval│
                                     │  - alignment    │
                                     │  - seq_info_merge│
                                     └─────────────────┘
```

### Key Architecture Decisions

1. **Frontend:** Next.js 15 (optimized with virtualization) on AWS Amplify Hosting
2. **API:** FastAPI on ECS Fargate (decoupled from job orchestration)
3. **Orchestration:** AWS Step Functions (replaces Nextflow)
4. **Compute:** AWS Batch on Fargate Spot (retains containerized pipeline components)
5. **Storage:** S3 + DynamoDB (pipeline artifacts + job metadata)
6. **IaC:** AWS CDK Python (retained, compute layer modernized)

### What Changes vs. Current

| Component | Current | Proposed | Reason |
|-----------|---------|----------|--------|
| Frontend Deployment | Elastic Beanstalk EC2 | AWS Amplify | Cost reduction, better Next.js support |
| API Deployment | Elastic Beanstalk EC2 | ECS Fargate | Pay-per-use, scale to zero |
| Pipeline Orchestration | Nextflow on ECS | AWS Step Functions | Eliminate Groovy DSL, operational simplicity |
| Pipeline Compute | AWS Batch ECS | AWS Batch Fargate Spot | 70% cost reduction, retain containerization |
| Job Metadata | In-memory / S3 files | DynamoDB | Faster queries, better job status tracking |

### What Stays the Same

- Next.js + React frontend framework (with optimizations)
- FastAPI backend framework (with architectural refactoring)
- Python for pipeline components (seq_retrieval, alignment scripts)
- Docker containerization for pipeline steps
- AWS CDK for infrastructure-as-code
- S3 for pipeline artifact storage
- CloudWatch for logging and monitoring

---

## Sources & References

### Bioinformatics Workflow Management
- [Empowering bioinformatics communities with Nextflow and nf-core | Genome Biology](https://link.springer.com/article/10.1186/s13059-025-03673-9)
- [Snakemake | Nextflow vs Snakemake 2025](https://sagc-bioinformatics.github.io/nextflow-vs-snakemake-2025/snakemake/)
- [Orchestrating high performance computing with AWS Step Functions and AWS Batch](https://aws.amazon.com/blogs/compute/orchestrating-high-performance-computing-with-aws-step-functions-and-aws-batch/)
- [AWS Batch Genomics Sample](https://github.com/aws-samples/aws-batch-genomics)

### Frontend Performance
- [How To Render Large Datasets In React without Killing Performance](https://www.syncfusion.com/blogs/post/render-large-datasets-in-react)
- [Integrated web visualizations for protein-protein interaction databases | BMC Bioinformatics](https://bmcbioinformatics.biomedcentral.com/articles/10.1186/s12859-015-0615-z)

### API Framework Comparisons
- [FastAPI vs Flask 2025: Performance, Speed & When to Choose](https://strapi.io/blog/fastapi-vs-flask-python-framework-comparison)
- [FastAPI Benchmarks](https://fastapi.tiangolo.com/benchmarks/)
- [Which Is the Best Python Web Framework: Django, Flask, or FastAPI? | PyCharm Blog](https://blog.jetbrains.com/pycharm/2025/02/django-flask-fastapi/)

### AWS Cloud Architecture
- [Choosing the right compute orchestration tool for your research workload | AWS HPC Blog](https://aws.amazon.com/blogs/hpc/choosing-the-right-compute-orchestration-tool-for-your-research-workload/)
- [Building Simpler Genomics Workflows on AWS Step Functions](https://aws.amazon.com/blogs/compute/building-simpler-genomics-workflows-on-aws-step-functions/)

---

**End of Document**

*For questions or feedback on this PRD, contact: Product Management*
