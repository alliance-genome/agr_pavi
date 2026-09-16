import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { AlignmentEntry } from '../AlignmentEntry';

// Mock the vendored species config the same way as the main AlignmentEntry
// test harness (see AlignmentEntry.test.tsx).
jest.mock(
    '@/utils/agrSpeciesConfig',
    () => ({
        resolveJBrowseRelease: (sc: { jBrowseDataReleaseOverride?: string }, r: string) =>
            sc?.jBrowseDataReleaseOverride ?? r,
        gffFileUrl: jest.fn(() => 'https://example.test/gff.gff.gz'),
        getSpecies: jest.fn((taxonId: string) => ({
            apolloName: 'human',
            apolloTrack: '/All%20Genes/',
            enableOrthologComparison: true,
            enableSingleCellExpressionAtlasLink: true,
            fullName: 'Homo sapiens',
            jBrowseName: 'Homo sapiens',
            jBrowseOrthologyTracks: '',
            jBrowsefastaurl: '',
            jBrowsenclistbaseurltemplate: '',
            jBrowsetracks: '',
            jBrowseurltemplate: '',
            shortName: 'Hsa',
            taxonId: taxonId,
            vertebrate: true,
        })),
        getSingleGenomeLocation: jest.fn((genomeLocations: any[]) => genomeLocations[genomeLocations.length - 1]),
    })
);

jest.mock('../../TranscriptViewer', () => ({
    TranscriptViewerDialog: () => null,
}));

jest.mock('@/utils/tabixTranscripts', () => ({
    fetchTranscriptsGff: jest.fn(async () => []),
}));

// Reuse the real gene/allele mocks (fetchGeneInfo, fetchAlleles, ...) from the
// existing manual mock, but take control of the two new variant-search
// server actions so we can assert on how AlignmentEntry calls them.
// Jest requires out-of-scope variables referenced inside a jest.mock factory
// to be prefixed with "mock" (case-insensitive).
const mockLookupVariantByHgvs = jest.fn();
const mockSearchVariants = jest.fn();
const mockSearchAllelesByName = jest.fn();
const mockFetchAlleles = jest.fn();
jest.mock('../serverActions', () => ({
    ...jest.requireActual('../__mocks__/serverActions'),
    lookupVariantByHgvs: (...a: any[]) => mockLookupVariantByHgvs(...a),
    searchVariants: (...a: any[]) => mockSearchVariants(...a),
    searchAllelesByName: (...a: any[]) => mockSearchAllelesByName(...a),
    fetchAlleles: (...a: any[]) => mockFetchAlleles(...a),
}));

describe('AlignmentEntry variant search', () => {
    beforeEach(() => {
        mockLookupVariantByHgvs.mockReset();
        mockSearchVariants.mockReset();
        mockSearchVariants.mockResolvedValue([]);
        mockSearchAllelesByName.mockReset();
        mockSearchAllelesByName.mockResolvedValue([]);
        mockFetchAlleles.mockReset();
        mockFetchAlleles.mockResolvedValue([]);
    });

    it('resolves a pasted HGVS via lookupVariantByHgvs and adds it as an option', async () => {
        mockLookupVariantByHgvs.mockResolvedValue({
            id: 'MGI:1856155',
            displayName: 'Pax6Sey',
            variants: new Map([
                ['NC_000068.8:g.105521966G>T', {
                    id: 'NC_000068.8:g.105521966G>T',
                    displayName: 'NC_000068.8:g.105521966G>T',
                    consequences: [],
                }],
            ]),
            hasDisease: false,
            hasPhenotype: false,
            source: 'lookup',
        });

        const result = render(
            <AlignmentEntry
                index={0}
                agrjBrowseDataRelease='0.0.0'
                dispatchInputPayloadPart={jest.fn()}
                initialGeneId="MOCK:GENE1"
            />
        );

        // Wait for the gene to resolve and the allele field to become enabled.
        await waitFor(() => {
            const alleleInputElement = result.container.querySelector('#alleles-0');
            expect(alleleInputElement).not.toHaveClass('p-disabled');
        }, { timeout: 5000 });

        // Open the allele selection panel.
        fireEvent.focus(result.container.querySelector('div#alleles-0')!);
        const allelesDropdownTrigger = result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger');
        expect(allelesDropdownTrigger).not.toBeNull();
        fireEvent.click(allelesDropdownTrigger!);

        await waitFor(() => {
            expect(document.querySelector('div.p-multiselect-panel')).not.toBeNull();
        });

        // Type the HGVS into the MultiSelect's own filter input.
        const filterInput = document.querySelector('input.p-multiselect-filter') as HTMLInputElement | null;
        expect(filterInput).not.toBeNull();
        fireEvent.change(filterInput!, { target: { value: 'NC_000068.8:g.105521966G>T' } });

        // Let the ~350ms debounce elapse and the lookup resolve.
        await waitFor(() => {
            expect(mockLookupVariantByHgvs).toHaveBeenCalledWith('MOCK:GENE1', 'NC_000068.8:g.105521966G>T');
        }, { timeout: 3000 });

        // The found allele was merged into the options and is now visible.
        await waitFor(() => {
            expect(screen.getByText('Pax6Sey')).toBeInTheDocument();
        }, { timeout: 3000 });

        expect(mockSearchVariants).not.toHaveBeenCalled();
    });

    // Regression coverage for the fix-wave-1 bug: a just-added lookup/search
    // allele could be invisible in the dropdown even though the status text
    // said it was added.
    it('keeps a just-added HGVS lookup allele selectable when a consequence filter is active (Fix A)', async () => {
        // One pre-existing gene-sourced allele whose only consequence is
        // HIGH impact, so the "High impact" preset filter is real (matches
        // it) and active -- exercising the same `alleleFilters.filteredAlleles`
        // layer the transcript filter also feeds into (both are members of
        // `AlleleFilters`, threaded through the same `alleleMatches` check).
        mockFetchAlleles.mockResolvedValue([
            {
                id: 'ALLELE:EXISTING',
                displayName: 'existing-allele',
                hasDisease: false,
                hasPhenotype: false,
                source: 'gene',
                variants: new Map([
                    ['VAR:EXISTING', {
                        id: 'VAR:EXISTING',
                        displayName: 'c.1A>G',
                        consequences: [{
                            transcriptId: 'CURIE:TX1',
                            transcriptName: 'NM_000001.1',
                            molecularConsequences: ['missense_variant'],
                            impact: 'HIGH',
                        }],
                    }],
                ]),
            },
        ]);

        // The added lookup allele's consequence carries a MODERATE impact
        // (and a transcript NAME, not a curie) so it fails the active HIGH
        // impact filter -- reproducing the bug -- while still being a
        // realistic lookup result.
        mockLookupVariantByHgvs.mockResolvedValue({
            id: 'MGI:1856155',
            displayName: 'Pax6Sey',
            variants: new Map([
                ['NC_000068.8:g.105521966G>T', {
                    id: 'NC_000068.8:g.105521966G>T',
                    displayName: 'NC_000068.8:g.105521966G>T',
                    consequences: [{
                        transcriptId: 'NM_001244200.2',
                        transcriptName: 'NM_001244200.2',
                        molecularConsequences: ['missense_variant'],
                        impact: 'MODERATE',
                    }],
                }],
            ]),
            hasDisease: false,
            hasPhenotype: false,
            source: 'lookup',
        });

        const result = render(
            <AlignmentEntry
                index={0}
                agrjBrowseDataRelease='0.0.0'
                dispatchInputPayloadPart={jest.fn()}
                initialGeneId="MOCK:GENE1"
                initialAlleleIds={['ALLELE:EXISTING']}
            />
        );

        await waitFor(() => {
            const alleleInputElement = result.container.querySelector('#alleles-0');
            expect(alleleInputElement).not.toHaveClass('p-disabled');
        }, { timeout: 5000 });

        // Wait for the pre-existing allele to load so the filter panel has
        // data to filter on.
        const filterButton = await screen.findByRole('button', { name: 'Filter alleles' });
        await waitFor(() => expect(filterButton).not.toBeDisabled(), { timeout: 5000 });

        // Open the filter dialog and activate the "High impact" preset.
        fireEvent.click(filterButton);
        const highImpactButton = await screen.findByRole('button', { name: 'High impact' });
        await waitFor(() => expect(highImpactButton).not.toBeDisabled(), { timeout: 5000 });
        fireEvent.click(highImpactButton);

        // Open the allele dropdown and paste the HGVS to resolve+add it.
        fireEvent.focus(result.container.querySelector('div#alleles-0')!);
        const allelesDropdownTrigger = result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger');
        expect(allelesDropdownTrigger).not.toBeNull();
        fireEvent.click(allelesDropdownTrigger!);

        await waitFor(() => {
            expect(document.querySelector('div.p-multiselect-panel')).not.toBeNull();
        });

        const filterInput = document.querySelector('input.p-multiselect-filter') as HTMLInputElement | null;
        expect(filterInput).not.toBeNull();
        fireEvent.change(filterInput!, { target: { value: 'NC_000068.8:g.105521966G>T' } });

        await waitFor(() => {
            expect(mockLookupVariantByHgvs).toHaveBeenCalledWith('MOCK:GENE1', 'NC_000068.8:g.105521966G>T');
        }, { timeout: 3000 });

        // Without Fix A, the active HIGH-impact filter would drop this
        // allele from alleleOptions since its only consequence is MODERATE.
        await waitFor(() => {
            expect(screen.getByText('Pax6Sey')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('routes non-HGVS input to a text search and clears the filter once results are added (Fix B)', async () => {
        mockSearchVariants.mockResolvedValue([
            {
                id: 'NC_000007.14:g.112265902A>G',
                displayName: 'NC_000007.14:g.112265902A>G',
                variants: new Map([
                    ['NC_000007.14:g.112265902A>G', {
                        id: 'NC_000007.14:g.112265902A>G',
                        displayName: 'NC_000007.14:g.112265902A>G',
                        consequences: [],
                    }],
                ]),
                hasDisease: false,
                hasPhenotype: false,
                source: 'search',
            },
        ]);

        const result = render(
            <AlignmentEntry
                index={0}
                agrjBrowseDataRelease='0.0.0'
                dispatchInputPayloadPart={jest.fn()}
                initialGeneId="MOCK:GENE1"
            />
        );

        await waitFor(() => {
            const alleleInputElement = result.container.querySelector('#alleles-0');
            expect(alleleInputElement).not.toHaveClass('p-disabled');
        }, { timeout: 5000 });

        fireEvent.focus(result.container.querySelector('div#alleles-0')!);
        const allelesDropdownTrigger = result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger');
        expect(allelesDropdownTrigger).not.toBeNull();
        fireEvent.click(allelesDropdownTrigger!);

        await waitFor(() => {
            expect(document.querySelector('div.p-multiselect-panel')).not.toBeNull();
        });

        // "Sey" is a non-HGVS free-text token; it must be routed to
        // searchVariants, not lookupVariantByHgvs.
        const filterInput = document.querySelector('input.p-multiselect-filter') as HTMLInputElement | null;
        expect(filterInput).not.toBeNull();
        fireEvent.change(filterInput!, { target: { value: 'Sey' } });

        await waitFor(() => {
            expect(mockSearchVariants).toHaveBeenCalled();
        }, { timeout: 3000 });
        expect(mockSearchVariants.mock.calls[0]?.[0]).toBe('MOCK:GENE1');
        expect(mockSearchVariants.mock.calls[0]?.[3]).toBe('Sey');
        expect(mockLookupVariantByHgvs).not.toHaveBeenCalled();

        // The added result is HGVS-labeled and doesn't contain "Sey"; it's
        // only visible once the typed filter text is cleared (Fix B). Its
        // HGVS string renders twice in the item template (allele display
        // name + variant label), so assert at least one match rather than
        // a single unique node.
        await waitFor(() => {
            expect(screen.getAllByText('NC_000007.14:g.112265902A>G').length).toBeGreaterThan(0);
        }, { timeout: 3000 });

        await waitFor(() => {
            expect(filterInput!.value).toBe('');
        }, { timeout: 3000 });
    });

    it('shows a full-HGVS hint for a bare position number and calls neither server action', async () => {
        const result = render(
            <AlignmentEntry
                index={0}
                agrjBrowseDataRelease='0.0.0'
                dispatchInputPayloadPart={jest.fn()}
                initialGeneId="MOCK:GENE1"
            />
        );

        await waitFor(() => {
            const alleleInputElement = result.container.querySelector('#alleles-0');
            expect(alleleInputElement).not.toHaveClass('p-disabled');
        }, { timeout: 5000 });

        fireEvent.focus(result.container.querySelector('div#alleles-0')!);
        const allelesDropdownTrigger = result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger');
        expect(allelesDropdownTrigger).not.toBeNull();
        fireEvent.click(allelesDropdownTrigger!);

        await waitFor(() => {
            expect(document.querySelector('div.p-multiselect-panel')).not.toBeNull();
        });

        // A bare position number (no accession) is the natural-but-doomed
        // input; it must show guidance, not trigger a lookup or a search.
        const filterInput = document.querySelector('input.p-multiselect-filter') as HTMLInputElement | null;
        expect(filterInput).not.toBeNull();
        fireEvent.change(filterInput!, { target: { value: '105521966' } });

        await waitFor(() => {
            expect(screen.getByText(/Enter the full HGVS/i)).toBeInTheDocument();
        }, { timeout: 3000 });

        expect(mockLookupVariantByHgvs).not.toHaveBeenCalled();
        expect(mockSearchVariants).not.toHaveBeenCalled();
    });

    it('resolves an allele name (e.g. n1046) via searchAllelesByName and adds it', async () => {
        // The allele-name index carries the HGVS directly, so typing a name
        // yields a named, HGVS-keyed allele.
        mockSearchAllelesByName.mockResolvedValue([
            {
                id: 'WB:WBVar00089919',
                displayName: 'n1046',
                variants: new Map([
                    ['NC_003282.8:g.11691040C>T', {
                        id: 'NC_003282.8:g.11691040C>T',
                        displayName: 'NC_003282.8:g.11691040C>T',
                        consequences: [],
                    }],
                ]),
                hasDisease: false,
                hasPhenotype: false,
                source: 'search',
            },
        ]);

        const result = render(
            <AlignmentEntry
                index={0}
                agrjBrowseDataRelease='0.0.0'
                dispatchInputPayloadPart={jest.fn()}
                initialGeneId="MOCK:GENE1"
            />
        );

        await waitFor(() => {
            const alleleInputElement = result.container.querySelector('#alleles-0');
            expect(alleleInputElement).not.toHaveClass('p-disabled');
        }, { timeout: 5000 });

        fireEvent.focus(result.container.querySelector('div#alleles-0')!);
        const allelesDropdownTrigger = result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger');
        fireEvent.click(allelesDropdownTrigger!);
        await waitFor(() => {
            expect(document.querySelector('div.p-multiselect-panel')).not.toBeNull();
        });

        const filterInput = document.querySelector('input.p-multiselect-filter') as HTMLInputElement | null;
        expect(filterInput).not.toBeNull();
        fireEvent.change(filterInput!, { target: { value: 'n1046' } });

        // The name is routed to the allele-name search (not the HGVS lookup).
        await waitFor(() => {
            expect(mockSearchAllelesByName).toHaveBeenCalled();
        }, { timeout: 3000 });
        expect(mockSearchAllelesByName.mock.calls[0]?.[3]).toBe('n1046');
        expect(mockLookupVariantByHgvs).not.toHaveBeenCalled();

        // The resolved allele becomes visible (filter cleared after add).
        await waitFor(() => {
            expect(screen.getByText('n1046')).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});
