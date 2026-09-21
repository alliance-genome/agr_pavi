'use client';

import { EventName, createComponent } from '@lit/react';
import React, { memo } from 'react';

import NightingaleTrack, {Feature} from '@nightingale-elements/nightingale-track';
import {Shapes as FeatureShapes} from '@nightingale-elements/nightingale-track/dist/FeatureShape';
import { NightingaleChangeEvent } from './types';

type NightingaleTrackType = NightingaleTrack
type OnFeatureClick = CustomEvent<{ id: string; event: MouseEvent }>;

type dataPropType = Feature[]

const NightingaleTrackReactComponent = createComponent({
    tagName: 'nightingale-track',
    elementClass: NightingaleTrack,
    react: React,
    events: {
        onFeatureClick: 'onFeatureClick' as EventName<OnFeatureClick>,
        onChange: 'change' as EventName<NightingaleChangeEvent>,
    },
});

// Memoized version to prevent unnecessary re-renders
const MemoizedNightingaleTrack = memo(NightingaleTrackReactComponent);

export type { NightingaleTrackType }
export type { dataPropType, FeatureShapes }
export default MemoizedNightingaleTrack
