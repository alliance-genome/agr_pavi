'use client';

import { EventName, createComponent } from '@lit/react';
import React, { memo } from 'react';

import NightingaleNavigation from '@nightingale-elements/nightingale-navigation';
import { NightingaleChangeEvent } from './types';

type NightingaleNavigationType = NightingaleNavigation

const NightingaleNavigationReactComponent = createComponent({
    tagName: 'nightingale-navigation',
    elementClass: NightingaleNavigation,
    react: React,
    events: {
        onChange: 'change' as EventName<NightingaleChangeEvent>
    }
});

// Memoized version to prevent unnecessary re-renders
const MemoizedNightingaleNavigation = memo(NightingaleNavigationReactComponent);

export { type NightingaleNavigationType }
export default MemoizedNightingaleNavigation
