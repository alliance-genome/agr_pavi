import { NextRequest, NextResponse } from 'next/server';

// Allowed external API URLs for security
const ALLOWED_HOSTS = [
    'https://pavi-api.alliancegenome.org',
    'https://pavi-api-dev.alliancegenome.org',
];

export async function GET(request: NextRequest) {
    const targetUrl = request.nextUrl.searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json(
            { error: 'Missing url parameter' },
            { status: 400 }
        );
    }

    // Validate the URL is in our allowed list
    const isAllowed = ALLOWED_HOSTS.some(host => targetUrl.startsWith(host));
    if (!isAllowed) {
        return NextResponse.json(
            { error: 'URL not in allowed hosts' },
            { status: 403 }
        );
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Remote API returned ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Proxy fetch error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch from remote API' },
            { status: 502 }
        );
    }
}
