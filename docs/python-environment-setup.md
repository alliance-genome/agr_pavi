# Python Environment Setup

This document describes the Python environment configuration for PAVI local EC2 deployment, including the use of `uv` for package management and `ruff`/`mypy` for code quality.

## Overview

The PAVI API and pipeline components use:

- **Python 3.12** - Latest stable Python version
- **uv** - Fast Python package installer and resolver
- **ruff** - Fast Python linter (replaces flake8, isort, etc.)
- **mypy** - Static type checker

## uv Package Manager

### What is uv?

`uv` is an extremely fast Python package installer and resolver, written in Rust. It's a drop-in replacement for `pip` and `pip-tools`, offering 10-100x faster dependency resolution.

### Installation

uv is typically pre-installed on modern systems. Verify with:

```bash
which uv
# /home/ec2-user/.local/bin/uv

uv --version
# uv 0.x.x
```

If not installed:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Basic Usage

```bash
# Create virtual environment
uv venv --python 3.12 .venv

# Activate (standard Python activation)
source .venv/bin/activate

# Install packages
uv pip install package-name

# Install from requirements.txt
uv pip install -r requirements.txt

# Install multiple packages
uv pip install ruff mypy pytest
```

## API Environment Setup

### Create and Configure

```bash
cd /home/ec2-user/agr_pavi/api

# Create virtual environment with Python 3.12
uv venv --python 3.12 .venv

# Install production dependencies
uv pip install -r requirements.txt

# Install development tools
uv pip install ruff mypy

# Verify installation
.venv/bin/python --version
# Python 3.12.12

.venv/bin/ruff --version
# ruff 0.14.14

.venv/bin/mypy --version
# mypy 1.19.1
```

### requirements.txt Contents

The API requires these core dependencies:

```
fastapi[standard]~=0.120.0
smart-open[s3]~=7.1.0
boto3~=1.35.0
pydantic~=2.10.0
```

## Pipeline Components Environment

### seq_retrieval Setup

```bash
cd /home/ec2-user/agr_pavi/pipeline_components/seq_retrieval

# Create virtual environment
uv venv --python 3.12 .venv

# Install dependencies
uv pip install -r requirements.txt

# Verify key packages
.venv/bin/python -c "
import click
import pysam
import Bio
import jsonpickle
print('All imports successful')
"
```

### requirements.txt Contents

The seq_retrieval component requires:

```
biopython~=1.85
click~=8.3
jsonpickle~=4.1
pysam~=0.23
requests~=2.32
```

## Code Quality Tools

### ruff - Fast Python Linter

ruff is a high-performance Python linter that replaces multiple tools (flake8, isort, pyupgrade, etc.).

#### Running ruff

```bash
cd /home/ec2-user/agr_pavi/api

# Check all files in src/
.venv/bin/ruff check src/

# Check specific files
.venv/bin/ruff check src/local_job_store.py src/local_pipeline.py

# Auto-fix issues
.venv/bin/ruff check --fix src/

# Show detailed output
.venv/bin/ruff check --show-fixes src/
```

#### Common ruff Rules

| Code | Description | Example |
|------|-------------|---------|
| F401 | Unused import | `import os` but os never used |
| F821 | Undefined name | Using variable before definition |
| E501 | Line too long | Lines > 88 characters |
| E711 | Comparison to None | `x == None` instead of `x is None` |

#### ruff Configuration

If needed, create `ruff.toml` or add to `pyproject.toml`:

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "W", "I"]
ignore = ["E501"]  # Ignore line length
```

### mypy - Static Type Checker

mypy verifies type annotations in Python code.

#### Running mypy

```bash
cd /home/ec2-user/agr_pavi/api

# Check specific files
.venv/bin/mypy src/local_job_store.py src/local_pipeline.py \
  src/config.py src/job_service.py src/main.py \
  --ignore-missing-imports

# Check all files
.venv/bin/mypy src/ --ignore-missing-imports

# Strict mode
.venv/bin/mypy src/ --strict --ignore-missing-imports
```

#### Common mypy Flags

| Flag | Description |
|------|-------------|
| `--ignore-missing-imports` | Don't error on imports without stubs |
| `--strict` | Enable all strict checks |
| `--no-implicit-optional` | Don't assume Optional for None defaults |
| `--warn-return-any` | Warn when returning Any |

#### mypy Configuration

Add to `pyproject.toml`:

```toml
[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_configs = true
ignore_missing_imports = true

[[tool.mypy.overrides]]
module = "boto3.*"
ignore_missing_imports = true
```

## Type Annotations in PAVI

### Examples from local_job_store.py

```python
from typing import Any, Optional

class LocalJobStore:
    def __init__(self, db_path: Optional[str] = None):
        """Initialize with optional custom database path."""
        self.db_path: str = db_path or default_path
        self._local: threading.local = threading.local()

    def create_job(
        self,
        job_id: str,
        input_data: list[dict[str, Any]],
        input_count: int = 0
    ) -> dict[str, Any]:
        """Create a new job record."""
        ...

    def get_job(self, job_id: str) -> Optional[dict[str, Any]]:
        """Get job by ID, returns None if not found."""
        ...
```

### Examples from local_pipeline.py

```python
from typing import Any, Callable, Optional
from pathlib import Path

class LocalPipelineRunner:
    def __init__(
        self,
        work_dir: str = "/var/lib/pavi/work",
        results_dir: str = "/var/lib/pavi/results",
        max_workers: int = 4,
        progress_callback: Optional[Callable[[str, str, int], None]] = None,
    ):
        self.work_dir: Path = Path(work_dir)
        self.results_dir: Path = Path(results_dir)
        self.max_workers: int = max_workers
        self.progress_callback: Optional[Callable[[str, str, int], None]] = progress_callback
```

## Running All Checks

### Quick Check Script

```bash
#!/bin/bash
# check-code.sh

cd /home/ec2-user/agr_pavi/api

echo "=== Running ruff ==="
.venv/bin/ruff check src/
RUFF_EXIT=$?

echo ""
echo "=== Running mypy ==="
.venv/bin/mypy src/local_job_store.py src/local_pipeline.py \
  src/config.py src/job_service.py src/main.py \
  --ignore-missing-imports
MYPY_EXIT=$?

echo ""
if [ $RUFF_EXIT -eq 0 ] && [ $MYPY_EXIT -eq 0 ]; then
    echo "All checks passed!"
    exit 0
else
    echo "Some checks failed."
    exit 1
fi
```

### Pre-commit Integration

If using pre-commit, add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.14.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.19.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]
        args: [--ignore-missing-imports]
```

## Troubleshooting

### "No module named pip"

```bash
# Use uv directly instead
uv pip install package-name
```

### "Python 3.12 not found"

```bash
# Check available Python versions
ls /usr/bin/python*

# Install Python 3.12 if missing
sudo yum install python3.12

# Or use pyenv
pyenv install 3.12.0
pyenv local 3.12.0
```

### "uv venv failed"

```bash
# Create with existing Python
python3.12 -m venv .venv

# Then use uv for installing
uv pip install -r requirements.txt
```

### mypy "Cannot find implementation"

```bash
# Add type stubs
uv pip install types-requests types-boto3

# Or ignore specific modules in mypy.ini
[mypy-boto3.*]
ignore_missing_imports = True
```

### ruff conflicts with existing tools

If migrating from flake8/isort:

```bash
# Remove old tools
uv pip uninstall flake8 isort pyflakes

# ruff covers all their functionality
uv pip install ruff
```

## Package Versions Summary

| Package | Version | Purpose |
|---------|---------|---------|
| Python | 3.12.12 | Runtime |
| uv | 0.x.x | Package management |
| ruff | 0.14.14 | Linting |
| mypy | 1.19.1 | Type checking |
| FastAPI | 0.120.x | Web framework |
| boto3 | 1.35.x | AWS SDK |
| biopython | 1.85 | Bioinformatics |
| pysam | 0.23.x | SAM/BAM handling |

## References

- [uv Documentation](https://docs.astral.sh/uv/)
- [ruff Documentation](https://docs.astral.sh/ruff/)
- [mypy Documentation](https://mypy.readthedocs.io/)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)
