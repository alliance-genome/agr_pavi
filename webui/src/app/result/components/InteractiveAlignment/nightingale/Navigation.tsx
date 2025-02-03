'use client';

import { createComponent } from '@lit/react';
import React from 'react';

import NightingaleNavigation from '@nightingale-elements/nightingale-navigation';

type NightingaleNavigationType = NightingaleNavigation

const NightingaleNavigationReactComponent = createComponent({
    tagName: 'nightingale-navigation',
    elementClass: NightingaleNavigation,
    react: React
});

export { type NightingaleNavigationType }
export default NightingaleNavigationReactComponent
