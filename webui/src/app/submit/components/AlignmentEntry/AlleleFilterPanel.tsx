'use client';

import React, { FunctionComponent, useState } from 'react'

import { Button } from 'primereact/button'
import { Checkbox } from 'primereact/checkbox'
import { Dialog } from 'primereact/dialog'
import { MultiSelect } from 'primereact/multiselect'

import { AlleleFilters, AlleleFilterOptions } from './useAlleleFilters'

export interface AlleleFilterPanelProps {
    readonly filters: AlleleFilters
    readonly options: AlleleFilterOptions
    readonly activeCount: number
    // eslint-disable-next-line no-unused-vars
    readonly setSetFilter: (field: 'consequences' | 'impacts' | 'transcriptIds' | 'sift' | 'polyphen', values: Iterable<string>) => void
    // eslint-disable-next-line no-unused-vars
    readonly setBoolFilter: (field: 'hasDisease' | 'hasPhenotype', value: boolean | null) => void
    readonly clearFilters: () => void
    readonly disabled?: boolean
}

const sectionStyle: React.CSSProperties = { marginBottom: '0.75rem' }
const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--agr-text-muted, #6c757d)',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
}

const boolRow: React.CSSProperties = { display: 'flex', gap: '0.5rem', alignItems: 'center' }

const BoolCheckbox: FunctionComponent<{
    label: string
    value: boolean | null
    // eslint-disable-next-line no-unused-vars
    onChange: (next: boolean | null) => void
}> = ({ label, value, onChange }) => (
    <label style={boolRow}>
        <Checkbox
            checked={value === true}
            onChange={(e) => onChange(e.checked ? true : null)}
        />
        <span style={{ fontSize: '0.8125rem' }}>{label}</span>
    </label>
)

export const AlleleFilterPanel: FunctionComponent<AlleleFilterPanelProps> = ({
    filters, options, activeCount, setSetFilter, setBoolFilter, clearFilters, disabled,
}) => {
    const [open, setOpen] = useState(false)

    const buildOptions = (values: string[]) => values.map(v => ({ label: v, value: v }))

    const transcriptOptions = options.transcripts.map(t => ({ label: t.name, value: t.id }))

    return (
        <>
            <Button
                type="button"
                icon="pi pi-filter"
                text
                severity={activeCount > 0 ? 'info' : undefined}
                badge={activeCount > 0 ? String(activeCount) : undefined}
                badgeClassName={activeCount > 0 ? 'p-badge-secondary' : undefined}
                tooltip={activeCount > 0 ? `${activeCount} active filter${activeCount === 1 ? '' : 's'}` : 'Filter alleles'}
                tooltipOptions={{ position: 'top' }}
                aria-label="Filter alleles"
                disabled={disabled}
                onClick={() => setOpen(true)}
            />
            <Dialog
                visible={open}
                onHide={() => setOpen(false)}
                header="Filter alleles"
                dismissableMask
                modal
                style={{ width: '380px', maxWidth: '95vw' }}
                contentStyle={{ padding: '1rem' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.875rem' }}>Filter alleles</strong>
                    <Button
                        type="button"
                        label="Clear"
                        text
                        size="small"
                        disabled={activeCount === 0}
                        onClick={clearFilters}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--agr-text-muted, #6c757d)', alignSelf: 'center' }}>
                        Presets:
                    </span>
                    <Button
                        type="button"
                        label="Missense only"
                        size="small"
                        outlined
                        disabled={!options.consequences.includes('missense_variant')}
                        onClick={() => setSetFilter('consequences', ['missense_variant'])}
                    />
                    <Button
                        type="button"
                        label="High impact"
                        size="small"
                        outlined
                        disabled={!options.impacts.includes('HIGH')}
                        onClick={() => setSetFilter('impacts', ['HIGH'])}
                    />
                    <Button
                        type="button"
                        label="Disease"
                        size="small"
                        outlined
                        onClick={() => setBoolFilter('hasDisease', true)}
                    />
                </div>

                <div style={sectionStyle}>
                    <span style={labelStyle}>Molecular consequence</span>
                    <MultiSelect
                        value={Array.from(filters.consequences)}
                        options={buildOptions(options.consequences)}
                        onChange={(e) => setSetFilter('consequences', e.value as string[])}
                        placeholder={options.consequences.length === 0 ? 'No data' : 'Any'}
                        disabled={options.consequences.length === 0}
                        display="chip"
                        filter
                        style={{ width: '100%' }}
                        maxSelectedLabels={3}
                    />
                </div>

                <div style={sectionStyle}>
                    <span style={labelStyle}>Impact</span>
                    <MultiSelect
                        value={Array.from(filters.impacts)}
                        options={buildOptions(options.impacts)}
                        onChange={(e) => setSetFilter('impacts', e.value as string[])}
                        placeholder={options.impacts.length === 0 ? 'No data' : 'Any'}
                        disabled={options.impacts.length === 0}
                        display="chip"
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={sectionStyle}>
                    <span style={labelStyle}>Transcript</span>
                    <MultiSelect
                        value={Array.from(filters.transcriptIds)}
                        options={transcriptOptions}
                        onChange={(e) => setSetFilter('transcriptIds', e.value as string[])}
                        placeholder={transcriptOptions.length === 0 ? 'No data' : 'Any'}
                        disabled={transcriptOptions.length === 0}
                        display="chip"
                        filter
                        style={{ width: '100%' }}
                        maxSelectedLabels={2}
                    />
                </div>

                <div style={sectionStyle}>
                    <span style={labelStyle}>SIFT</span>
                    <MultiSelect
                        value={Array.from(filters.sift)}
                        options={buildOptions(options.sift)}
                        onChange={(e) => setSetFilter('sift', e.value as string[])}
                        placeholder={options.sift.length === 0 ? 'No data' : 'Any'}
                        disabled={options.sift.length === 0}
                        display="chip"
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={sectionStyle}>
                    <span style={labelStyle}>PolyPhen</span>
                    <MultiSelect
                        value={Array.from(filters.polyphen)}
                        options={buildOptions(options.polyphen)}
                        onChange={(e) => setSetFilter('polyphen', e.value as string[])}
                        placeholder={options.polyphen.length === 0 ? 'No data' : 'Any'}
                        disabled={options.polyphen.length === 0}
                        display="chip"
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={{ ...sectionStyle, marginBottom: 0, borderTop: '1px solid var(--agr-border, #e5e7eb)', paddingTop: '0.75rem' }}>
                    <BoolCheckbox
                        label="Has disease"
                        value={filters.hasDisease}
                        onChange={(v) => setBoolFilter('hasDisease', v)}
                    />
                    <div style={{ height: '0.4rem' }} />
                    <BoolCheckbox
                        label="Has phenotype"
                        value={filters.hasPhenotype}
                        onChange={(v) => setBoolFilter('hasPhenotype', v)}
                    />
                </div>
            </Dialog>
        </>
    )
}
