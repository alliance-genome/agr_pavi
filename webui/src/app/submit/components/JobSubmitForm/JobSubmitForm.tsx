'use client';

import { useRouter } from 'next/navigation'

import { Button } from 'primereact/button';
import React, { FunctionComponent, useCallback, useEffect, useReducer, useState } from 'react';
import { submitNewPipelineJob } from './serverActions';

import { AlignmentEntryList } from '../AlignmentEntryList/AlignmentEntryList';
import { AlignmentEntryStatus } from '../AlignmentEntry/types';
import { ExampleDataLoader, ExampleData } from '../ExampleDataLoader/ExampleDataLoader';
import { FormIntroduction } from '../FormIntroduction';
import { ValidationSummary } from '../ValidationMessage';

import { JobType, JobSumbissionPayloadRecord, InputPayloadDispatchAction, InputPayloadPart, InputPayloadPartMap } from './types';

interface JobSumbitProps {
    readonly agrjBrowseDataRelease: string
}
export const JobSubmitForm: FunctionComponent<JobSumbitProps> = (props: JobSumbitProps) => {
    const router = useRouter()

    console.info(`agrjBrowseDataRelease: ${props.agrjBrowseDataRelease}`)

    const inputPayloadReducer = (prevState: InputPayloadPartMap, action: InputPayloadDispatchAction) => {
        const newState = new Map(prevState)
        const entityIndex = action.index

        switch (action.type) {
            case 'ADD': {
                console.log('inputPayloadReducer ADD action called.')
                /* istanbul ignore else */
                if ( prevState.get(entityIndex) === undefined ){
                    /* istanbul ignore else */
                    if( Object.hasOwn(action.value, 'index') && Object.hasOwn(action.value, 'payloadPart') && Object.hasOwn(action.value, 'status') ){
                        console.log(`inputPayloadReducer: adding new value at index ${entityIndex} `)
                        newState.set(entityIndex, action.value as InputPayloadPart)
                    }
                    else{
                        console.error('inputPayloadReducer: cannot add partial InputPayloadPart', action.value)
                    }
                }
                else {
                    console.warn(`inputPayloadReducer: addition requested but index ${entityIndex} already has existing value.`)
                }

                return newState
            }
            case 'DELETE': {
                console.log('inputPayloadReducer DELETE action called.')
                /* istanbul ignore else */
                if ( prevState.get(entityIndex) !== undefined ){
                    console.log(`inputPayloadReducer: deleting element at index ${entityIndex} `)
                    newState.delete(entityIndex)
                }
                else {
                    console.warn(`inputPayloadReducer: deletion requested but index ${entityIndex} does not exist.`)
                }

                return newState
            }
            case 'UPDATE': {
                const prevInputPayloadPart = prevState.get(entityIndex)
                /* istanbul ignore else */
                if ( prevInputPayloadPart !== undefined ){
                    const newInputPayloadPart: InputPayloadPart = {
                        ...prevInputPayloadPart,
                        ...action.value
                    }
                    newState.set(entityIndex, newInputPayloadPart)
                }
                else{
                    console.warn(`inputPayloadReducer: Update requested to non-existing inputPayload at index ${entityIndex}.`)
                }

                return newState
            }
            default: {
                return newState
            }

        }
    }
    const [inputPayloadParts, dispatchInputPayloadPart] = useReducer(inputPayloadReducer, new Map() as InputPayloadPartMap)

    function generate_complete_payload() {
        let payload = [] as JobSumbissionPayloadRecord[]

        console.log('generate_complete_payload: inputPayloadParts size =', inputPayloadParts.size)
        inputPayloadParts.forEach((part, index) => {
            console.log(`generate_complete_payload: part[${index}] status=${part.status}, hasPayload=${!!part.payloadPart}`)
            if(part.payloadPart){
                payload = payload.concat(part.payloadPart)
            }
        })
        if(payload.length === 0){
            console.warn('empty payload generated')
            return undefined
        }
        else{
            console.log('returning payload :', payload)
            return payload
        }
    }

    const submitDisabled = () => {
        const statuses = [...inputPayloadParts.values()].map(r => r.status)
        console.log('submitDisabled: entry statuses =', statuses)
        const non_ready = [...inputPayloadParts.values()].some(
            (record) => record.status !== AlignmentEntryStatus.READY
        )

        return non_ready
    }

    const initJob: JobType = {
        'uuid': undefined,
        'status': 'expected',
    }
    const [job, setJob] = useState(initJob)
    const [displayMsg, setDisplayMsg] = useState('')
    const [validationErrors, setValidationErrors] = useState<string[]>([])
    const [initialGeneIds, setInitialGeneIds] = useState<string[]>()

    const handleLoadExample = useCallback((example: ExampleData) => {
        console.log('Loading example:', example.name)
        const geneIds = example.genes.map(gene => gene.geneId)
        console.log('Gene IDs to load:', geneIds)
        setInitialGeneIds(geneIds)
        setValidationErrors([])
    }, [])

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
        console.log('Generating payload:')
        setValidationErrors([])

        setJob({
            uuid: undefined,
            status: 'submitting',
        });

        const payload = generate_complete_payload()

        if( payload && payload.length > 1 ){

            console.log('Sending submit request to server action.')
            const submitResponse: JobType = await submitNewPipelineJob(payload)

            console.log('Submit response received, updating Job.')
            setJob(submitResponse)
        }
        else{
            console.warn('No payload to submit.')
            setValidationErrors(['At least two sequences are required for alignment.'])

            setJob({
                uuid: undefined,
                status: 'failed to submit',
                inputValidationPassed: false
            })
        }
    }

    useEffect(() => {
        console.log('New inputPayloadParts: ', inputPayloadParts)
    }, [inputPayloadParts])

    // Update displayMsg on every job update
    useEffect(
        () => {
            if( job['status'] === 'pending' ){
                if(job['uuid']){
                    const params = new URLSearchParams();
                    params.set("uuid", job['uuid']);
                    router.push(`/progress?${params.toString()}`)
                }
                else{
                    console.error('Status pending received without uuid.')
                }
            }
            else{
                setDisplayMsg(jobDisplayMsg())
            }
        },
        [job, jobDisplayMsg, router]
    );

    return (
        <div className="agr-page-section">
            <FormIntroduction />

            <ValidationSummary errors={validationErrors} />

            <div className="agr-card">
                <div className="agr-card-header">
                    <h2>Alignment Entries</h2>
                    <ExampleDataLoader onLoadExample={handleLoadExample} />
                </div>
                <div className="agr-card-body">
                    <AlignmentEntryList agrjBrowseDataRelease={props.agrjBrowseDataRelease}
                                        dispatchInputPayloadPart={dispatchInputPayloadPart}
                                        initialGeneIds={initialGeneIds} />
                </div>
                <div className="agr-card-footer">
                    <Button label='Submit Job' onClick={handleSubmit} icon="pi pi-check"
                            loading={job['status'] === 'submitting'}
                            disabled={submitDisabled()}
                            className="p-button-lg"
                            />
                    {displayMsg && <div className="agr-message agr-message-error">{displayMsg}</div>}
                </div>
            </div>
        </div>
    );
}
