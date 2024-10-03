'use server'

import { WebUiHealthCheck } from "./components/WebUiHealthCheck";

export default async function Page() {
    return (
        <WebUiHealthCheck />
    )
}
