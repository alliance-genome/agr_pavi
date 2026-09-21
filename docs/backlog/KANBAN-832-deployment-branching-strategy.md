# KANBAN-832: Create Testing/Development Deployment and Branching Strategy

## Status
Backlog

## Summary
Define and implement a branching, testing, and deployment strategy to enable continued development without affecting public users once PAVI goes live.

## Problem

Currently PAVI has:
- One permanent branch: `main`
- One deployment environment (linked to main)

When made publicly accessible, any updates merged to `main` directly affect public users. Need a strategy to:
- Continue development safely
- Test changes before public release
- Maintain stability for end users

## Options Analysis

### Option A: Continuous Deployment (Preferred)

**Strategy**: Keep single `main` branch, rely on automated testing and developer validation.

```
feature-branch → PR → main → auto-deploy to prod
                  ↑
            CI/CD validation
            (tests, type-check, lint)
```

**Pros:**
- Simple branching model
- Fast iteration
- No merge conflicts between long-lived branches
- Forces good testing practices

**Cons:**
- Bugs can reach production quickly
- Requires robust test coverage
- No staging environment for manual QA

**Requirements:**
- Comprehensive unit tests (>80% coverage)
- Integration tests for critical paths
- E2E tests for user workflows
- Feature flags for incomplete features

### Option B: Staging Environment

**Strategy**: Add permanent `develop` branch with staging deployment.

```
feature-branch → develop → staging-deploy → main → prod-deploy
                    ↑                          ↑
              dev testing               release decision
```

**Pros:**
- Manual QA before production
- Buffer for catching issues
- Safer for public-facing app

**Cons:**
- More complex branching
- Merge conflicts between branches
- Slower release cycle
- Additional infrastructure cost

**Requirements:**
- Staging AWS environment
- Release schedule/process
- Branch synchronization procedures

### Option C: Hybrid Approach

**Strategy**: Single `main` branch with feature flags and canary deployments.

```
feature-branch → main → canary (5%) → full rollout (100%)
                  ↑
            feature flags for
            incomplete features
```

**Pros:**
- Fast iteration with safety net
- Gradual rollout catches issues
- No branch complexity

**Cons:**
- Requires feature flag infrastructure
- More complex deployment setup
- Monitoring overhead

## Recommendation

**Option A (Continuous Deployment)** is recommended for PAVI because:

1. Small team, fast iteration needed
2. Bioinformatics tool with specific user base (not mass consumer)
3. Current CI/CD already validates PRs
4. Lower risk tolerance acceptable for research tool

### Implementation Requirements for Option A

1. **Enhanced Test Coverage**
   - Unit tests: 80%+ coverage
   - Integration tests for API endpoints
   - E2E tests for submit → results flow

2. **PR Validation Gates**
   - All tests must pass
   - Type checking (mypy, tsc)
   - Linting (flake8, eslint)
   - Code review required

3. **Monitoring & Alerting**
   - Error rate monitoring
   - Performance metrics
   - User-reported issue tracking
   - Quick rollback capability

4. **Feature Flags (Optional)**
   - For large features in development
   - Environment variable based
   - Easy to toggle without redeploy

## Implementation Plan

### Phase 1: Strengthen CI/CD
```yaml
# GitHub Actions workflow
on:
  pull_request:
    branches: [main]

jobs:
  validate:
    steps:
      - run: make run-unit-tests
      - run: make run-type-checks
      - run: make run-style-checks
      - run: make run-e2e-tests  # Add if not present
```

### Phase 2: Add Monitoring
- CloudWatch alarms for error rates
- Dashboard for key metrics
- PagerDuty/Slack alerts for critical issues

### Phase 3: Document Release Process
```markdown
## Release Checklist
1. PR approved and CI passing
2. Manual smoke test (if major change)
3. Merge to main
4. Monitor deployment
5. Verify in production
6. Rollback if issues detected
```

### Phase 4: Rollback Procedure
```bash
# Quick rollback to previous version
git revert HEAD
git push origin main
# Or redeploy previous container tag
```

## Alternative: If Option B Chosen

### Branch Structure
```
main (production)
  └── develop (staging)
        └── feature/* (development)
```

### Environment Mapping
| Branch | Environment | URL |
|--------|-------------|-----|
| main | production | pavi.alliancegenome.org |
| develop | staging | pavi-staging.alliancegenome.org |

### Release Process
1. Features merged to `develop`
2. QA on staging environment
3. Release PR: `develop` → `main`
4. Production deployment

### AWS Infrastructure Needed
- Duplicate ECS services for staging
- Separate database/storage if needed
- Staging subdomain configuration

## Files to Modify

1. `.github/workflows/` - Update CI/CD workflows
2. `CONTRIBUTING.md` - Document branching strategy
3. `aws_infra/` - If adding staging environment
4. `README.md` - Update deployment documentation

## Decision Required

Team should decide:
1. Which option to implement (A, B, or C)?
2. Timeline for implementation
3. Test coverage requirements
4. Release cadence (if Option B)

## Related

- Current GitHub Actions workflows
- AWS CDK infrastructure
- KANBAN-623 (CloudWatch metrics)
