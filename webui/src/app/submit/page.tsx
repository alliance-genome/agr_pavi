import { Breadcrumbs } from '../components/Breadcrumbs';
import { JobSubmitForm } from './components/JobSubmitForm/JobSubmitForm';

const PUBLIC_DATA_PORTAL_URL = 'https://www.alliancegenome.org'

async function getAgrDataRelease(publicDataPortalUrl: string): Promise<string> {
    const releaseInfoURL = `${publicDataPortalUrl}/api/releaseInfo`
    return fetch(releaseInfoURL, { next: { revalidate: 3600 }})  // Revalidate once per hour
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

export default async function SubmitPage() {
    const agrDataRelease = await getAgrDataRelease(PUBLIC_DATA_PORTAL_URL)

    return (
        <article>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'Submit Job' },
                ]}
            />
            <header>
                <h1 className="agr-page-title">Submit New Job</h1>
            </header>
            <section>
                <JobSubmitForm agrjBrowseDataRelease={agrDataRelease} />
            </section>
        </article>
    );
}
