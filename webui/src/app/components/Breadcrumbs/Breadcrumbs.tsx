'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import styles from './Breadcrumbs.module.css';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[];
    showHome?: boolean;
}

// Route to label mapping for automatic breadcrumbs
const routeLabels: Record<string, string> = {
    '': 'Home',
    'submit': 'Submit Job',
    'jobs': 'My Jobs',
    'results': 'Results',
    'help': 'Help',
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
    items,
    showHome = true,
}) => {
    const pathname = usePathname();

    // Generate breadcrumbs from current path if items not provided
    const breadcrumbItems: BreadcrumbItem[] = React.useMemo(() => {
        if (items) {
            return items;
        }

        const segments = pathname.split('/').filter(Boolean);
        const generatedItems: BreadcrumbItem[] = [];

        if (showHome) {
            generatedItems.push({ label: 'Home', href: '/' });
        }

        let currentPath = '';
        segments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const isLast = index === segments.length - 1;

            // Try to get a friendly label, or format the segment
            const label = routeLabels[segment] ||
                segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

            generatedItems.push({
                label,
                href: isLast ? undefined : currentPath,
            });
        });

        return generatedItems;
    }, [items, pathname, showHome]);

    // Don't render if only home or empty
    if (breadcrumbItems.length <= 1) {
        return null;
    }

    return (
        <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
            <ol className={styles.list}>
                {breadcrumbItems.map((item, index) => {
                    const isLast = index === breadcrumbItems.length - 1;

                    return (
                        <li key={index} className={styles.item}>
                            {item.href && !isLast ? (
                                <>
                                    <Link href={item.href} className={styles.link}>
                                        {index === 0 && showHome ? (
                                            <span className={styles.homeIcon} aria-hidden="true">
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                                    <polyline points="9 22 9 12 15 12 15 22"/>
                                                </svg>
                                            </span>
                                        ) : null}
                                        <span>{item.label}</span>
                                    </Link>
                                    <span className={styles.separator} aria-hidden="true">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="9 18 15 12 9 6"/>
                                        </svg>
                                    </span>
                                </>
                            ) : (
                                <span
                                    className={styles.current}
                                    aria-current="page"
                                >
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};
