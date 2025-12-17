# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AGR PAVI (Proteins Annotations and Variants Inspector) is a monorepo for a bioinformatics web application that processes protein sequences, alignments, and genomic data. Components are deployed independently to AWS.

## Architecture

```
agr_pavi/
├── webui/              # Next.js 15+ frontend (React 19, TypeScript)
├── api/                # FastAPI backend (Python 3.12) - job manager + pipeline orchestration
├── pipeline_components/
│   ├── seq_retrieval/  # Python sequence data retrieval
│   └── alignment/      # Clustal Omega alignment container
├── shared_aws/
│   ├── py_package/     # pavi_shared_aws - reusable AWS CDK Python utilities
│   └── aws_infra/      # Shared AWS resources (Chatbot, etc.)
└── */aws_infra/        # CDK infrastructure definitions per component
```

The API orchestrates Nextflow workflows that run on AWS Batch/ECS, calling pipeline components for sequence retrieval and alignment.

## Essential Commands

Each component has its own Makefile. Run commands from the component directory.

### Validation (run before PRs)
```bash
make run-style-checks    # flake8 (Python) or eslint (TypeScript)
make run-type-checks     # mypy (Python) or tsc (TypeScript)
make run-unit-tests      # pytest (Python) or jest (TypeScript)
```

### Development Servers
```bash
# API (from api/)
make run-server-dev      # FastAPI dev server on localhost:8080

# WebUI (from webui/)
make run-server-dev      # Next.js dev server (needs PAVI_API_BASE_URL)
```

### Docker
```bash
make container-image     # Build container locally
make run-container-dev   # Run via docker-compose
make push-container-image TAG_NAME=<tag>  # Push to ECR (requires registry-docker-login)
```

### Dependencies
```bash
make install-deps        # Install production dependencies
make install-test-deps   # Install with test dependencies
make update-deps-locks-all  # Update lock files (requirements.txt, package-lock.json)
```

### E2E Testing (WebUI)
```bash
make run-e2e-tests       # Cypress with visual regression in Docker
make run-e2e-tests-dev   # Interactive Cypress mode
```

### AWS Deployment (requires AWS credentials)
```bash
make validate-dev        # CDK diff against dev environment
make deploy-dev          # Deploy full stack to dev
```

### Shared AWS Package
After modifying `shared_aws/py_package/`, rebuild and install:
```bash
make -C shared_aws/py_package/ clean build install
```

## Python Conventions

- Python 3.12 with virtual environments (`.venv/` created automatically by Make)
- Use type hints everywhere - mypy enforced on PRs
- Google Python Style Guide for docstrings
- flake8 for linting
- pip-tools for dependency management (pyproject.toml -> requirements.txt)
- 80% minimum test coverage (pytest with coverage)

## TypeScript/JavaScript Conventions

- TypeScript strict mode required
- Next.js App Router (not Pages Router)
- ESLint with eslint-config-next
- Jest with React Testing Library for unit tests
- npm with package-lock.json (use `--strict-peer-deps`)
- Node.js v20 (managed via NVM, see .nvmrc)

## AWS CDK

All CDK code is Python for consistency. Key files in each `aws_infra/` directory:
- `cdk.json` - CDK execution config
- `cdk.context.json` - VPC context
- `cdk_app.py` - Stack definitions
- `cdk_classes/` - Custom constructs

CDK CLI installed locally via npm: use `npx cdk <command>`.

## Dependency Management

- Use `~=` (Python) or `~` (npm) for patch/minor version flexibility
- Lock files must be committed (requirements.txt, package-lock.json)
- Low-risk updates auto-applied on PR validation unless `no-deps-lock-updates` label added
- High-risk updates come via Dependabot PRs

## CI/CD

- PRs to main run validation (lint, type-check, test, CDK diff)
- Merges to main auto-deploy via GitHub Actions
- Container images pushed to ECR with version tags
