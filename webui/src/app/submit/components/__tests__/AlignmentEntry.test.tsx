import { describe, expect, it } from '@jest/globals';

import { render, fireEvent, waitFor } from '@testing-library/react'

import { Feature } from '@jbrowse/core/util';
import { AlignmentEntry } from '../AlignmentEntry/AlignmentEntry'

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
jest.mock("../AlignmentEntry/serverActions")

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
    // eslint-disable-next-line no-unused-vars, no-dupe-class-members
    get(key: "refName"): string;
    // eslint-disable-next-line no-unused-vars, no-dupe-class-members
    get(key: "subfeatures"): Feature[];
    // eslint-disable-next-line no-unused-vars, no-dupe-class-members
    get(key: string): any;
    // eslint-disable-next-line no-dupe-class-members
    get(key: "refName" | "start" | "end" | "subfeatures" | string): any {
        if (key === 'name') {
            return this.id
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
            <AlignmentEntry index={0} agrjBrowseDataRelease='8.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const geneInputElement = result.container.querySelector('#gene')
        expect(geneInputElement).not.toBe(null)  // Expect gene input element to be found
        expect(geneInputElement).toHaveClass('p-inputtext') // Expect element to be inputtext box
    })

    it('renders transcript input element', () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='8.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const transcriptInputElement = result.container.querySelector('#transcripts')
        expect(transcriptInputElement).not.toBe(null)  // Expect transcript input element to be found
        expect(transcriptInputElement).toHaveClass('p-multiselect') // Expect element to be multiselect box
    })

    it('renders allele input element', () => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='8.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const alleleInputElement = result.container.querySelector('#alleles')
        expect(alleleInputElement).not.toBe(null)  // Expect allele input element to be found
        expect(alleleInputElement).toHaveClass('p-multiselect') // Expect element to be multiselect box
    })

    it('accepts gene input string and populates transcript and allele fields when done so', async() => {
        const result = render(
            <AlignmentEntry index={0} agrjBrowseDataRelease='8.0.0' dispatchInputPayloadPart={jest.fn()} />
        )

        const geneInputElement = result.container.querySelector('input#gene')
        expect(geneInputElement).not.toBe(null)  // Expect gene input element to be found

        fireEvent.focusIn(geneInputElement!)
        fireEvent.input(geneInputElement!, {target: {value: 'mock:gene1'}})
        // fireEvent.focusOut(geneInputElement!)

        // Find transcript multiselect element
        const transcriptsElement = result.container.querySelector('div#transcripts')
        expect(transcriptsElement).not.toBe(null)
        fireEvent.focusOut(geneInputElement!)
        // fireEvent.focusIn(transcriptsElement!)

        // Find transcripts and alleles loading spinner
        await waitFor(() => {
            // const transcriptsLoadingSpinner = result.container.querySelector('div#transcripts > div.p-multiselect-trigger > svg.p-icon-spin')
            expect(result.container.querySelector('div#transcripts > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon.p-icon-spin')).not.toBeNull()

            expect(result.container.querySelector('div#alleles > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon.p-icon-spin')).not.toBeNull()
        })

        // Wait for transcripts loading spinner to disappear
        await waitFor(() => {
            // const transcriptsLoadingSpinner = result.container.querySelector('div#transcripts > div.p-multiselect-trigger > svg.p-icon-spin')
            expect(result.container.querySelector('div#transcripts > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon:not(.p-icon-spin)')).not.toBeNull()
        })

        // Wait for alleles loading spinner to disappear
        await waitFor(() => {
            // const transcriptsLoadingSpinner = result.container.querySelector('div#transcripts > div.p-multiselect-trigger > svg.p-icon-spin')
            expect(result.container.querySelector('div#alleles > div.p-multiselect-trigger > svg.p-multiselect-trigger-icon:not(.p-icon-spin)')).not.toBeNull()
        })

        // TODO: Add tests to check if transcript and allele fields are populated with mock data
    })
})
