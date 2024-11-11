'use client';

import { dedupe, revlist } from '@jbrowse/core/BaseFeatureWidget/util';
import { Feature } from '@jbrowse/core/util';
import { fetchTranscripts } from 'generic-sequence-panel';
import NCListFeature from "generic-sequence-panel/dist/NCListFeature";
import { FloatLabel } from 'primereact/floatlabel';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import React, { createRef, FunctionComponent, useCallback, useEffect, useState } from 'react';

import { fetchGeneInfo } from './serverActions';

import { AlignmentEntryStatus, GeneInfo, FeatureStrand } from './types';
import { JobSumbissionPayloadRecord, InputPayloadPart, InputPayloadDispatchAction } from '../JobSubmitForm/types';

//Note: dynamic import of stage vs main src is currently not possible on client nor server (2024/07/25).
// * Server requires node 22's experimental feature http(s) module imports,
//   which is expected to become stable in Oct 2024 (https://nodejs.org/api/esm.html#https-and-http-imports)
// * next.js client code does not support async/await (at current), which is required for dynamic imports
//   like `await import(`${public_website_src}/lib/utils.js`)`
import { getSpecies, getSingleGenomeLocation } from 'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js';

export interface AlignmentEntryProps {
    readonly index: number
    readonly agrjBrowseDataRelease: string
    readonly dispatchInputPayloadPart: React.Dispatch<InputPayloadDispatchAction>
}
export const AlignmentEntry: FunctionComponent<AlignmentEntryProps> = (props: AlignmentEntryProps) => {
    const [setupCompleted, setSetupCompleted] = useState<Boolean>(false)
    const geneMessageRef: React.RefObject<Message> = createRef();
    const [geneMessageDisplay, setgeneMessageDisplay] = useState('none')
    const [gene, setGene] = useState<GeneInfo>()
    const transcriptMultiselectRef: React.RefObject<MultiSelect> = createRef();
    const [transcriptList, setTranscriptList] = useState<Feature[]>([])
    const [transcriptListFocused, setTranscriptListFocused] = useState<Boolean>(false)
    const [transcriptListOpened, setTranscriptListOpened] = useState<Boolean>(false)
    const [selectedTranscriptIds, setSelectedTranscriptIds] = useState<Array<any>>([])
    const [transcriptListLoading, setTranscriptListLoading] = useState(true)
    const [fastaFileUrl, setFastaFileUrl] = useState<string>()

    const updateInputPayloadPart = useCallback((newProperties: Partial<InputPayloadPart>) => {
        const dispatchAction: InputPayloadDispatchAction = {
            type: 'UPDATE',
            index: props.index,
            value: newProperties
        }
        props.dispatchInputPayloadPart(dispatchAction)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    interface TranscriptInfoType {
        readonly id: string,
        readonly name: string,
        readonly exons: Array<{
            refStart: number
            refEnd: number
        }>,
        readonly cds_regions: Array<{
            refStart: number
            refEnd: number,
            phase: 0 | 1 | 2
        }>
    }

    const processGeneEntry = async(geneId: string) => {
        updateInputPayloadPart({
                status: AlignmentEntryStatus.PROCESSING,
                payloadPart: undefined
        })
        if( geneId ){
            console.log('Fetching gene info for geneID', geneId, '...')
            setTranscriptListLoading(true)
            setSelectedTranscriptIds([])

            const geneInfo: GeneInfo | undefined = await fetchGeneInfo(geneId)
            if(geneInfo){
                updateInputPayloadPart({
                    status: AlignmentEntryStatus.PENDING_INPUT
                })
                console.log('Gene info received:', JSON.stringify(geneInfo))
                setgeneMessageDisplay('none')
                setGene(geneInfo)
            }
            else{
                console.log('Error while receiving gene info: undefined geneInfo returned.')
                updateInputPayloadPart({
                    status: AlignmentEntryStatus.FAILED_PROCESSING,
                    payloadPart: undefined
                })
                setgeneMessageDisplay('initial')
                setGene(undefined)
            }
        }
        else {
            updateInputPayloadPart({
                status: AlignmentEntryStatus.PENDING_INPUT
            })
            setGene(undefined)
        }
    }

    const payloadPortion = useCallback((gene_info: GeneInfo, transcripts_info: TranscriptInfoType[]) => {
        let portion: JobSumbissionPayloadRecord[] = []

        transcripts_info.forEach(transcript => {
            portion.push({
                name: `${gene_info.symbol}_${transcript.name}`,
                fasta_file_url: fastaFileUrl!,
                seq_id: getSingleGenomeLocation(gene_info.genomeLocations)['chromosome'],
                seq_strand: getSingleGenomeLocation(gene_info.genomeLocations)['strand'],
                exon_seq_regions: transcript.exons.map((e) => ({
                    'start': e.refStart,
                    'end': e.refEnd
                })),
                cds_seq_regions: transcript.cds_regions.map((e) => ({
                    'start': e.refStart,
                    'end': e.refEnd,
                    'frame': e.phase
                }))
            })
        });

        return portion
    },[fastaFileUrl])

    // Convert relative positions (to parent feature)
    // to absolute positions (to chromosome/contig)
    const jBrowseSubfeatureRelToRefPos = (subfeatureList: any[], featureStrand: FeatureStrand,
                                          parentRefStart: number, parentRefEnd: number) => (
        subfeatureList.map((subfeat: any) => {
            let new_subfeat = {
                ...subfeat,
            }

            if (featureStrand === -1) {
                new_subfeat['refStart'] = parentRefEnd - new_subfeat['start']
                new_subfeat['refEnd'] = parentRefEnd - new_subfeat['end'] + 1
            }
            else {
                new_subfeat['refStart'] = parentRefStart + new_subfeat['start'] + 1
                new_subfeat['refEnd'] = parentRefStart + new_subfeat['end']
            }

            return new_subfeat
        })
    )

    const processTranscriptEntry = useCallback(async(transcriptIds: String[]) => {
        updateInputPayloadPart({
            status: AlignmentEntryStatus.PROCESSING,
            payloadPart: undefined
        })
        console.log(`selected transcripts (${transcriptIds.length}): ${transcriptIds}`)
        console.log('Fetching exon info for selected transcripts...')

        let transcriptsInfo: Array<TranscriptInfoType> = []

        if(transcriptIds.length < 1){
            updateInputPayloadPart({
                status: AlignmentEntryStatus.PENDING_INPUT
            })
        }
        else{
            transcriptIds.forEach((transcriptId) => {
                console.log(`Finding transcript for ID ${transcriptId}...`)

                const transcript = transcriptList.find(r => r.id() === transcriptId)
                if( !transcript ){
                    console.error(`No transcript found for transcript ID ${transcriptId}`)
                    updateInputPayloadPart({
                        status: AlignmentEntryStatus.FAILED_PROCESSING,
                        payloadPart: undefined
                    })
                }
                else{
                    console.log(`Found transcript ${transcript}.`)

                    console.log(`Fetching exon info for transcript ${transcript}...`)
                    // const f = new NCListFeature(transcript);
                    const feature: any = new NCListFeature(transcript).toJSON();

                    const { subfeatures = [] } = feature

                    const children = subfeatures
                                        .sort((a: any, b: any) => a.start - b.start)
                                        .map((sub: any) => ({
                                            ...sub,
                                            start: sub.start - feature.start,
                                            end: sub.end - feature.start
                                        }))

                    let exons: any[] = dedupe(children.filter((sub: any) => sub.type === 'exon'))
                    let cds_regions: any[] = dedupe(children.filter((sub: any) => sub.type === 'CDS'))

                    let transcript_length = transcript.get("end") - transcript.get("start")
                    if (feature.strand === -1) {
                        exons = revlist(exons, transcript_length)
                        cds_regions = revlist(cds_regions, transcript_length)
                    }

                    // Convert relative positions (to transcript)
                    // to absolute positions (to chromosome/contig)
                    exons = jBrowseSubfeatureRelToRefPos(exons, feature.strand, transcript.get('start'), transcript.get('end'))
                    cds_regions = jBrowseSubfeatureRelToRefPos(cds_regions, feature.strand, transcript.get('start'), transcript.get('end'))

                    console.log(`transcript ${transcript.get("name")} resulted in exons:`, exons)
                    console.log(`transcript ${transcript.get("name")} resulted in cds regions:`, cds_regions)

                    const transcriptInfo: TranscriptInfoType = {
                        id: transcript.id(),
                        name: transcript.get('name'),
                        exons: exons,
                        cds_regions: cds_regions
                    }

                    transcriptsInfo.push(transcriptInfo)
                }
            })

            const portion = payloadPortion(gene!, transcriptsInfo)
            console.log('AlignmentEntry portion is', portion)

            if( (portion === undefined || portion.length < 1) ){
                updateInputPayloadPart({
                    status: AlignmentEntryStatus.FAILED_PROCESSING,
                    payloadPart: undefined
                })
            }
            else {
                updateInputPayloadPart({
                    status: AlignmentEntryStatus.READY,
                    payloadPart: portion
                })
            }
        }
    },[gene, transcriptList, payloadPortion, updateInputPayloadPart])

    // Handle transcriptList updates once gene object has been saved
    useEffect(() => {
        async function updateTranscriptList() {
            console.log(`New gene object: ${gene}`)

            if(gene){
                const speciesConfig = getSpecies(gene.species.taxonId)
                console.log('speciesConfig:', speciesConfig)

                setFastaFileUrl(speciesConfig.jBrowsefastaurl)

                const jBrowsenclistbaseurl = speciesConfig.jBrowsenclistbaseurltemplate.replace('{release}', props.agrjBrowseDataRelease)

                const genomeLocation = getSingleGenomeLocation(gene.genomeLocations);

                const transcripts = await fetchTranscripts({
                    refseq: genomeLocation['chromosome'],
                    start: genomeLocation['start'],
                    end: genomeLocation['end'],
                    gene: gene['symbol'],
                    urltemplate: speciesConfig.jBrowseurltemplate,
                    nclistbaseurl: jBrowsenclistbaseurl
                })
                console.log("transcripts received:", transcripts)

                // Define transcripts list
                setTranscriptList(transcripts)
            }
        }
        updateTranscriptList()
    }, [gene]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update transcriptList loading status and open selection panel once transcriptList object has been saved
    useEffect(
        () => {
            console.log(`New transcript list loaded.`)
            setTranscriptListLoading(false)
            if(transcriptList.length > 0){
                const select_menu = transcriptMultiselectRef.current
                if( select_menu && transcriptListFocused ){
                    console.log(`Opening transcript panel.`)
                    transcriptMultiselectRef.current?.show()
                }
            }
        },
        [transcriptList] // eslint-disable-line react-hooks/exhaustive-deps
    );

    useEffect(
        () => {
            if( setupCompleted === true && transcriptListFocused === false && transcriptListOpened === false ){
                processTranscriptEntry(selectedTranscriptIds)
            }
        }
    ,[setupCompleted, selectedTranscriptIds, transcriptListFocused, transcriptListOpened, processTranscriptEntry])

    useEffect(
        () => {
            console.log(`AlignmentEntry with index ${props.index} mounted.`)
            const initInputPayloadPart: InputPayloadPart = {
                index: props.index,
                status: AlignmentEntryStatus.PENDING_INPUT,
                payloadPart: undefined
            }
            props.dispatchInputPayloadPart({type: 'ADD', index: props.index, value: initInputPayloadPart})
            setSetupCompleted(true)

            return props.dispatchInputPayloadPart.bind(undefined, {type: 'DELETE', index: props.index, value: initInputPayloadPart})
        }, [] // eslint-disable-line react-hooks/exhaustive-deps
    )

    return (
        <div className='p-inputgroup'>
            <FloatLabel>
                <InputText id="gene" className="p-inputtext-sm" placeholder='e.g. HGNC:620'
                            onBlur={ (e) => processGeneEntry(e.currentTarget.value) } />
                <label htmlFor="gene">Gene</label>
            </FloatLabel>
            <Message severity='error' ref={geneMessageRef} pt={{root:{style: {display: geneMessageDisplay}}}}
                            text="Failed to find gene, correct input and try again." />
            <FloatLabel>
                <MultiSelect id="transcripts" loading={transcriptListLoading} ref={transcriptMultiselectRef}
                    display='chip' maxSelectedLabels={3} className="w-full md:w-20rem"
                    value={selectedTranscriptIds} onChange={(e) => setSelectedTranscriptIds(e.value)}
                    onFocus={ () => setTranscriptListFocused(true) }
                    onBlur={ () => setTranscriptListFocused(false) }
                    onHide={ () => setTranscriptListOpened(false) }
                    onShow={ () => setTranscriptListOpened(true) }
                    options={
                    transcriptList.map(r => (
                        {
                            key: r.id(),
                            value: r.id(),
                            label: r.get("name")
                        } ))} />
                <label htmlFor="transcripts">Transcripts</label>
            </FloatLabel><br />
        </div>
    )
}
