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

    const [jobState, setJobState] = useState<number>(JobProgressStatus.pending)
    const [lastChecked, setLastChecked] = useState<number>()

    const updateJobStatus = async () => {
        const currentDate = Date.now()

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
        setLastChecked(Date.now())

        //TODO: timeout after x amount of time or nr of checks (return to submit form?)
        const interval = setInterval(updateJobStatus, 10000);
        return () => {
          clearInterval(interval);
        };
    }, []);

    //TODO: once jobState indicates successful completion, forward to results page.

    return (
        <>
            <div className="card">
                <ProgressBar mode="indeterminate" style={{ height: '6px' }}></ProgressBar>
            </div>
            <div>
                {lastChecked?`Last checked at: ${new Date(lastChecked)}`:''}
                <br />
                <br />
                {`Job ${props.uuidStr} is ${JobProgressStatus[jobState]}.`}
            </div>
        </>
    )
}

//TODO: add unit (component) & E2E testing for progress tracking
