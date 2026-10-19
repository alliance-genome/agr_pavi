import type { Metadata } from "next";
import { Lato } from "next/font/google";
import React from "react";
import "./globals.css";
import "./styles/agr-theme.css";

import { PrimeReactProvider } from 'primereact/api';

import { Header } from './components/Header/Header';
import { Footer } from './components/Footer/Footer';
import { Ribbon } from './components/Ribbon/Ribbon';
import { SkipLinks, LiveRegionProvider, KeyboardShortcuts } from './components/Accessibility';
import { LayoutWrapper } from './components/LayoutWrapper';
import { withBasePath } from '@/utils/basePath';
import { NO_FLASH_SCRIPT } from '@/hooks/useTheme';

const lato = Lato({
    subsets: ["latin"],
    weight: ["300", "400", "700"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "PAVI - Protein Annotation and Variant Inspector",
    description: "Analyze protein variants and alignments with the Alliance of Genome Resources",
    icons: "https://www.alliancegenome.org/favicon-16x16.png",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            {/* No-flash dark mode: runs synchronously before the body
                paints so a reload while in dark mode doesn't flash white.
                Must mirror useTheme's applyTheme logic.

                dangerouslySetInnerHTML is safe here: NO_FLASH_SCRIPT is a
                hard-coded string constant from our own module, never user
                input. React forces this attribute for inline <script>
                because that's the only way the bootstrap script runs
                before React hydrates. */}
            <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        </head>
        <body className={lato.className}>
            <Ribbon />
            <PrimeReactProvider>
                <LiveRegionProvider>
                    <link id="theme-link" rel="stylesheet" href={withBasePath('/themes/mdc-light-indigo/theme.css')} />
                    <LayoutWrapper
                        header={<Header />}
                        footer={<Footer />}
                        skipLinks={<SkipLinks />}
                        keyboardShortcuts={<KeyboardShortcuts />}
                    >
                        {children}
                    </LayoutWrapper>
                </LiveRegionProvider>
            </PrimeReactProvider>
        </body>
        </html>
    );
}
