// Server-generated page

import { AlignmentResultView } from './components/AlignmentResultView/AlignmentResultView'
import { redirect } from 'next/navigation'

export default async function Page( props: any ) {

    const searchParams: Record<string, any> = (await props.searchParams)
    const jobUuidStr = searchParams['uuid'] as string

    if( !jobUuidStr ){
        redirect('/submit')
    }

    return (
        <AlignmentResultView uuidStr={jobUuidStr} />
    )
}
