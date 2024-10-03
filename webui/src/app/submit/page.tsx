import { JobSubmitForm } from './components/JobSubmitForm/JobSubmitForm';

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
        <JobSubmitForm agrjBrowseDataRelease={agrDataRelease} />
    );
}
