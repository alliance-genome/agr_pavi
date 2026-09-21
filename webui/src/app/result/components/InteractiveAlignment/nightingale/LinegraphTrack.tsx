'use client';

import { EventName, createComponent } from '@lit/react';
import React, { memo } from 'react';

import NightingaleLinegraphTrack, { LineData } from '@nightingale-elements/nightingale-linegraph-track';
import { NightingaleChangeEvent } from './types';

type NightingaleLinegraphTrackType = NightingaleLinegraphTrack;

const NightingaleLinegraphTrackReactComponent = createComponent({
    tagName: 'nightingale-linegraph-track',
    elementClass: NightingaleLinegraphTrack,
    react: React,
    events: {
        onChange: 'change' as EventName<NightingaleChangeEvent>,
    },
});

// Memoized version to prevent unnecessary re-renders
const MemoizedNightingaleLinegraphTrack = memo(NightingaleLinegraphTrackReactComponent);

export type { NightingaleLinegraphTrackType, LineData };
export default MemoizedNightingaleLinegraphTrack;
