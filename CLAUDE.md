# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AGR PAVI (Proteins Annotations and Variants Inspector) is a bioinformatics web application for visualizing protein sequence alignments with variant annotations across model organisms. It provides ortholog comparisons using Clustal Omega for alignment and EMBL-EBI's Nightingale components for visualization.

**Live:** https://pavi.alliancegenome.org/submit

## Architecture

```
agr_pavi/
├── webui/              # Next.js 15 frontend (React 19, TypeScript, Nightingale)
├── api/                # FastAPI backend (Python 3.12) - job orchestration
├── pipeline_components/
│   ├── seq_retrieval/  # Protein sequence retrieval from genomic regions
│   └── alignment/      # Clustal Omega multiple sequence alignment
├── shared_aws/
│   ├── py_package/     # pavi_shared_aws - reusable AWS CDK utilities
│   └── aws_infra/      # Shared AWS resources
└── */aws_infra/        # CDK infrastructure per component
```

### Pipeline Flow
1. API receives job request with sequence regions
2. **Parallel** sequence retrieval fetches protein FASTA + metadata per region
3. **Alignment** merges FASTAs and runs Clustal Omega
4. **collectAndAlignSeqInfo** merges metadata with alignment coordinates
5. Results returned: `alignment-output.aln` + `aligned_seq_info.json`

Currently uses Nextflow on AWS Batch/ECS; migrating to AWS Step Functions (see `docs/step-functions-design.md`).

## Essential Commands

Each component has its own Makefile. Run commands from the component directory.

### Validation (run before PRs)
```bash
make run-style-checks    # flake8 (Python) or eslint (TypeScript)
make run-type-checks     # mypy (Python) or tsc --noEmit --strict (TypeScript)
make run-unit-tests      # pytest (Python) or jest (TypeScript)
```

### Development Servers
```bash
# API (from api/)
make run-server-dev      # FastAPI dev server on localhost:8080

# WebUI (from webui/)
PAVI_API_BASE_URL=http://localhost:8080 make run-server-dev
```

### Running Single Tests
```bash
# Python (from component directory)
.venv/bin/python -m pytest tests/a_unit/test_main.py -v
.venv/bin/python -m pytest tests/a_unit/test_main.py::test_health_reporting -v

# TypeScript (from webui/)
npm run test -- --testPathPattern="AlignmentEntry.test"
npm run test:watch  # Interactive watch mode
```

### Docker
```bash
make container-image     # Build container locally
make run-container-dev   # Run via docker-compose
make push-container-image TAG_NAME=<tag>  # Push to ECR
```

### Dependencies
```bash
make install-deps        # Install production dependencies
make install-test-deps   # Install with test dependencies
make update-deps-locks-all  # Update lock files
```

### E2E Testing (WebUI)
```bash
make run-e2e-tests       # Cypress with visual regression in Docker
make run-e2e-tests-dev   # Interactive Cypress mode
```

### AWS Deployment
```bash
make validate-dev        # CDK diff against dev environment
make deploy-dev          # Deploy full stack to dev
```

### Shared AWS Package
After modifying `shared_aws/py_package/`:
```bash
make -C shared_aws/py_package/ clean build install
```

## Python Conventions

- Python 3.12 with virtual environments (`.venv/` created automatically by Make)
- Type hints required everywhere - mypy enforced on PRs
- Google Python Style Guide for docstrings
- flake8 for linting
- pip-tools for dependency management (pyproject.toml -> requirements.txt)
- 80% minimum test coverage (pytest with coverage)
- Tests organized: `tests/a_unit/` for unit tests, `tests/b_integration/` for integration tests

## TypeScript/JavaScript Conventions

- TypeScript strict mode required
- Next.js App Router (not Pages Router) - pages in `src/app/`
- ESLint with eslint-config-next (zero warnings allowed: `--max-warnings 0`)
- Jest with React Testing Library for unit tests
- Tests co-located in `__tests__/` directories alongside components
- npm with package-lock.json (use `--strict-peer-deps`)
- Node.js v24 (managed via NVM, see .nvmrc)

## AWS CDK

All CDK code is Python for consistency. Key files in each `aws_infra/` directory:
- `cdk.json` - CDK execution config
- `cdk.context.json` - VPC context
- `cdk_app.py` - Stack definitions
- `cdk_classes/` - Custom constructs

CDK CLI via npm: `npx cdk <command>`.

## Dependency Management

- Use `~=` (Python) or `~` (npm) for patch/minor version flexibility
- Lock files must be committed (requirements.txt, package-lock.json)
- Low-risk updates auto-applied on PR validation unless `no-deps-lock-updates` label added

## CI/CD

- PRs to main run validation (lint, type-check, test, CDK diff)
- Merges to main auto-deploy via GitHub Actions
- Container images pushed to ECR with version tags

## Key Libraries

**WebUI:**
- `@nightingale-elements/*` - Protein sequence visualization components from EMBL-EBI
- `primereact` + `primeflex` - UI component library
- `@tanstack/react-virtual` - Virtualized alignment rendering

**API:**
- `fastapi[standard]` - REST API framework
- `smart-open[s3]` - S3 file access
