import { describe, expect, it } from '@jest/globals';

import { render, fireEvent, waitFor } from '@testing-library/react'

import { Feature } from '../utils';
import { AlignmentEntry } from '../AlignmentEntry'

jest.mock('https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js',
    () => {
        return {
            getSpecies: jest.fn((taxonId: string) => {
                console.log('Mocking getSpecies for taxonId:', taxonId)
                return {
                    apolloName: "human",
                    apolloTrack: "/All%20Genes/",
                    enableOrthologComparison: true,
                    enableSingleCellExpressionAtlasLink: true,
                    fullName: "Homo sapiens",
                    jBrowseName: "Homo sapiens",
                    jBrowseOrthologyTracks: "Homo_sapiens_all_genes,human2fly.filter.anchors,human2mouse.filter.anchors,human2rat.filter.anchors,human2worm.filter.anchors,human2xenopuslaevis.filter.anchors,human2xenopustropicalis.filter.anchors,human2yeast.filter.anchors,human2zebrafish.filter.anchors",
                    jBrowsefastaurl: "https://s3.amazonaws.com/agrjbrowse/fasta/GCF_000001405.40_GRCh38.p14_genomic.fna.gz",
                    jBrowsenclistbaseurltemplate: "https://s3.amazonaws.com/agrjbrowse/docker/{release}/human/",
                    jBrowsetracks: "_all_genes,_ht_variants",
                    jBrowseurltemplate: "tracks/All_Genes/{refseq}/trackData.jsonz",
                    shortName: "Hsa",
                    taxonId: taxonId,
                    vertebrate: true
                }
            }),
            getSingleGenomeLocation: jest.fn((genomeLocations: any[]) => {
                console.log('Mocking getSingleGenomeLocation')
                // Return last element without mutating the array
                return genomeLocations[genomeLocations.length - 1]
            })
        }
    },
    {virtual: true}
)

// Mock server Actions
jest.mock("../serverActions")

// Mock seqpanel transcript retrieval
class mockFeature {
    uniqueId: string
    start: number
    end: number
    refName: string
    subfeatures: Feature[]

    constructor(uniqueId: string, start: number, end: number, refName: string, subfeatures: Feature[]) {
        this.uniqueId = uniqueId
        this.start = start
        this.end = end
        this.refName = refName
        this.subfeatures = subfeatures
    }

    // eslint-disable-next-line no-unused-vars
    get(key: "start" | "end"): number;
    // eslint-disable-next-line no-unused-vars
    get(key: "refName"): string;
    // eslint-disable-next-line no-unused-vars
    get(key: "subfeatures"): Feature[];
    // eslint-disable-next-line no-unused-vars
    get(key: string): any;
    get(key: "refName" | "start" | "end" | "subfeatures" | string): any {
        if (key === 'name') {
            return this.uniqueId
        }
        else if (key === 'refName') {
            return this.refName
        }
        else if (key === 'start') {
            return this.start
        }
        else if (key === 'end') {
            return this.end
        }
        else if (key === 'subfeatures') {
            return this.subfeatures
        }
        else {
            return ''
        }
    }

    id() {
        return this.uniqueId
    }

    parent() {
        return undefined
    }

    children() {
        return this.subfeatures
    }

    toJSON() {
        return {
            start: this.start,
            end: this.end,
            refName: this.refName,
            uniqueId: this.uniqueId
        }
    }
}

const mockTranscript1 = new mockFeature('mock:transcript1', 0, 0, 'chr1', [])
const mockTranscript2 = new mockFeature('mock:transcript2', 100, 200, 'chr2', [])

jest.mock('generic-sequence-panel',
    () => {
        return {
            fetchTranscripts: jest.fn(
                async (): Promise<Feature[]> => {
                    return [
                        mockTranscript1,
                        mockTranscript2
                    ]
                }
            )
        }
    }
)

describe('AlignmentEntry', () => {
    it('renders a gene input element', () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const geneInputElement = result.container.querySelector('#gene-0 > input')
        expect(geneInputElement).not.toBe(null)  // Expect gene input element to be found
        expect(geneInputElement).toHaveClass('p-inputtext') // Expect element to be inputtext box
    })

    it('renders transcript input element', () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const transcriptInputElement = result.container.querySelector('#transcripts-0')
        expect(transcriptInputElement).not.toBe(null)  // Expect transcript input element to be found
        expect(transcriptInputElement).toHaveClass('p-multiselect') // Expect element to be multiselect box
    })

    it('renders allele input element with optional label', () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const alleleInputElement = result.container.querySelector('#alleles-0')
        expect(alleleInputElement).not.toBe(null)  // Expect allele input element to be found
        expect(alleleInputElement).toHaveClass('p-multiselect') // Expect element to be multiselect box

        // Check that allele field is marked as optional
        const alleleLabel = result.container.querySelector('label[for="alleles-0"]')
        expect(alleleLabel).not.toBe(null)
        expect(alleleLabel?.textContent).toContain('optional')
    })

    it('allele field is disabled when no gene is selected', () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const alleleInputElement = result.container.querySelector('#alleles-0')
        expect(alleleInputElement).not.toBe(null)
        expect(alleleInputElement).toHaveClass('p-disabled') // Should be disabled without gene
    })

    it('renders form fields in correct order: Gene, Transcript, Alleles', () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        // Get all input containers in order
        const geneField = result.container.querySelector('#gene-0')
        const transcriptField = result.container.querySelector('#transcripts-0')
        const alleleField = result.container.querySelector('#alleles-0')

        expect(geneField).not.toBe(null)
        expect(transcriptField).not.toBe(null)
        expect(alleleField).not.toBe(null)

        // Verify order by checking DOM positions
        const allFields = result.container.querySelectorAll('[id^="gene-"], [id^="transcripts-"], [id^="alleles-"]')
        const fieldIds = Array.from(allFields).map(f => f.id)
        expect(fieldIds).toEqual(['gene-0', 'transcripts-0', 'alleles-0'])
    })

    it('accepts gene input string and correctly processes it to populate transcript and allele fields', async() => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const geneInputElement = result.container.querySelector('#gene-0 > input')
        expect(geneInputElement).not.toBe(null)  // Expect gene input element to be found

        // test unkown gene input
        fireEvent.focusIn(geneInputElement!)
        fireEvent.input(geneInputElement!, {target: {value: 'INVALID-GENE-NAME'}})
        fireEvent.focusOut(geneInputElement!)

        // Wait for unkown gene error message to appear
        await waitFor(() => {
            expect(result.container.querySelector('div.p-inline-message-error')).not.toBeNull()

            expect(result.container.querySelector('div.p-inline-message-error')).toBeVisible()
        })

        // test kown gene input
        fireEvent.focusIn(geneInputElement!)
        fireEvent.input(geneInputElement!, {target: {value: 'MOCK:GENE1'}})
        fireEvent.focusOut(geneInputElement!)

        // Wait for gene query autocomplete processing to start
        const geneLoadingSpinnerQuery = '#gene-0 > svg.p-autocomplete-loader'
        await waitFor(() => {
            expect(result.container.querySelector(geneLoadingSpinnerQuery)).not.toBeNull()
        })

        // Wait for gene query autocomplete processing to finish
        await waitFor(() => {
            expect(result.container.querySelector(geneLoadingSpinnerQuery)).toBeNull()
        }, {timeout: 5000})

        // Wait for unkown gene error message to disappear
        await waitFor(() => {
            expect(result.container.querySelector('div.p-inline-message-error')).not.toBeNull()

            expect(result.container.querySelector('div.p-inline-message-error')).not.toBeVisible()
        })

        // Wait for transcripts field to start loading new list
        await waitFor(() => {
            expect(result.container.querySelector('div#transcripts-0 > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon.p-icon-spin')).not.toBeNull()
        })

        // Wait for transcripts list to finish loading
        await waitFor(() => {
            expect(result.container.querySelector('div#transcripts-0 > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon:not(.p-icon-spin)')).not.toBeNull()
        })

        // Note: Alleles are now lazy-loaded when the dropdown is opened, not automatically after gene selection

        // Open transcript selection pane
        fireEvent.focus(result.container.querySelector('div#transcripts-0')!)
        const transcriptsDropdownTrigger = result.container.querySelector('div#transcripts-0 > div.p-multiselect-trigger')
        expect(transcriptsDropdownTrigger).not.toBeNull()
        fireEvent.click(transcriptsDropdownTrigger!)

        // Find opened transcript selection pane (panel is rendered in portal, use document)
        await waitFor(() => {
            expect(document.querySelector('div.p-multiselect-panel')).not.toBeNull()
        })

        // Find transcript option element
        const transcriptsSelectionPaneElement = document.querySelector('div.p-multiselect-panel')
        expect(transcriptsSelectionPaneElement).not.toBe(null)
        const transcriptsOptionElements = transcriptsSelectionPaneElement!.querySelectorAll('li.p-multiselect-item')
        expect(transcriptsOptionElements).not.toBe(null)
        expect(transcriptsOptionElements).toHaveLength(2)
        expect(transcriptsOptionElements[0]).toContainHTML('<span>mock:transcript1</span>')
        expect(transcriptsOptionElements[1]).toContainHTML('<span>mock:transcript2</span>')

        // Close transcript panel first before opening allele panel
        fireEvent.click(transcriptsDropdownTrigger!)
        await waitFor(() => {
            expect(document.querySelector('div.p-multiselect-panel')).toBeNull()
        })

        // Open allele selection pane (this triggers lazy-loading of alleles)
        fireEvent.focus(result.container.querySelector('div#alleles-0')!)
        const allelesDropdownTrigger = result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger')
        expect(allelesDropdownTrigger).not.toBeNull()
        fireEvent.click(allelesDropdownTrigger!)

        // Wait for alleles to start loading
        await waitFor(() => {
            expect(result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon.p-icon-spin')).not.toBeNull()
        })

        // Wait for alleles to finish loading
        await waitFor(() => {
            expect(result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon:not(.p-icon-spin)')).not.toBeNull()
        })

        // Find opened allele selection pane (panel is rendered in portal, use document)
        await waitFor(() => {
            expect(document.querySelector('div.p-multiselect-panel')).not.toBeNull()
        })

        // Find allele option element
        const allelesSelectionPaneElement = document.querySelector('div.p-multiselect-panel')
        expect(allelesSelectionPaneElement).not.toBe(null)
        const allelesOptionElements = allelesSelectionPaneElement!.querySelectorAll('li.p-multiselect-item')
        expect(allelesOptionElements).not.toBe(null)
        expect(allelesOptionElements).toHaveLength(2)

        // Check first allele (MOCK1 with 2 variants)
        expect(allelesOptionElements[0]).toHaveTextContent('MOCK1')
        expect(allelesOptionElements[0]).toHaveTextContent('2 variants')

        // Check second allele (MOCK2 with 1 variant)
        expect(allelesOptionElements[1]).toHaveTextContent('MOCK2')
        expect(allelesOptionElements[1]).toHaveTextContent('MOCK2.1') // Single variant shows displayName
    })

    it('allele field becomes enabled after gene selection', async () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        // Initially disabled
        let alleleInputElement = result.container.querySelector('#alleles-0')
        expect(alleleInputElement).toHaveClass('p-disabled')

        // Enter a valid gene
        const geneInputElement = result.container.querySelector('#gene-0 > input')
        fireEvent.focusIn(geneInputElement!)
        fireEvent.input(geneInputElement!, {target: {value: 'MOCK:GENE1'}})
        fireEvent.focusOut(geneInputElement!)

        // Wait for gene to be processed
        await waitFor(() => {
            expect(result.container.querySelector('#gene-0 > svg.p-autocomplete-loader')).toBeNull()
        }, {timeout: 5000})

        // Wait for allele field to become enabled
        await waitFor(() => {
            alleleInputElement = result.container.querySelector('#alleles-0')
            expect(alleleInputElement).not.toHaveClass('p-disabled')
        })
    })

    it('can select alleles from dropdown when gene is selected', async () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        // Enter a valid gene
        const geneInputElement = result.container.querySelector('#gene-0 > input')
        fireEvent.focusIn(geneInputElement!)
        fireEvent.input(geneInputElement!, {target: {value: 'MOCK:GENE1'}})
        fireEvent.focusOut(geneInputElement!)

        // Wait for gene processing to complete
        await waitFor(() => {
            expect(result.container.querySelector('#gene-0 > svg.p-autocomplete-loader')).toBeNull()
        }, {timeout: 5000})

        // Verify allele field is enabled
        await waitFor(() => {
            const alleleInputElement = result.container.querySelector('#alleles-0')
            expect(alleleInputElement).not.toHaveClass('p-disabled')
        })

        // Open allele dropdown
        const allelesDropdownTrigger = result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger')
        expect(allelesDropdownTrigger).not.toBeNull()
        fireEvent.click(allelesDropdownTrigger!)

        // Wait for panel to appear and alleles to finish loading
        await waitFor(() => {
            const panel = document.querySelector('div.p-multiselect-panel')
            expect(panel).not.toBeNull()
            // Check for allele options
            const options = document.querySelectorAll('div.p-multiselect-panel li.p-multiselect-item')
            expect(options.length).toBeGreaterThan(0)
        }, {timeout: 5000})

        // Verify allele options are available
        const allelesOptionElements = document.querySelectorAll('div.p-multiselect-panel li.p-multiselect-item')
        expect(allelesOptionElements.length).toBe(2) // MOCK:GENE1 has 2 alleles
    })

    it('displays allele options with correct variant count', async () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        // Enter a valid gene with multiple alleles
        const geneInputElement = result.container.querySelector('#gene-0 > input')
        fireEvent.focusIn(geneInputElement!)
        fireEvent.input(geneInputElement!, {target: {value: 'MOCK:GENE1'}})
        fireEvent.focusOut(geneInputElement!)

        // Wait for gene processing
        await waitFor(() => {
            expect(result.container.querySelector('#gene-0 > svg.p-autocomplete-loader')).toBeNull()
        }, {timeout: 5000})

        // Wait for allele field to be enabled
        await waitFor(() => {
            const alleleInputElement = result.container.querySelector('#alleles-0')
            expect(alleleInputElement).not.toHaveClass('p-disabled')
        })

        // Open allele dropdown
        const allelesDropdownTrigger = result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger')
        fireEvent.click(allelesDropdownTrigger!)

        // Wait for panel and options to load
        await waitFor(() => {
            const panel = document.querySelector('div.p-multiselect-panel')
            expect(panel).not.toBeNull()
            const options = document.querySelectorAll('div.p-multiselect-panel li.p-multiselect-item')
            expect(options.length).toBe(2)
        }, {timeout: 5000})

        // Verify allele options show correct content
        const options = document.querySelectorAll('div.p-multiselect-panel li.p-multiselect-item')

        // First allele (MOCK1) has 2 variants
        expect(options[0]).toHaveTextContent('MOCK1')
        expect(options[0]).toHaveTextContent('2 variants')

        // Second allele (MOCK2) has 1 variant - shows variant name
        expect(options[1]).toHaveTextContent('MOCK2')
        expect(options[1]).toHaveTextContent('MOCK2.1')
    })

    it('shows different allele counts for gene with many alleles', async () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        // Enter a gene with many alleles
        const geneInputElement = result.container.querySelector('#gene-0 > input')
        fireEvent.focusIn(geneInputElement!)
        fireEvent.input(geneInputElement!, {target: {value: 'MOCK:GENE_MANY_ALLELES'}})
        fireEvent.focusOut(geneInputElement!)

        // Wait for gene processing
        await waitFor(() => {
            expect(result.container.querySelector('#gene-0 > svg.p-autocomplete-loader')).toBeNull()
        }, {timeout: 5000})

        // Wait for allele field to be enabled
        await waitFor(() => {
            const alleleInputElement = result.container.querySelector('#alleles-0')
            expect(alleleInputElement).not.toHaveClass('p-disabled')
        })

        // Open allele dropdown
        const allelesDropdownTrigger = result.container.querySelector('div#alleles-0 > div.p-multiselect-trigger')
        fireEvent.click(allelesDropdownTrigger!)

        // Wait for panel and options to load
        await waitFor(() => {
            const panel = document.querySelector('div.p-multiselect-panel')
            expect(panel).not.toBeNull()
            const options = document.querySelectorAll('div.p-multiselect-panel li.p-multiselect-item')
            expect(options.length).toBeGreaterThan(0)
        }, {timeout: 5000})

        // MOCK:GENE_MANY_ALLELES has 5 alleles in the mock data
        const options = document.querySelectorAll('div.p-multiselect-panel li.p-multiselect-item')
        expect(options.length).toBe(5)

        // Check that one of them shows a complex variant (3 variants)
        expect(options[4]).toHaveTextContent('complex-1')
        expect(options[4]).toHaveTextContent('3 variants')
    })
})
