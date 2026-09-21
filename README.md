# AGR PAVI

**Proteins Annotations and Variants Inspector**

PAVI is a web application that enables researchers to visualize protein sequence alignments with variant annotations across model organisms. It provides cross-species ortholog comparisons integrated with the [Alliance of Genome Resources](https://www.alliancegenome.org/).

**Live Application:** https://pavi.alliancegenome.org/submit

---

## Overview

PAVI addresses a gap in bioinformatics tooling: existing tools provide raw alignment data but lack interactive variant overlay visualization. PAVI combines:

- **Ortholog alignment visualization** using Clustal Omega for multiple sequence alignment
- **Variant annotation overlay** showing mutations in sequence context
- **Cross-species comparison** for model organism research
- **Interactive web interface** built on EMBL-EBI's Nightingale components

### Target Users

| User Segment | Use Case |
|--------------|----------|
| Comparative Genomics Researchers | Visualize alignments across orthologs with variant annotations to identify conserved regions |
| Clinical Bioinformaticians | Assess whether variants fall in conserved domains across species |
| Model Organism Database Curators | Link gene pages to protein alignments showing variants |
| Bioinformatics Tool Developers | Programmatic access via API for downstream pipelines |

---

## Architecture

PAVI is a monorepo with independently deployed components:

| Component | Description | Technology |
|-----------|-------------|------------|
| [webui/](webui/) | Interactive user interface | Next.js 15, React 19, TypeScript, Nightingale |
| [api/](api/) | Job manager and pipeline orchestration | FastAPI, Python 3.12 |
| [pipeline_components/](pipeline_components/) | Sequence retrieval and alignment processing | Python, Clustal Omega |
| [shared_aws/](shared_aws/) | Shared AWS CDK infrastructure code | Python, AWS CDK |

### Current Architecture

The API currently orchestrates **Nextflow** workflows running on AWS Batch/ECS for sequence retrieval and alignment.

### Planned Architecture

The project is migrating to **AWS Step Functions** with Fargate Spot for improved cost efficiency and operational simplicity. Key changes:

- Step Functions state machine replacing Nextflow orchestration
- AWS Batch on Fargate Spot (30-40% cost reduction)
- DynamoDB for job tracking with TTL-based cleanup
- AWS Amplify for WebUI hosting

See [Step Functions Design](docs/step-functions-design.md) for technical details.

---

## Project Goals

PAVI is preparing for public launch with these objectives:

| Goal | Target |
|------|--------|
| **User Adoption** | 500 unique users in first 3 months, 2,000+ by month 6 |
| **Cost Optimization** | 30% infrastructure cost reduction via Fargate Spot |
| **Accessibility** | WCAG 2.1 AA compliance |
| **Reliability** | 99.5% uptime SLO |
| **Performance** | API latency p95 < 500ms, job completion < 5 minutes |

---

## Quick Start

### Development

```bash
# WebUI
cd webui
make install-deps
make run-server-dev      # Starts Next.js dev server

# API
cd api
make install-deps
make run-server-dev      # Starts FastAPI dev server on :8080

# Run validation (any component)
make run-unit-tests
make run-type-checks
make run-style-checks
```

### Deployment

```bash
# Validate CDK changes against AWS
make validate-dev

# Deploy to dev environment
make deploy-dev
```

---

## Documentation

All planning and design documents are in [`docs/`](docs/):

### Planning
- [Product Requirements Document](docs/prd-pavi-public-launch-unified.md) - Complete PRD for public launch
- [Unified Backlog](docs/pavi-unified-backlog.md) - Consolidated task backlog

### Design
- [UX Improvement Plan](docs/pavi-webui-8week-ux-improvement-plan.md) - WebUI enhancement roadmap
- [Step Functions Design](docs/step-functions-design.md) - Pipeline orchestration migration
- [Scientific Utility Assessment](docs/pavi-scientific-utility-assessment.md) - Competitive analysis and feature priorities

### Technical
- [Deployment Runbook](docs/step-functions-deployment-runbook.md) - Operational procedures
- [Benchmark Results](docs/benchmark-results-baseline.md) - Performance baseline

---

## Development Standards

| Language | Standards |
|----------|-----------|
| **Python 3.12** | Type hints required (mypy), flake8 linting, Google-style docstrings, 80% test coverage |
| **TypeScript** | Strict mode, ESLint with next config, Jest for testing |
| **Infrastructure** | AWS CDK in Python, pip-tools for dependency management |

Each component has a `Makefile` with standard targets. See component-specific READMEs for details.

---

## Acknowledgements

PAVI builds on these open-source projects:

- [BioPython](https://biopython.org/) - Cock et al. (2009) [doi:10.1093/bioinformatics/btp163](https://doi.org/10.1093/bioinformatics/btp163)
- [Nextflow](https://www.nextflow.io/) - Di Tommaso et al. (2017) [doi:10.1038/nbt.3820](https://doi.org/10.1038/nbt.3820)
- [Nightingale](https://github.com/ebi-webcomponents/nightingale) - Salazar et al. (2023) [doi:10.1093/bioadv/vbad064](https://doi.org/10.1093/bioadv/vbad064)
- [Samtools](http://www.htslib.org/) - Danecek et al. (2021) [doi:10.1093/gigascience/giab008](https://doi.org/10.1093/gigascience/giab008)
- [PySam](https://github.com/pysam-developers/pysam)

---

## Maintainers

[Manuel Luypaert](https://github.com/mluypaert)
