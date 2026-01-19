'use client';

import { Breadcrumbs } from '../components/Breadcrumbs'
import { AlignmentResultView } from './components/AlignmentResultView/AlignmentResultView'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'

function ResultPageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const jobUuidStr = searchParams.get('uuid')

    useEffect(() => {
        if (!jobUuidStr) {
            router.push('/submit')
        }
    }, [jobUuidStr, router])

    if (!jobUuidStr) {
        return null
    }

    return (
        <article>
            <Breadcrumbs
                items={[
                    { label: 'Home', href: '/' },
                    { label: 'Results' },
                ]}
            />
            <AlignmentResultView uuidStr={jobUuidStr} />
        </article>
    )
}

export default function ResultPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResultPageContent />
        </Suspense>
    )
}
