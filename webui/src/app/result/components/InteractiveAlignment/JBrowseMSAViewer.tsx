'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { observer } from 'mobx-react';
import { MSAView, MSAModelF } from 'react-msaview';
import { ThemeProvider, createTheme } from '@mui/material';

export interface JBrowseMSAViewerProps {
    readonly alignmentResult: string;  // CLUSTAL format string
    readonly height?: number;
}

// Create MUI theme for react-msaview
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#3b82f6',
        },
    },
});

const JBrowseMSAViewer: React.FC<JBrowseMSAViewerProps> = observer(({
    alignmentResult,
    height = 500,
}) => {
    const modelRef = useRef<ReturnType<typeof MSAModelF>['Type'] | null>(null);

    // Create the model once
    const model = useMemo(() => {
        const Model = MSAModelF();
        const instance = Model.create({
            type: 'MsaView',
            height,
            rowHeight: 20,
            colWidth: 16,
            drawMsaLetters: true,
            contrastLettering: true,
            drawTree: false,
            hideGaps: false,
            colorSchemeName: 'clustal2',
        });
        modelRef.current = instance;
        return instance;
    }, []);

    // Update the MSA data when alignmentResult changes
    useEffect(() => {
        if (model && alignmentResult) {
            model.setData({ msa: alignmentResult });
        }
    }, [model, alignmentResult]);

    // Update height when prop changes
    useEffect(() => {
        if (model && height) {
            model.setHeight(height);
        }
    }, [model, height]);

    if (!alignmentResult) {
        return <div>No alignment data available</div>;
    }

    return (
        <ThemeProvider theme={theme}>
            <div style={{ width: '100%', height: `${height}px` }}>
                <MSAView model={model} />
            </div>
        </ThemeProvider>
    );
});

export default JBrowseMSAViewer;
