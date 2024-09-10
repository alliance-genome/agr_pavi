'use client';

import React, { FunctionComponent, useEffect, useState } from 'react';
import { ProgressBar } from 'primereact/progressbar';
import { redirect } from 'next/navigation'

import { fetchJobStatus } from './serverActions';
import { JobProgressStatus } from './types';

export interface JobProgressTrackerProps {
    readonly uuidStr?: string
}
export const JobProgressTracker: FunctionComponent<JobProgressTrackerProps> = (props: JobProgressTrackerProps) => {
    if( !props.uuidStr ){
        redirect('/submit')
    }

    const [activeProgress, setActiveProgress] = useState<boolean>(true)
    const [progressValue, setProgressValue] = useState<number>()
    const [updateInterval, setUpdateInterval] = useState<ReturnType<typeof setTimeout>>()
    const [jobState, setJobState] = useState<number>()
    const [stateMessage, setStateMessage] = useState<string>('Retrieving job progress...')
    const [lastChecked, setLastChecked] = useState<number>()

    const progressBarMode = () => (
        activeProgress ? "indeterminate" : "determinate"
    )

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

    const updateJobStatus = async (initCheckDate: number) => {
        const currentDate = Date.now()

        // Stop checking for updates if >1h passed since starting checks
        if( currentDate - initCheckDate > 1000 * 60 * 60 ){
            clearInterval(updateInterval);
            const msg = `Job ${props.uuidStr} failed to report completion before timeout.`
            console.warn(msg)
            setStateMessage(`${msg} Please try again or contact the developers.`)
            setActiveProgress(false)
            setProgressValue(0)
            return Promise.resolve()
        }

        const newState = await fetchJobStatus(props.uuidStr!)
        if(newState){
            setJobState(newState)
        }
        else{
            console.error(`Failed to fetch job status for uuid ${props.uuidStr}`)
        }

        setLastChecked(currentDate)
    }

    //Check for jobState updates every 10s
    useEffect(() => {
        const initCheckDate = Date.now()

        const interval = setInterval(updateJobStatus.bind(undefined, initCheckDate), 10000);
        setUpdateInterval(interval)

        return () => {
          clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        updateStateMessage()
        if( jobState === JobProgressStatus.completed || jobState === JobProgressStatus.failed ){
            clearInterval(updateInterval);
            setActiveProgress(false)
            setProgressValue(100)
            //TODO: on successful completion, forward to results page.
            //TODO: on failure, report failure (and forward to submit page?).
        }
    }, [jobState]);

    return (
        <>
            <div className="card">
                <ProgressBar mode={progressBarMode()} value={progressValue} style={{ height: '6px' }}></ProgressBar>
            </div>
            <div>
                {lastChecked?`Last checked at: ${new Date(lastChecked)}`:''}
                <br />
                <br />
                {stateMessage}
            </div>
        </>
    )
}

//TODO: add unit (component) & E2E testing for progress tracking
