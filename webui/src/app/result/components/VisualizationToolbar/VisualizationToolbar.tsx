'use client';

import React, { useState, useCallback } from 'react';
import { Button } from 'primereact/button';
import { Slider } from 'primereact/slider';
import { InputText } from 'primereact/inputtext';
import { Menu } from 'primereact/menu';
import { Tooltip } from 'primereact/tooltip';
import { MenuItem } from 'primereact/menuitem';
import styles from './VisualizationToolbar.module.css';

export interface VisualizationToolbarProps {
    // Zoom controls
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    // eslint-disable-next-line no-unused-vars
    onZoomChange?: (zoom: number) => void;

    // View options
    showLabels?: boolean;
    // eslint-disable-next-line no-unused-vars
    onToggleLabels?: (show: boolean) => void;
    colorScheme?: 'conservation' | 'hydrophobicity' | 'clustal';
    // eslint-disable-next-line no-unused-vars
    onColorSchemeChange?: (scheme: 'conservation' | 'hydrophobicity' | 'clustal') => void;

    // Search
    searchQuery?: string;
    // eslint-disable-next-line no-unused-vars
    onSearchChange?: (query: string) => void;

    // Export
    onExportFasta?: () => void;
    onExportClustal?: () => void;
    onExportImage?: () => void;
    onExportPdf?: () => void;

    // Fullscreen
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;

    // Reference
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function VisualizationToolbar({
    zoom = 100,
    minZoom = 50,
    maxZoom = 200,
    onZoomChange,
    showLabels = true,
    onToggleLabels,
    colorScheme = 'clustal',
    onColorSchemeChange,
    searchQuery = '',
    onSearchChange,
    onExportFasta,
    onExportClustal,
    onExportImage,
    onExportPdf,
    isFullscreen = false,
    onToggleFullscreen,
    containerRef,
}: VisualizationToolbarProps) {
    const [exportMenuVisible, setExportMenuVisible] = useState(false);
    const exportMenuRef = React.useRef<Menu>(null);

    const handleZoomIn = useCallback(() => {
        const newZoom = Math.min(zoom + 10, maxZoom);
        onZoomChange?.(newZoom);
    }, [zoom, maxZoom, onZoomChange]);

    const handleZoomOut = useCallback(() => {
        const newZoom = Math.max(zoom - 10, minZoom);
        onZoomChange?.(newZoom);
    }, [zoom, minZoom, onZoomChange]);

    const handleZoomReset = useCallback(() => {
        onZoomChange?.(100);
    }, [onZoomChange]);

    const handleToggleFullscreen = useCallback(() => {
        if (!containerRef?.current) {
            onToggleFullscreen?.();
            return;
        }

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
        onToggleFullscreen?.();
    }, [containerRef, onToggleFullscreen]);

    const exportMenuItems: MenuItem[] = [
        {
            label: 'FASTA Format',
            icon: 'pi pi-file',
            command: () => onExportFasta?.(),
            disabled: !onExportFasta,
        },
        {
            label: 'Clustal Format',
            icon: 'pi pi-file',
            command: () => onExportClustal?.(),
            disabled: !onExportClustal,
        },
        { separator: true },
        {
            label: 'PNG Image',
            icon: 'pi pi-image',
            command: () => onExportImage?.(),
            disabled: !onExportImage,
        },
        {
            label: 'PDF Document',
            icon: 'pi pi-file-pdf',
            command: () => onExportPdf?.(),
            disabled: !onExportPdf,
        },
    ];

    const colorSchemeOptions = [
        { value: 'clustal', label: 'Clustal', icon: 'pi pi-palette' },
        { value: 'conservation', label: 'Conservation', icon: 'pi pi-chart-bar' },
        { value: 'hydrophobicity', label: 'Hydrophobicity', icon: 'pi pi-wave-pulse' },
    ] as const;

    return (
        <div className={styles.toolbar} role="toolbar" aria-label="Visualization controls">
            <Tooltip target=".tooltip-target" position="bottom" />

            {/* Zoom Controls */}
            <div className={styles.toolbarGroup}>
                <span className={styles.toolbarLabel}>Zoom:</span>
                <div className={styles.zoomControls}>
                    <button
                        className={`${styles.toolbarButton} tooltip-target`}
                        onClick={handleZoomOut}
                        disabled={zoom <= minZoom}
                        aria-label="Zoom out"
                        data-pr-tooltip="Zoom out"
                    >
                        <i className="pi pi-minus" />
                    </button>

                    <div className={styles.zoomSlider}>
                        <Slider
                            value={zoom}
                            min={minZoom}
                            max={maxZoom}
                            onChange={(e) => onZoomChange?.(e.value as number)}
                            aria-label="Zoom level"
                        />
                    </div>

                    <button
                        className={`${styles.toolbarButton} tooltip-target`}
                        onClick={handleZoomIn}
                        disabled={zoom >= maxZoom}
                        aria-label="Zoom in"
                        data-pr-tooltip="Zoom in"
                    >
                        <i className="pi pi-plus" />
                    </button>

                    <span className={styles.zoomValue}>{zoom}%</span>

                    <button
                        className={`${styles.toolbarButton} tooltip-target`}
                        onClick={handleZoomReset}
                        aria-label="Reset zoom"
                        data-pr-tooltip="Reset zoom"
                    >
                        <i className="pi pi-refresh" />
                    </button>
                </div>
            </div>

            <div className={styles.toolbarDivider} />

            {/* View Options */}
            <div className={styles.toolbarGroup}>
                <button
                    className={`${styles.toolbarButton} ${showLabels ? styles.active : ''} tooltip-target`}
                    onClick={() => onToggleLabels?.(!showLabels)}
                    aria-label={showLabels ? 'Hide labels' : 'Show labels'}
                    aria-pressed={showLabels}
                    data-pr-tooltip={showLabels ? 'Hide sequence labels' : 'Show sequence labels'}
                >
                    <i className="pi pi-tag" />
                </button>

                <div className={styles.toggleGroup}>
                    {colorSchemeOptions.map((option) => (
                        <button
                            key={option.value}
                            className={`${styles.toolbarButton} ${colorScheme === option.value ? styles.active : ''} tooltip-target`}
                            onClick={() => onColorSchemeChange?.(option.value)}
                            aria-label={`${option.label} color scheme`}
                            aria-pressed={colorScheme === option.value}
                            data-pr-tooltip={option.label}
                        >
                            <i className={option.icon} />
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.toolbarDivider} />

            {/* Search */}
            {onSearchChange && (
                <div className={styles.toolbarGroup}>
                    <span className={`${styles.searchInput} p-input-icon-left`}>
                        <i className="pi pi-search" />
                        <InputText
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search sequences..."
                            aria-label="Search sequences"
                        />
                    </span>
                </div>
            )}

            {/* Export & Fullscreen */}
            <div className={styles.toolbarGroup}>
                <Menu
                    ref={exportMenuRef}
                    model={exportMenuItems}
                    popup
                    onHide={() => setExportMenuVisible(false)}
                />
                <Button
                    className={`${styles.toolbarButton} ${styles.exportMenuButton}`}
                    onClick={(e) => {
                        setExportMenuVisible(!exportMenuVisible);
                        exportMenuRef.current?.toggle(e);
                    }}
                    aria-label="Export options"
                    aria-haspopup="true"
                    aria-expanded={exportMenuVisible}
                >
                    <i className="pi pi-download" />
                    <span>Export</span>
                    <i className="pi pi-chevron-down" style={{ fontSize: '0.7rem' }} />
                </Button>

                <button
                    className={`${styles.toolbarButton} ${styles.fullscreenButton} ${isFullscreen ? styles.active : ''}`}
                    onClick={handleToggleFullscreen}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                    <i className={isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'} />
                    <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
                </button>
            </div>
        </div>
    );
}

export default VisualizationToolbar;
