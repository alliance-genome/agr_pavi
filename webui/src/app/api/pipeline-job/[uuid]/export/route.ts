import { NextRequest, NextResponse } from 'next/server';

// Stream the per-job SQLite file from the backend API as a download.
// The backend may be on a different origin in dev (localhost:8000) and
// behind Caddy in EC2 dev / production; this route lets the browser
// always hit a same-origin URL regardless of the deployment topology.
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ uuid: string }> }
) {
    const { uuid } = await context.params;
    const apiBase = process.env.PAVI_API_BASE_URL;

    if (!apiBase) {
        return NextResponse.json(
            { error: 'PAVI_API_BASE_URL is not configured on the server.' },
            { status: 500 }
        );
    }

    const upstream = await fetch(`${apiBase}/api/pipeline-job/${uuid}/export`);

    if (!upstream.ok) {
        return NextResponse.json(
            {
                error: 'Failed to fetch per-job DB',
                status: upstream.status,
            },
            { status: upstream.status }
        );
    }

    return new NextResponse(upstream.body, {
        status: 200,
        headers: {
            'Content-Type': 'application/x-sqlite3',
            'Content-Disposition': `attachment; filename="pavi-job-${uuid}.db"`,
        },
    });
}
