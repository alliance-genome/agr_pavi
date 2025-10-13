import React from 'react';
import { render } from '@testing-library/react';
import { expect } from '@jest/globals';
import '@testing-library/jest-dom';

import { FailureDisplay } from '../FailureDisplay/FailureDisplay';

describe('FailureDisplay Component', () => {
    const failureMap = new Map<string, string>

    failureMap.set('seq3', 'mocked error message')
    failureMap.set('seq4', 'mocked error message2')

    test('renders without crashing', () => {
        const {container} = render(<FailureDisplay failureList={failureMap} />);
        expect(container.querySelector('#alignment-failures')).toBeInTheDocument();
    });

    test('renders empty when no errors', () => {
        const {container} = render(<FailureDisplay failureList={new Map<string, string>} />);
        expect(container.querySelector('#alignment-failures')).not.toBeInTheDocument();
    });

    test('displays the correct error messages on failures', () => {
        const {container} = render(<FailureDisplay failureList={failureMap} />);
        const failuresListItems = container.querySelectorAll('#alignment-failures > ul > li')
        const textsArray = Array.from(failuresListItems).map(el => el.textContent);

        expect(failuresListItems).toHaveLength(2);
        expect(textsArray).toContain('seq3: mocked error message');
    });

});
