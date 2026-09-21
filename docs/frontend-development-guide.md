# Frontend Development Guide

This guide is the single source of truth for frontend development in PAVI (Protein Annotation and Variant Inspector). It covers the Next.js application architecture, development workflows, testing, and deployment.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Mock API System](#mock-api-system)
- [Nightingale Integration](#nightingale-integration)
- [Key Components Deep Dive](#key-components-deep-dive)
- [UI Libraries](#ui-libraries)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Building and Deploying](#building-and-deploying)

---

## Architecture Overview

### Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | ~15.5 | React framework (App Router) |
| React | ^19 | UI library |
| TypeScript | ~5.9 | Type-safe JavaScript |
| Node.js | ^24 | Runtime (managed via NVM) |
| PrimeReact | ~10.9 | UI component library |
| Material UI | ^7.3 | Additional UI components |
| Nightingale | ^5.0 | Protein sequence visualization |

### App Router Pages

The WebUI uses Next.js App Router. All pages reside under `webui/src/app/`:

| Route | Directory | Description |
|-------|-----------|-------------|
| `/` | `page.tsx` | Landing page with feature overview |
| `/submit` | `submit/` | Job submission form with gene/allele selection |
| `/progress` | `progress/` | Real-time job progress tracking |
| `/result` | `result/` | Alignment visualization with Nightingale |
| `/jobs` | `jobs/` | Job history table (localStorage-backed) |
| `/help` | `help/` | Documentation, FAQ, and glossary |
| `/admin` | `admin/` | Admin page (client-side password auth) |
| `/benchmark` | `benchmark/` | Internal alignment viewer performance testing |
| `/health` | `health/` | Health check (`force-dynamic` server component) |
| `/alignment` | `alignment/` | Alignment utilities |
| `/accessibility` | `accessibility/` | Accessibility features |

### Component Hierarchy

```
RootLayout (layout.tsx)
├── PrimeReactProvider
│   └── LiveRegionProvider
│       └── LayoutWrapper
│           ├── SkipLinks
│           ├── Header
│           ├── KeyboardShortcuts
│           ├── {children}  (page content)
│           └── Footer
```

The root layout (`src/app/layout.tsx`) sets up:
- The **Lato** font from Google Fonts
- Global CSS (`globals.css`) and AGR theme (`styles/agr-theme.css`)
- PrimeReact provider for theming
- Accessibility components (skip links, live region, keyboard shortcuts)
- Shared header/footer via `LayoutWrapper`

### API Proxy Middleware

The middleware (`src/middleware.ts`) intercepts all `/api/*` requests:

```
Browser request → /api/pipeline-job/...
       │
       ├── MOCK_API=true → Rewrite to /api/mock/pipeline-job/...
       │                    (served by Next.js API route)
       │
       └── MOCK_API unset → Rewrite to PAVI_API_BASE_URL/api/pipeline-job/...
                             (proxied to FastAPI backend)
```

Special cases:
- `/api` redirects to `/api/docs` (FastAPI docs)
- `/api/docs` rewrites to the backend docs endpoint
- `/openapi.json` rewrites to the backend OpenAPI spec
- Routes under `/api/mock` and `/api/proxy-deployment-status` are handled by Next.js directly (not proxied)

The middleware matcher is configured to only run on `/api/:path*` and `/openapi.json`.

---

## Getting Started

### Prerequisites

- **Node.js v24** -- managed via NVM (see `.nvmrc` in `webui/`)
- **npm** -- comes with Node.js (use `--strict-peer-deps` for installs)

Install Node.js via NVM:

```bash
nvm install 24
nvm use 24
```

### Install Dependencies

```bash
cd webui
make install-deps          # Production dependencies
make install-test-deps     # Production + test dependencies (includes jest, cypress, etc.)
```

Or directly with npm:

```bash
npm install --strict-peer-deps
```

### Running with a Real Backend

Start the API server first (see [Backend Development Guide](backend-development-guide.md)), then:

```bash
cd webui
PAVI_API_BASE_URL=http://localhost:8000 make run-server-dev
```

This starts Next.js in development mode on `http://localhost:3000`. All `/api/*` requests are proxied to the FastAPI backend at `http://localhost:8000`.

### Running with Mock API (Frontend-Only)

For UI development without running the backend:

```bash
cd webui
npm run dev:mock
```

This sets `MOCK_API=true` and starts Next.js dev server. All API calls return mock data -- perfect for UI-only development. See [Mock API System](#mock-api-system) for details.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PAVI_API_BASE_URL` | `http://localhost:8000` | Backend API URL for proxy |
| `MOCK_API` | unset | Set to `true` to use mock API responses |
| `ANALYZE` | unset | Set to `true` for bundle analysis (`npm run build:analyze`) |

---

## Project Structure

```
webui/
├── src/
│   └── app/                          # Next.js App Router
│       ├── layout.tsx                # Root layout (providers, header, footer)
│       ├── page.tsx                  # Home page
│       ├── globals.css               # Global styles
│       ├── helper_fns.ts             # Shared utility functions
│       ├── public-ui-modules.ts      # Type declarations for URL imports
│       ├── styles/
│       │   └── agr-theme.css         # AGR theme CSS variables
│       ├── api/
│       │   └── mock/[...path]/       # Mock API catch-all route
│       │       └── route.ts
│       ├── components/               # Shared components
│       │   ├── Header/
│       │   ├── Footer/
│       │   ├── Accessibility/
│       │   ├── LayoutWrapper/
│       │   └── __tests__/
│       ├── hooks/                    # Custom React hooks (see below)
│       ├── submit/                   # Job submission page
│       │   └── components/
│       │       ├── AlignmentEntry/
│       │       ├── AlignmentEntryList/
│       │       ├── JobSubmitForm/
│       │       ├── ExampleDataLoader/
│       │       └── ...
│       ├── progress/                 # Progress tracking page
│       ├── result/                   # Result visualization page
│       │   └── components/
│       │       ├── InteractiveAlignment/
│       │       │   ├── nightingale/  # Nightingale React wrappers
│       │       │   ├── InteractiveAlignment.tsx
│       │       │   └── VirtualizedAlignment.tsx
│       │       ├── AlignmentResultView/
│       │       ├── AlignmentSearch/
│       │       ├── DisplayModeSelector/
│       │       ├── ExportMenu/
│       │       ├── PositionInfoPanel/
│       │       ├── ResultsSummary/
│       │       ├── TextAlignment/
│       │       ├── VisualizationToolbar/
│       │       └── __tests__/
│       ├── jobs/                     # Job history page
│       ├── help/                     # Help page
│       ├── admin/                    # Admin page
│       ├── benchmark/                # Benchmark page
│       └── health/                   # Health check page
│   ├── middleware.ts                 # API proxy middleware
│   └── utils/
│       └── mockData.ts              # Mock API response data
├── __mocks__/                        # Global Jest mocks
│   └── nightingale-track.ts
├── cypress/                          # Cypress E2E tests
├── jest.config.ts                    # Jest configuration
├── jest.setup.ts                     # Jest setup (imports @testing-library/jest-dom)
├── eslint.config.mjs                 # ESLint flat config
├── tsconfig.json                     # TypeScript configuration
├── next.config.mjs                   # Next.js configuration
├── Makefile                          # Build/test/dev commands
├── package.json                      # Dependencies and scripts
└── .nvmrc                            # Node.js version (24)
```

### Custom Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useJobHistory` | Manages job history in localStorage (add, update, remove, filter, star) |
| `useRealtimeUpdates` | Generic polling hook with retry, backoff, timeout, and browser notifications |
| `useResponsive` | Viewport dimensions, breakpoints (`mobile`/`tablet`/`desktop`), orientation |
| `usePrefersReducedMotion` | Detects `prefers-reduced-motion` media query |
| `useTouchDevice` | Detects touch-capable devices |
| `useGeneSearch` | Gene autocomplete search with AGR API integration |
| `useTranscriptSelection` | Transcript selection for a given gene |
| `useAlleleSelection` | Allele selection for a given gene |
| `usePrefetch` | Route and data prefetching with cache |
| `useFocusOnMount` | Focus management and page announcements for accessibility |
| `useWebVitals` | Web Vitals reporting |

All hooks are exported from `src/hooks/index.ts` as a barrel file.

### Path Aliases

TypeScript and Jest are configured with the `@/` path alias:

```typescript
// Resolves to webui/src/utils/mockData.ts
import { getMockResponse } from '@/utils/mockData';
```

Configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

And mirrored in `jest.config.ts`:
```typescript
moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
}
```

---

## Mock API System

The mock API allows full UI development and visual testing without a running backend.

### How It Works

1. **Middleware** (`src/middleware.ts`) checks the `MOCK_API` environment variable
2. When `MOCK_API=true`, requests to `/api/*` are rewritten to `/api/mock/*`
3. The **catch-all route** (`src/app/api/mock/[...path]/route.ts`) handles GET and POST requests
4. It calls `getMockResponse()` from `src/utils/mockData.ts` to return appropriate mock data
5. A small delay (300ms GET, 500ms POST) simulates network latency

### Mock Data

Mock data is defined in `src/utils/mockData.ts` and includes:

| Mock | Description |
|------|-------------|
| `mockJobSubmissionResponse` | POST `/api/pipeline-job/` response |
| `mockJobStatusPending` | Job in pending state |
| `mockJobStatusRunning` | Job in running state (45% progress) |
| `mockJobStatusCompleted` | Job completed (100% progress) |
| `mockJobStatusFailed` | Job with error message |
| `mockAlignmentResult` | Clustal Omega alignment output (BRCA1 Human/Mouse) |
| `mockAlignedSeqInfo` | Sequence metadata (gene IDs, species, lengths) |
| `mockJobLogs` | Pipeline execution log lines |

### Testing Different States

Use the `mockStatus` query parameter to control job status responses:

```
/progress?uuid=test&mockStatus=pending
/progress?uuid=test&mockStatus=running
/progress?uuid=test&mockStatus=completed
/progress?uuid=test&mockStatus=failed
```

Without `mockStatus`, the default response is `completed`.

### Adding New Mock Endpoints

To add a new mock endpoint:

1. Add mock data to `src/utils/mockData.ts`:
   ```typescript
   export const mockNewFeatureData = {
       // Your mock data here
   };
   ```

2. Add a route match in `getMockResponse()`:
   ```typescript
   export function getMockResponse(endpoint: string, method: string = 'GET'): any {
       // ... existing routes ...

       if (endpoint.includes('/your-new-endpoint')) {
           return mockNewFeatureData;
       }

       return { error: 'Mock endpoint not found' };
   }
   ```

3. The catch-all route handler already supports GET and POST -- no changes needed there.

### Vercel Deployment

Vercel deployments always use `MOCK_API=true` (configured in `vercel.json`), making them fully self-contained without a backend. This is used for visual regression testing with Percy.

---

## Nightingale Integration

### What Is Nightingale?

[Nightingale](https://ebi-webcomponents.github.io/nightingale/) is a suite of web components from EMBL-EBI for biological sequence visualization. PAVI uses Nightingale for:

- Multiple Sequence Alignment (MSA) visualization
- Variant annotation display on tracks
- Conservation score line graphs
- Navigation ruler with zoom/pan

### Installed Packages

```json
{
    "@nightingale-elements/nightingale-msa": "^5.0.0",
    "@nightingale-elements/nightingale-manager": "^5.0.0",
    "@nightingale-elements/nightingale-navigation": "^5.0.0",
    "@nightingale-elements/nightingale-track": "^5.0.0",
    "@nightingale-elements/nightingale-linegraph-track": "^5.6.0",
    "@lit/react": "^1.0.7"
}
```

### React Wrappers via @lit/react

Nightingale components are Lit-based web components. They cannot be used directly in React. PAVI wraps each component using `@lit/react`'s `createComponent`:

```typescript
// src/app/result/components/InteractiveAlignment/nightingale/MSA.tsx
import { EventName, createComponent } from '@lit/react';
import React, { memo } from 'react';
import NightingaleMSA from '@nightingale-elements/nightingale-msa';
import { NightingaleChangeEvent } from './types';

type OnFeatureClick = CustomEvent<{ id: string; event: MouseEvent }>;

const NightingaleMSAReactComponent = createComponent({
    tagName: 'nightingale-msa',
    elementClass: NightingaleMSA,
    react: React,
    events: {
        onFeatureClick: 'onFeatureClick' as EventName<OnFeatureClick>,
        onChange: 'change' as EventName<NightingaleChangeEvent>,
    },
});

const MemoizedNightingaleMSA = memo(NightingaleMSAReactComponent);
export default MemoizedNightingaleMSA;
```

All wrappers are memoized with `React.memo` to prevent unnecessary re-renders.

### Wrapper Files

Located in `src/app/result/components/InteractiveAlignment/nightingale/`:

| File | Component | Purpose |
|------|-----------|---------|
| `Manager.tsx` | `NightingaleManager` | Synchronizes display range across children |
| `Navigation.tsx` | `NightingaleNavigation` | Ruler/navigation bar |
| `Track.tsx` | `NightingaleTrack` | Feature annotation tracks (variants) |
| `LinegraphTrack.tsx` | `NightingaleLinegraphTrack` | Line graphs (conservation scores) |
| `MSA.tsx` | `NightingaleMSA` | Main alignment viewer |
| `types.ts` | -- | Shared TypeScript types |
| `index.ts` | -- | Barrel exports |

### Component Composition

Nightingale components work together through `NightingaleManager`:

```tsx
import {
    NightingaleManager,
    NightingaleNavigation,
    NightingaleTrack,
    NightingaleMSA,
} from '@/app/result/components/InteractiveAlignment/nightingale';

<NightingaleManager reflected-attributes="display-start,display-end">
    <NightingaleNavigation
        length={alignmentLength}
        display-start={1}
        display-end={alignmentLength}
        height={40}
        margin-left={labelWidth}
    />
    <NightingaleTrack
        data={variantFeatures}
        length={alignmentLength}
        height={30}
        layout="non-overlapping"
        margin-left={labelWidth}
    />
    <NightingaleMSA
        data={msaData}
        features={msaFeatures}
        length={alignmentLength}
        height={300}
        label-width={labelWidth}
        colorScheme="clustal2"
        onChange={handleChange}
    />
</NightingaleManager>
```

The `reflected-attributes` on `NightingaleManager` ensures all children stay synchronized when the user pans or zooms.

### Color Schemes

Available amino acid color schemes for the MSA viewer:

| Scheme | Description |
|--------|-------------|
| `clustal2` | ClustalX default colors |
| `conservation` | Conservation-based coloring |
| `hydro` | Hydrophobicity |
| `cinema` | CINEMA colors |
| `taylor` | Taylor colors |
| `zappo` | Zappo colors |
| `lesk` | Lesk colors |
| `mae` | MAE colors |
| `aliphatic`, `aromatic`, `charged`, `positive`, `negative`, `polar` | Property-based coloring |
| `buried_index`, `helix_propensity`, `strand_propensity`, `turn_propensity` | Structure-based coloring |

### Mocking Nightingale in Tests

Nightingale web components do not work in jsdom. A global mock is required.

**Global mock** (`webui/__mocks__/nightingale-track.ts`):

```typescript
export default class NightingaleTrack extends HTMLElement {}
```

This mock is wired in `jest.config.ts` via `moduleNameMapper`:

```typescript
moduleNameMapper: {
    '^@nightingale-elements/nightingale-track$': '<rootDir>/__mocks__/nightingale-track.ts',
}
```

Other Nightingale components may need per-test mocking depending on the test. See [Testing Guide](testing-guide.md) for more patterns.

### Performance Considerations

- All Nightingale wrappers use `React.memo` to avoid re-renders
- Memoize MSA data and feature arrays with `useMemo`
- For large alignments (30+ sequences), use `VirtualizedAlignment` which leverages `@tanstack/react-virtual`

For detailed Nightingale component API documentation, see [Nightingale Guide](nightingale-guide.md).

---

## Key Components Deep Dive

### Submit Flow (`/submit`)

The submit page allows users to build alignment jobs by searching for genes and selecting transcripts.

**Component hierarchy:**

```
submit/page.tsx
└── JobSubmitForm
    ├── FormIntroduction
    ├── ExampleDataLoader
    ├── AlignmentEntryList
    │   └── AlignmentEntry (one per gene)
    │       ├── Gene autocomplete (PrimeReact AutoComplete)
    │       ├── Transcript multi-select (EnhancedMultiSelect)
    │       └── Allele multi-select (EnhancedMultiSelect)
    ├── ValidationMessage
    └── HelpTooltip
```

**Key hooks in the submit flow:**

- `useGeneSearch` -- handles gene autocomplete against the AGR API, auto-selects single matches
- `useTranscriptSelection` -- fetches and manages transcript options for a selected gene
- `useAlleleSelection` -- fetches and manages allele options for a selected gene

**Server actions** (`AlignmentEntry/serverActions.ts`) handle data fetching on the server side (gene info, autocomplete suggestions). These are excluded from test coverage.

### Progress Tracking (`/progress`)

The progress page polls the API for job status updates.

**Key hook:** `useRealtimeUpdates` provides:
- Configurable polling interval (default 5 seconds)
- Automatic retry with exponential backoff (up to 3 retries)
- Maximum polling duration (default 1 hour)
- Browser notification support when jobs complete
- Connection status tracking (`connected`, `connecting`, `disconnected`, `error`)

### Result Display (`/result`)

The result page is the most complex, containing:

| Component | Purpose |
|-----------|---------|
| `AlignmentResultView` | Main container for results |
| `InteractiveAlignment` | Nightingale-based alignment viewer |
| `VirtualizedAlignment` | Performance-optimized viewer for large alignments |
| `TextAlignment` | Plain-text alignment display |
| `DisplayModeSelector` | Switch between interactive/text views |
| `VisualizationToolbar` | Color scheme, zoom controls |
| `AlignmentSearch` | Search within alignment |
| `PositionInfoPanel` | Position details on hover/click |
| `ResultsSummary` | Overview statistics |
| `ExportMenu` | Download alignment files |
| `JobExportMenu` | Export job data as ZIP |
| `AlignmentSkeleton` | Loading placeholder |
| `FailureDisplay` | Error display |
| `ResponsiveAlignmentContainer` | Responsive wrapper |

### URL Imports from agr_ui

PAVI imports utility functions directly from the `agr_ui` GitHub repository via Next.js URL imports:

```typescript
import { getSingleGenomeLocation } from 'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js';
```

This is configured in `next.config.mjs`:

```javascript
experimental: {
    urlImports: [
        'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/',
        'https://raw.githubusercontent.com/alliance-genome/agr_ui/test/',
        'https://raw.githubusercontent.com/alliance-genome/agr_ui/stage/'
    ]
}
```

Type declarations for these imports are in `src/app/public-ui-modules.ts`:

```typescript
declare module 'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/constants.js'
declare module 'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js'
```

The `webui/next.lock` file caches these imports and must be committed to version control.

**Important:** Tests must explicitly mock these URL imports since they cannot be resolved in the test environment.

---

## UI Libraries

### PrimeReact

PrimeReact (`~10.9`) is the primary UI component library, providing:

- Form inputs (AutoComplete, MultiSelect, InputText, Dropdown)
- DataTable for job history
- Dialog, Toast, ProgressBar
- Button, Card, Panel

The `PrimeReactProvider` wraps the entire app in `layout.tsx`. The theme CSS is loaded via a `<link>` tag pointing to `/themes/mdc-light-indigo/theme.css`.

### PrimeFlex

PrimeFlex (`^3.3`) provides utility CSS classes for layout:

```tsx
<div className="flex align-items-center justify-content-between gap-3">
    <div className="col-12 md:col-6">...</div>
</div>
```

### PrimeIcons

PrimeIcons (`^7.0`) provides icon classes:

```tsx
<i className="pi pi-search" />
<i className="pi pi-download" />
```

### Material UI

MUI (`^7.3`) is used alongside PrimeReact for specific components:

- `@mui/material` -- for components like Accordion, Tooltip, Tabs
- `@mui/icons-material` -- for Material Design icons

Styled with `@emotion/react`, `@emotion/styled`, and `tss-react`.

### AGR Theme CSS

`src/app/styles/agr-theme.css` defines CSS custom properties for Alliance branding:

```css
:root {
    --agr-primary: #2069a0;
    --agr-gray-50: #f8f9fa;
    --agr-gray-100: #f1f3f5;
    /* ... through --agr-gray-900 */
    --agr-font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

Use these variables for consistent theming:

```tsx
<div style={{
    backgroundColor: 'var(--agr-gray-50, #f8f9fa)',
    border: '1px solid var(--agr-gray-200, #e9ecef)',
    color: 'var(--agr-gray-700, #495057)'
}}>
```

### Global CSS

`globals.css` includes Nightingale canvas rendering fixes:

```css
nightingale-msa,
nightingale-msa canvas {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
}
```

---

## Testing

### Jest + React Testing Library Setup

Tests use Jest 30 with jsdom environment and React Testing Library.

**Configuration (`jest.config.ts`):**

- Uses `next/jest` for Next.js integration (auto-configures transforms, module resolution)
- Test environment: `jsdom`
- Test pattern: `**/__tests__/**/*.[jt]s?(x)`
- Setup: `jest.setup.ts` imports `@testing-library/jest-dom/jest-globals`
- Path alias: `@/` maps to `src/`

**Jest setup (`jest.setup.ts`):**

```typescript
import '@jest/globals'
import '@testing-library/jest-dom/jest-globals'
```

### Coverage Thresholds

| Metric | Minimum |
|--------|---------|
| Lines | 60% |
| Statements | 60% |
| Functions | 50% |
| Branches | 50% |

Coverage is collected automatically on every test run. The coverage directory is `webui/coverage/`.

**Excluded from coverage:**
- `node_modules/`
- `serverActions.ts` files (server-side data fetching)

### Running Tests

```bash
# From webui/ directory

# Run all tests (silent mode, with coverage)
npm run test
# Or via Make:
make run-unit-tests

# Run tests with visible console output
npm run test:dev

# Run a specific test file
npm run test -- --testPathPattern="InteractiveAlignment.test"

# Interactive watch mode (re-runs on file changes)
npm run test:watch
```

### Test File Organization

Tests are co-located with their source code in `__tests__/` directories:

```
src/app/result/components/
├── InteractiveAlignment/
│   └── InteractiveAlignment.tsx
├── __tests__/
│   └── InteractiveAlignment.test.tsx
```

### Writing Tests

```typescript
import { describe, expect, it, jest } from '@jest/globals';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

// Mock dependencies
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
});
```

### Mocking Patterns

**Module-level mocks** (`__mocks__/` directory):

```typescript
// src/app/submit/components/AlignmentEntry/__mocks__/serverActions.ts
export const fetchData = jest.fn().mockResolvedValue({
    data: 'mocked response'
});
```

**Per-test mocks:**

```typescript
jest.mock('../serverActions');
import { fetchData } from '../serverActions';

beforeEach(() => {
    jest.clearAllMocks();
});

it('calls fetchData', async () => {
    (fetchData as jest.Mock).mockResolvedValueOnce({ special: 'data' });
    // ... test code ...
    expect(fetchData).toHaveBeenCalledWith('expected-arg');
});
```

**URL import mocks:** Since URL imports from `agr_ui` cannot be resolved in tests, mock them explicitly:

```typescript
jest.mock('https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js', () => ({
    getSingleGenomeLocation: jest.fn(),
}));
```

### E2E Testing with Cypress

Cypress (`^15.2`) handles end-to-end testing:

```bash
# Full E2E suite with visual regression (runs in Docker for consistent rendering)
make run-e2e-tests

# Interactive Cypress mode (opens browser, no visual regression)
make run-e2e-tests-dev
```

E2E tests live in `webui/cypress/e2e/`. Test resources are copied from `tests/resources/` to `cypress/test-resources/` automatically.

### Visual Regression Testing

**cypress-image-diff** runs inside Docker for pixel-consistent screenshots:

```bash
# Run visual regression tests
make run-e2e-tests

# View failed comparisons in a web report
make open-cypress-image-diff-html-report  # Opens at localhost:6868
```

When intentional UI changes occur:
1. Run the tests to generate new screenshots
2. Review differences in the HTML report
3. Update baselines by copying new screenshots to the baseline directory
4. Commit updated baselines

### Percy Visual Testing

Percy runs against Vercel preview deployments (which use `MOCK_API=true`).

```bash
# Run Percy against local dev server
npm run dev:mock  # Terminal 1
PERCY_TOKEN=your_token npm run percy:local  # Terminal 2

# Run Percy against a Vercel deployment
BASE_URL=https://your-app.vercel.app PERCY_TOKEN=your_token npm run percy
```

Percy captures snapshots of key pages at multiple viewport widths (375, 768, 1280, 1920px). Configuration is in `.percy.yml` and snapshot definitions are in `percy-snapshots.js`.

For full Percy setup details, see `webui/VERCEL_PERCY_SETUP.md`.

---

## Code Quality

### TypeScript

TypeScript strict mode is enforced. The configuration extends `@tsconfig/next`:

```json
{
    "extends": "@tsconfig/next/tsconfig.json",
    "compilerOptions": {
        "paths": { "@/*": ["./src/*"] },
        "downlevelIteration": true,
        "esModuleInterop": true,
        "target": "ES2017"
    }
}
```

Run type checks:

```bash
npm run typecheck
# Or via Make:
make run-type-checks
```

### ESLint

ESLint uses flat config (`eslint.config.mjs`) extending:
- `next/core-web-vitals`
- `next/typescript`
- `eslint:recommended`

Key rules:
- `@typescript-eslint/no-explicit-any`: off (pragmatic for Nightingale interop)
- `no-unused-vars` and `@typescript-eslint/no-unused-vars`: error (with `_` prefix exception)
- Jest and Cypress plugin configs for test files
- Zero warnings allowed: `--max-warnings 0`

ESLint also covers `src/`, `cypress/e2e/`, and `cypress/support/` directories (configured in `next.config.mjs`).

Run linting:

```bash
npm run lint
# Or via Make:
make run-style-checks
```

### Pre-PR Checklist

Run all checks before submitting a pull request:

```bash
cd webui
make run-type-checks      # TypeScript type checking
make run-style-checks     # ESLint (zero warnings)
make run-unit-tests       # Jest tests with coverage
```

---

## Building and Deploying

### Production Build

```bash
cd webui
PAVI_API_BASE_URL=http://localhost:8000 npm run build
PAVI_API_BASE_URL=http://localhost:8000 npm run start
```

**Important:** Never use `npm run dev` for production. The dev server is slow, shows development warnings, and is not optimized.

### Bundle Analysis

To analyze the production bundle:

```bash
npm run build:analyze
```

This opens an interactive bundle visualization (via `@next/bundle-analyzer`).

### Docker Build

```bash
# Build the container image
make container-image

# Run via docker-compose
make run-container-dev

# Stop the container
make stop-container-dev

# Push to ECR
make push-container-image TAG_NAME=<tag>
```

The Docker build uses `output: standalone` in Next.js config for a minimal production image. The Makefile reads the Node.js version from `.nvmrc`.

### Local EC2 Deployment

On the dev EC2 instance, run as production services behind Caddy:

```bash
# Build the WebUI
cd webui
PAVI_API_BASE_URL=http://localhost:8000 npm run build

# Start production server
PAVI_API_BASE_URL=http://localhost:8000 npm run start
```

Caddy (running as a systemd service) reverse-proxies HTTPS traffic to the WebUI on port 3000 and the API on port 8000.

### Vercel Deployment

Vercel deployments use `MOCK_API=true` and serve the UI with mock data. Configuration is in `vercel.json` with:
- Root directory: `webui`
- Build command: `npm run build`
- Install command: `npm install --strict-peer-deps`

This is primarily used for visual regression testing, not production.

---

## Related Documentation

- [Nightingale Guide](nightingale-guide.md) -- Detailed Nightingale component API reference
- [Testing Guide](testing-guide.md) -- Full testing practices across the project
- [Configuration Reference](configuration-reference.md) -- All environment variables
- [Data Flow Diagrams](data-flows.md) -- How data flows through the system
- [Troubleshooting](troubleshooting.md) -- Common issues and solutions
- [Vercel & Percy Setup](../webui/VERCEL_PERCY_SETUP.md) -- Visual testing configuration
