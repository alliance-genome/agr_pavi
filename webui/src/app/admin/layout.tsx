import React from 'react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Admin pages use their own full-width layout
    // Override the container constraints from root layout
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            background: 'var(--agr-gray-50)',
        }}>
            {children}
        </div>
    );
}
