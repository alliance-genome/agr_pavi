'use client'

import { useSearchParams } from 'next/navigation'
import { JobProgressTracker } from '../components/client/JobProgressTracker/JobProgressTracker'

export default function Page() {

    const searchParams = useSearchParams()
    const jobUuidStr = searchParams.get('uuid') || undefined

    return (
        <JobProgressTracker uuidStr={jobUuidStr} />
    )
}
