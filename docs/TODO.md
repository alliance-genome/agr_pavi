# PAVI Overhaul - Task Tracker

**Start Date:** _____________
**Target Completion:** 12 weeks from start
**Working Model:** You (solo dev) + Claude Code (AI pair)

---

## Phase 1: Foundation (Weeks 1-3)

### Week 1: Analysis & POC
| Task | Claude | You |
|------|--------|-----|
| - [ ] Review PRD, confirm scope | - | Read, flag concerns |
| - [ ] Set up feature branch | Create branch | Push to GitHub |
| - [ ] Benchmark frontend perf | Write script | Run, record FPS |
| - [ ] Map Nextflow → Step Functions | Generate JSON | Review logic |
| - [ ] **Step Functions POC** | Write CDK | Deploy, test |

**Week 1 Gate:** POC triggers a Batch job from Step Functions
- [ ] Gate passed

### Week 2: Step Functions + DynamoDB
| Task | Claude | You |
|------|--------|-----|
| - [ ] Full Step Functions workflow | Write CDK | Deploy, test |
| - [ ] DynamoDB job table | Write CDK | Deploy |
| - [ ] Extract job logic from API | Refactor code | Review, test |
| - [ ] Wire FastAPI → Step Functions | Write code | Test E2E |

### Week 3: Frontend Optimization
| Task | Claude | You |
|------|--------|-----|
| - [ ] Add react-virtual | Install, integrate | Test large datasets |
| - [ ] Optimize Nightingale | Code-split | Verify FPS |
| - [ ] Amplify CDK stack | Write CDK | Deploy staging |
| - [ ] ECS Fargate CDK | Write CDK | Review |

**Phase 1 Gate:**
- [ ] Step Functions workflow executes in dev
- [ ] Frontend renders 500 sequences at 60 FPS
- [ ] Amplify staging deploys

---

## Phase 2: Core Migration (Weeks 4-7)

### Week 4: Backend Decoupling
| Task | Claude | You |
|------|--------|-----|
| - [ ] Replace Nextflow invocation | Update FastAPI | Test locally |
| - [ ] Job status endpoint | Write DynamoDB queries | Test |
| - [ ] Update API tests | Rewrite tests | Run pytest |
| - [ ] Deploy API to Fargate | Finalize CDK | Deploy staging |

### Week 5: Pipeline Migration
| Task | Claude | You |
|------|--------|-----|
| - [ ] seq_retrieval → Fargate Spot | Update Batch CDK | Deploy, test |
| - [ ] alignment → Fargate Spot | Update Batch CDK | Deploy, test |
| - [ ] Full pipeline test (10 runs) | - | Execute, verify |
| - [ ] Result callback to DynamoDB | Write code | Verify |

### Week 6: Frontend Deployment
| Task | Claude | You |
|------|--------|-----|
| - [ ] Amplify staging deploy | Configure build | Deploy |
| - [ ] Environment variables | Update CDK | Verify API works |
| - [ ] Update Cypress tests | Fix tests | Run E2E |
| - [ ] Load test script | Write k6 script | Run test |

### Week 7: Integration Testing
| Task | Claude | You |
|------|--------|-----|
| - [ ] Fix failing E2E tests | Debug, fix | Verify pass |
| - [ ] Load test (500 concurrent) | - | Run, review |
| - [ ] Security checklist | Generate | Review |
| - [ ] Cost review | - | Check AWS costs |

**Phase 2 Gate:**
- [ ] All E2E tests pass
- [ ] p95 < 500ms
- [ ] 100 successful pipeline runs
- [ ] Costs within +/- 20%

---

## Phase 3: Production Cutover (Weeks 8-10)

### Week 8: Production Prep
| Task | Claude | You |
|------|--------|-----|
| - [ ] Production CDK stacks | Duplicate config | Deploy |
| - [ ] Blue environment (no traffic) | - | CDK deploy |
| - [ ] S3 data migration | Write script | Run, verify |
| - [ ] Route 53 setup | Write CDK | Deploy |

### Week 9: Canary Deployment
- [ ] Monday: 0% - smoke tests
- [ ] Tuesday: 10% - monitor errors
- [ ] Wednesday: 25% - monitor latency
- [ ] Thursday: 50% - review all metrics
- [ ] Friday: 75% - prep for cutover

**Rollback if:**
- [ ] Error rate > 1%? NO
- [ ] p95 > 1s? NO
- [ ] Data issues? NO

### Week 10: Full Cutover
| Task | Claude | You |
|------|--------|-----|
| - [ ] 100% traffic switch | - | Update Route 53 |
| - [ ] Monitor Tue-Wed | Help debug | Watch dashboards |
| - [ ] Decommission old infra | Write scripts | CDK destroy |
| - [ ] Runbooks | Write docs | Review |

**Phase 3 Gate:**
- [ ] 100% on new infra
- [ ] Zero critical incidents
- [ ] SLOs maintained
- [ ] Old infra scheduled for deletion

---

## Phase 4: Stabilization (Weeks 11-12)

### Week 11: Optimization
| Task | Claude | You |
|------|--------|-----|
| - [ ] Analyze prod metrics | Summarize | Identify issues |
| - [ ] Performance fixes | Write fixes | Deploy |
| - [ ] Bug fixes | Fix issues | Test, deploy |
| - [ ] CloudWatch dashboards | Write CDK | Deploy |

### Week 12: Documentation
| Task | Claude | You |
|------|--------|-----|
| - [ ] Update CLAUDE.md | Rewrite | Review |
| - [ ] Update READMEs | Update | Review |
| - [ ] Write ADRs | Write | Commit |
| - [ ] Delete old stacks | - | CDK destroy |
| - [ ] Retrospective | - | Write notes |

**Final Gate:**
- [ ] Docs complete
- [ ] 30%+ cost reduction
- [ ] No P0/P1 issues
- [ ] Old infra deleted

---

## Success Metrics (Week 12)

| Metric | Target | Actual |
|--------|--------|--------|
| Infrastructure cost reduction | -30% | ______ |
| Pipeline execution time | -25% | ______ |
| API response time (p95) | < 500ms | ______ |
| Frontend FPS (500 sequences) | 60 FPS | ______ |
| E2E test pass rate | 100% | ______ |
| Zero-downtime migration | Yes | ______ |

---

## Notes & Blockers

_Add notes as you go. Tag with week number._

---

## Deferred Items (Post-Launch)

- [ ] WebSocket real-time job status (polling is fine for now)
- [ ] Result caching optimization
- [ ] Multi-region deployment
- [ ] Advanced CloudWatch dashboards
- [ ] DynamoDB reserved capacity (on-demand OK short-term)

---

## Quick Reference

**Start Week 1:**
```bash
# Have Claude Code create feature branch
git checkout -b feature/pavi-overhaul
```

**Key AWS commands you'll run:**
```bash
# Deploy CDK stacks
cd <component>/aws_infra && npx cdk deploy

# Check Step Functions
aws stepfunctions list-executions --state-machine-arn <arn>

# Check Batch jobs
aws batch describe-jobs --jobs <job-id>
```
