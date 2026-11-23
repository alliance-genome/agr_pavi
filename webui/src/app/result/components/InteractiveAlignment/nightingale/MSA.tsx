'use client';

import { EventName, createComponent } from '@lit/react';
import React, { memo } from 'react';

import NightingaleMSA from '@nightingale-elements/nightingale-msa';
import { NightingaleChangeEvent } from './types';

type NightingaleMSAType = NightingaleMSA
type OnFeatureClick = CustomEvent<{ id: string; event: MouseEvent }>;

type dataPropType = {sequence: string, name: string}[]
type featuresPropType = {
    residues: {
        from: number,
        to: number
    },
    sequences: {
        from: number,
        to: number
    },
    id: string,
    borderColor: string,
    fillColor: string,
    mouseOverFillColor: string,
    mouseOverBorderColor: string,
}[]

const NightingaleMSAReactComponent = createComponent({
    tagName: 'nightingale-msa',
    elementClass: NightingaleMSA,
    react: React,
    events: {
        onFeatureClick: 'onFeatureClick' as EventName<OnFeatureClick>,
        onChange: 'change' as EventName<NightingaleChangeEvent>,
    },
});

// Memoized version to prevent unnecessary re-renders
const MemoizedNightingaleMSA = memo(NightingaleMSAReactComponent);

export type { NightingaleMSAType }
export type { dataPropType, featuresPropType }
export default MemoizedNightingaleMSA
