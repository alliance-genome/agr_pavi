// Server-generated page

import { WebUiHealthCheck } from "./components/WebUiHealthCheck";

export default async function Page() {
    return (
        <WebUiHealthCheck />
    )
}

// For GitHub Pages static export, we need force-static
// For regular deployment, this should be force-dynamic (modify before deploying to production)
export const dynamic = 'force-static'
