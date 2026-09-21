# PAVI Documentation

This directory contains documentation for the PAVI (Proteins Annotations and Variants Inspector) project.

## Complete Development Guides

Start here for comprehensive, end-to-end documentation:

| Guide | Description |
|-------|-------------|
| [Deployment Guide](deployment-complete-guide.md) | All deployment modes: local dev, EC2, AWS cloud, CI/CD |
| [Backend Development](backend-development-guide.md) | API, pipeline, testing, code quality |
| [Frontend Development](frontend-development-guide.md) | WebUI, Nightingale, mock API, testing |

---

## Documentation Index

### Quick Start

| Document | Audience | Description |
|----------|----------|-------------|
| [CLAUDE.md](../CLAUDE.md) | All | Main project guidelines and development instructions |
| [Quick Reference](quick-reference.md) | All | Common commands and quick start guide |

### Reference Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [API Reference](api-reference.md) | Dev | Complete REST API endpoint documentation |
| [Configuration Reference](configuration-reference.md) | Dev/Ops | All environment variables and configuration options |
| [Database Schemas](database-schemas.md) | Dev | DynamoDB, SQLite, and S3 storage schemas |
| [Data Flow Diagrams](data-flows.md) | Dev | Visual diagrams of data flow through the system |

### Architecture & Design

| Document | Audience | Description |
|----------|----------|-------------|
| [Architecture Diagram](architecture-diagram.md) | All | High-level system architecture |
| [Step Functions Design](step-functions-design.md) | Dev/Ops | AWS Step Functions pipeline architecture |
| [seq-retrieval Architecture](seq-retrieval-architecture.md) | Dev | Sequence retrieval component deep dive |
| [Nightingale Guide](nightingale-guide.md) | Dev | EMBL-EBI Nightingale component integration |

### Deployment Guides

| Document | Audience | Description |
|----------|----------|-------------|
| [Local EC2 Deployment](local-ec2-deployment.md) | Ops | Deploy PAVI on a single EC2 instance |
| [Deployment Guide](deployment-guide.md) | Ops | General deployment instructions |
| [Step Functions Deployment Runbook](step-functions-deployment-runbook.md) | Ops | AWS Step Functions deployment guide |
| [AWS Deployment Infrastructure](aws-deployment-infrastructure.md) | Ops | AWS infrastructure overview |
| [WebUI Deployment Debugging](webui-deployment-debugging-guide.md) | Ops | Troubleshooting WebUI deployments |
| [Deploying Under a Base Path](base-path-deployment.md) | Dev/Ops | Serve the WebUI under a URL prefix (e.g. `alliancegenome.org/pavi`) |

### Development Guides

| Document | Audience | Description |
|----------|----------|-------------|
| [Testing Guide](testing-guide.md) | Dev | How to run and write tests |
| [Local Pipeline Implementation](local-pipeline-implementation.md) | Dev | Local pipeline code details |
| [Clustal Omega Build](clustal-omega-build.md) | Dev/Ops | Building Clustal Omega from source |
| [Python Environment Setup](python-environment-setup.md) | Dev | Python setup with uv, ruff, mypy |

### Operations & Troubleshooting

| Document | Audience | Description |
|----------|----------|-------------|
| [Troubleshooting](troubleshooting.md) | All | Common issues and solutions |
| [Security Guide](security.md) | Ops | Security practices and considerations |

### Planning & Roadmaps

| Document | Audience | Description |
|----------|----------|-------------|
| [PRD](PRD.md) | All | Product Requirements Document |
| [PRD - Technology Stack Overhaul](PRD-PAVI-Technology-Stack-Overhaul.md) | All | Technology modernization PRD |
| [PRD - Public Launch](prd-pavi-public-launch-unified.md) | All | Public launch requirements |
| [Technical Roadmap](TECHNICAL-ROADMAP.md) | All | Technical development roadmap |
| [Implementation Plan (3 Month)](IMPLEMENTATION-PLAN-3-MONTH.md) | All | 3-month implementation timeline |
| [UX Specifications](UX-SPECIFICATIONS.md) | All | User experience specifications |
| [UX Prioritized Roadmap](ux-prioritized-roadmap.md) | All | UX improvement priorities |
| [UX Roadmap Action Plan](ux-roadmap-action-plan.md) | All | UX implementation plan |
| [WebUI 8-Week UX Plan](pavi-webui-8week-ux-improvement-plan.md) | All | 8-week WebUI improvement plan |
| [WebUI Improvement Summary](pavi-webui-improvement-plan-summary.md) | All | WebUI improvements overview |

### Backlog & Progress

| Document | Audience | Description |
|----------|----------|-------------|
| [TODO](TODO.md) | Dev | Current task list |
| [Unified Backlog](pavi-unified-backlog.md) | All | Complete project backlog |
| [Backlog Review Summary](backlog-review-summary.md) | All | Backlog review notes |
| [Week 1 Completion Summary](week1-completion-summary.md) | All | Week 1 progress |
| [Week 2 Quick Start](week2-quick-start.md) | All | Week 2 quick start |
| [Week 8 Development Plan](week8-development-plan.md) | All | Week 8 development plan |

### Reference Materials

| Document | Audience | Description |
|----------|----------|-------------|
| [Scientific Utility Assessment](pavi-scientific-utility-assessment.md) | All | Scientific value assessment |
| [Variant WG Reference](variant-wg-reference.md) | Dev | Variant working group reference |
| [Benchmark Results](benchmark-results-baseline.md) | Dev/Ops | Performance benchmarks |
| [Local EC2 Migration Plan](local-ec2-migration-plan.md) | Ops | Migration planning document |

---

## Quick Start

### For Developers

1. Read [CLAUDE.md](../CLAUDE.md) for project conventions
2. Follow [Python Environment Setup](python-environment-setup.md) or WebUI setup
3. Review [API Reference](api-reference.md) for endpoint details
4. Check [Testing Guide](testing-guide.md) before submitting PRs

### For Operations

1. Review [Configuration Reference](configuration-reference.md)
2. Follow [Local EC2 Deployment](local-ec2-deployment.md) or [AWS Deployment](aws-deployment-infrastructure.md)
3. Keep [Troubleshooting](troubleshooting.md) handy
4. Review [Security Guide](security.md) for best practices

### For Understanding the System

1. Start with [Architecture Diagram](architecture-diagram.md)
2. Review [Data Flow Diagrams](data-flows.md)
3. Explore [Step Functions Design](step-functions-design.md)

---

## Architecture Overview

### AWS Production Architecture

```
WebUI → API (Elastic Beanstalk) → Step Functions → AWS Batch → S3
                                        ↓
                                    DynamoDB
```

### Local EC2 Architecture

```
WebUI → API (uvicorn) → LocalPipelineRunner → clustalo → Local FS
                               ↓
                            SQLite
```

## Key Components

| Component | Production | Local EC2 |
|-----------|------------|-----------|
| Job Storage | DynamoDB | SQLite |
| Result Storage | S3 | Local filesystem |
| Orchestration | Step Functions | LocalPipelineRunner |
| Compute | AWS Batch | Direct Python execution |
| Alignment | Containerized clustalo | Local clustalo binary |

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/deployment-status` | GET | Detailed component status |
| `/api/pipeline-job/` | POST | Submit alignment job |
| `/api/pipeline-job/{uuid}` | GET | Get job status |
| `/api/pipeline-job/{uuid}/result/alignment` | GET | Get alignment result |
| `/api/pipeline-job/{uuid}/result/seq-info` | GET | Get sequence info |
| `/api/pipeline-job/{uuid}/logs` | GET | Get job logs |

See [API Reference](api-reference.md) for complete documentation.

## Contributing

1. Follow coding conventions in [CLAUDE.md](../CLAUDE.md)
2. Run validation checks before PRs:
   ```bash
   make run-style-checks
   make run-type-checks
   make run-unit-tests
   ```
3. Update documentation for new features
4. See [Testing Guide](testing-guide.md) for test requirements
