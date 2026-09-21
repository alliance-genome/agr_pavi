import React from 'react';
import styles from './admin.module.css';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Admin pages use their own full-width layout
    // Use fixed positioning to completely cover the viewport and hide the regular layout
    return (
        <div className={styles.adminLayoutOverlay}>
            {children}
        </div>
    );
}
