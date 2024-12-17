// Server-generated page

import { JobProgressTracker } from './components/JobProgressTracker/JobProgressTracker'
import { redirect } from 'next/navigation'

export default async function Page( props: any ) {

    const searchParams: Record<string, any> = props.searchParams
    const jobUuidStr = searchParams['uuid'] as string

    if( !jobUuidStr ){
        redirect('/submit')
    }

    return (
        <JobProgressTracker uuidStr={jobUuidStr} />
    )
}
