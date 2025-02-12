'use client';

import { EventName, createComponent } from '@lit/react';
import React from 'react';

import NightingaleMSA from '@nightingale-elements/nightingale-msa';
import { NightingaleChangeEvent } from './types';

type NightingaleMSAType = NightingaleMSA
type OnFeatureClick = CustomEvent<{ id: string; event: MouseEvent }>;

const NightingaleMSAReactComponent = createComponent({
    tagName: 'nightingale-msa',
    elementClass: NightingaleMSA,
    react: React,
    events: {
        onFeatureClick: 'onFeatureClick' as EventName<OnFeatureClick>,
        onChange: 'change' as EventName<NightingaleChangeEvent>,
    },
});

export type { NightingaleMSAType }
export default NightingaleMSAReactComponent
