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

                return genomeLocations.pop()
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

        const geneInputElement = result.container.querySelector('#gene > input')
        expect(geneInputElement).not.toBe(null)  // Expect gene input element to be found
        expect(geneInputElement).toHaveClass('p-inputtext') // Expect element to be inputtext box
    })

    it('renders transcript input element', () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const transcriptInputElement = result.container.querySelector('#transcripts')
        expect(transcriptInputElement).not.toBe(null)  // Expect transcript input element to be found
        expect(transcriptInputElement).toHaveClass('p-multiselect') // Expect element to be multiselect box
    })

    it('renders allele input element', () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const alleleInputElement = result.container.querySelector('#alleles')
        expect(alleleInputElement).not.toBe(null)  // Expect allele input element to be found
        expect(alleleInputElement).toHaveClass('p-multiselect') // Expect element to be multiselect box
    })

    it('accepts gene input string and correctly processes it to populate transcript and allele fields', async() => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='0.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const geneInputElement = result.container.querySelector('#gene > input')
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
        const geneLoadingSpinnerQuery = '#gene > svg.p-autocomplete-loader'
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

        // Wait for transcripts and alleles fields to start loading new lists
        await waitFor(() => {
            // const transcriptsLoadingSpinner = result.container.querySelector('div#transcripts > div.p-multiselect-trigger > svg.p-icon-spin')
            expect(result.container.querySelector('div#transcripts > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon.p-icon-spin')).not.toBeNull()

            expect(result.container.querySelector('div#alleles > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon.p-icon-spin')).not.toBeNull()
        })

        // Wait for transcripts list to finish loading
        await waitFor(() => {
            // const transcriptsLoadingSpinner = result.container.querySelector('div#transcripts > div.p-multiselect-trigger > svg.p-icon-spin')
            expect(result.container.querySelector('div#transcripts > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon:not(.p-icon-spin)')).not.toBeNull()
        })

        // Wait for alleles list to finish loading
        await waitFor(() => {
            // const transcriptsLoadingSpinner = result.container.querySelector('div#transcripts > div.p-multiselect-trigger > svg.p-icon-spin')
            expect(result.container.querySelector('div#alleles > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon:not(.p-icon-spin)')).not.toBeNull()
        })

        // Open transcript selection pane
        fireEvent.focus(result.container.querySelector('div#transcripts')!)
        const transcriptsDropdownTrigger = result.container.querySelector('div#transcripts > div.p-multiselect-trigger')
        expect(transcriptsDropdownTrigger).not.toBeNull()
        fireEvent.click(transcriptsDropdownTrigger!)

        // Find opened transcript selection pane
        await waitFor(() => {
            expect(result.container.querySelector('div.p-multiselect-panel')).not.toBeNull()
        })

        // Find transcript option element
        const transcriptsSelectionPaneElement = result.container.querySelector('div.p-multiselect-panel')
        expect(transcriptsSelectionPaneElement).not.toBe(null)
        const transcriptsOptionElements = transcriptsSelectionPaneElement!.querySelectorAll('li.p-multiselect-item')
        expect(transcriptsOptionElements).not.toBe(null)
        expect(transcriptsOptionElements).toHaveLength(2)
        expect(transcriptsOptionElements[0]).toContainHTML('<span>mock:transcript1</span>')
        expect(transcriptsOptionElements[1]).toContainHTML('<span>mock:transcript2</span>')

        // Open allele selection pane
        fireEvent.focus(result.container.querySelector('div#alleles')!)
        const allelesDropdownTrigger = result.container.querySelector('div#alleles > div.p-multiselect-trigger')
        expect(allelesDropdownTrigger).not.toBeNull()
        fireEvent.click(allelesDropdownTrigger!)

        // Find opened allele selection pane
        await waitFor(() => {
            expect(result.container.querySelector('div.p-multiselect-panel')).not.toBeNull()
        })

        // Find allele option element
        const allelesSelectionPaneElement = result.container.querySelector('div.p-multiselect-panel')
        expect(allelesSelectionPaneElement).not.toBe(null)
        const allelesOptionElements = allelesSelectionPaneElement!.querySelectorAll('li.p-multiselect-item')
        expect(allelesOptionElements).not.toBe(null)
        expect(allelesOptionElements).toHaveLength(2)
        expect(allelesOptionElements[0]).toContainHTML('<p>ALLELE:MOCK1 - MOCK1</p><p>(2 variants)</p>')
        expect(allelesOptionElements[1]).toContainHTML('<p>ALLELE:MOCK2 - MOCK2</p><p>(MOCK2.1)</p>')
    })
})
