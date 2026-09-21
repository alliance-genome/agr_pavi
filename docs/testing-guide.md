# Testing Guide

This guide covers testing practices, conventions, and tools used in PAVI.

## Overview

PAVI uses a multi-layer testing strategy:

| Layer | Tools | Purpose |
|-------|-------|---------|
| **Unit Tests** | pytest, Jest | Test individual functions and components |
| **Integration Tests** | pytest + httpx, Cypress | Test component interactions |
| **E2E Tests** | Cypress | Test complete user workflows |
| **Visual Regression** | cypress-image-diff, Percy | Detect UI changes |
| **Type Checking** | mypy, TypeScript | Static type verification |
| **Linting** | flake8, ESLint | Code style enforcement |

## Test Organization

### Python Projects

```
api/
├── tests/
│   ├── a_unit/              # Unit tests (run first)
│   │   ├── __init__.py
│   │   ├── test_main.py
│   │   └── test_job_service.py
│   ├── b_integration/       # Integration tests (run second)
│   │   ├── __init__.py
│   │   ├── test_main.py
│   │   └── helper_fns.py
│   └── requirements.txt     # Test dependencies
├── pytest.ini               # pytest configuration
└── .coveragerc              # Coverage configuration

pipeline_components/seq_retrieval/
├── tests/
│   ├── unit/
│   │   ├── seq_info/
│   │   │   ├── conftest.py      # Fixtures for module
│   │   │   └── test_seq_info.py
│   │   ├── seq_region/
│   │   │   ├── conftest.py
│   │   │   ├── fixtures/        # Fixture definitions
│   │   │   │   ├── seq_regions.py
│   │   │   │   └── multipart_seq_regions.py
│   │   │   ├── test_seq_region.py
│   │   │   └── test_multipart_seq_region.py
│   │   └── variant/
│   │       ├── conftest.py
│   │       ├── fixtures/
│   │       └── test_variant.py
│   └── resources/           # Test data files
└── pytest.ini
```

**Note:** Directory prefixes (`a_unit/`, `b_integration/`) ensure execution order.

### TypeScript Projects

```
webui/
├── src/
│   └── app/
│       ├── components/
│       │   └── __tests__/
│       │       └── DarkModeToggle.test.tsx
│       ├── result/
│       │   └── components/
│       │       └── __tests__/
│       │           └── InteractiveAlignment.test.tsx
│       └── submit/
│           └── components/
│               └── AlignmentEntry/
│                   ├── __mocks__/
│                   │   └── serverActions.ts
│                   └── __tests__/
│                       └── AlignmentEntry.test.tsx
├── __mocks__/               # Global module mocks
│   └── nightingale-track.ts
├── jest.config.ts           # Jest configuration
└── jest.setup.ts            # Jest setup
```

**Convention:** Tests are co-located in `__tests__/` directories alongside their source.

## Running Tests

### Python (from component directory)

```bash
# All validation checks
make run-type-checks     # mypy
make run-style-checks    # flake8
make run-unit-tests      # pytest tests/a_unit/

# Full test suite with coverage
make run-tests           # pytest --cov

# Verbose output with HTML coverage report
make run-tests-dev       # pytest --cov --cov-report html -v

# Single test file
.venv/bin/python -m pytest tests/a_unit/test_main.py -v

# Single test function
.venv/bin/python -m pytest tests/a_unit/test_main.py::test_health_reporting -v

# Integration tests with containers
make run-integration-test-container
```

### TypeScript (from webui/)

```bash
# All validation checks
make run-type-checks     # tsc --noEmit --strict
make run-style-checks    # eslint --max-warnings 0
make run-unit-tests      # jest --silent

# Run specific test file
npm run test -- --testPathPattern="AlignmentEntry.test"

# Interactive watch mode
npm run test:watch

# Verbose output (without --silent)
npm run test:dev
```

### E2E Tests (from webui/)

```bash
# Full E2E with visual regression (Docker required)
make run-e2e-tests

# Interactive Cypress mode (no visual regression)
make run-e2e-tests-dev

# View visual regression failures
make open-cypress-image-diff-html-report  # Opens at localhost:6868
```

## Writing Tests

### Python Unit Tests

```python
# tests/a_unit/test_example.py
import pytest
from my_module import my_function

def test_my_function_basic() -> None:
    """Test basic functionality."""
    result = my_function("input")
    assert result == "expected"

def test_my_function_edge_case() -> None:
    """Test edge case handling."""
    with pytest.raises(ValueError):
        my_function(None)

class TestMyClass:
    """Group related tests."""

    def test_method_one(self) -> None:
        pass

    def test_method_two(self) -> None:
        pass
```

### Python Fixtures

```python
# tests/unit/conftest.py
import pytest
from .fixtures.my_fixtures import *  # noqa: F401, F403

# tests/unit/fixtures/my_fixtures.py
import pytest

@pytest.fixture
def sample_data() -> dict:
    """Provide sample test data."""
    return {
        "key": "value",
        "numbers": [1, 2, 3]
    }

@pytest.fixture
def mock_fasta_file(tmp_path) -> str:
    """Create temporary FASTA file."""
    fasta = tmp_path / "test.fasta"
    fasta.write_text(">seq1\nACGT\n")
    return str(fasta)
```

### Python Mocking

```python
# Using pytest-mock
def test_with_mock(mocker) -> None:
    mock_fetch = mocker.patch('my_module.fetch_data')
    mock_fetch.return_value = {"data": "mocked"}

    result = my_function()
    assert result["data"] == "mocked"
    mock_fetch.assert_called_once()

# Using responses for HTTP mocking
import responses

@responses.activate
def test_api_call() -> None:
    responses.add(
        responses.GET,
        "https://api.example.com/data",
        json={"result": "success"},
        status=200
    )

    result = fetch_from_api()
    assert result["result"] == "success"
```

### TypeScript Unit Tests

```typescript
// __tests__/MyComponent.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

// Mock external modules
jest.mock('../serverActions');

describe('MyComponent', () => {
    it('renders correctly', () => {
        render(<MyComponent />);
        expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });

    it('handles user interaction', async () => {
        render(<MyComponent />);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(screen.getByText('Updated')).toBeInTheDocument();
        });
    });

    it('handles errors gracefully', () => {
        render(<MyComponent error="Something went wrong" />);
        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });
});
```

### TypeScript Mocking

```typescript
// __mocks__/serverActions.ts
export const fetchData = jest.fn().mockResolvedValue({
    data: 'mocked response'
});

// In test file
jest.mock('../serverActions');
import { fetchData } from '../serverActions';

beforeEach(() => {
    jest.clearAllMocks();
});

it('calls fetchData', async () => {
    (fetchData as jest.Mock).mockResolvedValueOnce({ special: 'data' });

    // ... test code

    expect(fetchData).toHaveBeenCalledWith('expected-arg');
});
```

### Cypress E2E Tests

```typescript
// cypress/e2e/my-workflow.cy.ts
/// <reference types="cypress" />

describe('My Workflow', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('completes successfully', () => {
        // Fill form
        cy.get('[data-testid="input-field"]').type('test value');
        cy.get('[data-testid="submit-button"]').click();

        // Wait for result
        cy.get('[data-testid="result"]', { timeout: 30000 })
            .should('contain', 'Success');
    });

    it('handles errors', () => {
        // Intercept API to simulate error
        cy.intercept('POST', '/api/pipeline-job/', {
            statusCode: 500,
            body: { detail: 'Server error' }
        });

        cy.get('[data-testid="submit-button"]').click();
        cy.get('[data-testid="error-message"]')
            .should('be.visible');
    });
});
```

### Visual Regression Tests

```typescript
// cypress/e2e/visual-test.cy.ts
describe('Visual Regression', () => {
    afterEach(() => {
        cy.task('clearSnapshotResults');
    });

    it('matches baseline screenshot', () => {
        cy.visit('/result?uuid=test-id');

        // Wait for content to load
        cy.get('[data-testid="alignment-view"]')
            .should('be.visible');

        // Compare screenshot
        cy.get('[data-testid="alignment-view"]')
            .compareSnapshot('alignment-view-baseline')
            .then((result) => {
                cy.task('storeSnapshotResult', {
                    id: 'alignment-view-baseline',
                    result
                });
            });

        // Assert no failures
        cy.task('errorOnSnapshotFailures');
    });
});
```

## Coverage Requirements

### Python Coverage

| Metric | Requirement |
|--------|-------------|
| Line Coverage | 90% minimum |
| Branch Coverage | 90% minimum |

**Exclusions (`.coveragerc`):**
- `__init__.py` files
- AWS infrastructure code
- CLI entry points
- Code with `# pragma: no cover`
- `AssertionError` and `NotImplementedError` raises

### TypeScript Coverage

| Metric | Requirement |
|--------|-------------|
| Lines | 60% minimum |
| Functions | 50% minimum |
| Branches | 50% minimum |
| Statements | 60% minimum |

**Exclusions (`jest.config.ts`):**
- `serverActions.ts` files
- `node_modules/`

## CI/CD Integration

Tests run automatically on pull requests:

```yaml
# Simplified workflow
jobs:
  python-checks:
    runs-on: ubuntu-latest
    steps:
      - run: make run-type-checks
      - run: make run-style-checks
      - run: make run-unit-tests

  typescript-checks:
    runs-on: ubuntu-latest
    steps:
      - run: make run-type-checks
      - run: make run-style-checks
      - run: make run-unit-tests

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [python-checks, typescript-checks]
    steps:
      - run: docker-compose up -d
      - run: make run-e2e-tests
```

## Best Practices

### Test Naming

```python
# Good: Descriptive test names
def test_job_status_returns_running_for_active_execution():
    pass

def test_variant_embedding_handles_insertions_at_boundary():
    pass

# Bad: Vague names
def test_job():
    pass

def test_variant():
    pass
```

### Test Isolation

```python
# Good: Each test is independent
@pytest.fixture
def fresh_database(tmp_path):
    db = tmp_path / "test.db"
    yield str(db)
    # Cleanup happens automatically

# Bad: Tests depend on shared state
shared_data = {}  # Don't do this
```

### Meaningful Assertions

```python
# Good: Clear assertion messages
assert result.status == "completed", f"Expected completed, got {result.status}"

# Good: Multiple specific assertions
assert len(sequences) == 3
assert sequences[0].name == "expected_name"
assert all(s.length > 0 for s in sequences)

# Bad: Single boolean without context
assert result  # What is being checked?
```

### Test Resource Files

```
tests/resources/
├── valid-input.json          # Valid test input
├── invalid-input.json        # Invalid input for error tests
├── expected-output.json      # Expected results for comparison
└── sample.fasta             # Sample FASTA file
```

## Debugging Tests

### Python

```bash
# Run with verbose output
pytest tests/a_unit/test_file.py -v

# Run with print statements shown
pytest tests/a_unit/test_file.py -s

# Run with debugger on failure
pytest tests/a_unit/test_file.py --pdb

# Run specific test
pytest tests/a_unit/test_file.py::test_function_name -v
```

### TypeScript

```bash
# Run with verbose output
npm run test:dev -- --testPathPattern="MyTest"

# Run in watch mode for debugging
npm run test:watch

# Debug in VS Code: Add launch.json configuration
```

### Cypress

```bash
# Open interactive mode
make run-e2e-tests-dev

# Debug in browser
cy.debug()  # Add in test
cy.pause()  # Pause execution
```

## Visual Regression Testing

### Updating Baselines

When intentional UI changes occur:

1. Run tests to generate new screenshots
2. Review differences in HTML report
3. Copy new screenshots to baseline directory:
   ```bash
   cp cypress/visual-tests/cypress-image-diff-screenshots/*.png \
      cypress/visual-tests/cypress-image-diff-screenshots/baseline/
   ```
4. Commit updated baselines

### Percy Integration

Percy runs against Vercel preview deployments:

```bash
# Local testing with Percy
PERCY_TOKEN=your_token npm run percy

# CI: Percy runs automatically on Vercel previews
```

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Development conventions
- [Troubleshooting](troubleshooting.md) - Test failure debugging
- [Configuration Reference](configuration-reference.md) - Test environment setup
