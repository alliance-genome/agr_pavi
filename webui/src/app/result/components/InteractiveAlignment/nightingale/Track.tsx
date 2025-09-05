'use client';

import { EventName, createComponent } from '@lit/react';
import React from 'react';

import NightingaleTrack, {Feature} from '@nightingale-elements/nightingale-track';
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

export type { NightingaleTrackType }
export type { dataPropType }
export default NightingaleTrackReactComponent
