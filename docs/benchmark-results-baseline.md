# PAVI Frontend Performance Benchmark - Baseline Results

**Date:** 2025-12-17
**Branch:** feature/pavi-overhaul
**Purpose:** Establish baseline performance metrics before optimization

## Test Environment

- **Browser:** Chrome (Docker container)
- **Component:** Nightingale MSA (Web Components, Canvas-based)
- **Sequence Length:** 300 amino acids per sequence
- **Variants:** 3-5 per sequence

## Results

| Sequences | Canvas Height | Render Time | Avg FPS | Min FPS | Max FPS | Status |
|-----------|---------------|-------------|---------|---------|---------|--------|
| 100 | 2,000px | 5,430ms | 34 | 1 | 59 | Acceptable |
| 500 | 10,000px | 12,317ms | 18 | 1 | 52 | Poor |
| 1,000 | 20,000px | 23,091ms | 1 | 1 | 1 | Unusable |

## Key Findings

### 1. Performance Degrades Exponentially
- Render time increases ~4x from 100 to 500 sequences
- FPS drops from 34 to 18 (47% reduction)
- At 1000 sequences, UI becomes completely unresponsive

### 2. No Virtualization
- All sequences rendered simultaneously
- Canvas height = `sequences * 20px`
- DOM bloat proportional to sequence count

### 3. Render Blocking
- Min FPS drops to 1 across ALL tests
- Indicates main thread blocking during initial render
- Large canvas operations freeze the UI

### 4. O(n*m) Variant Processing
- Nested loops for variant overlay calculation
- Compounds performance issues at scale

## Architecture Limitations

```
Current: InteractiveAlignment.tsx
├── height={alignmentData.length * 20}  ← Linear scaling, no virtualization
├── Nightingale MSA (Canvas)
│   └── Renders ALL sequences at once
└── Variant processing: O(sequences × variants)
```

## Recommendations

1. **Implement Virtual Scrolling**
   - Only render visible sequences (~50 at a time)
   - Use react-window or react-virtualized
   - Reduces DOM nodes from 1000 to ~50

2. **Paginated Data Loading**
   - API returns windowed data
   - Fetch more on scroll
   - Reduces initial payload

3. **Web Worker for Variants**
   - Move O(n*m) processing off main thread
   - Prevents render blocking

4. **Canvas Optimization**
   - Multiple smaller canvases vs one large canvas
   - Progressive rendering

## Target Metrics (Post-Optimization)

| Sequences | Target FPS | Target Render Time |
|-----------|------------|-------------------|
| 100 | 60 | <500ms |
| 500 | 60 | <1000ms |
| 1,000 | 60 | <2000ms |
| 10,000+ | 60 | <3000ms |

## Conclusion

The current implementation cannot scale beyond ~100 sequences with acceptable performance. Virtualization is **required** for the PAVI overhaul to meet its goals of handling large datasets.

---

*Benchmark conducted as part of Week 1 tasks for PAVI Technology Stack Overhaul*
