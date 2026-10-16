// Public (unauthenticated) view of a shared alignment result.
//
// Server-side resolves the share token to a job_id by calling the API, then
// renders the same AlignmentResultView used by /result?uuid=. If the token
// is unknown / revoked / expired, redirects to a friendly error.

import { notFound } from 'next/navigation'

import { Breadcrumbs } from '../../components/Breadcrumbs'
import { AlignmentResultView } from '../../result/components/AlignmentResultView/AlignmentResultView'

interface SharedPageProps {
    readonly params: Promise<{ token: string }>
}

async function resolveShareToken(token: string): Promise<string | null> {
    const base = process.env.PAVI_API_BASE_URL || ''
    try {
        const res = await fetch(`${base}/api/shared/${encodeURIComponent(token)}`, {
            cache: 'no-store',
        })
        if (!res.ok) return null
        const data = await res.json() as { job_id?: string }
        return data.job_id ?? null
    } catch {
        return null
    }
}

export default async function SharedResultPage(props: SharedPageProps) {
    const { token } = await props.params
    const jobUuid = await resolveShareToken(token)
    if (!jobUuid) {
        notFound()
    }

    return (
        <article>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'Shared Result' },
                ]}
            />
            <AlignmentResultView uuidStr={jobUuid} />
        </article>
    )
}
