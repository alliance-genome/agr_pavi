import { PrimeReactProvider } from 'primereact/api';

import JobSubmitForm, { DarkModeToggle } from './clientComponents';
import submitNewPipelineJob from './serverActions';

export default async function Page() {
    return (
        <PrimeReactProvider>
            {/* eslint-disable-next-line @next/next/no-css-tags */}
            <link id="theme-link" rel="stylesheet" href="/themes/mdc-light-indigo/theme.css" />
            <DarkModeToggle />
            <JobSubmitForm submitFn={submitNewPipelineJob}></JobSubmitForm>
        </PrimeReactProvider>
    );
}
