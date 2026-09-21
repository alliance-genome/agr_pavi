import { Breadcrumbs } from '../components/Breadcrumbs';
import { OrthologForm } from './OrthologForm';

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

export default async function OrthologSubmitPage() {
    const agrDataRelease = await getAgrDataRelease(PUBLIC_DATA_PORTAL_URL);

    return (
        <article>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'Ortholog Alignment' },
                ]}
            />
            <header>
                <h1 className="agr-page-title">Ortholog Alignment</h1>
            </header>
            <section>
                <OrthologForm agrjBrowseDataRelease={agrDataRelease} />
            </section>
        </article>
    );
}
