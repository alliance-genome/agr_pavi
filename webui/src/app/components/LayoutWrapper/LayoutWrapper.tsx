'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

// Routes that should render without header/footer (fullscreen mode)
const FULLSCREEN_ROUTES = ['/alignment'];

interface LayoutWrapperProps {
    children: ReactNode;
    header: ReactNode;
    footer: ReactNode;
    skipLinks: ReactNode;
    keyboardShortcuts: ReactNode;
}

export function LayoutWrapper({
    children,
    header,
    footer,
    skipLinks,
    keyboardShortcuts
}: LayoutWrapperProps) {
    const pathname = usePathname();
    const isFullscreen = FULLSCREEN_ROUTES.some(route => pathname.startsWith(route));

    if (isFullscreen) {
        // Fullscreen mode: just render children without header/footer
        return <>{children}</>;
    }

    // Normal mode: render with full layout
    return (
        <>
            {skipLinks}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                {header}
                <main id="main-content" className="agr-page-content" role="main" tabIndex={-1}>
                    <div className="agr-container">
                        {children}
                    </div>
                </main>
                {footer}
                {keyboardShortcuts}
            </div>
        </>
    );
}
