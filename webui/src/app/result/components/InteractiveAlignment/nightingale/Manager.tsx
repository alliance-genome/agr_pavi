'use client';

import { createComponent } from '@lit/react';
import React from 'react';

import NightingaleManager from '@nightingale-elements/nightingale-manager';

type NightingaleManagerType = NightingaleManager

const NightingaleManagerReactComponent = createComponent({
    tagName: 'nightingale-manager',
    elementClass: NightingaleManager,
    react: React
});

export { type NightingaleManagerType }
export default NightingaleManagerReactComponent
