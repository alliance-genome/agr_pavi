# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AGR PAVI (Proteins Annotations and Variants Inspector) is a bioinformatics web application for visualizing protein sequence alignments with variant annotations across model organisms. It provides ortholog comparisons using Clustal Omega for alignment and EMBL-EBI's Nightingale components for visualization.

**Live:** https://pavi.alliancegenome.org/submit
**Dev:** https://dev-pavi.alliancegenome.org

## Architecture

```
agr_pavi/
├── webui/              # Next.js 15 frontend (React 19, TypeScript, Nightingale)
│   └── src/app/        # App Router pages: /submit, /progress, /result, /jobs, /help, /admin
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

### Pipeline Execution Modes

| Mode | Storage | Orchestration | Use Case |
|------|---------|---------------|----------|
| **Local Pipeline** | SQLite + Local FS | Direct Python | Dev on EC2 |
| **Step Functions** | DynamoDB + S3 | AWS Step Functions | Production |
| **Nextflow** (legacy) | In-memory + S3 | Nextflow on Batch | Deprecated |

Set via `USE_LOCAL_PIPELINE=true` or `USE_STEP_FUNCTIONS=true`. See `docs/configuration-reference.md`.

### API Endpoints
- `POST /api/pipeline-job/` - Submit alignment job with sequence regions
- `GET /api/pipeline-job/{uuid}` - Poll job status
- `GET /api/pipeline-job/{uuid}/result/alignment` - Fetch alignment file
- `GET /api/pipeline-job/{uuid}/result/seq-info` - Fetch sequence metadata
- `GET /api/pipeline-job/{uuid}/logs` - Fetch pipeline logs

### WebUI User Flow
1. `/submit` - Job submission form with gene/allele selection
2. `/progress?uuid={id}` - Real-time job progress tracking
3. `/result?uuid={id}` - Alignment visualization with Nightingale components
4. `/jobs` - Job history table
5. `/help` - Documentation, FAQ, and glossary

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
make run-server-dev      # FastAPI dev server on localhost:8000

# WebUI (from webui/)
PAVI_API_BASE_URL=http://localhost:8000 make run-server-dev  # Next.js on localhost:3000

# WebUI with mock API (no backend required)
npm run dev:mock         # Uses mock data for frontend-only development
```

Note: The API docker container runs on port 8080, but `fastapi dev` uses 8000.

### Running Tests
```bash
# Python - all tests with coverage (from component directory)
make run-tests           # pytest --cov (all tests)
make run-unit-tests      # pytest tests/a_unit/ only

# Python - single test file or function
.venv/bin/python -m pytest tests/a_unit/test_main.py -v
.venv/bin/python -m pytest tests/a_unit/test_main.py::test_health_reporting -v

# TypeScript (from webui/)
npm run test -- --testPathPattern="AlignmentEntry.test"
npm run test:watch  # Interactive watch mode
npm run test:dev    # Verbose output (without --silent)
```

### Verbose Testing with Coverage
```bash
# Python (from component directory) - HTML coverage report
make run-tests-dev   # Runs pytest with --cov-report html -v
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
make run-e2e-tests-dev   # Interactive Cypress mode (no visual regression)
make open-cypress-image-diff-html-report  # View failed visual regression at localhost:6868
```

Visual regression tests use `cypress-image-diff` and require the Docker container for consistent rendering. If tests fail, use the HTML report to inspect differences and update baselines.

### Percy Visual Testing
Percy visual testing runs against Vercel preview deployments. See `webui/VERCEL_PERCY_SETUP.md` for configuration details. The preview deployment uses `MOCK_API=true` to provide consistent mock data for visual snapshots.

### Local EC2 Deployment (Dev)

The dev environment runs directly on EC2 with Caddy as reverse proxy:

```
Internet → Caddy (HTTPS/Let's Encrypt) → localhost:3000 (WebUI)
                                       → localhost:8000 (API)
```

**Caddyfile** (`/etc/caddy/Caddyfile`):
```
dev-pavi.alliancegenome.org {
    handle /api/* {
        reverse_proxy localhost:8000
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

**Start services:**
```bash
# API (production)
cd api/src
USE_LOCAL_PIPELINE=true ../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

# WebUI (production) - build once, then start
cd webui
PAVI_API_BASE_URL=http://localhost:8000 npm run build
PAVI_API_BASE_URL=http://localhost:8000 npm run start

# Caddy (systemd)
sudo systemctl start caddy
```

**Note:** Do NOT use `npm run dev` for production - it's slow and shows warnings.

### AWS Deployment (Elastic Beanstalk)
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
- Tests in `tests/a_unit/` (unit) and `tests/b_integration/` (integration) - prefix ensures execution order

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
- `@nightingale-elements/*` - Protein sequence visualization (MSA viewer, tracks, navigation)
- `primereact` + `primeflex` - UI component library
- `@tanstack/react-virtual` - Virtualized alignment rendering
- `@mui/material` - Material UI components
- `clustal-js` - Clustal format parsing
- `@lit/react` - Lit element wrappers for Nightingale web components

**API:**
- `fastapi[standard]` - REST API framework
- `smart-open[s3]` - S3 file access

**Pipeline:**
- `biopython` - Sequence manipulation and FASTA handling
- `pysam` - SAM/BAM file operations
- Clustal Omega - Multiple sequence alignment (external binary)

## Documentation

Comprehensive documentation is available in `docs/`:

- [API Reference](docs/api-reference.md) - REST API endpoints and schemas
- [Configuration Reference](docs/configuration-reference.md) - All environment variables
- [Testing Guide](docs/testing-guide.md) - How to run and write tests
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [Data Flow Diagrams](docs/data-flows.md) - System data flows
- [Database Schemas](docs/database-schemas.md) - Storage schemas
- [Security Guide](docs/security.md) - Security practices

See [docs/README.md](docs/README.md) for the complete documentation index
