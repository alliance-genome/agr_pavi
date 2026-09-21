'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';
import type { MenuItem } from 'primereact/menuitem';
import type { JobHistoryEntry } from '../../../../hooks/useJobHistory';
import { exportJobAsJson, exportJobAsZip } from '../../../../utils/jobExport';
import styles from './JobExportMenu.module.css';

export interface JobExportMenuProps {
    jobHistory?: JobHistoryEntry;
    alignmentResult?: string;
    logs?: string[];
    metadata?: Record<string, unknown>;
    disabled?: boolean;
    buttonLabel?: string;
    buttonIcon?: string;
    showJsonOption?: boolean;
    showZipOption?: boolean;
}

export function JobExportMenu({
    jobHistory,
    alignmentResult,
    logs,
    metadata,
    disabled = false,
    buttonLabel = 'Export Job',
    buttonIcon = 'pi pi-download',
    showJsonOption = true,
    showZipOption = true,
}: JobExportMenuProps) {
    const menuRef = useRef<Menu>(null);
    const toastRef = useRef<Toast>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleJsonExport = useCallback(async () => {
        setIsExporting(true);
        try {
            exportJobAsJson(jobHistory, alignmentResult, logs, metadata);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Export Complete',
                detail: 'Job data exported as JSON',
                life: 3000,
            });
        } catch (error) {
            console.error('JSON export failed:', error);
            toastRef.current?.show({
                severity: 'error',
                summary: 'Export Failed',
                detail: 'Failed to export job data',
                life: 5000,
            });
        } finally {
            setIsExporting(false);
        }
    }, [jobHistory, alignmentResult, logs, metadata]);

    const handleZipExport = useCallback(async () => {
        setIsExporting(true);
        try {
            await exportJobAsZip(jobHistory, alignmentResult, logs, metadata);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Export Complete',
                detail: 'Job data exported as ZIP archive',
                life: 3000,
            });
        } catch (error) {
            console.error('ZIP export failed:', error);
            toastRef.current?.show({
                severity: 'error',
                summary: 'Export Failed',
                detail: 'Failed to create ZIP archive',
                life: 5000,
            });
        } finally {
            setIsExporting(false);
        }
    }, [jobHistory, alignmentResult, logs, metadata]);

    const menuItems: MenuItem[] = [];

    if (showJsonOption) {
        menuItems.push({
            label: 'Export as JSON',
            icon: 'pi pi-code',
            command: handleJsonExport,
            disabled: isExporting,
            template: (item, options) => (
                <button
                    className={`${options.className} ${styles.menuItem}`}
                    onClick={(e) => options.onClick(e)}
                    disabled={isExporting}
                >
                    <span className={`${options.iconClassName} ${styles.menuIcon}`} />
                    <div className={styles.menuContent}>
                        <span className={styles.menuLabel}>{item.label}</span>
                        <span className={styles.menuDescription}>
                            Complete job data in JSON format
                        </span>
                    </div>
                </button>
            ),
        });
    }

    if (showZipOption) {
        menuItems.push({
            label: 'Download as ZIP',
            icon: 'pi pi-file-export',
            command: handleZipExport,
            disabled: isExporting || !alignmentResult,
            template: (item, options) => (
                <button
                    className={`${options.className} ${styles.menuItem}`}
                    onClick={(e) => options.onClick(e)}
                    disabled={isExporting || !alignmentResult}
                >
                    <span className={`${options.iconClassName} ${styles.menuIcon}`} />
                    <div className={styles.menuContent}>
                        <span className={styles.menuLabel}>{item.label}</span>
                        <span className={styles.menuDescription}>
                            All formats (FASTA, Clustal, PHYLIP, JSON)
                        </span>
                    </div>
                </button>
            ),
        });
    }

    if (menuItems.length === 0) {
        return null;
    }

    // If only one option, render a simple button
    if (menuItems.length === 1) {
        const singleOption = menuItems[0];
        return (
            <div className={styles.container}>
                <Toast ref={toastRef} />
                <Button
                    label={singleOption.label as string}
                    icon={singleOption.icon}
                    onClick={() => singleOption.command?.({} as { originalEvent: React.SyntheticEvent; item: MenuItem })}
                    disabled={disabled || isExporting}
                    loading={isExporting}
                    className="p-button-outlined"
                />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Toast ref={toastRef} />
            <Menu
                ref={menuRef}
                model={menuItems}
                popup
                className={styles.menu}
            />
            <Button
                label={buttonLabel}
                icon={isExporting ? 'pi pi-spin pi-spinner' : buttonIcon}
                onClick={(e) => menuRef.current?.toggle(e)}
                disabled={disabled || isExporting}
                className="p-button-outlined"
                aria-haspopup="true"
            />
        </div>
    );
}

export default JobExportMenu;
