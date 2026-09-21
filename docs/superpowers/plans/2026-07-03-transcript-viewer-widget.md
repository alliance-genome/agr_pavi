# Transcript Viewer Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-gene "View transcripts" modal on the PAVI `/submit` page that renders the gene's transcript/isoform models using the Alliance `genomefeatures` D3 viewer — the same widget as the Alliance gene page.

**Architecture:** A pure config-builder module turns data PAVI already holds (gene genome location, species NCList template, release) into the viewer's ISOFORM track config. A client-only `GenomeFeatureView` component dynamically imports `genomefeatures`, fetches the NCList track data from S3, and instantiates `GenomeFeatureViewer` into an `<svg>`. A PrimeReact `Dialog` (`TranscriptViewerDialog`) wraps it with a fallback, opened by a button on each `AlignmentEntry`.

**Tech Stack:** Next.js 15 App Router (React 19, TypeScript strict), PrimeReact `Dialog`/`Button`, `genomefeatures` (D3/SVG), Jest + React Testing Library, Cypress.

## Global Constraints

- TypeScript strict mode; ESLint must pass with `--max-warnings 0`.
- All new UI components are client components (`'use client'`).
- The `genomefeatures` library touches `window`/DOM — it must never be imported at module top level in a path that can be server-rendered. Import it via dynamic `import()` inside `useEffect`, and load `GenomeFeatureView` through `next/dynamic` with `{ ssr: false }`.
- Reuse the existing cross-repo util import path verbatim: `https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js` (`getSpecies`, `getSingleGenomeLocation`). Do not add a second copy.
- v1 is read-only, transcripts-only (`type: 'ISOFORM'`). No variants, no click-to-select.
- New files live under `webui/src/app/submit/components/TranscriptViewer/`.
- Run all commands from `webui/`.

---

## File structure

- Create: `webui/src/app/submit/components/TranscriptViewer/trackConfig.ts` — pure helpers + types + `TRANSCRIPT_TYPES`.
- Create: `webui/src/app/submit/components/TranscriptViewer/GenomeFeatureView.tsx` — client renderer wrapping `GenomeFeatureViewer`.
- Create: `webui/src/app/submit/components/TranscriptViewer/TranscriptViewerDialog.tsx` — PrimeReact Dialog + fallback.
- Create: `webui/src/app/submit/components/TranscriptViewer/index.ts` — barrel exports.
- Create: `webui/src/app/submit/components/TranscriptViewer/__tests__/trackConfig.test.ts`
- Create: `webui/src/app/submit/components/TranscriptViewer/__tests__/TranscriptViewerDialog.test.tsx`
- Modify: `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx` — add trigger button + dialog state.
- Create: `webui/cypress/e2e/transcript-viewer.cy.ts` — E2E.
- Modify: `webui/package.json` — add `genomefeatures` dependency.

---

## Task 1: Add the `genomefeatures` dependency and verify its API

De-risks the one real unknown (the GitHub-pinned fork + the `GenomeFeatureViewer` constructor + the Next build) before any UI is built.

**Files:**
- Modify: `webui/package.json`

**Interfaces:**
- Produces: a resolvable `genomefeatures` module exporting `GenomeFeatureViewer` (constructor `(config, selector, width, height)`) and `fetchNCListData({region, urlTemplate})`.

- [ ] **Step 1: Add the dependency using the same source agr_ui pins**

Run (from `webui/`):

```bash
npm install --strict-peer-deps "github:alliance-genome/genomefeatures"
```

Expected: install succeeds and `package.json` gains a `genomefeatures` entry under `dependencies`. If the GitHub install fails in this environment, fall back to the npm release and note it in the commit message:

```bash
npm install --strict-peer-deps genomefeatures@1.0.5
```

- [ ] **Step 2: Verify the exported API surface**

Run:

```bash
node -e "const g = require('genomefeatures'); console.log('GenomeFeatureViewer:', typeof g.GenomeFeatureViewer); console.log('fetchNCListData:', typeof g.fetchNCListData);"
```

Expected output:

```
GenomeFeatureViewer: function
fetchNCListData: function
```

If either is `undefined`, inspect `node_modules/genomefeatures/` `package.json` `main`/`module` and the built entry to find the correct export names, and record the actual names — later tasks import `{ GenomeFeatureViewer, fetchNCListData } from 'genomefeatures'` and must be updated to match.

- [ ] **Step 3: Verify the Next build still compiles**

Run:

```bash
npm run build 2>&1 | tail -20
```

Expected: build completes without errors referencing `genomefeatures`. (This confirms the dependency does not break SSR at import time; we still guard usage behind dynamic import in later tasks.)

- [ ] **Step 4: Commit**

```bash
git add webui/package.json webui/package-lock.json
git commit -m "build(webui): add genomefeatures dependency for transcript viewer"
```

---

## Task 2: Pure track-config builders

**Files:**
- Create: `webui/src/app/submit/components/TranscriptViewer/trackConfig.ts`
- Test: `webui/src/app/submit/components/TranscriptViewer/__tests__/trackConfig.test.ts`

**Interfaces:**
- Produces:
  - `TRANSCRIPT_TYPES: string[]`
  - `interface ViewerRegion { chromosome: string; start: number; end: number }`
  - `buildNcListUrl(nclistBaseTemplate: string, release: string, chromosome: string): string`
  - `interface IsoformTrackConfig { region: ViewerRegion; genome: string; transcriptTypes: string[]; htpVariant: string; tracks: Array<{ type: 'ISOFORM'; trackData: unknown; geneBounds: { start: number; end: number }; geneSymbol: string; geneId: string; speciesTaxonId: string }> }`
  - `buildIsoformTrackConfig(p: { region: ViewerRegion; apolloName: string; geneSymbol: string; geneId: string; speciesTaxonId: string; trackData: unknown }): IsoformTrackConfig`

- [ ] **Step 1: Write the failing test**

Create `webui/src/app/submit/components/TranscriptViewer/__tests__/trackConfig.test.ts`:

```ts
import {
    TRANSCRIPT_TYPES,
    buildNcListUrl,
    buildIsoformTrackConfig,
} from '../trackConfig';

describe('buildNcListUrl', () => {
    it('substitutes {release} and appends the All_Genes trackData path', () => {
        const template = 'https://s3.amazonaws.com/agrjbrowse/docker/{release}/human/';
        const url = buildNcListUrl(template, '8.2.0', '17');
        expect(url).toBe(
            'https://s3.amazonaws.com/agrjbrowse/docker/8.2.0/human/tracks/All_Genes/17/trackData.jsonz'
        );
    });
});

describe('buildIsoformTrackConfig', () => {
    const region = { chromosome: '17', start: 100, end: 200 };
    const config = buildIsoformTrackConfig({
        region,
        apolloName: 'human',
        geneSymbol: 'TP53',
        geneId: 'HGNC:11998',
        speciesTaxonId: 'NCBITaxon:9606',
        trackData: [{ some: 'nclist' }],
    });

    it('places region, genome and transcriptTypes at the top level', () => {
        expect(config.region).toEqual(region);
        expect(config.genome).toBe('human');
        expect(config.transcriptTypes).toBe(TRANSCRIPT_TYPES);
        expect(config.htpVariant).toBe('');
    });

    it('builds a single ISOFORM track carrying the fetched trackData and gene bounds', () => {
        expect(config.tracks).toHaveLength(1);
        const track = config.tracks[0];
        expect(track.type).toBe('ISOFORM');
        expect(track.trackData).toEqual([{ some: 'nclist' }]);
        expect(track.geneBounds).toEqual({ start: 100, end: 200 });
        expect(track.geneSymbol).toBe('TP53');
        expect(track.geneId).toBe('HGNC:11998');
        expect(track.speciesTaxonId).toBe('NCBITaxon:9606');
    });
});

describe('TRANSCRIPT_TYPES', () => {
    it('includes the common transcript biotypes', () => {
        expect(TRANSCRIPT_TYPES).toContain('mRNA');
        expect(TRANSCRIPT_TYPES).toContain('ncRNA');
        expect(TRANSCRIPT_TYPES).toContain('transcript');
        expect(TRANSCRIPT_TYPES.length).toBeGreaterThanOrEqual(20);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -- --testPathPattern="trackConfig" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '../trackConfig'`.

- [ ] **Step 3: Write the implementation**

Create `webui/src/app/submit/components/TranscriptViewer/trackConfig.ts`:

```ts
// Transcript biotypes the genomefeatures ISOFORM renderer recognises.
// Copied from agr_ui src/lib/genomeFeatureTypes.js getTranscriptTypes() so
// PAVI does not need a second cross-repo runtime import for a static list.
export const TRANSCRIPT_TYPES: string[] = [
    'mRNA', 'ncRNA', 'piRNA', 'lincRNA', 'miRNA', 'pre_miRNA', 'snoRNA',
    'lnc_RNA', 'tRNA', 'snRNA', 'rRNA', 'ARS', 'antisense_RNA',
    'C_gene_segment', 'V_gene_segment', 'pseudogene_attribute',
    'pseudogenic_transcript', 'snoRNA_gene', 'mature_protein_region',
    'telomerase_RNA', 'transposable_element', 'enzymatic_RNA',
    'RNase_MRP_RNA', 'RNase_P_RNA', 'transcript',
];

export interface ViewerRegion {
    chromosome: string;
    start: number;
    end: number;
}

// The genomefeatures NCList track lives under a per-species, per-release,
// per-chromosome path. The species template carries a `{release}`
// placeholder and a trailing slash (e.g.
// ".../docker/{release}/human/"); we substitute the release and append
// the All_Genes trackData file for the chromosome.
export function buildNcListUrl(
    nclistBaseTemplate: string,
    release: string,
    chromosome: string
): string {
    return (
        nclistBaseTemplate.replace('{release}', release) +
        `tracks/All_Genes/${chromosome}/trackData.jsonz`
    );
}

export interface IsoformTrackConfig {
    region: ViewerRegion;
    genome: string;
    transcriptTypes: string[];
    htpVariant: string;
    tracks: Array<{
        type: 'ISOFORM';
        trackData: unknown;
        geneBounds: { start: number; end: number };
        geneSymbol: string;
        geneId: string;
        speciesTaxonId: string;
    }>;
}

export interface BuildIsoformConfigParams {
    region: ViewerRegion;
    apolloName: string;
    geneSymbol: string;
    geneId: string;
    speciesTaxonId: string;
    trackData: unknown;
}

// Assemble the ISOFORM-only track config genomefeatures expects. Mirrors
// the shape agr_ui builds in genomeFeatureWrapper.jsx for displayType
// 'ISOFORM'. PAVI shows a single gene, so the display region and the gene
// bounds are the gene's own genome location.
export function buildIsoformTrackConfig(
    p: BuildIsoformConfigParams
): IsoformTrackConfig {
    return {
        region: p.region,
        genome: p.apolloName,
        transcriptTypes: TRANSCRIPT_TYPES,
        htpVariant: '',
        tracks: [
            {
                type: 'ISOFORM',
                trackData: p.trackData,
                geneBounds: { start: p.region.start, end: p.region.end },
                geneSymbol: p.geneSymbol,
                geneId: p.geneId,
                speciesTaxonId: p.speciesTaxonId,
            },
        ],
    };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm run test -- --testPathPattern="trackConfig" 2>&1 | tail -15
```

Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add webui/src/app/submit/components/TranscriptViewer/trackConfig.ts webui/src/app/submit/components/TranscriptViewer/__tests__/trackConfig.test.ts
git commit -m "feat(webui): add pure track-config builders for transcript viewer"
```

---

## Task 3: `GenomeFeatureView` client renderer

**Files:**
- Create: `webui/src/app/submit/components/TranscriptViewer/GenomeFeatureView.tsx`
- Test: `webui/src/app/submit/components/TranscriptViewer/__tests__/GenomeFeatureView.test.tsx`

**Interfaces:**
- Consumes: `buildNcListUrl`, `buildIsoformTrackConfig` (Task 2); `getSpecies`, `getSingleGenomeLocation` from the agr_ui util URL; `GeneInfo` from `../AlignmentEntry/types`; `genomefeatures` `{ GenomeFeatureViewer, fetchNCListData }` (Task 1).
- Produces: `default` export `GenomeFeatureView` — React component with props `{ gene: GeneInfo; release: string; width?: number; height?: number; onError?: (message: string) => void }`, rendering an `<svg>` whose id is stable per instance.

- [ ] **Step 1: Write the failing test**

Create `webui/src/app/submit/components/TranscriptViewer/__tests__/GenomeFeatureView.test.tsx`:

```tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import GenomeFeatureView from '../GenomeFeatureView';

// Mock the cross-repo Alliance utils (same pattern as AlignmentEntry.test).
jest.mock(
    'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js',
    () => ({
        getSpecies: jest.fn(() => ({
            apolloName: 'human',
            jBrowsenclistbaseurltemplate:
                'https://s3.amazonaws.com/agrjbrowse/docker/{release}/human/',
        })),
        getSingleGenomeLocation: jest.fn(() => ({
            chromosome: '17',
            start: 100,
            end: 200,
        })),
    }),
    { virtual: true }
);

// Mock the genomefeatures library.
const viewerCtor = jest.fn();
const fetchNCListData = jest.fn(async () => [{ some: 'nclist' }]);
jest.mock(
    'genomefeatures',
    () => ({
        GenomeFeatureViewer: jest.fn((...args: unknown[]) => viewerCtor(...args)),
        fetchNCListData: (arg: unknown) => fetchNCListData(arg),
    }),
    { virtual: true }
);

const gene = {
    id: 'HGNC:11998',
    symbol: 'TP53',
    species: { taxonId: 'NCBITaxon:9606' },
    genomeLocations: [{ chromosome: '17', start: 100, end: 200 }],
} as any;

describe('GenomeFeatureView', () => {
    beforeEach(() => {
        viewerCtor.mockClear();
        fetchNCListData.mockClear();
    });

    it('renders an svg element', () => {
        const { container } = render(
            <GenomeFeatureView gene={gene} release="8.2.0" />
        );
        expect(container.querySelector('svg')).not.toBeNull();
    });

    it('fetches NCList data and instantiates the viewer with the built config', async () => {
        render(<GenomeFeatureView gene={gene} release="8.2.0" width={800} height={400} />);

        await waitFor(() => expect(viewerCtor).toHaveBeenCalledTimes(1));

        expect(fetchNCListData).toHaveBeenCalledWith({
            region: { chromosome: '17', start: 100, end: 200 },
            urlTemplate:
                'https://s3.amazonaws.com/agrjbrowse/docker/8.2.0/human/tracks/All_Genes/17/trackData.jsonz',
        });

        const [config, selector, width, height] = viewerCtor.mock.calls[0];
        expect(selector).toMatch(/^#gfv-/);
        expect(width).toBe(800);
        expect(height).toBe(400);
        expect(config.genome).toBe('human');
        expect(config.tracks[0].type).toBe('ISOFORM');
        expect(config.tracks[0].trackData).toEqual([{ some: 'nclist' }]);
    });

    it('calls onError when fetching fails', async () => {
        fetchNCListData.mockRejectedValueOnce(new Error('boom'));
        const onError = jest.fn();
        render(<GenomeFeatureView gene={gene} release="8.2.0" onError={onError} />);
        await waitFor(() => expect(onError).toHaveBeenCalledWith('boom'));
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -- --testPathPattern="GenomeFeatureView" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '../GenomeFeatureView'`.

- [ ] **Step 3: Write the implementation**

Create `webui/src/app/submit/components/TranscriptViewer/GenomeFeatureView.tsx`:

```tsx
'use client';

import React, { useEffect, useId } from 'react';
// eslint-disable-next-line import/no-unresolved
import { getSpecies, getSingleGenomeLocation } from 'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js';
import { GeneInfo } from '../AlignmentEntry/types';
import { buildNcListUrl, buildIsoformTrackConfig, ViewerRegion } from './trackConfig';

export interface GenomeFeatureViewProps {
    readonly gene: GeneInfo;
    readonly release: string;
    readonly width?: number;
    readonly height?: number;
    // eslint-disable-next-line no-unused-vars
    readonly onError?: (message: string) => void;
}

export default function GenomeFeatureView({
    gene,
    release,
    width = 900,
    height = 500,
    onError,
}: GenomeFeatureViewProps) {
    // useId can contain ':' which is invalid in a CSS selector; sanitise it.
    const rawId = useId().replace(/:/g, '_');
    const svgId = `gfv-${rawId}`;

    useEffect(() => {
        let disposed = false;

        const clearSvg = () => {
            const el = document.getElementById(svgId);
            if (el) el.innerHTML = '';
        };

        async function renderViewer() {
            try {
                const speciesConfig = getSpecies(gene.species.taxonId);
                const location = getSingleGenomeLocation(gene.genomeLocations);
                const region: ViewerRegion = {
                    chromosome: location['chromosome'],
                    start: location['start'],
                    end: location['end'],
                };
                const urlTemplate = buildNcListUrl(
                    speciesConfig.jBrowsenclistbaseurltemplate,
                    release,
                    region.chromosome
                );

                const { GenomeFeatureViewer, fetchNCListData } = await import('genomefeatures');
                const trackData = await fetchNCListData({ region, urlTemplate });
                if (disposed) return;

                const config = buildIsoformTrackConfig({
                    region,
                    apolloName: speciesConfig.apolloName,
                    geneSymbol: gene.symbol,
                    geneId: gene.id,
                    speciesTaxonId: gene.species.taxonId,
                    trackData,
                });

                clearSvg();
                // eslint-disable-next-line no-new
                new GenomeFeatureViewer(config, `#${svgId}`, width, height);
            } catch (e) {
                if (!disposed) {
                    onError?.(e instanceof Error ? e.message : String(e));
                }
            }
        }

        renderViewer();
        return () => {
            disposed = true;
            clearSvg();
        };
    }, [gene, release, svgId, width, height, onError]);

    return <svg id={svgId} width={width} height={height} />;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm run test -- --testPathPattern="GenomeFeatureView" 2>&1 | tail -20
```

Expected: PASS (3 tests green).

- [ ] **Step 5: Lint the new files**

Run:

```bash
npx eslint --max-warnings 0 src/app/submit/components/TranscriptViewer/GenomeFeatureView.tsx src/app/submit/components/TranscriptViewer/trackConfig.ts 2>&1 | tail -15
```

Expected: no output (clean). Fix any warnings before committing.

- [ ] **Step 6: Commit**

```bash
git add webui/src/app/submit/components/TranscriptViewer/GenomeFeatureView.tsx webui/src/app/submit/components/TranscriptViewer/__tests__/GenomeFeatureView.test.tsx
git commit -m "feat(webui): add GenomeFeatureView client renderer"
```

---

## Task 4: `TranscriptViewerDialog` + barrel export

**Files:**
- Create: `webui/src/app/submit/components/TranscriptViewer/TranscriptViewerDialog.tsx`
- Create: `webui/src/app/submit/components/TranscriptViewer/index.ts`
- Test: `webui/src/app/submit/components/TranscriptViewer/__tests__/TranscriptViewerDialog.test.tsx`

**Interfaces:**
- Consumes: `GenomeFeatureView` (Task 3, loaded via `next/dynamic` with `ssr:false`); `GeneInfo`.
- Produces: named export `TranscriptViewerDialog` — props `{ visible: boolean; gene: GeneInfo | undefined; release: string; onHide: () => void }`. Barrel `index.ts` re-exports `TranscriptViewerDialog` and `GenomeFeatureView` default.

- [ ] **Step 1: Write the failing test**

Create `webui/src/app/submit/components/TranscriptViewer/__tests__/TranscriptViewerDialog.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TranscriptViewerDialog } from '../TranscriptViewerDialog';

// Replace the dynamic GenomeFeatureView with a marker so the dialog test
// does not pull in genomefeatures / D3.
jest.mock('../GenomeFeatureView', () => ({
    __esModule: true,
    default: () => <div data-testid="genome-feature-view" />,
}));

const gene = {
    id: 'HGNC:11998',
    symbol: 'TP53',
    species: { taxonId: 'NCBITaxon:9606' },
    genomeLocations: [{ chromosome: '17', start: 100, end: 200 }],
} as any;

describe('TranscriptViewerDialog', () => {
    it('does not render viewer content when hidden', () => {
        render(
            <TranscriptViewerDialog visible={false} gene={gene} release="8.2.0" onHide={() => {}} />
        );
        expect(screen.queryByTestId('genome-feature-view')).toBeNull();
    });

    it('renders the viewer and the gene symbol in the header when visible', () => {
        render(
            <TranscriptViewerDialog visible gene={gene} release="8.2.0" onHide={() => {}} />
        );
        expect(screen.getByTestId('genome-feature-view')).toBeInTheDocument();
        expect(screen.getByText(/TP53/)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test -- --testPathPattern="TranscriptViewerDialog" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '../TranscriptViewerDialog'`.

- [ ] **Step 3: Write the implementation**

Create `webui/src/app/submit/components/TranscriptViewer/TranscriptViewerDialog.tsx`:

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import dynamic from 'next/dynamic';
import { GeneInfo } from '../AlignmentEntry/types';

// genomefeatures / D3 must not be server-rendered.
const GenomeFeatureView = dynamic(() => import('./GenomeFeatureView'), {
    ssr: false,
});

export interface TranscriptViewerDialogProps {
    readonly visible: boolean;
    readonly gene: GeneInfo | undefined;
    readonly release: string;
    readonly onHide: () => void;
}

export function TranscriptViewerDialog({
    visible,
    gene,
    release,
    onHide,
}: TranscriptViewerDialogProps) {
    const [error, setError] = useState<string | null>(null);

    // Reset the error whenever the dialog is (re)opened or the gene changes.
    useEffect(() => {
        setError(null);
    }, [visible, gene]);

    const header = gene ? `Transcripts — ${gene.symbol}` : 'Transcripts';

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={header}
            modal
            dismissableMask
            style={{ width: '950px', maxWidth: '95vw' }}
        >
            {visible && gene ? (
                error ? (
                    <div>
                        Could not load the transcript view.{' '}
                        <a
                            href={`https://www.alliancegenome.org/gene/${gene.id}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            View on Alliance
                        </a>
                        .
                    </div>
                ) : (
                    <GenomeFeatureView gene={gene} release={release} onError={setError} />
                )
            ) : null}
        </Dialog>
    );
}
```

Create `webui/src/app/submit/components/TranscriptViewer/index.ts`:

```ts
export { TranscriptViewerDialog } from './TranscriptViewerDialog';
export type { TranscriptViewerDialogProps } from './TranscriptViewerDialog';
export { default as GenomeFeatureView } from './GenomeFeatureView';
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm run test -- --testPathPattern="TranscriptViewerDialog" 2>&1 | tail -15
```

Expected: PASS (2 tests green).

- [ ] **Step 5: Lint**

Run:

```bash
npx eslint --max-warnings 0 src/app/submit/components/TranscriptViewer/ 2>&1 | tail -15
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add webui/src/app/submit/components/TranscriptViewer/TranscriptViewerDialog.tsx webui/src/app/submit/components/TranscriptViewer/index.ts webui/src/app/submit/components/TranscriptViewer/__tests__/TranscriptViewerDialog.test.tsx
git commit -m "feat(webui): add TranscriptViewerDialog wrapping the genome feature view"
```

---

## Task 5: Wire the "View transcripts" trigger into `AlignmentEntry`

**Files:**
- Modify: `webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx`

**Interfaces:**
- Consumes: `TranscriptViewerDialog` (Task 4); the existing `geneSearch.gene` (`GeneInfo | undefined`) and `props.agrjBrowseDataRelease` (string) already present in the component.

- [ ] **Step 1: Read the current gene/transcript region of the component**

Run:

```bash
grep -n "geneSearch.gene\|agrjBrowseDataRelease\|import {" src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx | head -20
```

Expected: confirms `geneSearch.gene` and `props.agrjBrowseDataRelease` exist. Note the import block line numbers and a JSX location near the transcript `MultiSelect` (id starts with `transcripts-`) to place the button.

- [ ] **Step 2: Add the import and dialog state**

In `AlignmentEntry.tsx`, add to the import block (near the other component imports):

```tsx
import { Button } from 'primereact/button';
import { TranscriptViewerDialog } from '../TranscriptViewer';
```

(If `Button` is already imported from `primereact/button`, do not duplicate it.)

Inside the component body, alongside the other `useState` hooks, add:

```tsx
const [transcriptViewerVisible, setTranscriptViewerVisible] = useState(false);
```

- [ ] **Step 3: Add the trigger button and dialog to the JSX**

Immediately after the transcript `MultiSelect`'s wrapping element (the `<div>` that contains the element with `id={`transcripts-${props.index}`}`), add:

```tsx
<Button
    label="View transcripts"
    icon="pi pi-chart-bar"
    className="p-button-text p-button-sm"
    type="button"
    disabled={!geneSearch.gene}
    onClick={() => setTranscriptViewerVisible(true)}
    aria-label="View transcripts"
/>
<TranscriptViewerDialog
    visible={transcriptViewerVisible}
    gene={geneSearch.gene}
    release={props.agrjBrowseDataRelease}
    onHide={() => setTranscriptViewerVisible(false)}
/>
```

- [ ] **Step 4: Type-check and lint**

Run:

```bash
npm run type-check 2>&1 | tail -15
npx eslint --max-warnings 0 src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx 2>&1 | tail -15
```

Expected: no type errors referencing the new code; eslint clean.

- [ ] **Step 5: Run the AlignmentEntry unit tests**

Run:

```bash
npm run test -- --testPathPattern="AlignmentEntry" 2>&1 | tail -20
```

Expected: existing AlignmentEntry tests still PASS (the button is inert without a gene and the dialog renders nothing while hidden). If a test fails because the new `../TranscriptViewer` import pulls `next/dynamic`, add to that test file's mocks:

```tsx
jest.mock('../../TranscriptViewer', () => ({
    TranscriptViewerDialog: () => null,
}));
```

- [ ] **Step 6: Commit**

```bash
git add webui/src/app/submit/components/AlignmentEntry/AlignmentEntry.tsx
git commit -m "feat(webui): add View transcripts button to alignment entry"
```

---

## Task 6: Cypress end-to-end coverage

**Files:**
- Create: `webui/cypress/e2e/transcript-viewer.cy.ts`

**Interfaces:**
- Consumes: the running WebUI at `CYPRESS_BASE_URL` and API at `CYPRESS_API_BASE_URL` (same convention as `examples-catalog.cy.ts`); the shared example catalog to drive a gene selection via the Load Example dialog.

- [ ] **Step 1: Write the test**

Create `webui/cypress/e2e/transcript-viewer.cy.ts`:

```ts
/// <reference types="cypress" />

// Verifies the "View transcripts" modal opens for a selected gene and the
// genomefeatures viewer renders transcript models into an <svg>.

describe('transcript viewer modal', () => {
    Cypress.on('uncaught:exception', (err) => {
        if (err.message.includes('CanvasRenderingContext2D')) return false;
        return undefined;
    });

    it('opens the viewer and renders transcript models', () => {
        cy.visit('/submit');

        // Load a known example so a gene (with a genome location) is selected.
        cy.get('[aria-label="Open example dataset selector"]').click();
        cy.contains('h4', 'TP53 Orthologs').click();

        // The View transcripts button becomes enabled once a gene is set.
        cy.get('button[aria-label="View transcripts"]', { timeout: 60_000 })
            .first()
            .should('be.enabled')
            .click();

        // The dialog opens with the genome feature svg.
        cy.get('.p-dialog', { timeout: 30_000 }).should('be.visible');
        cy.get('.p-dialog svg[id^="gfv-"]', { timeout: 60_000 }).should('exist');

        // The viewer draws transcript models as SVG path/rect children.
        cy.get('.p-dialog svg[id^="gfv-"]', { timeout: 60_000 })
            .find('path, rect')
            .its('length')
            .should('be.greaterThan', 0);
    });
});
```

- [ ] **Step 2: Ensure services are running**

Run (in separate shells if not already up, matching the local dev setup):

```bash
# API (from api/src): USE_LOCAL_PIPELINE=true ../.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001
# WebUI (from webui): PAVI_API_BASE_URL=http://localhost:8001 PORT=3001 npm run dev
curl -fs http://localhost:3001 >/dev/null && echo "webui up"
curl -fs http://localhost:8001/api/health >/dev/null && echo "api up"
```

Expected: both print "up".

- [ ] **Step 3: Run the E2E test**

Run (from `webui/`):

```bash
CYPRESS_BASE_URL=http://localhost:3001 ./node_modules/.bin/cypress run \
  --spec 'cypress/e2e/transcript-viewer.cy.ts' \
  --env API_BASE_URL=http://localhost:8001 2>&1 | tail -25
```

Expected: 1 passing test; the run reports the dialog opened and the svg contained `path`/`rect` children.

- [ ] **Step 4: Commit**

```bash
git add webui/cypress/e2e/transcript-viewer.cy.ts
git commit -m "test(webui): e2e for the transcript viewer modal"
```

---

## Self-review notes

- **Spec coverage:** modal on demand (Task 4/5), transcripts-only ISOFORM (Task 2), reuse of existing region + NCList template (Task 3), error/fallback with Alliance link (Task 4), disabled button when no gene/location (Task 5, plus `getSingleGenomeLocation` empty handled by the fetch error path → fallback), unit + component + E2E tests (Tasks 2/3/4/6), dependency de-risk spike (Task 1). All spec sections map to a task.
- **Deferred (per spec non-goals):** variant lollipops, click-to-select, neighbouring genes — intentionally not in any task; the `type: 'ISOFORM'` config and `onError` seam leave room for them.
- **Type consistency:** `buildNcListUrl`, `buildIsoformTrackConfig`, `IsoformTrackConfig`, `ViewerRegion`, `GenomeFeatureView` props, and `TranscriptViewerDialogProps` are used with identical names/shapes across Tasks 2–5.
