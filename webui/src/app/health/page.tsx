// Server-generated page

import { WebUiHealthCheck } from "./components/WebUiHealthCheck";

export default async function Page() {
    return (
        <WebUiHealthCheck />
    )
}

// Force dynamic page rendering by next.js
export const dynamic = 'force-dynamic'
