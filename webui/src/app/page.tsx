import { PrimeReactProvider } from 'primereact/api';

import { DarkModeToggle } from './components/client/DarkModeToggle';
import { JobSubmitForm } from './components/client/JobSubmitForm';
import { fetchGeneInfo, submitNewPipelineJob } from './serverActions';

const PUBLIC_DATA_PORTAL_URL = 'https://www.alliancegenome.org'

async function getAgrDataRelease(publicDataPortalUrl: string): Promise<string> {
    const releaseInfoURL = `${publicDataPortalUrl}/api/releaseInfo`
    return fetch(releaseInfoURL)
            .then((response) => {
                if( response.ok ){
                    return response.json() as any;
                }
                else{
                    throw new Error('Error while retrieving releaseInfo.')
                }
                })
            .then((data) => {
                return data.releaseVersion as string
            })
}

export default async function Page() {
    const agrDataRelease = await getAgrDataRelease(PUBLIC_DATA_PORTAL_URL)

    return (
        <PrimeReactProvider>
            {/* eslint-disable-next-line @next/next/no-css-tags */}
            <link id="theme-link" rel="stylesheet" href="/themes/mdc-light-indigo/theme.css" />
            <DarkModeToggle />
            <br />
            <JobSubmitForm submitFn={submitNewPipelineJob} geneInfoFn={fetchGeneInfo} agrjBrowseDataRelease={agrDataRelease} />
        </PrimeReactProvider>
    );
}
