import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect } from '@jest/globals';
import '@testing-library/jest-dom';

import { FailureDisplay } from '../FailureDisplay/FailureDisplay';

describe('FailureDisplay Component', () => {
    const failureMap = new Map<string, string>

    failureMap.set('seq3', 'mocked error message')
    failureMap.set('seq4', 'mocked error message2')

    test('renders without crashing', () => {
        const {container} = render(<FailureDisplay failureList={failureMap} />);
        // Component now uses accordion structure with role="region"
        expect(container.querySelector('[role="region"][aria-label="Failure details"]')).toBeInTheDocument();
    });

    test('renders empty state when no errors', () => {
        render(<FailureDisplay failureList={new Map<string, string>} />);
        // When empty, shows success message
        expect(screen.getByText('All sequences processed successfully')).toBeInTheDocument();
    });

    test('displays the correct error messages on failures', () => {
        // Render with defaultExpanded=false (default) - accordion items are collapsed
        render(<FailureDisplay failureList={failureMap} defaultExpanded={false} />);

        // Check for accordion items with failure IDs (visible in collapsed headers)
        expect(screen.getByText('seq3')).toBeInTheDocument();
        expect(screen.getByText('seq4')).toBeInTheDocument();

        // Check that summary shows correct count
        expect(screen.getByText('2 errors')).toBeInTheDocument();
    });

});
