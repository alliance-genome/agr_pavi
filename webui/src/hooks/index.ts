export { useJobHistory } from './useJobHistory';
export type { JobHistoryEntry, JobStatus } from './useJobHistory';

export { useRealtimeUpdates, isJobComplete } from './useRealtimeUpdates';
export type { ConnectionStatus, RealtimeUpdateOptions, RealtimeUpdateResult } from './useRealtimeUpdates';

export { useResponsive, usePrefersReducedMotion, useTouchDevice } from './useResponsive';
export type { ResponsiveState, UseResponsiveOptions } from './useResponsive';

export { usePrefetchRoute, usePrefetchData, usePrefetchOnVisible, clearPrefetchCache } from './usePrefetch';
export type { PrefetchOptions, UsePrefetchResult } from './usePrefetch';

export { useFocusOnMount, usePageAnnouncement } from './useFocusOnMount';

export { useGeneSearch } from './useGeneSearch';
export type { UseGeneSearchOptions, UseGeneSearchResult } from './useGeneSearch';

export { useTranscriptSelection } from './useTranscriptSelection';
export type { UseTranscriptSelectionOptions, UseTranscriptSelectionResult } from './useTranscriptSelection';

export { useAlleleSelection } from './useAlleleSelection';
export type { UseAlleleSelectionOptions, UseAlleleSelectionResult } from './useAlleleSelection';
