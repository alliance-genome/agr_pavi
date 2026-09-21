# Nightingale Integration Guide

This guide covers the integration of EMBL-EBI's Nightingale components for protein sequence visualization in PAVI.

## Overview

PAVI uses Nightingale web components for:
- Multiple Sequence Alignment (MSA) visualization
- Variant annotation display
- Conservation score visualization
- Navigation and zooming

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     React Application                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  InteractiveAlignment / VirtualizedAlignment                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ NightingaleManager (reflected-attributes)               │    │   │
│  │  │   synchronizes: display-start, display-end              │    │   │
│  │  │                                                         │    │   │
│  │  │  ┌─────────────────────────────────────────────────┐   │    │   │
│  │  │  │ NightingaleNavigation (ruler)                   │   │    │   │
│  │  │  └─────────────────────────────────────────────────┘   │    │   │
│  │  │                                                         │    │   │
│  │  │  ┌─────────────────────────────────────────────────┐   │    │   │
│  │  │  │ NightingaleTrack (variant overview)             │   │    │   │
│  │  │  └─────────────────────────────────────────────────┘   │    │   │
│  │  │                                                         │    │   │
│  │  │  ┌─────────────────────────────────────────────────┐   │    │   │
│  │  │  │ NightingaleLinegraphTrack (conservation)        │   │    │   │
│  │  │  └─────────────────────────────────────────────────┘   │    │   │
│  │  │                                                         │    │   │
│  │  │  ┌─────────────────────────────────────────────────┐   │    │   │
│  │  │  │ NightingaleMSA (alignment viewer)               │   │    │   │
│  │  │  └─────────────────────────────────────────────────┘   │    │   │
│  │  │                                                         │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

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

### React Wrappers

Nightingale components are Lit web components. PAVI wraps them for React using `@lit/react`:

```typescript
// nightingale/MSA.tsx
import { EventName, createComponent } from '@lit/react';
import React, { memo } from 'react';
import NightingaleMSA from '@nightingale-elements/nightingale-msa';

const NightingaleMSAReactComponent = createComponent({
    tagName: 'nightingale-msa',
    elementClass: NightingaleMSA,
    react: React,
    events: {
        onFeatureClick: 'onFeatureClick' as EventName<OnFeatureClick>,
        onChange: 'change' as EventName<NightingaleChangeEvent>,
    },
});

// Memoize for performance
const MemoizedNightingaleMSA = memo(NightingaleMSAReactComponent);
export default MemoizedNightingaleMSA;
```

### Wrapper Files

| File | Component |
|------|-----------|
| `nightingale/MSA.tsx` | MSA alignment viewer |
| `nightingale/Manager.tsx` | State synchronization |
| `nightingale/Navigation.tsx` | Ruler/navigation |
| `nightingale/Track.tsx` | Feature tracks |
| `nightingale/LinegraphTrack.tsx` | Line graphs (conservation) |
| `nightingale/types.ts` | TypeScript types |
| `nightingale/index.ts` | Barrel exports |

## Component Configuration

### NightingaleManager

Synchronizes display range across child components:

```tsx
<NightingaleManager reflected-attributes="display-start,display-end">
  {/* All children receive synchronized display-start/display-end */}
  <NightingaleNavigation />
  <NightingaleTrack />
  <NightingaleMSA />
</NightingaleManager>
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `reflected-attributes` | string | Comma-separated attributes to sync |

### NightingaleNavigation

Displays a ruler for navigation:

```tsx
<NightingaleNavigation
    length={alignmentLength}
    display-start={displayStart}
    display-end={displayEnd}
    height={40}
    ruler-padding={0}
    margin-left={labelWidth}
/>
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `length` | number | Total sequence length |
| `display-start` | number | Visible range start (1-indexed) |
| `display-end` | number | Visible range end |
| `height` | number | Component height in pixels |
| `ruler-padding` | number | Padding for ruler |
| `margin-left` | number | Left margin (align with MSA labels) |

### NightingaleTrack

Displays feature annotations (variants):

```tsx
<NightingaleTrack
    data={variantFeatures}
    length={alignmentLength}
    display-start={displayStart}
    display-end={displayEnd}
    height={trackHeight}
    layout="non-overlapping"
    margin-left={labelWidth}
/>
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `data` | Feature[] | Array of feature objects |
| `length` | number | Total sequence length |
| `display-start` | number | Visible range start |
| `display-end` | number | Visible range end |
| `height` | number | Track height |
| `layout` | string | Feature layout mode |
| `margin-left` | number | Left margin |

**Feature Data Structure:**
```typescript
interface Feature {
    accession: string;    // Unique identifier
    start: number;        // Start position (1-indexed)
    end: number;          // End position
    color: string;        // Fill color (hex)
    shape: FeatureShape;  // Shape type
}

type FeatureShape = 'diamond' | 'triangle' | 'chevron' | 'circle' | 'rectangle';
```

### NightingaleLinegraphTrack

Displays line graphs (e.g., conservation scores):

```tsx
<NightingaleLinegraphTrack
    data={conservationData}
    length={alignmentLength}
    display-start={displayStart}
    display-end={displayEnd}
    height={60}
    margin-left={labelWidth}
/>
```

**Line Data Structure:**
```typescript
interface LineData {
    name: string;           // Line identifier
    range: [number, number]; // Y-axis range
    color: string;          // Line color
    fill: string;           // Fill color under line
    lineCurve: string;      // Curve type (e.g., 'curveLinear')
    values: Array<{
        position: number;   // X position (1-indexed)
        value: number;      // Y value
    }>;
}
```

### NightingaleMSA

Main alignment viewer:

```tsx
<NightingaleMSA
    data={msaData}
    features={variantFeatures}
    length={alignmentLength}
    display-start={displayStart}
    display-end={displayEnd}
    height={msaHeight}
    label-width={labelWidth}
    colorScheme={colorScheme}
    overlay-conservation={false}
    onChange={handleChange}
    onFeatureClick={handleFeatureClick}
/>
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `data` | MSAData[] | Sequence data array |
| `features` | Feature[] | Variant annotations |
| `length` | number | Alignment length |
| `display-start` | number | Visible range start |
| `display-end` | number | Visible range end |
| `height` | number | Component height |
| `label-width` | number | Label column width |
| `colorScheme` | string | Amino acid coloring |
| `overlay-conservation` | boolean | Show conservation overlay |

**MSA Data Structure:**
```typescript
interface MSAData {
    name: string;      // Sequence name
    sequence: string;  // Aligned sequence (with gaps)
}
```

## Color Schemes

Available amino acid color schemes for MSA:

| Scheme | Description |
|--------|-------------|
| `conservation` | Conservation-based coloring |
| `clustal2` | ClustalX default colors |
| `aliphatic` | Aliphatic residues |
| `aromatic` | Aromatic residues |
| `charged` | Charged residues |
| `positive` | Positively charged |
| `negative` | Negatively charged |
| `hydro` | Hydrophobicity |
| `polar` | Polar residues |
| `buried_index` | Burial propensity |
| `helix_propensity` | Helix propensity |
| `strand_propensity` | Strand propensity |
| `turn_propensity` | Turn propensity |
| `cinema` | CINEMA colors |
| `lesk` | Lesk colors |
| `mae` | MAE colors |
| `taylor` | Taylor colors |
| `zappo` | Zappo colors |

## Event Handling

### Change Events

Fired when display range changes (pan/zoom):

```typescript
interface NightingaleChangeEvent extends Event {
    detail: {
        'display-start': number;
        'display-end': number;
    };
}

const handleChange = (e: NightingaleChangeEvent) => {
    setDisplayRange({
        displayStart: e.detail['display-start'],
        displayEnd: e.detail['display-end']
    });
};
```

### Feature Click Events

Fired when a variant feature is clicked:

```typescript
type OnFeatureClick = CustomEvent<{
    id: string;       // Feature accession
    event: MouseEvent;
}>;

const handleFeatureClick = (e: OnFeatureClick) => {
    const variantId = e.detail.id;
    // Show variant details...
};
```

## Styling

### Global CSS

Canvas rendering optimizations in `globals.css`:

```css
/* Fix blurry canvas rendering */
nightingale-msa,
nightingale-msa canvas {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
}

#alignment-view-container canvas {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
}
```

### AGR Theme Colors

PAVI uses Alliance Genome CSS variables:

```css
/* agr-theme.css */
:root {
    --agr-primary: #2069a0;
    --agr-gray-50: #f8f9fa;
    --agr-gray-100: #f1f3f5;
    --agr-gray-200: #e9ecef;
    --agr-gray-300: #dee2e6;
    --agr-gray-400: #ced4da;
    --agr-gray-500: #adb5bd;
    --agr-gray-600: #868e96;
    --agr-gray-700: #495057;
    --agr-gray-800: #343a40;
    --agr-gray-900: #212529;
    --agr-font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

### Inline Styling

Components use AGR theme variables:

```tsx
<div style={{
    backgroundColor: 'var(--agr-gray-50, #f8f9fa)',
    border: '1px solid var(--agr-gray-200, #e9ecef)',
    color: 'var(--agr-gray-700, #495057)'
}}>
```

## Usage Examples

### Basic Alignment View

```tsx
import {
    NightingaleManager,
    NightingaleNavigation,
    NightingaleMSA,
    MSADataProp
} from '@/app/result/components/InteractiveAlignment/nightingale';

function BasicAlignment({ alignment }: { alignment: MSADataProp }) {
    const length = alignment[0]?.sequence.length ?? 0;

    return (
        <NightingaleManager reflected-attributes="display-start,display-end">
            <NightingaleNavigation
                length={length}
                display-start={1}
                display-end={length}
                height={40}
            />
            <NightingaleMSA
                data={alignment}
                length={length}
                display-start={1}
                display-end={length}
                height={300}
                colorScheme="clustal2"
            />
        </NightingaleManager>
    );
}
```

### Alignment with Variants

```tsx
function AlignmentWithVariants({
    alignment,
    variants
}: {
    alignment: MSADataProp;
    variants: VariantInfo[];
}) {
    const [displayRange, setDisplayRange] = useState({
        start: 1,
        end: alignment[0].sequence.length
    });

    // Convert variants to MSA features
    const msaFeatures = useMemo(() =>
        variants.map(v => ({
            residues: { from: v.alignmentStart, to: v.alignmentEnd },
            sequences: { from: 0, to: alignment.length - 1 },
            id: v.variantId,
            borderColor: '#000000',
            fillColor: 'rgba(0,0,0,0.3)',
            mouseOverFillColor: 'rgba(0,0,0,0.5)',
            mouseOverBorderColor: '#000000',
        })),
        [variants, alignment.length]
    );

    // Convert variants to track features
    const trackFeatures = useMemo(() =>
        variants.map(v => ({
            accession: v.variantId,
            start: v.alignmentStart,
            end: v.alignmentEnd,
            color: getVariantColor(v.type),
            shape: getVariantShape(v.type),
        })),
        [variants]
    );

    const handleChange = useCallback((e: NightingaleChangeEvent) => {
        setDisplayRange({
            start: e.detail['display-start'],
            end: e.detail['display-end']
        });
    }, []);

    return (
        <NightingaleManager reflected-attributes="display-start,display-end">
            <NightingaleNavigation
                length={length}
                display-start={displayRange.start}
                display-end={displayRange.end}
                height={40}
            />
            <NightingaleTrack
                data={trackFeatures}
                length={length}
                display-start={displayRange.start}
                display-end={displayRange.end}
                height={30}
                layout="non-overlapping"
            />
            <NightingaleMSA
                data={alignment}
                features={msaFeatures}
                length={length}
                display-start={displayRange.start}
                display-end={displayRange.end}
                height={300}
                colorScheme="clustal2"
                onChange={handleChange}
            />
        </NightingaleManager>
    );
}
```

## Performance Considerations

### Memoization

All Nightingale wrappers are memoized to prevent unnecessary re-renders:

```tsx
const MemoizedNightingaleMSA = memo(NightingaleMSAReactComponent);
```

### Data Memoization

MSA data and features should be memoized:

```tsx
const msaData = useMemo(() =>
    sequences.map(s => ({ name: s.name, sequence: s.sequence })),
    [sequences]
);

const msaFeatures = useMemo(() =>
    variants.map(v => ({ /* ... */ })),
    [variants]
);
```

### Virtualization

For large alignments (30+ sequences), use `VirtualizedAlignment`:

```tsx
// Uses @tanstack/react-virtual for virtualized rendering
<VirtualizedAlignment
    alignment={largeAlignment}
    seqInfoDict={seqInfo}
    msaFeatures={features}
/>
```

## Testing

### Jest Mocks

Mock Nightingale components in tests:

```typescript
// __mocks__/nightingale-track.ts
export default class MockNightingaleTrack extends HTMLElement {
    static get observedAttributes() {
        return ['data', 'length', 'display-start', 'display-end'];
    }
}

customElements.define('nightingale-track', MockNightingaleTrack);
```

### Test Patterns

```typescript
import { render, screen } from '@testing-library/react';

describe('InteractiveAlignment', () => {
    it('renders alignment data', () => {
        const mockData = [
            { name: 'Seq1', sequence: 'MSTQVN' },
            { name: 'Seq2', sequence: 'MSTQVN' }
        ];

        render(<InteractiveAlignment alignment={mockData} />);

        // Verify component rendered
        expect(screen.getByTestId('alignment-container')).toBeInTheDocument();
    });
});
```

## File Locations

| File | Description |
|------|-------------|
| `webui/src/app/result/components/InteractiveAlignment/nightingale/` | React wrappers |
| `webui/src/app/result/components/InteractiveAlignment/InteractiveAlignment.tsx` | Basic alignment view |
| `webui/src/app/result/components/InteractiveAlignment/VirtualizedAlignment.tsx` | Large alignment view |
| `webui/src/app/globals.css` | Global Nightingale styles |
| `webui/src/app/styles/agr-theme.css` | AGR theme variables |

## Related Documentation

- [Testing Guide](testing-guide.md) - Testing Nightingale components
- [Troubleshooting](troubleshooting.md) - Visualization issues
- [Data Flow Diagrams](data-flows.md) - How alignment data reaches visualization
