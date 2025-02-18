'use client';

import { EventName, createComponent } from '@lit/react';
import React from 'react';

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

export { type NightingaleNavigationType }
export default NightingaleNavigationReactComponent
