import { notFound, redirect } from 'next/navigation';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CompareView } from './CompareView';

// Side-by-side comparison of two completed jobs. Launched from /jobs
// when the user has exactly 2 completed jobs selected. The URL carries
// the two UUIDs explicitly so a comparison is linkable / shareable.
export default async function ComparePage(props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await props.searchParams;
    const rawA = Array.isArray(sp.a) ? sp.a[0] : sp.a;
    const rawB = Array.isArray(sp.b) ? sp.b[0] : sp.b;

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!rawA || !rawB) {
        redirect('/jobs?error=compare-missing-uuid');
    }
    if (!uuidPattern.test(rawA) || !uuidPattern.test(rawB)) {
        notFound();
    }
    if (rawA.toLowerCase() === rawB.toLowerCase()) {
        redirect(`/result?uuid=${rawA}`);
    }

    return (
        <article>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'My Jobs', href: '/jobs' },
                    { label: 'Compare' },
                ]}
            />
            <header>
                <h1 className="agr-page-title">Compare Alignments</h1>
            </header>
            <section>
                <CompareView uuidA={rawA} uuidB={rawB} />
            </section>
        </article>
    );
}
