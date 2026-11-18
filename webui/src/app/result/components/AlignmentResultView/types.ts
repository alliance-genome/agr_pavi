// Canvas is the only interactive mode now (powered by @nuin/msa-canvas).
// The two legacy Nightingale modes (virtualized / interactive) were
// deleted in the feat/msa-canvas-replace branch. 'jbrowse' remains as
// a placeholder for a future track-browser view.
export type displayModeType = 'text' | 'canvas' | 'jbrowse'
