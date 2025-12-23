import type { Metadata } from "next";
import { Lato } from "next/font/google";
import React from "react";
import "./globals.css";
import "./styles/agr-theme.css";

import { PrimeReactProvider } from 'primereact/api';

import { Header } from './components/Header/Header';
import { Footer } from './components/Footer/Footer';

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
        <html lang="en">
        <body className={lato.className}>
            <PrimeReactProvider>
                {/* eslint-disable-next-line @next/next/no-css-tags */}
                <link id="theme-link" rel="stylesheet" href="/themes/mdc-light-indigo/theme.css" />
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <Header />
                    <main className="agr-page-content">
                        <div className="agr-container">
                            {children}
                        </div>
                    </main>
                    <Footer />
                </div>
            </PrimeReactProvider>
        </body>
        </html>
    );
}
