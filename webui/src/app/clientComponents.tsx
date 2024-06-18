'use client';

import { Button } from 'primereact/button'
import { InputTextarea } from 'primereact/inputtextarea';
import { ToggleButton } from "primereact/togglebutton";
import { PrimeReactContext } from 'primereact/api';
import { FC, useCallback, useContext, useEffect, useState } from 'react';

import { jobType } from './types';

interface props {
    submitFn: Function
}

const JobSubmitForm: FC<props> = ({submitFn}) => {
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
        const submitResponse: jobType = await submitFn(payload)

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
        <ToggleButton onLabel="" onIcon="pi pi-moon"
                      offLabel="" offIcon="pi pi-sun"
                      tooltip='toggle dark mode'
                      checked={darkMode} onChange={(e) => toggleDarkMode(e.value)} />
    );
}

export default JobSubmitForm
