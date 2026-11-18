'use client';

// Fullscreen alignment viewer entry point.
//
// Content lives in ./FullscreenAlignmentContent so we can dynamic-import
// it with ssr:false as ONE chunk. The content file static-imports the
// Nightingale wrappers so their custom-element definitions are
// registered BEFORE React creates the custom-element tags — otherwise
// React can set `data` on an un-upgraded element and the MSA grid
// never renders.

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const FullscreenAlignmentContent = dynamic(
    () => import('./FullscreenAlignmentContent'),
    { ssr: false }
);

export default function FullscreenAlignmentPage() {
    return (
        <Suspense fallback={
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: 'var(--agr-background-alt)',
                color: 'var(--agr-text-primary)',
            }}>
                Loading...
            </div>
        }>
            <FullscreenAlignmentContent />
        </Suspense>
    );
}
