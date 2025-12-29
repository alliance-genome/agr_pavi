# PAVI Technology Stack Overhaul - 3-Month Implementation Plan

**Timeline:** 12 weeks (Q1 2025)
**Compressed from:** 26-week PRD rollout
**Key Constraint:** Parallel workstreams, reduced validation cycles

---

## Executive Summary

This accelerated plan delivers the core architecture changes in 12 weeks by:
1. Running frontend optimization and backend decoupling in parallel
2. Combining infrastructure modernization with production migration
3. Reducing staging validation to 1 week (vs. 2 weeks)
4. Deferring non-critical optimizations to post-launch

---

## Working Model

**Developer:** You (solo)
**AI Pair:** Claude Code

**How we work:**
- You drive decisions, review code, and handle AWS credentials/deployments
- Claude Code writes code, CDK stacks, tests, and documentation
- Sequential focus (one workstream at a time) rather than parallel teams
- Claude Code can generate boilerplate while you review previous outputs

**Realistic pace:** ~15-20 hrs/week = 12 weeks. Full-time = 6-8 weeks possible.

---

## Week-by-Week Plan

### PHASE 1: Foundation (Weeks 1-3)

#### Week 1: Analysis & POC
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| Review PRD, confirm scope | - | Read PRD, flag concerns |
| Set up feature branch | Create branch, update CI | Push to GitHub |
| Benchmark frontend perf | Write benchmark script | Run in browser, record FPS |
| Map Nextflow → Step Functions | Generate state machine JSON | Review logic |
| **Step Functions POC** | Write CDK + state machine | Deploy to AWS, test |

**Exit Criteria:** POC triggers a Batch job from Step Functions

#### Week 2: Step Functions + DynamoDB
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| Step Functions workflow (full) | Write CDK for seq_retrieval → alignment | Deploy, test |
| DynamoDB job table | Write CDK, define schema | Deploy |
| API refactor: extract job logic | Refactor FastAPI code | Review, test locally |
| Job submission endpoint | Wire FastAPI → Step Functions | Test end-to-end |

#### Week 3: Frontend Optimization
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| Add react-virtual | Install, integrate into alignment view | Test with large datasets |
| Optimize Nightingale loading | Code-split, memoize | Verify FPS improvement |
| Amplify CDK stack | Write CDK for Amplify hosting | Deploy staging |
| ECS Fargate CDK (API) | Write task definition CDK | Review |

**Phase 1 Gate (End Week 3):**
- [ ] Step Functions workflow executes in dev
- [ ] Frontend renders 500 sequences at 60 FPS
- [ ] Amplify staging deploys

---

### PHASE 2: Core Migration (Weeks 4-7)

#### Week 4: Backend Decoupling Complete
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| Replace Nextflow invocation | Update FastAPI to call Step Functions | Test locally |
| Job status endpoint | Write GET /jobs/{id}/status with DynamoDB | Test queries |
| Update API tests | Rewrite tests for new architecture | Run pytest |
| Deploy API to Fargate | Finalize CDK | Deploy staging, verify |

#### Week 5: Pipeline Migration
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| Fargate Spot job definitions | Update Batch CDK for seq_retrieval | Deploy, test |
| Alignment container migration | Update Batch CDK for alignment | Deploy, test |
| Full pipeline test | - | Run 10 full executions |
| Result callback | Add Step Functions → DynamoDB update | Verify job completion |

#### Week 6: Frontend Deployment
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| Amplify deployment | Configure build settings | Deploy to staging |
| Environment variables | Update CDK with env vars | Verify API connection |
| Update Cypress tests | Fix tests for new endpoints | Run E2E suite |
| Basic load test script | Write k6/artillery script | Run against staging |

#### Week 7: Integration Testing
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| Fix any failing E2E tests | Debug and fix | Verify all pass |
| Load test analysis | - | Run 500 concurrent, review metrics |
| Security checklist | Generate checklist | Review IAM, endpoints |
| Cost review | - | Check AWS Cost Explorer |

**Phase 2 Gate (End Week 7):**
- [ ] All E2E tests pass in staging
- [ ] Load test: p95 < 500ms for API
- [ ] Pipeline: 100 consecutive successful runs
- [ ] Staging costs within +/- 20%

---

### PHASE 3: Production Cutover (Weeks 8-10)

#### Week 8: Production Prep
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| Production CDK stacks | Duplicate staging → prod config | Review, deploy |
| Deploy blue environment | - | Run CDK deploy (no traffic) |
| S3 data migration script | Write sync script | Run, verify data |
| Route 53 weighted routing | Write CDK for DNS | Deploy |

#### Week 9: Canary Deployment
| Day | Traffic | You Do |
|-----|---------|--------|
| Monday | 0% | Final smoke tests on blue |
| Tuesday | 10% | Update Route 53, monitor errors |
| Wednesday | 25% | Monitor CloudWatch |
| Thursday | 50% | Review all metrics |
| Friday | 75% | Prepare for Monday cutover |

**Rollback Triggers (revert immediately if):**
- Error rate > 1%
- p95 latency > 1s
- Any data inconsistency

#### Week 10: Full Cutover
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| 100% traffic switch | - | Update Route 53 weights |
| Monitor Tue-Wed | Help debug issues | Watch dashboards |
| Decommission old infra | Write destroy scripts | Run CDK destroy |
| Runbook documentation | Write runbooks | Review, publish |

**Phase 3 Gate (End Week 10):**
- [ ] 100% traffic on new infrastructure
- [ ] Zero critical incidents
- [ ] All SLOs maintained
- [ ] Old infrastructure scheduled for deletion

---

### PHASE 4: Stabilization (Weeks 11-12)

#### Week 11: Optimization
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| Analyze prod metrics | Summarize CloudWatch data | Identify hotspots |
| Performance fixes | Write optimizations | Deploy, verify |
| Bug fixes | Fix reported issues | Test, deploy |
| CloudWatch dashboards | Write dashboard CDK | Deploy |

#### Week 12: Documentation & Cleanup
| Task | Claude Code Does | You Do |
|------|------------------|--------|
| Update CLAUDE.md | Rewrite for new architecture | Review |
| Update all README.md files | Update commands/instructions | Review |
| Architecture Decision Records | Write ADRs for key decisions | Review, commit |
| Delete old CDK stacks | - | Run CDK destroy |
| Retrospective notes | - | Write lessons learned |

**Final Gate (End Week 12):**
- [ ] Documentation complete
- [ ] Cost reduction achieved (target: 30%+)
- [ ] No open P0/P1 issues
- [ ] Old infrastructure deleted

---

## Risk Mitigation for Solo Developer

| Risk | Mitigation | Contingency |
|------|------------|-------------|
| Step Functions POC fails Week 1 | Spike isolated, quick fail | Fallback to Nextflow optimization (simpler) |
| Frontend perf targets not met | Try virtualization first | Accept slower perf or defer to post-launch |
| Staging issues delay Week 7 | Claude Code helps debug | Extend Phase 2 by 1 week, compress Phase 4 |
| Production issues Week 9-10 | Instant rollback capability | Revert to old infra, extend migration |
| Burnout / time constraints | Realistic weekly goals | Extend to 16 weeks if needed |
| AWS credential/permission issues | Document all required IAM | Fix permissions early in Week 1 |

---

## Scope Cuts for 3-Month Timeline

**Deferred to Post-Launch:**
- WebSocket real-time job status (polling acceptable)
- Result caching optimization
- Multi-region deployment
- Advanced CloudWatch dashboards (basic only)
- DynamoDB cost optimization (on-demand acceptable short-term)

**Must Have:**
- Step Functions replacing Nextflow
- Amplify frontend deployment
- ECS Fargate API deployment
- Fargate Spot for pipeline compute
- Basic DynamoDB job tracking
- E2E tests passing
- Documentation updates

---

## Weekly Checkpoints

| Week | Key Question | Go/No-Go Decision |
|------|--------------|-------------------|
| 1 | Does Step Functions POC work? | Continue / Evaluate alternatives |
| 3 | Are all Phase 1 gates met? | Proceed to Phase 2 / Extend Phase 1 |
| 7 | Does staging pass all tests? | Proceed to production / Fix issues |
| 9 | Is canary deployment stable? | Full cutover / Rollback |
| 12 | Are all success criteria met? | Project complete / Extend support |

---

## Success Criteria (Week 12)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Infrastructure cost | -30% from baseline | AWS Cost Explorer |
| Pipeline execution time | -25% from baseline | CloudWatch metrics |
| API response time (p95) | < 500ms | CloudWatch metrics |
| Frontend FPS (500 sequences) | 60 FPS | Chrome DevTools |
| E2E test pass rate | 100% | Cypress CI |
| Zero-downtime migration | Yes | No user-impacting incidents |

---

## Appendix: Command Reference

### New Development Commands (Post-Migration)

```bash
# Frontend (Amplify)
cd webui/
make deploy-amplify-staging
make deploy-amplify-prod

# API (ECS Fargate)
cd api/
make deploy-fargate-staging
make deploy-fargate-prod

# Pipeline (Step Functions)
cd pipeline_components/aws_infra/
make deploy-step-functions

# Full stack
make deploy-dev   # Still works, targets new infra
```

### Monitoring Commands

```bash
# View Step Functions executions
aws stepfunctions list-executions --state-machine-arn <arn>

# View Batch job status
aws batch describe-jobs --jobs <job-id>

# View DynamoDB job metadata
aws dynamodb get-item --table-name pavi-jobs --key '{"jobId": {"S": "<id>"}}'
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-17
**Owner:** Engineering Lead
