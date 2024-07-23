'use client';

import { Button } from 'primereact/button'
import { FloatLabel } from 'primereact/floatlabel';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ToggleButton } from "primereact/togglebutton";
import { PrimeReactContext } from 'primereact/api';
import { FC, useCallback, useContext, useEffect, useState } from 'react';
import { fetchTranscripts } from 'generic-sequence-panel';
import { Feature } from '@jbrowse/core/util';
import { dedupe, revlist } from '@jbrowse/core/BaseFeatureWidget/util';
import NCListFeature from "generic-sequence-panel/dist/NCListFeature";
// import NCListFeature from "@jbrowse/plugin-legacy-jbrowse/dist/NCListAdapter/NCListFeature";
// import NCListFeature from "./jbrowse-utils/NCListFeature";

import { geneInfo, jobType } from './types';
import { MultiSelect } from 'primereact/multiselect';

interface props {
    submitFn: Function,
    geneInfoFn: Function
}

const JobSubmitForm: FC<props> = ({submitFn, geneInfoFn}) => {
    const [payload, setPayload] = useState("")
    const [gene, setGene] = useState<geneInfo>()
    const [transcriptList, setTranscriptList] = useState<Feature[]>([])
    const [selectedTranscriptIds, setSelectedTranscriptIds] = useState<Array<any>>([])
    const [transcriptListLoading, setTranscriptListLoading] = useState(true)

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
        const submitResponse: jobType = await submitFn(payload)

        console.log('Submit response received, updating Job.')
        setJob(submitResponse)
    }

    const fetchGeneInfo = async(geneId: string) => {
        console.log('Fetching gene info for geneID', geneId, '...')
        setTranscriptListLoading(true)

        const geneInfo: geneInfo = await geneInfoFn(geneId)
        console.log('Gene info received:', JSON.stringify(geneInfo))

        setGene(geneInfo)

        //TODO: retrieve below JBrowse constants from constants.js file from public UI,
        // based on selected gene's species
        const jBrowsenclistbaseurl = 'https://s3.amazonaws.com/agrjbrowse/docker/7.0.0/human/'
        const jBrowseurltemplate = 'tracks/All_Genes/{refseq}/trackData.jsonz'

        //TODO: mimick or reuse agr-ui's getSingleGenomeLocation()
        const genomeLocation = geneInfo.genomeLocations[0];

        const transcripts = await fetchTranscripts({
            refseq: genomeLocation['chromosome'],
            start: genomeLocation['start'],
            end: genomeLocation['end'],
            gene: geneInfo['symbol'],
            urltemplate: jBrowseurltemplate,
            nclistbaseurl: jBrowsenclistbaseurl
          })
        console.log("transcripts received:", transcripts)

        // Define transcripts list
        setTranscriptList(transcripts)
        setTranscriptListLoading(false)
    }

    const fetchExonInfo = async(transcriptIds: String[]) => {
        console.log(`selected transcripts (${transcriptIds.length}): ${transcriptIds}`)
        console.log('Fetching exon info for selected transcripts...')

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
                        new_exon['RefStart'] = transcript.get('end') - new_exon['start']
                        new_exon['RefEnd'] = transcript.get('end') - new_exon['end'] + 1
                    }
                    else {
                        new_exon['RefStart'] = transcript.get('start') + new_exon['start'] + 1
                        new_exon['RefEnd'] = transcript.get('start') + new_exon['end']
                    }

                    return new_exon
                })

                console.log(`transcript ${transcript.get("name")} resulted in exons:`, exons)
            }
        })
    }

    // Update displayMsg on every job update
    useEffect(
        () => {
            setDisplayMsg(jobDisplayMsg())
        },
        [job, jobDisplayMsg]
    );

    // Print console message every time gene object updated
    useEffect(
        () => {
            console.log(`New gene object: ${gene}`)
        },
        [gene]
    );

    return (
        <div>
            <FloatLabel>
                <InputText id="gene" className="p-inputtext-sm" placeholder='e.g. HGNC:620'
                           onBlur={e => fetchGeneInfo(e.target.value)} />
                <label htmlFor="gene">Gene</label>
            </FloatLabel><br />
            <FloatLabel>
                <label htmlFor="transcripts">Transcripts</label>
                <MultiSelect id="transcripts" loading={transcriptListLoading}
                    display='chip' maxSelectedLabels={3} className="w-full md:w-20rem"
                    value={selectedTranscriptIds} onChange={(e) => setSelectedTranscriptIds(e.value)}
                    onHide={ () => fetchExonInfo(selectedTranscriptIds) }
                    options={
                    transcriptList.map(r => (
                        {
                            key: r.id(),
                            value: r.id(),
                            label: r.get("name")
                        } ))} />
            </FloatLabel><br />
            <InputTextarea onChange={e => setPayload(e.target.value)} /><br />
            <Button label='Submit' onClick={handleSubmit} icon="pi pi-check"
                    loading={job['status'] === 'submitting'} /><br />
            <div>{displayMsg}</div>
        </div>
    );
}

export const DarkModeToggle: FC<{}> = () => {
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
