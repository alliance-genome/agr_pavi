# Gemini Project: AGR PAVI

## Project Overview

This is the repository for Proteins Annotations and Variants Inspector (PAVI), a web application that enables researchers to visualize protein sequence alignments with variant annotations across model organisms. It provides cross-species ortholog comparisons integrated with the Alliance of Genome Resources.

The project is a monorepo containing the following components:

*   **`webui`**: An interactive user interface built with Next.js 15, React 19, and TypeScript.
*   **`api`**: A FastAPI backend that manages jobs and orchestrates the pipeline.
*   **`pipeline_components`**: A collection of Python scripts for sequence retrieval and alignment, using Clustal Omega.
*   **`shared_aws`**: Shared AWS CDK infrastructure code in Python.

The architecture is transitioning from a Nextflow-based pipeline to a more cost-effective AWS Step Functions and Fargate Spot model.

## Building and Running

### Common Commands

The root `Makefile` provides commands to manage the entire project. Each component also has its own `Makefile` with more specific commands.

### WebUI

*   **Install dependencies**: `make -C webui install-deps`
*   **Run development server**: `make -C webui run-server-dev`
*   **Run tests**: `make -C webui test`
*   **Run linting**: `make -C webui lint`
*   **Run type checking**: `make -C webui typecheck`

### API

*   **Install dependencies**: `make -C api install-deps`
*   **Run development server**: `make -C api run-server-dev`
*   **Run tests**: `make -C api run-tests`
*   **Run unit tests**: `make -C api run-unit-tests`
*   **Run style checks**: `make -C api run-style-checks`
*   **Run type checks**: `make -C api run-type-checks`

### Deployment (AWS CDK)

*   **Validate CDK changes**: `make validate-dev`
*   **Deploy to dev environment**: `make deploy-dev`

## Development Conventions

*   **Python**:
    *   Python 3.12
    *   Type hints are required and checked with `mypy`.
    *   Code is linted with `flake8`.
    *   Tests are written with `pytest`.
*   **TypeScript**:
    *   Strict mode is enabled.
    *   Code is linted with `ESLint` using the `next` configuration.
    *   Tests are written with `Jest`.
*   **Infrastructure**:
    *   AWS CDK is used for infrastructure as code, written in Python.
    *   `pip-tools` is used for dependency management.