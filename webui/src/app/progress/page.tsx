// Server-generated page

import { Breadcrumbs } from '../components/Breadcrumbs'
import { JobProgressTracker } from './components/JobProgressTracker/JobProgressTracker'
import { redirect } from 'next/navigation'

export default async function ProgressPage( props: any ) {

    const searchParams: Record<string, any> = (await props.searchParams)
    const jobUuidStr = searchParams['uuid'] as string

    if( !jobUuidStr ){
        redirect('/submit')
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
