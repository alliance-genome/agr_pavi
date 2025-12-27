// Server-generated page

import { Breadcrumbs } from '../components/Breadcrumbs'
import { AlignmentResultView } from './components/AlignmentResultView/AlignmentResultView'
import { redirect } from 'next/navigation'

export default async function ResultPage( props: any ) {

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
                    { label: 'Results' },
                ]}
            />
            <AlignmentResultView uuidStr={jobUuidStr} />
        </article>
    )
}
