# Migrate Python Dependency Management: pip-tools → uv

**Date**: 2026-03-08
**Jira**: KANBAN-648
**Approach**: Component-by-component migration, starting with the simplest

---

## Current State

```
pyproject.toml  ──▶  pip-compile (pip-tools 7.4.1)  ──▶  requirements.txt (with hashes)
                                                          tests/requirements.txt
```

- 7 Python components, each with their own `pyproject.toml` + `requirements.txt` + `tests/requirements.txt`
- `common_make` centralizes all pip-tools targets (venv creation, pip-compile, pip install)
- Dockerfiles install from `requirements.txt`
- Dependabot has extensive subdependency ignore lists as workaround
- `pavi_shared_aws` wheel built separately, referenced via `file:///tmp/` path

## Target State

```
pyproject.toml  ──▶  uv lock  ──▶  uv.lock (with dependency graph)
```

- Same `pyproject.toml` files (PEP-621 compliant — no changes needed)
- `uv.lock` replaces `requirements.txt` + `tests/requirements.txt` (single lock file per component)
- `common_make` uses `uv` commands instead of pip-tools
- Dockerfiles use `uv sync` or `uv pip install`
- Dependabot config simplified (uv.lock encodes dependency graph)

---

## Migration Order

Components ordered by complexity (simplest first):

```
Phase 1: common_make + simple component        (foundation)
Phase 2: remaining standalone components        (parallel)
Phase 3: shared_aws wheel + CDK infra          (complex dependency chain)
Phase 4: Dockerfiles + CI/CD + Dependabot      (integration)
```

---

## Phase 1: Foundation — common_make + API

### Step 1.1: Update common_make

Replace pip-tools targets with uv equivalents.

**Current targets → New targets:**

| Current | New | Command |
|---------|-----|---------|
| `.venv/` (python3.12 -m venv) | `.venv/` (`uv venv --python 3.12`) | `uv venv --python 3.12 .venv/` |
| `.venv-build/` (pip-tools install) | Remove entirely | uv doesn't need a separate build venv |
| `install-python-deps` (pip install -r requirements.txt) | `install-python-deps` (`uv sync`) | `uv sync --frozen` |
| `install-python-test-deps` (pip install -r tests/requirements.txt) | `install-python-test-deps` (`uv sync --extra test`) | `uv sync --frozen --extra test` |
| `update-python-deps-lock` (pip-compile --upgrade) | `update-python-deps-lock` (`uv lock --upgrade`) | `uv lock --upgrade` |
| `update-python-test-deps-lock` | Remove (uv.lock covers all extras) | N/A |
| `_python-write-lock-file` | Remove | N/A |

**Key simplifications:**
- No more `.venv-build/` — uv doesn't need pip-tools installed in a separate venv
- Single `uv.lock` replaces both `requirements.txt` and `tests/requirements.txt`
- `uv sync --frozen` installs exactly what's in the lock file (equivalent to `pip install -r requirements.txt`)
- `uv sync --extra test` includes test dependencies from the same lock file

### Step 1.2: Migrate API component

```bash
cd api/
uv lock                    # Generate uv.lock from existing pyproject.toml
uv sync --extra test       # Verify all deps install correctly
make run-unit-tests        # Verify tests pass
```

**Files changed:**
- `api/uv.lock` — NEW (generated)
- `api/requirements.txt` — DELETE
- `api/tests/requirements.txt` — DELETE

### Step 1.3: Verify API works end-to-end

```bash
cd api/
make run-style-checks
make run-type-checks
make run-unit-tests
```

---

## Phase 2: Remaining Standalone Components

### Step 2.1: Migrate seq_retrieval

```bash
cd pipeline_components/seq_retrieval/
uv lock
uv sync --extra test
make run-unit-tests
```

**Note:** seq_retrieval uses `pip install --editable .` for tests. Replace with:
```makefile
install-test-deps:
    uv sync --frozen --extra test
    # uv sync already handles editable installs for the project itself
```

**Files changed:**
- `pipeline_components/seq_retrieval/uv.lock` — NEW
- `pipeline_components/seq_retrieval/requirements.txt` — DELETE
- `pipeline_components/seq_retrieval/tests/requirements.txt` — DELETE

---

## Phase 3: Shared AWS Package + CDK Infrastructure

This is the most complex phase due to the wheel dependency chain.

### Step 3.1: Migrate shared_aws/py_package

The shared package builds a wheel that other components depend on. Two approaches:

**Option A: Keep wheel build, use uv for deps**
```makefile
build:
    uv build  # Replaces python -m build
    # uv build also supports SOURCE_DATE_EPOCH for reproducible builds
```

**Option B: Use uv workspace (monorepo-style)**
- Define a workspace in root `pyproject.toml`
- Components reference `pavi_shared_aws` as a workspace dependency
- uv resolves it automatically without wheel building

**Recommendation:** Start with Option A (minimal change), evaluate Option B later.

**Files changed:**
- `shared_aws/py_package/uv.lock` — NEW
- `shared_aws/py_package/requirements.txt` — DELETE
- `shared_aws/py_package/Makefile` — Update build target

### Step 3.2: Migrate CDK infrastructure components

All 4 CDK infra components follow the same pattern:

```bash
for dir in api/aws_infra pipeline_components/aws_infra shared_aws/aws_infra webui/aws_infra; do
    cd $dir
    uv lock
    uv sync --extra test
    make run-unit-tests
    cd -
done
```

**Consideration:** The `file:///tmp/pavi_shared_aws-0.0.0-py3-none-any.whl` dependency in `pyproject.toml` needs to work with `uv lock`. Test this — uv should handle `file://` URLs.

**Files changed (per component):**
- `*/aws_infra/uv.lock` — NEW
- `*/aws_infra/requirements.txt` — DELETE
- `*/aws_infra/tests/requirements.txt` — DELETE

---

## Phase 4: Integration — Dockerfiles, CI/CD, Dependabot

### Step 4.1: Update Dockerfiles

**Current pattern:**
```dockerfile
RUN python -m venv .venv/
RUN .venv/bin/pip install --no-cache-dir -r requirements.txt
```

**New pattern:**
```dockerfile
# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy project files
COPY pyproject.toml uv.lock ./

# Install dependencies (no venv needed — uv manages it)
RUN uv sync --frozen --no-dev --no-install-project
```

**Affected Dockerfiles:**
- `api/Dockerfile`
- `pipeline_components/seq_retrieval/Dockerfile`

### Step 4.2: Update GitHub Actions workflows

Add uv installation step to workflows that run Python:

```yaml
- name: Install uv
  uses: astral-sh/setup-uv@v5

- name: Install dependencies
  run: uv sync --frozen --extra test
```

**Affected workflows:**
- `.github/workflows/PR-validation.yml`
- `.github/workflows/main-build-and-deploy.yml`

### Step 4.3: Simplify Dependabot configuration

**Current:** Extensive ignore lists for subdependencies in `.github/dependabot.yml`

**New:** Remove subdependency ignore lists. With `uv.lock`, Dependabot can distinguish direct deps from transitive deps and handles them appropriately.

**Note:** Verify Dependabot supports `uv` package ecosystem. As of 2026, Dependabot has uv support. If not fully supported, the `pip` ecosystem with `uv.lock` may still work, or use Renovate as an alternative.

### Step 4.4: Clean up common_make

Remove all pip-tools references:
- Remove `.venv-build/` target
- Remove `_python-write-lock-file` target
- Remove `pip-tools==7.4.1` installation
- Simplify `update-deps-locks-all` (single `uv lock --upgrade` per component)

---

## File Change Summary

| Action | Files |
|--------|-------|
| **DELETE** | 14 files: `*/requirements.txt` + `*/tests/requirements.txt` across 7 components |
| **CREATE** | 7 files: `*/uv.lock` (one per component) |
| **MODIFY** | `common_make`, 4 component Makefiles, 2 Dockerfiles, 2 CI workflows, `dependabot.yml` |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| `file:///tmp/` wheel path not supported by `uv lock` | Test early in Phase 3; fall back to `uv pip install` for wheel |
| Dependabot doesn't fully support uv.lock | Check current support; can use Renovate as alternative |
| Hash verification differences | uv supports `--locked` which ensures reproducibility; test in CI |
| Docker build cache invalidation | `uv.lock` changes less frequently than `requirements.txt`, so cache should improve |
| Team unfamiliarity with uv | Document equivalent commands in CLAUDE.md |

---

## Command Equivalence Reference

| pip-tools | uv |
|-----------|----|
| `python -m venv .venv` | `uv venv` |
| `pip-compile pyproject.toml -o requirements.txt` | `uv lock` |
| `pip-compile --upgrade` | `uv lock --upgrade` |
| `pip install -r requirements.txt` | `uv sync --frozen` |
| `pip install -r tests/requirements.txt` | `uv sync --frozen --extra test` |
| `pip install --editable .` | `uv sync` (editable by default for project) |
| `python -m build` | `uv build` |
| `pip-compile --generate-hashes` | `uv lock` (hashes included by default in uv.lock) |

---

## Verification Checklist

For each component, after migration:
- [ ] `uv lock` generates valid lock file
- [ ] `uv sync --frozen` installs all deps
- [ ] `uv sync --frozen --extra test` installs test deps
- [ ] `make run-style-checks` passes
- [ ] `make run-type-checks` passes
- [ ] `make run-unit-tests` passes
- [ ] Docker build succeeds
- [ ] CI workflow succeeds
