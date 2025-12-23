'use client';

import React, { FunctionComponent, useCallback, useEffect, useState } from 'react';
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
    const [jobState, setJobState] = useState<JobProgressStatus>()
    const [progressMessage, setProgressMessage] = useState<string>('Retrieving job progress...')
    const [lastChecked, setLastChecked] = useState<number>()
    const [lastCheckedMessage, setLastCheckedMessage] = useState<string>('')

    const progressBarMode = () => (
        activeProgress ? "indeterminate" : "determinate"
    )

    const updateLastCheckedMsg = useCallback((active: boolean, reportDate?: number) => {
        let msg = ''

        if( reportDate ){
            msg = `Last checked at: ${new Date(reportDate)}`
            if(active){
                msg += ', updates every 10s'
            }
            msg += '.'
        }

        setLastCheckedMessage(msg)
    }, [])

    const updateProgressMessage = useCallback((state?: JobProgressStatus) => {
        let msg = ''
        if(state !== undefined){
            if( state === JobProgressStatus.completed ){
                msg = `Job ${props.uuidStr} has completed, redirecting to results page in a few seconds...`
            }
            else if( state === JobProgressStatus.failed ){
                msg = `Job ${props.uuidStr} has failed, try to submit a new job or contact the developers if this error persists.`
            }
            else{
                msg = `Job ${props.uuidStr} is ${JobProgressStatus[state]}.`
            }
        }
        setProgressMessage(msg)
    }, [props.uuidStr])

    const updateJobStatus = useCallback(async function(initCheckDate: number, jobUuid: string){
        const currentDate = Date.now()

        // Stop checking for updates if >1h passed since starting checks
        if( currentDate - initCheckDate > 1000 * 60 * 60 ){
            const msg = `Job ${jobUuid} failed to report completion before timeout.`
            console.warn(msg)
            setProgressMessage(`${msg} Please try again or contact the developers.`)
            setActiveProgress(false)
            setProgressValue(0)
            return Promise.resolve()
        }

        const newState = await fetchJobStatus(jobUuid)
        setLastChecked(currentDate)

        if(newState){
            setJobState(newState)

            if( newState === JobProgressStatus.completed || newState === JobProgressStatus.failed ){
                setActiveProgress(false)
                setProgressValue(100)

                //On successful completion, forward to results page.
                if( newState === JobProgressStatus.completed ){
                    const params = new URLSearchParams();
                    params.set("uuid", jobUuid);

                    setTimeout(
                        () => {router.push(`/result?${params.toString()}`)},
                        3000
                    )
                }

                return Promise.resolve()
            }
        }
        else {
            const msg = `Failed to fetch job status for uuid ${jobUuid}`
            console.error(msg)
            setProgressMessage(`${msg} Please reload the page to try again, check the URL uuid or contact the developers.`)
            setActiveProgress(false)
            setProgressValue(0)
            return Promise.resolve()
        }

        //Repeat every 10s
        setTimeout(updateJobStatus, 10000, initCheckDate, jobUuid)
    }, [router])

    //Start updating job status on page load
    useEffect(() => {
        console.log('JobProgressTracker mounted.')
        const initCheckDate = Date.now()
        updateJobStatus(initCheckDate, props.uuidStr)
    }, [updateJobStatus, props.uuidStr]);

    useEffect(() => {
        updateProgressMessage(jobState)
    }, [updateProgressMessage, jobState]);

    useEffect(() => {
        updateLastCheckedMsg(activeProgress, lastChecked)
    }, [updateLastCheckedMsg, activeProgress, lastChecked]);

    const getStatusClass = () => {
        if (jobState === JobProgressStatus.completed) return 'agr-status-success';
        if (jobState === JobProgressStatus.failed) return 'agr-status-error';
        return 'agr-status-pending';
    };

    return (
        <div className="agr-page-section">
            <div className="agr-page-header">
                <h1>Job Progress</h1>
                <p className="agr-page-description">
                    Tracking alignment job: <code className="agr-code">{props.uuidStr}</code>
                </p>
            </div>
            <div className="agr-card">
                <div className="agr-card-header">
                    <h2>Processing Status</h2>
                </div>
                <div className="agr-card-body">
                    <div className="agr-progress-container">
                        <ProgressBar
                            mode={progressBarMode()}
                            value={progressValue}
                            style={{ height: '8px' }}
                            className="agr-progress-bar"
                        />
                    </div>
                    <div className={`agr-progress-status ${getStatusClass()}`}>
                        <p id="progress-msg" className="agr-progress-message">{progressMessage}</p>
                        {lastCheckedMessage && (
                            <p className="agr-progress-timestamp">{lastCheckedMessage}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

//TODO: add unit (component) testing for progress tracking
