'use client';

import React from 'react';
import { Tag } from 'primereact/tag';
import { Tooltip } from 'primereact/tooltip';
import type { ConnectionStatus as ConnectionStatusType } from '../../../../hooks/useRealtimeUpdates';
import styles from './ConnectionStatus.module.css';

interface ConnectionStatusProps {
    status: ConnectionStatusType;
    lastUpdate?: Date | null;
    retryCount?: number;
    onRetry?: () => void;
}

export function ConnectionStatus({
    status,
    lastUpdate,
    retryCount = 0,
    onRetry,
}: ConnectionStatusProps) {
    const getStatusConfig = () => {
        switch (status) {
            case 'connected':
                return {
                    icon: 'pi-wifi',
                    label: 'Connected',
                    severity: 'success' as const,
                    description: 'Receiving live updates',
                };
            case 'connecting':
                return {
                    icon: 'pi-spin pi-spinner',
                    label: 'Connecting',
                    severity: 'info' as const,
                    description: 'Establishing connection...',
                };
            case 'disconnected':
                return {
                    icon: 'pi-wifi',
                    label: 'Reconnecting',
                    severity: 'warning' as const,
                    description: retryCount > 0
                        ? `Retrying... (attempt ${retryCount})`
                        : 'Connection interrupted, retrying...',
                };
            case 'error':
                return {
                    icon: 'pi-exclamation-triangle',
                    label: 'Disconnected',
                    severity: 'danger' as const,
                    description: 'Unable to connect. Click to retry.',
                };
        }
    };

    const config = getStatusConfig();

    const formatLastUpdate = (date: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 5) return 'just now';
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return date.toLocaleTimeString();
    };

    return (
        <div className={styles.container}>
            <Tag
                severity={config.severity}
                className={`${styles.tag} ${status === 'error' && onRetry ? styles.clickable : ''}`}
                onClick={status === 'error' && onRetry ? onRetry : undefined}
                data-pr-tooltip={config.description}
                data-pr-position="bottom"
            >
                <i className={`pi ${config.icon} ${styles.icon}`} />
                <span className={styles.label}>{config.label}</span>
            </Tag>
            <Tooltip target={`.${styles.tag}`} />

            {lastUpdate && status === 'connected' && (
                <span className={styles.lastUpdate}>
                    Last update: {formatLastUpdate(lastUpdate)}
                </span>
            )}
        </div>
    );
}
