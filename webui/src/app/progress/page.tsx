'use client';

import { Breadcrumbs } from '../components/Breadcrumbs'
import { JobProgressTracker } from './components/JobProgressTracker/JobProgressTracker'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'

function ProgressPageContent() {
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
                    { label: 'Job Progress' },
                ]}
            />
            <JobProgressTracker uuidStr={jobUuidStr} />
        </article>
    )
}

export default function ProgressPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProgressPageContent />
        </Suspense>
    )
}
