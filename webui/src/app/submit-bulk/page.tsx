import { Breadcrumbs } from '../components/Breadcrumbs';
import { BulkUploadForm } from './BulkUploadForm';

const PUBLIC_DATA_PORTAL_URL = 'https://www.alliancegenome.org';

async function getAgrDataRelease(publicDataPortalUrl: string): Promise<string> {
    const releaseInfoURL = `${publicDataPortalUrl}/api/releaseInfo`;
    return fetch(releaseInfoURL, { next: { revalidate: 3600 } })
        .then((response) => {
            if (response.ok) {
                return response.json() as any;
            } else {
                throw new Error('Error while retrieving releaseInfo.');
            }
        })
        .then((data) => {
            return data.releaseVersion as string;
        });
}

export default async function SubmitBulkPage() {
    const agrDataRelease = await getAgrDataRelease(PUBLIC_DATA_PORTAL_URL);

    return (
        <article>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'Bulk Upload' },
                ]}
            />
            <header>
                <h1 className="agr-page-title">Bulk Gene-List Upload</h1>
            </header>
            <section>
                <BulkUploadForm agrjBrowseDataRelease={agrDataRelease} />
            </section>
        </article>
    );
}
