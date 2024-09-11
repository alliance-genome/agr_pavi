'use client';

import React, { FunctionComponent, useEffect, useState } from 'react';
import { ProgressBar } from 'primereact/progressbar';
import { useRouter } from 'next/navigation'

import { fetchJobStatus } from './serverActions';
import { JobProgressStatus } from './types';

export interface JobProgressTrackerProps {
    readonly uuidStr: string
}
export const JobProgressTracker: FunctionComponent<JobProgressTrackerProps> = (props: JobProgressTrackerProps) => {
    const router = useRouter()

    const [activeProgress, setActiveProgress] = useState<boolean>(true)
    const [progressValue, setProgressValue] = useState<number>()
    const [jobState, setJobState] = useState<number>()
    const [stateMessage, setStateMessage] = useState<string>('Retrieving job progress...')
    const [lastChecked, setLastChecked] = useState<number>()
    const [lastCheckedMessage, setLastCheckedMessage] = useState<string>('')

    const progressBarMode = () => (
        activeProgress ? "indeterminate" : "determinate"
    )

    const updateLastCheckedMsg = () => {
        let msg = ''

        if( lastChecked ){
            msg = `Last checked at: ${new Date(lastChecked)}`
            if(activeProgress){
                msg += ', updates every 10s'
            }
            msg += '.'
        }

        setLastCheckedMessage(msg)
    }

    const updateStateMessage = (msg?: string) => {
        if(msg){
            updateStateMessage(msg)
        }
        else{
            if(jobState !== undefined){
                setStateMessage(`Job ${props.uuidStr} is ${JobProgressStatus[jobState]}.`)
            }
        }
    }

    async function updateJobStatus(initCheckDate: number){
        const currentDate = Date.now()

        // Stop checking for updates if >1h passed since starting checks
        if( currentDate - initCheckDate > 1000 * 60 * 60 ){
            const msg = `Job ${props.uuidStr} failed to report completion before timeout.`
            console.warn(msg)
            setStateMessage(`${msg} Please try again or contact the developers.`)
            setActiveProgress(false)
            setProgressValue(0)
            return Promise.resolve()
        }

        const newState = await fetchJobStatus(props.uuidStr)
        setLastChecked(currentDate)

        if(newState){
            setJobState(newState)

            if( newState === JobProgressStatus.completed || jobState === JobProgressStatus.failed ){
                setActiveProgress(false)
                setProgressValue(100)

                //On successful completion, forward to results page.
                if( newState === JobProgressStatus.completed ){
                    const params = new URLSearchParams();
                    params.set("uuid", props.uuidStr);

                    router.push(`/result?${params.toString()}`)
                }

                //TODO: on failure, report failure (and forward to submit page?).

                return Promise.resolve()
            }
        }
        else {
            const msg = `Failed to fetch job status for uuid ${props.uuidStr}`
            console.error(msg)
            setStateMessage(`${msg} Please reload the page to try again, check the URL uuid or contact the developers.`)
            setActiveProgress(false)
            setProgressValue(0)
            return Promise.resolve()
        }

        //Repeat every 10s
        setTimeout(updateJobStatus, 10000, initCheckDate)
    }

    //Start updating job status on page load
    useEffect(() => {
        const initCheckDate = Date.now()
        updateJobStatus(initCheckDate)
    }, []);

    useEffect(() => {
        updateStateMessage()
    }, [jobState]);

    useEffect(() => {
        updateLastCheckedMsg()
    }, [activeProgress, lastChecked]);

    return (
        <>
            <div className="card">
                <ProgressBar mode={progressBarMode()} value={progressValue} style={{ height: '6px' }}></ProgressBar>
            </div>
            <div>
                <p style={{margin:'0px', padding:'0px', fontSize:'12px'}}>{lastCheckedMessage}</p>
                <p id="progress-msg">{stateMessage}</p>
            </div>
        </>
    )
}

//TODO: add unit (component) & E2E testing for progress tracking
