'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import styles from './LogViewer.module.css';

export interface LogEntry {
    timestamp: Date;
    level: 'info' | 'warning' | 'error' | 'debug';
    message: string;
    source?: string;
}

interface LogViewerProps {
    logs: LogEntry[];
    title?: string;
    maxHeight?: number;
    autoScroll?: boolean;
    collapsed?: boolean;
    onDownload?: () => void;
}

export function LogViewer({
    logs,
    title = 'Job Logs',
    maxHeight = 300,
    autoScroll = true,
    collapsed = true,
    onDownload,
}: LogViewerProps) {
    const [isCollapsed, setIsCollapsed] = useState(collapsed);
    const [filter, setFilter] = useState<LogEntry['level'] | 'all'>('all');
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoScroll && logContainerRef.current && !isCollapsed) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll, isCollapsed]);

    const getLevelSeverity = (level: LogEntry['level']): 'info' | 'warning' | 'danger' | 'secondary' => {
        switch (level) {
            case 'error':
                return 'danger';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'secondary';
        }
    };

    const filteredLogs = filter === 'all'
        ? logs
        : logs.filter(log => log.level === filter);

    const errorCount = logs.filter(l => l.level === 'error').length;
    const warningCount = logs.filter(l => l.level === 'warning').length;

    const formatTimestamp = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const headerTemplate = () => (
        <div className={styles.panelHeader}>
            <div className={styles.headerLeft}>
                <i className="pi pi-file-o" />
                <span>{title}</span>
                <span className={styles.logCount}>({logs.length} entries)</span>
            </div>
            <div className={styles.headerRight}>
                {errorCount > 0 && (
                    <Tag severity="danger" value={`${errorCount} errors`} className={styles.countBadge} />
                )}
                {warningCount > 0 && (
                    <Tag severity="warning" value={`${warningCount} warnings`} className={styles.countBadge} />
                )}
            </div>
        </div>
    );

    return (
        <Panel
            header={headerTemplate()}
            toggleable
            collapsed={isCollapsed}
            onToggle={(e) => setIsCollapsed(e.value ?? false)}
            className={styles.panel}
        >
            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    <Button
                        label="All"
                        size="small"
                        className={filter === 'all' ? 'p-button-primary' : 'p-button-outlined'}
                        onClick={() => setFilter('all')}
                    />
                    <Button
                        label="Info"
                        size="small"
                        icon="pi pi-info-circle"
                        className={filter === 'info' ? 'p-button-info' : 'p-button-outlined'}
                        onClick={() => setFilter('info')}
                    />
                    <Button
                        label="Warnings"
                        size="small"
                        icon="pi pi-exclamation-triangle"
                        className={filter === 'warning' ? 'p-button-warning' : 'p-button-outlined'}
                        onClick={() => setFilter('warning')}
                    />
                    <Button
                        label="Errors"
                        size="small"
                        icon="pi pi-times-circle"
                        className={filter === 'error' ? 'p-button-danger' : 'p-button-outlined'}
                        onClick={() => setFilter('error')}
                    />
                </div>
                {onDownload && (
                    <Button
                        label="Download Logs"
                        icon="pi pi-download"
                        size="small"
                        className="p-button-text"
                        onClick={onDownload}
                    />
                )}
            </div>

            <div
                ref={logContainerRef}
                className={styles.logContainer}
                style={{ maxHeight: `${maxHeight}px` }}
                role="log"
                aria-live="polite"
                aria-label="Job processing logs"
            >
                {filteredLogs.length === 0 ? (
                    <div className={styles.empty}>
                        <i className="pi pi-inbox" />
                        <p>No log entries to display</p>
                    </div>
                ) : (
                    filteredLogs.map((log, index) => (
                        <div
                            key={index}
                            className={`${styles.logEntry} ${styles[log.level]}`}
                        >
                            <span className={styles.timestamp}>
                                {formatTimestamp(log.timestamp)}
                            </span>
                            <Tag
                                severity={getLevelSeverity(log.level)}
                                value={log.level.toUpperCase()}
                                className={styles.levelTag}
                            />
                            {log.source && (
                                <span className={styles.source}>[{log.source}]</span>
                            )}
                            <span className={styles.message}>{log.message}</span>
                        </div>
                    ))
                )}
            </div>
        </Panel>
    );
}
