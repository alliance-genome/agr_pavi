'use client'

import { useSearchParams } from 'next/navigation'
import { JobProgressTracker } from '../components/client/JobProgressTracker/JobProgressTracker'
import { redirect } from 'next/navigation'

export default function Page() {

    const searchParams = useSearchParams()
    const jobUuidStr = searchParams.get('uuid')

    if( !jobUuidStr ){
        redirect('/submit')
    }

    return (
        <JobProgressTracker uuidStr={jobUuidStr} />
    )
}
