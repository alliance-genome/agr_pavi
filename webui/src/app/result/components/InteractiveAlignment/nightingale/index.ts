/**
 * Nightingale components barrel file.
 *
 * These components are code-split via dynamic imports in the parent components.
 * Each component is wrapped with React.memo for performance optimization.
 */

// Re-export components for convenient imports
export { default as NightingaleMSA } from './MSA';
export { default as NightingaleManager } from './Manager';
export { default as NightingaleNavigation } from './Navigation';
export { default as NightingaleTrack } from './Track';

// Re-export types
export type { dataPropType as MSADataProp, featuresPropType as MSAFeaturesProp } from './MSA';
export type { dataPropType as TrackDataProp, FeatureShapes } from './Track';
export type { NightingaleChangeEvent } from './types';
