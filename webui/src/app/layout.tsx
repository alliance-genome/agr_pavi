import type { Metadata } from "next";
import { Inter } from "next/font/google";
import React from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PAVI webUI pilot",
  description: "Generated by create next app",
  icons: "https://www.alliancegenome.org/favicon-16x16.png",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
