'use client';

import { dedupe, revlist } from '@jbrowse/core/BaseFeatureWidget/util';
import { Feature } from '@jbrowse/core/util';
import { fetchTranscripts } from 'generic-sequence-panel';
import NCListFeature from "generic-sequence-panel/dist/NCListFeature";
import { PrimeReactContext } from 'primereact/api';
import { Button } from 'primereact/button';
import { FloatLabel } from 'primereact/floatlabel';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import { ToggleButton } from "primereact/togglebutton";
import React, { createRef, FunctionComponent, useCallback, useContext, useEffect, useState } from 'react';

import { geneInfo, jobType, jobSumbissionPayloadRecord, transcriptInfo } from './types';

//Note: dynamic import of stage vs main src is currently not possible on client nor server (2024/07/25).
// * Server requires node 22's experimental feature http(s) module imports,
//   which is expected to become stable in Oct 2024 (https://nodejs.org/api/esm.html#https-and-http-imports)
// * next.js client code does not support async/await (at current), which is required for dynamic imports
//   like `await import(`${public_website_src}/lib/utils.js`)`
import { getSpecies, getSingleGenomeLocation } from 'https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/lib/utils.js';

interface alignmentEntryProps {
    readonly index: number
    readonly geneInfoFn: Function
    readonly agrjBrowseDataRelease: string
    readonly updatePayloadPart: Function
    //TODO: payloadPartstatus (pending => updating <=> ready)
}
const AlignmentEntry: FunctionComponent<alignmentEntryProps> = (props: alignmentEntryProps) => {
    const geneMessageRef: React.RefObject<Message> = createRef();
    const [geneMessageDisplay, setgeneMessageDisplay] = useState('none')
    const [gene, setGene] = useState<geneInfo>()
    const transcriptMultiselectRef: React.RefObject<MultiSelect> = createRef();
    const [transcriptList, setTranscriptList] = useState<Feature[]>([])
    const [transcriptListFocused, setTranscriptListFocused] = useState<Boolean>(false)
    const [selectedTranscriptIds, setSelectedTranscriptIds] = useState<Array<any>>([])
    const [transcriptListLoading, setTranscriptListLoading] = useState(true)
    const [fastaFileUrl, setFastaFileUrl] = useState<string>()

    const fetchGeneInfo = async(geneId: string) => {
        if( geneId ){
            console.log('Fetching gene info for geneID', geneId, '...')
            setTranscriptListLoading(true)
            setSelectedTranscriptIds([])

            const geneInfo: geneInfo | undefined = await props.geneInfoFn(geneId)
            if(geneInfo){
                console.log('Gene info received:', JSON.stringify(geneInfo))
                setgeneMessageDisplay('none')
                setGene(geneInfo)
            }
            else{
                console.log('Error while receiving gene info: undefined geneInfo returned.')
                setgeneMessageDisplay('initial')
                setGene(undefined)
            }
        }
        else {
            setGene(undefined)
        }
    }

    const fetchExonInfo = async(transcriptIds: String[]) => {
        console.log(`selected transcripts (${transcriptIds.length}): ${transcriptIds}`)
        console.log('Fetching exon info for selected transcripts...')

        let transcriptsInfo: Array<transcriptInfo> = []

        transcriptIds.forEach((transcriptId) => {
            console.log(`Finding transcript for ID ${transcriptId}...`)

            const transcript = transcriptList.find(r => r.id() === transcriptId)
            if( !transcript ){
                console.error(`No transcript found for transcript ID ${transcriptId}`)
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

                let transcript_length = transcript.get("end") - transcript.get("start")
                if (feature.strand === -1) {
                    exons = revlist(exons, transcript_length)
                }

                // Convert relative positions (to transcript)
                // to absolute positions (to chromosome/contig)
                exons = exons.map((exon: any) => {
                    let new_exon = {
                        ...exon,
                    }

                    if (feature.strand === -1) {
                        new_exon['refStart'] = transcript.get('end') - new_exon['start']
                        new_exon['refEnd'] = transcript.get('end') - new_exon['end'] + 1
                    }
                    else {
                        new_exon['refStart'] = transcript.get('start') + new_exon['start'] + 1
                        new_exon['refEnd'] = transcript.get('start') + new_exon['end']
                    }

                    return new_exon
                })

                console.log(`transcript ${transcript.get("name")} resulted in exons:`, exons)

                const transcriptInfo: transcriptInfo = {
                    id: transcript.id(),
                    name: transcript.get('name'),
                    exons: exons
                }

                transcriptsInfo.push(transcriptInfo)
            }
        })

        const portion = payloadPortion(gene!,transcriptsInfo)
        props.updatePayloadPart(props.index, portion)
    }

    const payloadPortion = (gene_info: geneInfo, transcripts_info: transcriptInfo[]) => {
        let portion: jobSumbissionPayloadRecord[] = []

        transcripts_info.forEach(transcript => {
            portion.push({
                name: `${gene_info.symbol}_${transcript.name}`,
                fasta_file_url: fastaFileUrl!,
                seq_id: getSingleGenomeLocation(gene!.genomeLocations)['chromosome'],
                seq_strand: getSingleGenomeLocation(gene!.genomeLocations)['strand'],
                seq_regions: transcript.exons.map((e) => ({
                    'start': e.refStart,
                    'end': e.refEnd
                }))
            })
        });

        return portion
    }

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

    return (
        <div className='p-inputgroup'>
            <FloatLabel>
                <InputText id="gene" className="p-inputtext-sm" placeholder='e.g. HGNC:620'
                            onBlur={ (e) => fetchGeneInfo(e.currentTarget.value) } />
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
                    onHide={ () => fetchExonInfo(selectedTranscriptIds) }
                    options={
                    transcriptList.map(r => (
                        {
                            key: r.id(),
                            value: r.id(),
                            label: r.get("name")
                        } ))} />
                <label htmlFor="transcripts">Transcripts</label>
            </FloatLabel><br />
        </div>)
}

interface alignmentEntryListProps {
    readonly geneInfoFn: Function,
    readonly agrjBrowseDataRelease: string
}
const AlignmentEntryList: FunctionComponent<alignmentEntryListProps> = (props: alignmentEntryListProps) => {
    //TODO: generate complete payload from all payloadParts
    //TODO: enable passthrough of payload value to jobSumbitForm for submission
    // const [payload, setPayload] = useState<object[]>([])

    //TODO: update alignmentEntries and payloadParts to be indexed hashes to prevent race conditions and mixups on entry removal

    const [alignmentEntries, setAlignmentEntries] = useState<alignmentEntryProps[]>([])
    const [payloadParts, setPayloadParts] = useState<Array<Array<jobSumbissionPayloadRecord>|undefined>>([])

    function updateAlignmentEntries(index: number, newPayloadPart?: jobSumbissionPayloadRecord[]){
        setPayloadParts((prevState) => {
            const newState = prevState
            newState[index] = newPayloadPart
            return newState
        })
    }

    const alignmentEntryBaseProps = {
        geneInfoFn: props.geneInfoFn,
        agrjBrowseDataRelease: props.agrjBrowseDataRelease,
        updatePayloadPart: updateAlignmentEntries
    }
    function addAlignmentEntry(){
        setAlignmentEntries((prevState) => {
            const newEntryIndex = prevState.length
            console.log(`Adding new alignmentEntry at index ${newEntryIndex}`)

            setPayloadParts([...payloadParts, undefined])
            return([...prevState, {...alignmentEntryBaseProps, index: newEntryIndex}])
        })
    }
    useEffect(
        () => {
            addAlignmentEntry()
        },[]
    )


    //TODO: enable removal of entries

    return (
        <table>
            <tbody>
                {alignmentEntries.map((entryProps, index) => (<tr key={index}><td>< AlignmentEntry {...entryProps} index={index} /></td></tr>))}
                <tr><td>
                    <Button text icon="pi pi-plus" onClick={() => addAlignmentEntry()} />
                </td></tr>
            </tbody>
        </table>
    )
}

interface jobSumbitProps {
    readonly submitFn: Function,
    readonly geneInfoFn: Function,
    readonly agrjBrowseDataRelease: string
}
const JobSubmitForm: FunctionComponent<jobSumbitProps> = (props: jobSumbitProps) => {
    console.info(`agrjBrowseDataRelease: ${props.agrjBrowseDataRelease}`)
    const [payload, setPayload] = useState("")

    const initJob: jobType = {
        'uuid': undefined,
        'status': 'expected',
    }
    const [job, setJob] = useState(initJob)
    const [displayMsg, setDisplayMsg] = useState('')

    const jobDisplayMsg = useCallback( () => {
        if (job['status'] === 'expected' || job['status'] === 'submitting') {
            return ''
        }
        else if (job['status'] === 'failed to submit') {
            let msg = 'Job failed to submit.'
            if (job['inputValidationPassed'] === false ){
                msg += ' Correct the input and try again.'
            }
            else{
                msg += ' Try again and contact the developers if this error persists.'
            }

            return msg
        } else {
            return `job ${job['uuid']||''} is now ${job['status']}.`
        }
    }, [job])

    const handleSubmit = async() => {
        setJob({
            uuid: undefined,
            status: 'submitting',
        });

        console.log('Sending submit request to server action.')
        const submitResponse: jobType = await props.submitFn(payload)

        console.log('Submit response received, updating Job.')
        setJob(submitResponse)
    }

    // Update displayMsg on every job update
    useEffect(
        () => {
            setDisplayMsg(jobDisplayMsg())
        },
        [job, jobDisplayMsg]
    );

    return (
        <div>
            <AlignmentEntryList geneInfoFn={props.geneInfoFn} agrjBrowseDataRelease={props.agrjBrowseDataRelease} />
            <InputTextarea onChange={ (e) => setPayload(e.currentTarget.value) } /><br />
            <Button label='Submit' onClick={handleSubmit} icon="pi pi-check"
                    loading={job['status'] === 'submitting'} /><br />
            <div>{displayMsg}</div>
        </div>
    );
}

export const DarkModeToggle: FunctionComponent<{}> = () => {
    const [darkMode, setDarkMode] = useState(false)
    const { changeTheme } = useContext(PrimeReactContext);

    function toggleDarkMode(darkMode: boolean) {
        console.log(`Toggling dark mode to ${darkMode?'enabled':'disabled'}.`)
        setDarkMode(darkMode)
        if( changeTheme ) {
            const oldThemeId = `mdc-${!darkMode?'dark':'light'}-indigo`
            const newThemeId = `mdc-${darkMode?'dark':'light'}-indigo`
            changeTheme(oldThemeId,newThemeId,'theme-link')
        }
        else {
            console.warn(`changeTheme not truthy (${changeTheme}), darkMode toggle not functional.`)
        }
    }

    return (
        <div >
            <ToggleButton onLabel="" onIcon="pi pi-moon"
                        offLabel="" offIcon="pi pi-sun"
                        tooltip='toggle dark mode'
                        checked={darkMode} onChange={(e) => toggleDarkMode(e.value)} />
        </div>
    );
}

export default JobSubmitForm
