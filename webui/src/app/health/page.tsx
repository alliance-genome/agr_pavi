'use server'

import { WebUiHealthCheck } from "../components/server/WebUiHealthCheck";

export default async function Page() {
    return (
        <WebUiHealthCheck />
    )
}
