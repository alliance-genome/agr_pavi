// Three interactive viewers coexist: Nightingale Virtualized (default),
// Nightingale Legacy (pre-virtualized layout), and @nuin/msa-canvas. The
// canvas-only rollout was reverted; all three stay available until we
// pick a single viewer with evidence. 'jbrowse' remains as a placeholder
// for a future track-browser view.
export type displayModeType = 'text' | 'virtualized' | 'interactive' | 'canvas' | 'jbrowse'
